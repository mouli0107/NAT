namespace HealthDrive.Tracker.Application.AI.Interfaces;

/// <summary>
/// Analyses inbound email text and returns structured fields to pre-fill
/// the ticket creation form. Gracefully degrades to null results when the
/// AI_EMAIL_ENRICHMENT feature flag is off or the LLM call fails.
/// </summary>
public interface IEmailEnrichmentService
{
    /// <param name="fromAddress">Sender email address — used as context hint only, never sent to LLM.</param>
    /// <param name="subject">Email subject line.</param>
    /// <param name="bodyText">Plain-text email body. Must be pre-processed to remove any HTML.</param>
    Task<EmailEnrichmentResult> EnrichAsync(
        string fromAddress,
        string subject,
        string bodyText,
        CancellationToken ct = default);
}
