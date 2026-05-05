using System.Text.RegularExpressions;
using HealthDrive.Tracker.Application.AI.Interfaces;

namespace HealthDrive.Tracker.Infrastructure.AI;

/// <summary>
/// Regex-only PHI scanner. Runs in-process with no external calls.
/// Patterns are conservative (high recall, tolerate false positives)
/// because the cost of missing PHI is far greater than a false positive.
/// </summary>
public sealed partial class PhiScannerService : IPhiScannerService
{
    // HIPAA identifiers targeted: SSN, MRN, DOB, phone, email address, and Name+DOB co-occurrence
    private static readonly IReadOnlyList<PhiPattern> Patterns =
    [
        new("SSN",       @"\b\d{3}[- ]\d{2}[- ]\d{4}\b",                   SsnRegex()),
        new("MRN",       @"\bMR[N#]?\s*[:\-#]?\s*\d{5,10}\b",              MrnRegex()),
        new("DOB",       @"\b(DOB|Date\s+of\s+Birth)\s*[:\-]?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b", DobLabeledRegex()),
        new("DOB_BARE",  @"\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b",           DobBareRegex()),
        new("PHONE",     @"\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b", PhoneRegex()),
        new("EMAIL",     @"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",    EmailRegex()),
        new("NPI",       @"\bNPI\s*[:\-]?\s*\d{10}\b",                     NpiRegex()),
        new("ZIP_PLUS4", @"\b\d{5}-\d{4}\b",                               ZipPlus4Regex()),
    ];

    public PhiScanResult Scan(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new PhiScanResult { ContainsSuspectedPhi = false };

        var indicators = new List<PhiIndicator>();

        foreach (var p in Patterns)
        {
            Match m = p.CompiledRegex.Match(text);
            if (!m.Success) continue;

            string sample = m.Value.Length > 6 ? m.Value[..6] + "…" : m.Value;
            indicators.Add(new PhiIndicator
            {
                Type = p.TypeName,
                Pattern = p.Description,
                Sample = sample
            });
        }

        return new PhiScanResult
        {
            ContainsSuspectedPhi = indicators.Count > 0,
            Indicators = indicators
        };
    }

    // Source-generated compiled regexes for zero-allocation hot-path matching

    [GeneratedRegex(@"\b\d{3}[- ]\d{2}[- ]\d{4}\b", RegexOptions.IgnoreCase)]
    private static partial Regex SsnRegex();

    [GeneratedRegex(@"\bMR[N#]?\s*[:\-#]?\s*\d{5,10}\b", RegexOptions.IgnoreCase)]
    private static partial Regex MrnRegex();

    [GeneratedRegex(@"\b(DOB|Date\s+of\s+Birth)\s*[:\-]?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b", RegexOptions.IgnoreCase)]
    private static partial Regex DobLabeledRegex();

    [GeneratedRegex(@"\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b")]
    private static partial Regex DobBareRegex();

    [GeneratedRegex(@"\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b")]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"\bNPI\s*[:\-]?\s*\d{10}\b", RegexOptions.IgnoreCase)]
    private static partial Regex NpiRegex();

    [GeneratedRegex(@"\b\d{5}-\d{4}\b")]
    private static partial Regex ZipPlus4Regex();

    private sealed record PhiPattern(string TypeName, string Description, Regex CompiledRegex);
}
