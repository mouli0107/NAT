export interface EmailEnrichmentResult {
  suggestedSubject: string | null;
  detectedFacilityName: string | null;
  extractedContactName: string | null;
  inferredUrgency: UrgencyLevel | null;
  detectedTicketType: string | null;
  intentSummary: string | null;
  confidence: number;
  containsSuspectedPhi: boolean;
  phiIndicators: string[];
  providerName: string;
  latencyMs: number;
}

export interface DepartmentRoutingResult {
  suggestedDepartmentId: number;
  suggestedDepartmentName: string;
  confidence: number;
  reasoning: string | null;
  routingSource: 'AI' | 'Rule' | 'TicketTypeDefault' | 'Disabled' | 'NoDepartments';
  providerName: string;
}

export interface FeatureFlag {
  name: string;
  isEnabled: boolean;
  description: string;
  lastModified: string;
  lastModifiedBy: string | null;
}

export enum UrgencyLevel {
  Normal = 0,
  Urgent = 1,
  Critical = 2
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.Normal]: 'Normal',
  [UrgencyLevel.Urgent]: 'Urgent',
  [UrgencyLevel.Critical]: 'Critical'
};

export const FEATURE_FLAG_NAMES = {
  aiEmailEnrichment: 'AI_EMAIL_ENRICHMENT',
  aiDepartmentRouting: 'AI_DEPARTMENT_ROUTING',
  aiPhiScanning: 'AI_PHI_SCANNING'
} as const;
