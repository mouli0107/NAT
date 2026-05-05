using Azure;
using Azure.AI.OpenAI;
using HealthDrive.Tracker.Application.AI.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using System.Diagnostics;

namespace HealthDrive.Tracker.Infrastructure.AI;

public sealed class AzureOpenAIOptions
{
    public const string Section = "AzureOpenAI";

    public required string Endpoint { get; init; }
    public required string ApiKey { get; init; }
    public required string DeploymentName { get; init; }   // e.g. "gpt-4o-mini"
    public int TimeoutSeconds { get; init; } = 30;
}

public sealed class AzureOpenAIProvider : ILlmProvider
{
    private readonly AzureOpenAIClient _client;
    private readonly string _deployment;
    private readonly ILogger<AzureOpenAIProvider> _logger;

    public string ProviderName => "AzureOpenAI";

    public AzureOpenAIProvider(
        IOptions<AzureOpenAIOptions> options,
        ILogger<AzureOpenAIProvider> logger)
    {
        var o = options.Value;
        _deployment = o.DeploymentName;
        _logger = logger;

        _client = new AzureOpenAIClient(
            new Uri(o.Endpoint),
            new AzureKeyCredential(o.ApiKey));
    }

    public async Task<LlmCompletionResponse> CompleteAsync(
        LlmCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(request.SystemPrompt),
            new UserChatMessage(request.UserContent)
        };

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = request.MaxTokens
        };

        if (request.JsonMode)
            chatOptions.ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat();

        _logger.LogDebug("LLM call started. CorrelationId={CorrelationId} Deployment={Deployment}",
            request.CorrelationId, _deployment);

        ChatClient chatClient = _client.GetChatClient(_deployment);
        ClientResult<ChatCompletion> result = await chatClient.CompleteChatAsync(messages, chatOptions, cancellationToken);
        ChatCompletion completion = result.Value;

        sw.Stop();

        string content = completion.Content.FirstOrDefault()?.Text ?? string.Empty;
        bool truncated = completion.FinishReason == ChatFinishReason.Length;

        _logger.LogInformation(
            "LLM call completed. CorrelationId={CorrelationId} Tokens={Prompt}+{Completion} Latency={Ms}ms Truncated={Truncated}",
            request.CorrelationId,
            completion.Usage.InputTokenCount,
            completion.Usage.OutputTokenCount,
            sw.ElapsedMilliseconds,
            truncated);

        return new LlmCompletionResponse
        {
            Content = content,
            ProviderName = ProviderName,
            ModelId = _deployment,
            PromptTokens = completion.Usage.InputTokenCount,
            CompletionTokens = completion.Usage.OutputTokenCount,
            WasTruncated = truncated,
            Latency = sw.Elapsed
        };
    }
}
