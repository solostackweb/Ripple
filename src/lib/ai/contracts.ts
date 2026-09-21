import { z } from "zod";

export const extractedChangeSchema = z.object({
  summary: z.string().min(1),
  kind: z.enum(["venue", "schedule", "speaker", "capacity", "vendor", "other"]),
  before: z.string().nullable(),
  after: z.string(),
  effectiveAt: z.string().datetime().nullable(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({ quote: z.string(), sourceId: z.string() })).min(1),
});

export const impactCandidateSchema = z.object({
  area: z.string(), title: z.string(), explanation: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  affectedEntityIds: z.array(z.string()),
  evidenceSourceIds: z.array(z.string()).min(1),
  suggestedOwner: z.string().nullable(), suggestedAction: z.string(),
});

export const impactAnalysisSchema = z.object({
  change: extractedChangeSchema,
  impacts: z.array(impactCandidateSchema),
  unknowns: z.array(z.string()),
});

export type ImpactAnalysis = z.infer<typeof impactAnalysisSchema>;

export const modelPolicy = {
  extraction: "gpt-5.6-luna",
  impactAnalysis: "gpt-5.6-terra",
  escalation: "gpt-5.6-sol",
} as const;

