namespace HealthDrive.Tracker.Application.AI.Interfaces;

// ── Request ──────────────────────────────────────────────────────

public sealed record LlmCompletionRequest
{
    /// <summary>System-level instructions (role, constraints, output format).</summary>
    public required string SystemPrompt { get; init; }

    /// <summary>The actual user content to analyse (email body, contract text, etc.).</summary>
    public required string UserContent { get; init; }

    /// <summary>
    /// When true the model is instructed to return valid JSON only.
    /// Use with a schema in SystemPrompt to get structured extraction.
    /// </summary>
    public bool JsonMode { get; init; } = false;

    /// <summary>Max tokens to generate. Keep small for classification tasks.</summary>
    public int MaxTokens { get; init; } = 800;

    /// <summary>Correlation ID propagated to Azure OpenAI telemetry and audit log.</summary>
    public Guid CorrelationId { get; init; } = Guid.NewGuid();
}

// ── Response ─────────────────────────────────────────────────────

public sealed record LlmCompletionResponse
{
    public required string Content { get; init; }
    public required string ProviderName { get; init; }
    public required string ModelId { get; init; }
    public int PromptTokens { get; init; }
    public int CompletionTokens { get; init; }
    public bool WasTruncated { get; init; }
    public TimeSpan Latency { get; init; }
}

// ── Email Enrichment Result ───────────────────────────────────────

public sealed record EmailEnrichmentResult
{
    /// <summary>AI-suggested ticket subject (cleaned, concise).</summary>
    public string? SuggestedSubject { get; init; }

    /// <summary>AI-detected facility name from email text.</summary>
    public string? DetectedFacilityName { get; init; }

    /// <summary>AI-extracted contact name from email body.</summary>
    public string? ExtractedContactName { get; init; }

    /// <summary>AI-inferred urgency level from tone/keywords.</summary>
    public UrgencyLevel? InferredUrgency { get; init; }

    /// <summary>AI-detected ticket type.</summary>
    public string? DetectedTicketType { get; init; }

    /// <summary>Free-text intent summary from the model.</summary>
    public string? IntentSummary { get; init; }

    /// <summary>0.0 – 1.0. Below 0.6 → fall back to manual fields.</summary>
    public double Confidence { get; init; }

    /// <summary>Whether any suspected PHI was found in the email.</summary>
    public bool ContainsSuspectedPhi { get; init; }

    /// <summary>PHI indicators found (SSN pattern, MRN pattern, DOB, etc.).</summary>
    public IReadOnlyList<string> PhiIndicators { get; init; } = [];

    public string ProviderName { get; init; } = string.Empty;
    public TimeSpan Latency { get; init; }
}

// ── Department Routing Result ────────────────────────────────────

public sealed record DepartmentRoutingResult
{
    public required int SuggestedDepartmentId { get; init; }
    public required string SuggestedDepartmentName { get; init; }

    /// <summary>0.0 – 1.0. Below 0.75 → fall back to deterministic rules.</summary>
    public double Confidence { get; init; }

    /// <summary>One-line reason the model gave for its choice.</summary>
    public string? Reasoning { get; init; }

    /// <summary>Which signal triggered this: "AI", "Rule", "TicketTypeDefault".</summary>
    public required string RoutingSource { get; init; }

    public string ProviderName { get; init; } = string.Empty;
}

// ── PHI Scan Result ──────────────────────────────────────────────

public sealed record PhiScanResult
{
    public bool ContainsSuspectedPhi { get; init; }
    public IReadOnlyList<PhiIndicator> Indicators { get; init; } = [];
}

public sealed record PhiIndicator
{
    public required string Type { get; init; }   // "SSN", "MRN", "DOB", "Phone", "Email", "Name+DOB"
    public required string Pattern { get; init; } // The regex or heuristic that matched
    public required string Sample { get; init; }  // First 6 chars of match for review (redacted)
}

// ── Shared Enum ──────────────────────────────────────────────────

public enum UrgencyLevel { Normal = 0, Urgent = 1, Critical = 2 }
