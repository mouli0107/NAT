import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailEnrichmentResult } from './ai.models';

/**
 * Compact badge shown on the ticket create/detail view when AI enrichment
 * is available. Collapses to nothing when enrichment is disabled or confidence
 * is below threshold.
 */
@Component({
  selector: 'hd-ai-enrichment-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (enrichment && enrichment.confidence >= 0.6) {
      <div class="ai-badge" [class.ai-badge--phi]="enrichment.containsSuspectedPhi">
        <span class="ai-badge__icon">✦</span>
        <span class="ai-badge__label">AI Suggested</span>
        <span class="ai-badge__conf">{{ (enrichment.confidence * 100) | number:'1.0-0' }}%</span>
        @if (enrichment.containsSuspectedPhi) {
          <span class="ai-badge__phi-warn" title="PHI detected — AI enrichment skipped">PHI</span>
        }
      </div>
    }
  `,
  styles: [`
    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #e6f4ee;
      border: 1px solid #2A7D4F;
      font-size: 11px;
      font-weight: 600;
      color: #1A5C32;
    }
    .ai-badge--phi {
      background: #fff3cd;
      border-color: #E8A020;
      color: #7d5a00;
    }
    .ai-badge__icon { font-size: 10px; }
    .ai-badge__conf { opacity: 0.75; }
    .ai-badge__phi-warn {
      background: #E8A020;
      color: #fff;
      border-radius: 4px;
      padding: 0 4px;
    }
  `]
})
export class AiEnrichmentBadgeComponent {
  @Input() enrichment: EmailEnrichmentResult | null = null;
}
