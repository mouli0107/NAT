using HealthDrive.Tracker.Application.AI.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Dapper;

namespace HealthDrive.Tracker.Infrastructure.AI;

public sealed class FeatureFlagService : IFeatureFlagService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(30);

    private readonly string _connectionString;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FeatureFlagService> _logger;

    public FeatureFlagService(
        string connectionString,
        IMemoryCache cache,
        ILogger<FeatureFlagService> logger)
    {
        _connectionString = connectionString;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> IsEnabledAsync(string flagName, CancellationToken ct = default)
    {
        string cacheKey = $"ff:{flagName}";
        if (_cache.TryGetValue(cacheKey, out bool cached))
            return cached;

        await using var conn = new SqlConnection(_connectionString);
        bool? value = await conn.QuerySingleOrDefaultAsync<bool?>(
            "SELECT IsEnabled FROM FeatureFlags WHERE Name = @Name",
            new { Name = flagName });

        bool result = value ?? false;
        _cache.Set(cacheKey, result, CacheTtl);
        return result;
    }

    public async Task SetAsync(string flagName, bool enabled, string changedBy, CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_connectionString);
        await conn.ExecuteAsync(
            """
            MERGE FeatureFlags AS t
            USING (VALUES (@Name, @IsEnabled, @ChangedBy, SYSUTCDATETIME()))
                  AS s (Name, IsEnabled, LastModifiedBy, LastModified)
            ON t.Name = s.Name
            WHEN MATCHED THEN
                UPDATE SET t.IsEnabled = s.IsEnabled, t.LastModifiedBy = s.LastModifiedBy, t.LastModified = s.LastModified
            WHEN NOT MATCHED THEN
                INSERT (Name, IsEnabled, LastModifiedBy, LastModified)
                VALUES (s.Name, s.IsEnabled, s.LastModifiedBy, s.LastModified);
            """,
            new { Name = flagName, IsEnabled = enabled, ChangedBy = changedBy });

        // Bust cache immediately so next request sees the new value
        _cache.Remove($"ff:{flagName}");

        _logger.LogInformation("Feature flag {Flag} set to {Value} by {User}", flagName, enabled, changedBy);
    }

    public async Task<IReadOnlyList<FeatureFlag>> GetAllAsync(CancellationToken ct = default)
    {
        await using var conn = new SqlConnection(_connectionString);
        var rows = await conn.QueryAsync<FeatureFlagRow>(
            "SELECT Name, IsEnabled, Description, LastModified, LastModifiedBy FROM FeatureFlags ORDER BY Name");

        return rows.Select(r => new FeatureFlag
        {
            Name = r.Name,
            IsEnabled = r.IsEnabled,
            Description = r.Description ?? string.Empty,
            LastModified = r.LastModified,
            LastModifiedBy = r.LastModifiedBy
        }).ToList();
    }

    private sealed record FeatureFlagRow(
        string Name,
        bool IsEnabled,
        string? Description,
        DateTimeOffset LastModified,
        string? LastModifiedBy);
}
