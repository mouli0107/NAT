import { useState } from 'react';
import { Zap, AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

export interface StandardAggEntry {
  ruleId: string;
  ruleName: string;
  severity: 'Critical' | 'Warning' | 'Info';
  fileCount: number;
  violationCount: number;
  fixedCount: number;
}

export interface BulkFixProgress {
  status: 'running' | 'done';
  fixed: number;
  failed: number;
  total: number;
  currentFile: string;
}

interface CommonIssuesProps {
  entries: StandardAggEntry[];
  totalFilesReviewed: number;
  sessionId: string | null;
  reviewComplete: boolean;
  bulkProgress: Record<string, BulkFixProgress>;
  onBulkFix: (standardId: string) => void;
}

const SEVERITY_COLORS = {
  Critical: { text: '#FF8080', bg: '#FF444420', border: '#FF444440', dot: '#FF4444' },
  Warning:  { text: '#FFC080', bg: '#FFA50020', border: '#FFA50040', dot: '#FFA500' },
  Info:     { text: '#80D4FF', bg: '#00BFFF15', border: '#00BFFF30', dot: '#00BFFF' },
};

type SeverityFilter = 'All' | 'Critical' | 'Warning';
type SortMode = 'files' | 'violations';

export function CommonIssues({
  entries,
  totalFilesReviewed,
  sessionId,
  reviewComplete,
  bulkProgress,
  onBulkFix,
}: CommonIssuesProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('files');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = entries
    .filter(e => severityFilter === 'All' || e.severity === severityFilter)
    .sort((a, b) =>
      sortMode === 'files'
        ? b.fileCount - a.fileCount
        : b.violationCount - a.violationCount,
    );

  const maxFiles = filtered[0]?.fileCount ?? 1;
  const totalViolations = entries.reduce((s, e) => s + e.violationCount, 0);
  const totalFixed = entries.reduce((s, e) => s + e.fixedCount, 0);

  const toggleExpand = (ruleId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
      return next;
    });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <CheckCircle className="w-8 h-8 mb-3" style={{ color: '#00A896' }} />
        <div className="text-sm font-semibold" style={{ color: '#A0C0D8' }}>
          {totalFilesReviewed === 0 ? 'Review in progress…' : 'No violations found'}
        </div>
        <div className="text-xs mt-1" style={{ color: '#4A6A8A' }}>
          {totalFilesReviewed > 0
            ? 'All files pass all standards'
            : 'Common issues will appear here as files are reviewed'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center gap-4 px-3 py-2 text-xs flex-shrink-0 border-b"
        style={{ background: '#0D1F3C', borderColor: '#1E3A5F' }}
      >
        <span style={{ color: '#4A6A8A' }}>
          <span className="font-semibold" style={{ color: '#FF8080' }}>{totalViolations.toLocaleString()}</span> violations
        </span>
        {totalFixed > 0 && (
          <span style={{ color: '#4A6A8A' }}>
            <span className="font-semibold" style={{ color: '#00A896' }}>{totalFixed.toLocaleString()}</span> fixed
          </span>
        )}
        <span style={{ color: '#4A6A8A' }}>
          <span className="font-semibold" style={{ color: '#A0C0D8' }}>{entries.length}</span> standards affected
        </span>
      </div>

      {/* Filter + sort controls */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0 border-b"
        style={{ borderColor: '#1E3A5F', background: '#0A1628' }}
      >
        <div className="flex gap-1">
          {(['All', 'Critical', 'Warning'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{
                background: severityFilter === f
                  ? (f === 'Critical' ? '#FF444430' : f === 'Warning' ? '#FFA50030' : '#00BFFF20')
                  : 'transparent',
                color: severityFilter === f
                  ? (f === 'Critical' ? '#FF8080' : f === 'Warning' ? '#FFC080' : '#00BFFF')
                  : '#4A6A8A',
                border: `1px solid ${severityFilter === f
                  ? (f === 'Critical' ? '#FF444450' : f === 'Warning' ? '#FFA50050' : '#00BFFF40')
                  : 'transparent'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['files', 'violations'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortMode(s)}
              className="px-2 py-0.5 rounded text-[10px] transition-colors"
              style={{
                color: sortMode === s ? '#00BFFF' : '#4A6A8A',
                background: sortMode === s ? '#00BFFF15' : 'transparent',
              }}
            >
              by {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(entry => {
          const colors = SEVERITY_COLORS[entry.severity];
          const bar = maxFiles > 0 ? Math.round((entry.fileCount / maxFiles) * 100) : 0;
          const pct = totalFilesReviewed > 0
            ? Math.round((entry.fileCount / totalFilesReviewed) * 100)
            : 0;
          const progress = bulkProgress[entry.ruleId];
          const isExpanded = expanded.has(entry.ruleId);
          const allFixed = entry.fixedCount >= entry.violationCount;

          return (
            <div
              key={entry.ruleId}
              className="border-b"
              style={{ borderColor: '#1E3A5F' }}
            >
              {/* Main row */}
              <div
                className="px-3 py-2"
                style={{ background: '#0A1628' }}
              >
                <div className="flex items-start gap-2">
                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(entry.ruleId)}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: '#4A6A8A' }}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3" />
                      : <ChevronRight className="w-3 h-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Standard ID + name */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        {entry.ruleId}
                      </span>
                      <span className="text-xs font-medium truncate" style={{ color: '#C0D8F0' }}>
                        {entry.ruleName}
                      </span>
                      {allFixed && (
                        <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#00A896' }}>✓ Fixed</span>
                      )}
                    </div>

                    {/* Bar + counts */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ background: '#1E3A5F' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${bar}%`, background: allFixed ? '#00A896' : colors.dot }}
                        />
                      </div>
                      <span className="text-[10px] flex-shrink-0" style={{ color: '#7A9CC0' }}>
                        <span className="font-semibold" style={{ color: colors.text }}>
                          {entry.fileCount.toLocaleString()}
                        </span>{' '}files ({pct}%)
                      </span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: '#4A6A8A' }}>
                        {entry.violationCount.toLocaleString()} violations
                      </span>
                    </div>

                    {/* Bulk fix controls */}
                    {!progress && !allFixed && sessionId && (
                      <div className="mt-1.5">
                        <button
                          onClick={() => onBulkFix(entry.ruleId)}
                          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                          style={{
                            background: '#00BFFF15',
                            color: '#00BFFF',
                            border: '1px solid #00BFFF30',
                          }}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          Fix All {entry.fileCount} files
                        </button>
                      </div>
                    )}

                    {/* Bulk fix progress */}
                    {progress && progress.status === 'running' && (
                      <div className="mt-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1E3A5F' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${progress.total > 0 ? Math.round(((progress.fixed + progress.failed) / progress.total) * 100) : 0}%`,
                                background: '#00BFFF',
                              }}
                            />
                          </div>
                          <span className="text-[10px] flex-shrink-0" style={{ color: '#7A9CC0' }}>
                            {progress.fixed + progress.failed}/{progress.total}
                          </span>
                        </div>
                        {progress.currentFile && (
                          <div className="text-[10px] mt-0.5 truncate" style={{ color: '#4A6A8A' }}>
                            {progress.currentFile.split('/').pop()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bulk fix done */}
                    {progress && progress.status === 'done' && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                        {progress.fixed > 0 && (
                          <span style={{ color: '#00A896' }}>
                            <CheckCircle className="inline w-3 h-3 mr-0.5" />
                            {progress.fixed} fixed
                          </span>
                        )}
                        {progress.failed > 0 && (
                          <span style={{ color: '#FF8080' }}>
                            {progress.failed} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Severity icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {entry.severity === 'Critical'
                      ? <AlertCircle className="w-3.5 h-3.5" style={{ color: '#FF4444' }} />
                      : <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#FFA500' }} />}
                  </div>
                </div>
              </div>

              {/* Expanded: description */}
              {isExpanded && (
                <div
                  className="px-8 pb-2 text-[10px] leading-relaxed"
                  style={{ color: '#7A9CC0', background: '#0D1F3C', borderTop: '1px solid #1E3A5F20' }}
                >
                  <div className="font-semibold mb-0.5" style={{ color: '#A0C0D8' }}>What to fix:</div>
                  <div>{getRuleDescription(entry.ruleId)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Map rule IDs to their "what to look for" descriptions for the expanded view
function getRuleDescription(ruleId: string): string {
  const DESCRIPTIONS: Record<string, string> = {
    S01: 'Look for [HttpPut] on any action method. PATCH DTOs must inherit FieldStatusDto.',
    S02: 'Look for DbContext injected outside Infrastructure/Repository layer.',
    S03: 'Look for .Update() calls on DbSet — use load + modify + SaveChangesAsync instead.',
    S04: 'TenantId must come from IApplicationIdentity, not from request body.',
    S05: 'Replace ICurrentUserService / IIdentityService with IApplicationIdentity.',
    S06: 'Use JsonApiFeatures for paging, sorting, includes. Implement FilterCriteriaBase.',
    S07: 'All .csproj files must target net10.0.',
    S08: 'Controllers call Services only. Services call Repositories only. No layer-skipping.',
    S09: 'Avoid new keyword on services — use DI constructor injection.',
    S10: 'Use PostgreSQL only. No UseSqlServer, UseSqlite, UseMySql.',
    S11: 'Use EF Core Code-First. No raw ADO.NET, Dapper, or manual SQL strings.',
    S12: 'EF entities and DbContext must stay in Repository/Infrastructure project.',
    S13: 'Inject DbContext directly. Do not use IDbContextFactory.',
    S14: 'Use extension methods for mapping. AutoMapper is prohibited.',
    S15: 'Controllers must return JSON:API wrapped responses.',
    S16: 'Separate DTOs for Read, Create, Update, and Filter operations.',
    S17: 'DTOs must inherit from Insurity Framework JSON:API base classes.',
    S18: 'Filter classes must inherit FilterCriteriaBase. Use filter[field] convention.',
    S19: 'Services must not use HttpContext or return IActionResult.',
    S20: 'Services must not call SaveChangesAsync directly.',
    S21: 'Use static extension methods (entity.ToDto()) for all mapping.',
    S22: 'Controllers must delegate all business logic to services.',
    S23: 'Controllers must inherit InsurityController, not ControllerBase.',
    S24: 'Use FluentValidation AbstractValidator<T>. No DataAnnotations on DTOs.',
    S25: 'Routes: lowercase, plural, no hyphens (e.g. /accounts, not /Account).',
    S26: 'Configure Swagger with Insurity JSON:API extensions and XML comments.',
    S27: 'Use JWT Bearer via Insurity security extensions. Add [Authorize] where needed.',
    S28: 'Use IApplicationIdentity in non-web layers instead of HttpContext.',
    S29: 'Tenant filtering belongs in Repository layer, not Service or Controller.',
    S30: 'Apply HasQueryFilter for tenant on all entities in DbContext.',
    S31: 'Auto-populate CreatedAt, UpdatedAt, CreatedBy, UpdatedBy in SaveChangesAsync.',
    S32: 'Use IApplicationIdentity.GetName() / GetEmail() / GetTenant() — not direct Claims access.',
    S33: 'Log to stdout/console only. No file sinks, DB sinks, or Windows Event Log.',
    S34: 'Use [LoggerMessage] source generator. No string interpolation in log calls.',
    S35: 'Use message templates: _logger.LogInformation("Processing {Id}", id).',
    S36: 'Add /// <summary> XML documentation to all public types and members.',
    S37: 'Call UseSnakeCaseNamingConvention() in DbContext OnModelCreating.',
    S38: 'Prefer EF Core conventions and data annotations over Fluent API.',
    S39: 'Configure many-to-many relationships using EF Core UsingEntity().',
    S40: 'No connection string credentials in appsettings.json or .cs files.',
    S41: 'Register AddHealthChecks() and map app.MapHealthChecks("/health").',
    S42: 'Enable UseJsonApi(), UseSwagger(), UseAuthentication(), UseAuthorization() in Program.cs.',
  };
  return DESCRIPTIONS[ruleId] ?? 'See coding standards documentation.';
}
