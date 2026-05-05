namespace HealthDrive.Tracker.Application.AI.Interfaces;

public sealed record DepartmentContext
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public IReadOnlyList<string> Keywords { get; init; } = [];
}

/// <summary>
/// Uses AI to suggest which department should handle a ticket based on
/// the inbound email or manual ticket description. Falls back to
/// deterministic keyword rules when the AI flag is off or confidence < 0.75.
/// </summary>
public interface IAIDepartmentRoutingService
{
    /// <param name="containsPhi">
    /// When true the implementation MUST NOT send any text to the LLM.
    /// It falls back immediately to deterministic keyword rules.
    /// </param>
    Task<DepartmentRoutingResult> SuggestDepartmentAsync(
        string emailSubject,
        string emailBody,
        IReadOnlyList<DepartmentContext> availableDepartments,
        bool containsPhi = false,
        CancellationToken ct = default);
}
