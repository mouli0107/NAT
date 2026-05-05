using System.Text;
using System.Text.Json;
using HealthDrive.Tracker.Application.AI.Interfaces;
using Microsoft.Extensions.Logging;

namespace HealthDrive.Tracker.Application.Services;

public sealed class AIDepartmentRoutingService : IAIDepartmentRoutingService
{
    private const double ConfidenceThreshold = 0.75;

    private readonly ILlmProvider _llm;
    private readonly IFeatureFlagService _flags;
    private readonly ILogger<AIDepartmentRoutingService> _logger;

    public AIDepartmentRoutingService(
        ILlmProvider llm,
        IFeatureFlagService flags,
        ILogger<AIDepartmentRoutingService> logger)
    {
        _llm = llm;
        _flags = flags;
        _logger = logger;
    }

    // Structured event IDs for compliance queries
    private static readonly EventId EvPhiSkip   = new(1003, "ROUTING_PHI_SKIP");
    private static readonly EventId EvLlmCalled = new(1004, "ROUTING_LLM_CALLED");

    public async Task<DepartmentRoutingResult> SuggestDepartmentAsync(
        string emailSubject,
        string emailBody,
        IReadOnlyList<DepartmentContext> availableDepartments,
        bool containsPhi = false,
        CancellationToken ct = default)
    {
        // PHI gate — never send PHI-flagged content to LLM
        if (containsPhi)
        {
            _logger.LogWarning(EvPhiSkip,
                "Department routing LLM call skipped — email contains suspected PHI. Falling back to keyword rules.");
            return FallbackToRules(emailSubject, string.Empty, availableDepartments);
        }

        if (!await _flags.IsEnabledAsync(FeatureFlags.AiDepartmentRouting, ct))
            return FallbackToRules(emailSubject, emailBody, availableDepartments);

        if (availableDepartments.Count == 0)
            return new DepartmentRoutingResult
            {
                SuggestedDepartmentId = 0,
                SuggestedDepartmentName = "Unassigned",
                RoutingSource = "NoDepartments",
                Confidence = 0
            };

        var request = new LlmCompletionRequest
        {
            SystemPrompt = BuildSystemPrompt(availableDepartments),
            UserContent = $"Subject: {emailSubject}\n\n{emailBody[..Math.Min(2000, emailBody.Length)]}",
            JsonMode = true,
            MaxTokens = 200
        };

        _logger.LogInformation(EvLlmCalled,
            "Routing LLM call initiated — subject length={SubjectLen} body length={BodyLen}",
            emailSubject.Length, emailBody.Length);

        try
        {
            LlmCompletionResponse response = await _llm.CompleteAsync(request, ct);
            var result = ParseResponse(response, availableDepartments);

            // Fall back to deterministic rules if confidence too low
            if (result.Confidence < ConfidenceThreshold)
            {
                _logger.LogInformation("AI routing confidence {Conf} below threshold — falling back to rules.", result.Confidence);
                return FallbackToRules(emailSubject, emailBody, availableDepartments);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Department routing LLM call failed. Falling back to rules.");
            return FallbackToRules(emailSubject, emailBody, availableDepartments);
        }
    }

    private static string BuildSystemPrompt(IReadOnlyList<DepartmentContext> depts)
    {
        var sb = new StringBuilder();
        sb.AppendLine("""
            You are a routing assistant for HealthDrive's internal ticket system.
            HealthDrive delivers specialty healthcare (dental, optometry, podiatry, audiology, behavioral health) to LTC facilities.

            Given an email subject and body, choose the BEST department from the list below.
            Return ONLY valid JSON:
            {
              "departmentId": <number>,
              "departmentName": "<string>",
              "confidence": <0.0–1.0>,
              "reasoning": "<one sentence>"
            }

            Available departments:
            """);

        foreach (var d in depts)
        {
            sb.AppendLine($"  ID={d.Id}: {d.Name}" +
                (d.Description is not null ? $" — {d.Description}" : "") +
                (d.Keywords.Count > 0 ? $" [keywords: {string.Join(", ", d.Keywords)}]" : ""));
        }

        sb.AppendLine("""

            Rules:
            - Set confidence < 0.75 if you are unsure.
            - Never invent department IDs not in the list.
            - NEVER include patient PII in reasoning.
            """);

        return sb.ToString();
    }

    private DepartmentRoutingResult ParseResponse(
        LlmCompletionResponse response,
        IReadOnlyList<DepartmentContext> depts)
    {
        try
        {
            using var doc = JsonDocument.Parse(response.Content);
            var root = doc.RootElement;

            int id = root.TryGetProperty("departmentId", out var idEl) ? idEl.GetInt32() : 0;
            string name = root.TryGetProperty("departmentName", out var nameEl) ? nameEl.GetString() ?? "Unassigned" : "Unassigned";
            double conf = root.TryGetProperty("confidence", out var confEl) ? confEl.GetDouble() : 0.0;
            string? reason = root.TryGetProperty("reasoning", out var rEl) ? rEl.GetString() : null;

            // Validate the returned ID is actually in our list
            bool valid = depts.Any(d => d.Id == id);
            if (!valid)
            {
                _logger.LogWarning("LLM returned unknown departmentId {Id} — ignoring.", id);
                return FallbackToRules(string.Empty, string.Empty, depts);
            }

            return new DepartmentRoutingResult
            {
                SuggestedDepartmentId = id,
                SuggestedDepartmentName = name,
                Confidence = conf,
                Reasoning = reason,
                RoutingSource = "AI",
                ProviderName = response.ProviderName
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse department routing response.");
            return FallbackToRules(string.Empty, string.Empty, depts);
        }
    }

    /// <summary>
    /// Keyword-based deterministic fallback — always returns a result.
    /// Checks department keywords and name fragments against subject + body.
    /// </summary>
    private static DepartmentRoutingResult FallbackToRules(
        string subject,
        string body,
        IReadOnlyList<DepartmentContext> depts)
    {
        if (depts.Count == 0)
            return new DepartmentRoutingResult
            {
                SuggestedDepartmentId = 0,
                SuggestedDepartmentName = "Unassigned",
                RoutingSource = "Rule",
                Confidence = 0
            };

        string haystack = $"{subject} {body}".ToLowerInvariant();

        foreach (var dept in depts)
        {
            bool nameMatch = haystack.Contains(dept.Name.ToLowerInvariant());
            bool keywordMatch = dept.Keywords.Any(k => haystack.Contains(k.ToLowerInvariant()));

            if (nameMatch || keywordMatch)
            {
                return new DepartmentRoutingResult
                {
                    SuggestedDepartmentId = dept.Id,
                    SuggestedDepartmentName = dept.Name,
                    Confidence = 0.6,
                    Reasoning = "Matched by keyword rule",
                    RoutingSource = "Rule"
                };
            }
        }

        // Default to first department (typically "General" or catch-all)
        var fallback = depts[0];
        return new DepartmentRoutingResult
        {
            SuggestedDepartmentId = fallback.Id,
            SuggestedDepartmentName = fallback.Name,
            Confidence = 0.3,
            Reasoning = "No keyword match — defaulted to first department",
            RoutingSource = "TicketTypeDefault"
        };
    }
}
