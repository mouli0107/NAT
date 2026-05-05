namespace HealthDrive.Tracker.Application.AI.Interfaces;

/// <summary>
/// Provider-agnostic LLM interface. Swap Azure OpenAI for any BAA-eligible provider
/// without changing any calling code — only the registered implementation changes.
/// </summary>
public interface ILlmProvider
{
    /// <summary>Name of the provider (logged on every audit event).</summary>
    string ProviderName { get; }

    /// <summary>Send a completion request and return the model's response text.</summary>
    Task<LlmCompletionResponse> CompleteAsync(
        LlmCompletionRequest request,
        CancellationToken cancellationToken = default);
}
