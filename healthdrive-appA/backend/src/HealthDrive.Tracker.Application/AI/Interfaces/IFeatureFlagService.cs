namespace HealthDrive.Tracker.Application.AI.Interfaces;

/// <summary>
/// Reads and writes DB-backed feature flags. Cached per request cycle;
/// admin changes take effect on next request after cache TTL expires.
/// </summary>
public interface IFeatureFlagService
{
    Task<bool> IsEnabledAsync(string flagName, CancellationToken ct = default);
    Task SetAsync(string flagName, bool enabled, string changedBy, CancellationToken ct = default);
    Task<IReadOnlyList<FeatureFlag>> GetAllAsync(CancellationToken ct = default);
}

public sealed record FeatureFlag
{
    public required string Name { get; init; }
    public required bool IsEnabled { get; init; }
    public required string Description { get; init; }
    public DateTimeOffset LastModified { get; init; }
    public string? LastModifiedBy { get; init; }
}

/// <summary>Well-known flag names — avoids magic strings across the codebase.</summary>
public static class FeatureFlags
{
    public const string AiEmailEnrichment = "AI_EMAIL_ENRICHMENT";
    public const string AiDepartmentRouting = "AI_DEPARTMENT_ROUTING";
    public const string AiPhiScanning = "AI_PHI_SCANNING";
}
