export type LiveEventData = {
  event: {
    id: string; name: string; starts_at: string; ends_at: string;
    location: string; attendee_count: number; status: string;
  };
  sources: Array<{ id: string; title: string; kind: string; observed_at: string; metadata: Record<string, unknown> }>;
  entities: Array<{ id: string; name: string; kind: string; attributes: Record<string, unknown>; confidence: number }>;
  relationships: Array<{ id: string; from_entity_id: string; to_entity_id: string; relation: string; confidence: number }>;
  tasks: Array<{ id: string; title: string; status: "todo" | "doing" | "done"; due_at: string | null; assigned_to: string | null }>;
  changes: Array<{ id: string; summary: string; kind: string; confidence: number; status: string; created_at: string }>;
  impacts: Array<{ id: string; change_id: string; area: string; title: string; explanation: string; severity: "low" | "medium" | "high" | "critical"; status: string }>;
};

export type AiPreferences = {
  provider: "demo" | "openai" | "nvidia";
  model: string;
  apiKey: string;
};

export const defaultAiPreferences: AiPreferences = {
  provider: "demo",
  model: "ripple-demo-engine",
  apiKey: "",
};
