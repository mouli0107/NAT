using HealthDrive.Tracker.Application.AI.Interfaces;

namespace HealthDrive.Tracker.Application.AI.Interfaces;

/// <summary>
/// Scans free-text (email body, notes) for suspected PHI patterns before any
/// content is forwarded to the LLM. A positive hit causes the pipeline to
/// redact or halt per the configured policy.
/// </summary>
public interface IPhiScannerService
{
    /// <summary>
    /// Returns immediately — pure regex, no I/O, no external calls.
    /// Safe to call on the hot email-intake path.
    /// </summary>
    PhiScanResult Scan(string text);
}
