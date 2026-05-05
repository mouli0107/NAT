using HealthDrive.Tracker.Application.AI.Interfaces;
using HealthDrive.Tracker.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthDrive.Tracker.Api.Controllers;

/// <summary>
/// Receives inbound emails forwarded by Azure Communication Services Event Grid webhook.
/// Pipeline: PHI scan → AI enrichment → AI routing → persist draft ticket.
/// The endpoint is protected by a shared webhook secret validated in middleware.
/// </summary>
[ApiController]
[Route("api/email-intake")]
[AllowAnonymous] // Auth handled by WebhookSecretFilter
public sealed class EmailIntakeController : ControllerBase
{
    private readonly IEmailEnrichmentService _enrichment;
    private readonly IAIDepartmentRoutingService _routing;
    private readonly IPhiScannerService _phi;
    private readonly IDepartmentRepository _departments;
    private readonly ITicketRepository _tickets;
    private readonly ILogger<EmailIntakeController> _logger;

    public EmailIntakeController(
        IEmailEnrichmentService enrichment,
        IAIDepartmentRoutingService routing,
        IPhiScannerService phi,
        IDepartmentRepository departments,
        ITicketRepository tickets,
        ILogger<EmailIntakeController> logger)
    {
        _enrichment = enrichment;
        _routing = routing;
        _phi = phi;
        _departments = departments;
        _tickets = tickets;
        _logger = logger;
    }

    /// <summary>
    /// Azure Communication Services sends an Event Grid notification when an email
    /// arrives on a regional inbox (e.g. southeast@tickets.healthdrive.com).
    /// </summary>
    [HttpPost("inbound")]
    [ServiceFilter(typeof(WebhookSecretFilter))]
    public async Task<IActionResult> InboundEmail(
        [FromBody] InboundEmailPayload payload,
        CancellationToken ct)
    {
        _logger.LogInformation("Inbound email received. MessageId={Id} From={From} Subject={Subject}",
            payload.MessageId, payload.From, payload.Subject);

        // 1. PHI pre-scan — single scan result shared by both downstream AI services
        //    so neither service independently re-introduces PHI into the LLM.
        PhiScanResult phiResult = _phi.Scan($"{payload.Subject} {payload.PlainTextBody}");
        if (phiResult.ContainsSuspectedPhi)
        {
            _logger.LogWarning(
                "PHI suspected in email {Id} from {From}. Both enrichment and routing LLM calls will be suppressed. Indicators: {Types}",
                payload.MessageId, payload.From,
                string.Join(", ", phiResult.Indicators.Select(i => i.Type)));
        }

        // 2. AI Email Enrichment (has own PHI gate; containsPhi passed for defence-in-depth)
        EmailEnrichmentResult enrichment = await _enrichment.EnrichAsync(
            payload.From, payload.Subject, payload.PlainTextBody, ct);

        // 3. Load available departments for AI routing context
        var depts = await _departments.GetAllAsync(ct);
        var deptContexts = depts.Select(d => new DepartmentContext
        {
            Id = d.Id,
            Name = d.Name,
            Description = d.Description,
            Keywords = d.Keywords
        }).ToList();

        // 4. AI Department Routing — containsPhi=true forces keyword-only fallback,
        //    ensuring PHI body is never forwarded to the LLM in this service either.
        DepartmentRoutingResult routing = await _routing.SuggestDepartmentAsync(
            payload.Subject, payload.PlainTextBody, deptContexts,
            containsPhi: phiResult.ContainsSuspectedPhi, ct);

        // 5. Persist as draft ticket
        var draftTicket = new DraftTicket
        {
            SourceMessageId = payload.MessageId,
            FromAddress = payload.From,
            RawSubject = payload.Subject,
            SuggestedSubject = enrichment.SuggestedSubject ?? payload.Subject,
            DetectedFacilityName = enrichment.DetectedFacilityName,
            ExtractedContactName = enrichment.ExtractedContactName,
            InferredUrgency = enrichment.InferredUrgency,
            DetectedTicketType = enrichment.DetectedTicketType,
            IntentSummary = enrichment.IntentSummary,
            EnrichmentConfidence = enrichment.Confidence,
            SuggestedDepartmentId = routing.SuggestedDepartmentId,
            SuggestedDepartmentName = routing.SuggestedDepartmentName,
            RoutingConfidence = routing.Confidence,
            RoutingSource = routing.RoutingSource,
            ContainsSuspectedPhi = phiResult.ContainsSuspectedPhi,
            PhiIndicators = phiResult.Indicators.Select(i => i.Type).ToList(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        int ticketId = await _tickets.CreateDraftAsync(draftTicket, ct);

        _logger.LogInformation(
            "Draft ticket {TicketId} created. EnrichmentConf={EConf:F2} RoutingConf={RConf:F2} RoutingSource={RSource}",
            ticketId, enrichment.Confidence, routing.Confidence, routing.RoutingSource);

        return Ok(new { ticketId, enrichmentConfidence = enrichment.Confidence, routingSource = routing.RoutingSource });
    }

    /// <summary>Azure Event Grid sends a validation handshake on first subscription setup.</summary>
    [HttpGet("inbound")]
    public IActionResult ValidationHandshake([FromQuery] string? validationCode) =>
        validationCode is not null
            ? Ok(new { validationResponse = validationCode })
            : Ok("HealthDrive Email Intake endpoint active.");
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public sealed record InboundEmailPayload
{
    public required string MessageId { get; init; }
    public required string From { get; init; }
    public required string Subject { get; init; }
    public required string PlainTextBody { get; init; }
    public string? HtmlBody { get; init; }
    public DateTimeOffset ReceivedAt { get; init; }
    public string? RegionCode { get; init; }
}

public sealed record DraftTicket
{
    public required string SourceMessageId { get; init; }
    public required string FromAddress { get; init; }
    public required string RawSubject { get; init; }
    public required string SuggestedSubject { get; init; }
    public string? DetectedFacilityName { get; init; }
    public string? ExtractedContactName { get; init; }
    public UrgencyLevel? InferredUrgency { get; init; }
    public string? DetectedTicketType { get; init; }
    public string? IntentSummary { get; init; }
    public double EnrichmentConfidence { get; init; }
    public int SuggestedDepartmentId { get; init; }
    public string SuggestedDepartmentName { get; init; } = string.Empty;
    public double RoutingConfidence { get; init; }
    public string RoutingSource { get; init; } = string.Empty;
    public bool ContainsSuspectedPhi { get; init; }
    public IReadOnlyList<string> PhiIndicators { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
}
