import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailEnrichmentResult, URGENCY_LABELS, UrgencyLevel } from './ai.models';

/**
 * Expandable panel on the Create Ticket form showing AI-suggested field values.
 * Emits `applyField` events so the parent form can pre-fill specific fields
 * without coupling this component to any reactive form library.
 */
@Component({
  selector: 'hd-ai-enrichment-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (enrichment && enrichment.confidence >= 0.6 && !enrichment.containsSuspectedPhi) {
      <div class="enrichment-panel">
        <div class="enrichment-panel__header" (click)="expanded = !expanded">
          <span class="enrichment-panel__icon">✦</span>
          <span>AI Suggestions</span>
          <span class="enrichment-panel__conf">{{ (enrichment.confidence * 100) | number:'1.0-0' }}% confidence</span>
          <span class="enrichment-panel__toggle">{{ expanded ? '▲' : '▼' }}</span>
        </div>

        @if (expanded) {
          <div class="enrichment-panel__body">
            @if (enrichment.suggestedSubject) {
              <div class="enrichment-row">
                <span class="enrichment-row__label">Subject</span>
                <span class="enrichment-row__value">{{ enrichment.suggestedSubject }}</span>
                <button class="enrichment-row__apply" (click)="apply('subject', enrichment!.suggestedSubject!)">Use</button>
              </div>
            }
            @if (enrichment.detectedFacilityName) {
              <div class="enrichment-row">
                <span class="enrichment-row__label">Facility</span>
                <span class="enrichment-row__value">{{ enrichment.detectedFacilityName }}</span>
                <button class="enrichment-row__apply" (click)="apply('facilityName', enrichment!.detectedFacilityName!)">Use</button>
              </div>
            }
            @if (enrichment.extractedContactName) {
              <div class="enrichment-row">
                <span class="enrichment-row__label">Contact</span>
                <span class="enrichment-row__value">{{ enrichment.extractedContactName }}</span>
                <button class="enrichment-row__apply" (click)="apply('contactName', enrichment!.extractedContactName!)">Use</button>
              </div>
            }
            @if (enrichment.inferredUrgency !== null && enrichment.inferredUrgency !== undefined) {
              <div class="enrichment-row">
                <span class="enrichment-row__label">Urgency</span>
                <span class="enrichment-row__value" [class]="urgencyClass(enrichment.inferredUrgency)">
                  {{ urgencyLabel(enrichment.inferredUrgency) }}
                </span>
                <button class="enrichment-row__apply" (click)="apply('urgency', String(enrichment!.inferredUrgency))">Use</button>
              </div>
            }
            @if (enrichment.detectedTicketType) {
              <div class="enrichment-row">
                <span class="enrichment-row__label">Type</span>
                <span class="enrichment-row__value">{{ enrichment.detectedTicketType }}</span>
                <button class="enrichment-row__apply" (click)="apply('ticketType', enrichment!.detectedTicketType!)">Use</button>
              </div>
            }
            @if (enrichment.intentSummary) {
              <div class="enrichment-row enrichment-row--summary">
                <span class="enrichment-row__label">Intent</span>
                <span class="enrichment-row__value enrichment-row__value--italic">{{ enrichment.intentSummary }}</span>
              </div>
            }
            <div class="enrichment-panel__footer">
              <button class="btn-apply-all" (click)="applyAll()">Apply all suggestions</button>
              <span class="enrichment-panel__provider">via {{ enrichment.providerName }}</span>
            </div>
          </div>
        }
      </div>
    }

    @if (enrichment?.containsSuspectedPhi) {
      <div class="phi-warning">
        <span>⚠</span> PHI suspected in email — AI suggestions disabled. Please review manually.
      </div>
    }
  `,
  styles: [`
    .enrichment-panel {
      border: 1px solid #2A7D4F;
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      font-size: 13px;
    }
    .enrichment-panel__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #e6f4ee;
      cursor: pointer;
      font-weight: 600;
      color: #1A5C32;
    }
    .enrichment-panel__conf { margin-left: auto; opacity: 0.7; font-weight: 400; }
    .enrichment-panel__toggle { font-size: 10px; }
    .enrichment-panel__body { padding: 8px 12px; }
    .enrichment-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .enrichment-row--summary { align-items: flex-start; }
    .enrichment-row__label {
      min-width: 70px;
      font-weight: 600;
      color: #555;
    }
    .enrichment-row__value { flex: 1; }
    .enrichment-row__value--italic { font-style: italic; color: #666; }
    .enrichment-row__apply {
      padding: 2px 8px;
      border-radius: 4px;
      background: #2A7D4F;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 11px;
    }
    .enrichment-panel__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      margin-top: 4px;
    }
    .btn-apply-all {
      padding: 4px 12px;
      border-radius: 6px;
      background: #1A5C32;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .enrichment-panel__provider { font-size: 11px; color: #999; }
    .urgency-urgent { color: #E8A020; font-weight: 700; }
    .urgency-critical { color: #DC3545; font-weight: 700; }
    .phi-warning {
      padding: 8px 12px;
      background: #fff3cd;
      border: 1px solid #E8A020;
      border-radius: 6px;
      color: #7d5a00;
      font-size: 13px;
      margin-bottom: 12px;
    }
  `]
})
export class AiEnrichmentPanelComponent {
  @Input() enrichment: EmailEnrichmentResult | null = null;
  @Output() applyField = new EventEmitter<{ field: string; value: string }>();

  expanded = true;
  readonly String = String;

  apply(field: string, value: string): void {
    this.applyField.emit({ field, value });
  }

  applyAll(): void {
    const e = this.enrichment!;
    if (e.suggestedSubject) this.apply('subject', e.suggestedSubject);
    if (e.detectedFacilityName) this.apply('facilityName', e.detectedFacilityName);
    if (e.extractedContactName) this.apply('contactName', e.extractedContactName);
    if (e.inferredUrgency !== null && e.inferredUrgency !== undefined)
      this.apply('urgency', String(e.inferredUrgency));
    if (e.detectedTicketType) this.apply('ticketType', e.detectedTicketType);
  }

  urgencyLabel(u: UrgencyLevel): string {
    return URGENCY_LABELS[u];
  }

  urgencyClass(u: UrgencyLevel): string {
    if (u === UrgencyLevel.Urgent) return 'urgency-urgent';
    if (u === UrgencyLevel.Critical) return 'urgency-critical';
    return '';
  }
}
