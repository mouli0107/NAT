using HealthDrive.Tracker.Application.AI.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthDrive.Tracker.Api.Controllers;

/// <summary>
/// Admin API to view and toggle AI feature flags without a deployment.
/// Restricted to the "Admin" role — never exposed to end users.
/// </summary>
[ApiController]
[Route("api/admin/feature-flags")]
[Authorize(Roles = "Admin")]
public sealed class FeatureFlagsController : ControllerBase
{
    private readonly IFeatureFlagService _flags;

    public FeatureFlagsController(IFeatureFlagService flags) => _flags = flags;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var all = await _flags.GetAllAsync(ct);
        return Ok(all);
    }

    [HttpPut("{flagName}")]
    public async Task<IActionResult> Toggle(
        string flagName,
        [FromBody] ToggleFlagRequest body,
        CancellationToken ct)
    {
        // Only allow well-known flag names — prevents injection of arbitrary keys
        string[] known =
        [
            FeatureFlags.AiEmailEnrichment,
            FeatureFlags.AiDepartmentRouting,
            FeatureFlags.AiPhiScanning
        ];

        if (!known.Contains(flagName, StringComparer.OrdinalIgnoreCase))
            return BadRequest($"Unknown feature flag: {flagName}");

        string changedBy = User.Identity?.Name ?? "unknown";
        await _flags.SetAsync(flagName, body.Enabled, changedBy, ct);

        return Ok(new { flagName, enabled = body.Enabled, changedBy });
    }
}

public sealed record ToggleFlagRequest(bool Enabled);
