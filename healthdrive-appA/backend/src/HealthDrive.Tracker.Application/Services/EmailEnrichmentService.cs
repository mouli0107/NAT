using System.Text.Json;
using HealthDrive.Tracker.Application.AI.Interfaces;
using Microsoft.Extensions.Logging;

namespace HealthDrive.Tracker.Application.Services;

public sealed class EmailEnrichmentService : IEmailEnrichmentService
{
    // Truncate body before sending to LLM — protects cost and latency.
    // 3000 chars ≈ ~750 tokens, well within 4o-mini context window.
    private const int MaxBodyChars = 3_000;

    // Structured event IDs so compliance teams can query PHI gate events by ID
    private static readonly EventId EvPhiBlocked = new(1001, "PHI_GATE_BLOCKED");
    private static readonly EventId EvPhiPassed  = new(1002, "PHI_GATE_PASSED");

    private readonly ILlmProvider _llm;
    private readonly IFeatureFlagService _flags;
    private readonly IPhiScannerService _phi;
    private readonly ILogger<EmailEnrichmentService> _logger;

    public EmailEnrichmentService(
        ILlmProvider llm,
        IFeatureFlagService flags,
        IPhiScannerService phi,
        ILogger<EmailEnrichmentService> logger)
    {
        _llm = llm;
        _flags = flags;
        _phi = phi;
        _logger = logger;
    }

    public async Task<EmailEnrichmentResult> EnrichAsync(
        string fromAddress,
        string subject,
        string bodyText,
        CancellationToken ct = default)
    {
        if (!await _flags.IsEnabledAsync(FeatureFlags.AiEmailEnrichment, ct))
            return new EmailEnrichmentResult { Confidence = 0, ProviderName = "Disabled" };

        // PHI gate — scan BOTH subject and body before any text leaves the system.
        // Subject lines can contain patient names, DOBs, or MRNs (e.g. "Re: Patient Jane Doe DOB 01/15/1945").
        PhiScanResult phiResult = _phi.Scan($"{subject} {bodyText}");
        if (phiResult.ContainsSuspectedPhi)
        {
            _logger.LogWarning(EvPhiBlocked,
                "PHI_GATE_BLOCKED: email from {From} — subject+body contain suspected PHI. " +
                "Content will NOT be sent to LLM. Indicators: {Types}",
                fromAddress,
                string.Join(", ", phiResult.Indicators.Select(i => i.Type)));

            return new EmailEnrichmentResult
            {
                Confidence = 0,
                ContainsSuspectedPhi = true,
                PhiIndicators = phiResult.Indicators.Select(i => i.Type).ToList(),
                ProviderName = _llm.ProviderName
            };
        }

        _logger.LogInformation(EvPhiPassed,
            "PHI_GATE_PASSED: email from {From} cleared PHI scan — proceeding to LLM enrichment.",
            fromAddress);

        string safeBody = bodyText.Length > MaxBodyChars
            ? bodyText[..MaxBodyChars] + "\n[TRUNCATED]"
            : bodyText;

        var request = new LlmCompletionRequest
        {
            SystemPrompt = BuildSystemPrompt(),
            UserContent = $"Subject: {subject}\n\n{safeBody}",
            JsonMode = true,
            MaxTokens = 500
        };

        try
        {
            LlmCompletionResponse response = await _llm.CompleteAsync(request, ct);
            return ParseResponse(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email enrichment LLM call failed. Returning empty result.");
            return new EmailEnrichmentResult { Confidence = 0, ProviderName = _llm.ProviderName };
        }
    }

    private static string BuildSystemPrompt() =>
        """
        You are an AI assistant for HealthDrive, a specialty healthcare company serving long-term care (LTC) facilities.
        HealthDrive provides dental, optometry, podiatry, audiology, and behavioral health services on-site at nursing homes and assisted living facilities.

        Analyse the inbound email and extract the following fields. Return ONLY valid JSON with this exact schema:
        {
          "suggestedSubject": "string | null — concise 5-10 word ticket subject",
          "detectedFacilityName": "string | null — LTC facility name if mentioned",
          "extractedContactName": "string | null — name of the person who sent or is mentioned",
          "inferredUrgency": 0 | 1 | 2,   // 0=Normal, 1=Urgent, 2=Critical
          "detectedTicketType": "string | null — e.g. Scheduling, Billing, Clinical, Equipment, Complaint, Other",
          "intentSummary": "string | null — one sentence describing what the sender needs",
          "confidence": 0.0   // 0.0–1.0, your confidence in the above extraction
        }

        Rules:
        - NEVER include patient names, SSNs, DOBs, MRNs, or any resident PII in the output.
        - If the email appears to contain patient health information, set confidence to 0.0 and return nulls for all string fields.
        - InferredUrgency = 2 (Critical) only when words like "emergency", "urgent", "immediate", "life safety" appear.
        - InferredUrgency = 1 (Urgent) for "ASAP", "today", "rush", "priority".
        - TicketType should be one of: Scheduling, Billing, Clinical, Equipment, IT, Compliance, Complaint, General.
        """;

    private EmailEnrichmentResult ParseResponse(LlmCompletionResponse response)
    {
        try
        {
            using var doc = JsonDocument.Parse(response.Content);
            var root = doc.RootElement;

            return new EmailEnrichmentResult
            {
                SuggestedSubject = GetString(root, "suggestedSubject"),
                DetectedFacilityName = GetString(root, "detectedFacilityName"),
                ExtractedContactName = GetString(root, "extractedContactName"),
                InferredUrgency = root.TryGetProperty("inferredUrgency", out var urgEl)
                    ? (UrgencyLevel)urgEl.GetInt32()
                    : null,
                DetectedTicketType = GetString(root, "detectedTicketType"),
                IntentSummary = GetString(root, "intentSummary"),
                Confidence = root.TryGetProperty("confidence", out var confEl)
                    ? confEl.GetDouble()
                    : 0.0,
                ContainsSuspectedPhi = false,
                ProviderName = response.ProviderName,
                Latency = response.Latency
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse LLM enrichment response. Raw: {Raw}", response.Content[..Math.Min(200, response.Content.Length)]);
            return new EmailEnrichmentResult { Confidence = 0, ProviderName = response.ProviderName };
        }
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;
}
