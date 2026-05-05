import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FeatureFlag, FEATURE_FLAG_NAMES } from '../ai/ai.models';

/**
 * Admin screen for toggling AI feature flags without a deployment.
 * Calls PUT /api/admin/feature-flags/{name} with { enabled: bool }.
 */
@Component({
  selector: 'hd-feature-flags',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ff-page">
      <h2 class="ff-page__title">AI Feature Flags</h2>
      <p class="ff-page__subtitle">
        Toggle AI features on or off instantly. Changes take effect within 30 seconds.
      </p>

      @if (loading) {
        <div class="ff-loading">Loading flags…</div>
      }

      @if (error) {
        <div class="ff-error">{{ error }}</div>
      }

      <div class="ff-list">
        @for (flag of flags; track flag.name) {
          <div class="ff-card">
            <div class="ff-card__info">
              <div class="ff-card__name">{{ friendlyName(flag.name) }}</div>
              <div class="ff-card__desc">{{ flag.description }}</div>
              <div class="ff-card__meta">
                Last changed: {{ flag.lastModified | date:'medium' }}
                @if (flag.lastModifiedBy) { · by {{ flag.lastModifiedBy }} }
              </div>
            </div>
            <label class="ff-toggle" [title]="flag.isEnabled ? 'Click to disable' : 'Click to enable'">
              <input
                type="checkbox"
                [checked]="flag.isEnabled"
                [disabled]="saving === flag.name"
                (change)="toggle(flag)"
              />
              <span class="ff-toggle__slider"></span>
            </label>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ff-page { max-width: 700px; margin: 0 auto; padding: 24px; }
    .ff-page__title { font-size: 22px; font-weight: 700; color: #1A3350; margin-bottom: 4px; }
    .ff-page__subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
    .ff-loading, .ff-error { padding: 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
    .ff-loading { background: #f0f4ff; color: #1a3388; }
    .ff-error { background: #fde8e8; color: #c00; }
    .ff-list { display: flex; flex-direction: column; gap: 12px; }
    .ff-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }
    .ff-card__name { font-weight: 700; color: #1A3350; margin-bottom: 4px; }
    .ff-card__desc { font-size: 13px; color: #555; margin-bottom: 4px; }
    .ff-card__meta { font-size: 11px; color: #999; }

    /* Toggle switch */
    .ff-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
    .ff-toggle input { opacity: 0; width: 0; height: 0; }
    .ff-toggle__slider {
      position: absolute; inset: 0;
      background: #ccc; border-radius: 24px; cursor: pointer;
      transition: background .2s;
    }
    .ff-toggle__slider::before {
      content: '';
      position: absolute;
      height: 18px; width: 18px;
      left: 3px; bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform .2s;
    }
    .ff-toggle input:checked + .ff-toggle__slider { background: #2A7D4F; }
    .ff-toggle input:checked + .ff-toggle__slider::before { transform: translateX(20px); }
    .ff-toggle input:disabled + .ff-toggle__slider { opacity: .6; cursor: not-allowed; }
  `]
})
export class FeatureFlagsComponent implements OnInit {
  flags: FeatureFlag[] = [];
  loading = false;
  saving: string | null = null;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.http.get<FeatureFlag[]>('/api/admin/feature-flags').subscribe({
      next: flags => { this.flags = flags; this.loading = false; },
      error: () => { this.error = 'Failed to load feature flags.'; this.loading = false; }
    });
  }

  toggle(flag: FeatureFlag): void {
    this.saving = flag.name;
    this.http.put(`/api/admin/feature-flags/${flag.name}`, { enabled: !flag.isEnabled }).subscribe({
      next: () => {
        this.saving = null;
        this.load();
      },
      error: () => {
        this.saving = null;
        this.error = `Failed to update ${flag.name}.`;
      }
    });
  }

  friendlyName(name: string): string {
    switch (name) {
      case FEATURE_FLAG_NAMES.aiEmailEnrichment: return 'AI Email Enrichment';
      case FEATURE_FLAG_NAMES.aiDepartmentRouting: return 'AI Department Routing';
      case FEATURE_FLAG_NAMES.aiPhiScanning: return 'AI PHI Scanning';
      default: return name;
    }
  }
}
