import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartmentRoutingResult } from './ai.models';

/**
 * Small badge on the ticket detail / create form showing how the
 * department was assigned — "AI", "Rule", or "Manual".
 */
@Component({
  selector: 'hd-ai-routing-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (routing) {
      <span class="routing-badge" [class]="badgeClass()" [title]="routing.reasoning ?? ''">
        @if (routing.routingSource === 'AI') { <span>✦</span> }
        {{ sourceLabel() }}
        @if (routing.confidence > 0) {
          <span class="routing-badge__conf">{{ (routing.confidence * 100) | number:'1.0-0' }}%</span>
        }
      </span>
    }
  `,
  styles: [`
    .routing-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .routing-badge--ai { background: #e6f4ee; color: #1A5C32; border: 1px solid #2A7D4F; }
    .routing-badge--rule { background: #e8f0fe; color: #1a3388; border: 1px solid #4a6cf7; }
    .routing-badge--manual { background: #f5f5f5; color: #555; border: 1px solid #ccc; }
    .routing-badge__conf { opacity: 0.75; font-weight: 400; }
  `]
})
export class AiRoutingBadgeComponent {
  @Input() routing: DepartmentRoutingResult | null = null;

  badgeClass(): string {
    if (!this.routing) return '';
    if (this.routing.routingSource === 'AI') return 'routing-badge routing-badge--ai';
    if (this.routing.routingSource === 'Rule') return 'routing-badge routing-badge--rule';
    return 'routing-badge routing-badge--manual';
  }

  sourceLabel(): string {
    if (!this.routing) return '';
    switch (this.routing.routingSource) {
      case 'AI': return 'AI Routed';
      case 'Rule': return 'Rule Matched';
      case 'TicketTypeDefault': return 'Default';
      default: return 'Manual';
    }
  }
}
