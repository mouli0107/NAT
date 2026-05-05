using HealthDrive.Tracker.Application.AI.Interfaces;

namespace HealthDrive.Tracker.Infrastructure.AI;

/// <summary>
/// No-op provider registered when the AI feature flag is disabled at startup,
/// or swapped in at runtime by the DI factory. Returns an empty response without
/// calling any external service — never throws, never leaks PHI.
/// </summary>
public sealed class NullLlmProvider : ILlmProvider
{
    public string ProviderName => "Null";

    public Task<LlmCompletionResponse> CompleteAsync(
        LlmCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new LlmCompletionResponse
        {
            Content = string.Empty,
            ProviderName = ProviderName,
            ModelId = "none",
            PromptTokens = 0,
            CompletionTokens = 0,
            WasTruncated = false,
            Latency = TimeSpan.Zero
        });
    }
}
