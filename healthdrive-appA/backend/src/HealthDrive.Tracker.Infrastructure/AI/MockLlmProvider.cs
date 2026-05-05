using HealthDrive.Tracker.Application.AI.Interfaces;

namespace HealthDrive.Tracker.Infrastructure.AI;

/// <summary>
/// Deterministic stub used in integration tests. Returns the canned response
/// set via <see cref="SetNextResponse"/> before each test assertion.
/// Never touches Azure — safe for CI pipelines with no BAA credentials.
/// </summary>
public sealed class MockLlmProvider : ILlmProvider
{
    private string _nextContent = "{}";

    public string ProviderName => "Mock";

    public void SetNextResponse(string json) => _nextContent = json;

    public Task<LlmCompletionResponse> CompleteAsync(
        LlmCompletionRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new LlmCompletionResponse
        {
            Content = _nextContent,
            ProviderName = ProviderName,
            ModelId = "mock-1",
            PromptTokens = 10,
            CompletionTokens = 20,
            WasTruncated = false,
            Latency = TimeSpan.FromMilliseconds(5)
        });
    }
}
