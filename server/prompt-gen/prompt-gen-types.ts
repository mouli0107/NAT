/**
 * prompt-gen-types.ts — shared types for the AI-DLC Prompt Generator.
 */
import type { Response } from 'express';
import type { LayerId } from './tech-profiles';

/** A parsed context document (FSD / BRD / CLAUDE.md / memory). */
export interface ContextDoc {
  fileName: string;
  role: ContextRole;
  content: string;
  charCount: number;
  truncated: boolean;
}

export type ContextRole = 'fsd' | 'brd' | 'standards' | 'memory' | 'other';

/** A user story selected for prompt generation. */
export interface StoryInput {
  externalId: string;   // e.g. "US-4.1" (may be empty for ad-hoc stories)
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

/** An in-memory bundle of loaded context, keyed by id, reused across generations. */
export interface ContextBundle {
  bundleId: string;
  userId: string;
  docs: ContextDoc[];
  /** Free-text project memory (accumulated decisions, golden-path notes). */
  projectMemory: string;
  createdAt: number;
}

/** The cross-layer contract synthesised in Stage 1. Kept as opaque text + parsed JSON. */
export interface GeneratedContract {
  /** Human-readable markdown summary of the contract. */
  markdown: string;
  /** Parsed JSON contract (names, fields, events, endpoints) — best-effort. */
  json: any | null;
}

export interface GeneratedLayer {
  layerId: LayerId;
  label: string;
  model: string;
  status: 'pending' | 'running' | 'done' | 'error';
  /** The generated implementation PROMPT (markdown). */
  prompt: string;
  error?: string;
}

export type PromptGenStatus = 'pending' | 'running' | 'complete' | 'error';

export interface SseEvent {
  event: string;
  [key: string]: any;
}

export interface PromptGenSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  projectId: string;
  status: PromptGenStatus;
  techProfileId: string;
  story: StoryInput;
  bundleId: string;
  contract: GeneratedContract | null;
  layers: GeneratedLayer[];
  error: string | null;
  createdAt: number;
  sseClients: Set<Response>;
  eventHistory: SseEvent[];
}
