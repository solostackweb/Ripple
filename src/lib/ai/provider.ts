import OpenAI from "openai";
import { impactAnalysisSchema, type ImpactAnalysis } from "./contracts";

export type AiProvider = "demo" | "openai" | "nvidia";

type ProviderConfig = {
  provider: AiProvider;
  model: string;
  client: OpenAI | null;
};

export type ProviderOverride = {
  provider?: AiProvider;
  model?: string;
  apiKey?: string;
};

export function getProviderConfig(override?: ProviderOverride): ProviderConfig {
  const requested = (override?.provider ?? process.env.AI_PROVIDER ?? "auto").toLowerCase();

  if (requested === "demo") return { provider: "demo", model: "ripple-demo-engine", client: null };

  const openAiKey = override?.provider === "openai" ? override.apiKey || process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY;
  if ((requested === "openai" || requested === "auto") && openAiKey) {
    return {
      provider: "openai",
      model: override?.model || process.env.AI_MODEL || "gpt-5-mini",
      client: new OpenAI({ apiKey: openAiKey }),
    };
  }

  const nvidiaKey = override?.provider === "nvidia" ? override.apiKey || process.env.NVIDIA_API_KEY : process.env.NVIDIA_API_KEY;
  if ((requested === "nvidia" || requested === "auto") && nvidiaKey) {
    return {
      provider: "nvidia",
      model: override?.model || process.env.AI_MODEL || "openai/gpt-oss-20b",
      client: new OpenAI({
        apiKey: nvidiaKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      }),
    };
  }

  return { provider: "demo", model: "ripple-demo-engine", client: null };
}

export async function testProvider(override?: ProviderOverride) {
  const config = getProviderConfig(override);
  if (!config.client) {
    return {
      ok: true,
      provider: config.provider,
      model: config.model,
      message: "Demo mode is active. Add an OpenAI or NVIDIA key to test a live model.",
    };
  }

  const startedAt = Date.now();
  const response = await config.client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: "Reply with only: ripple-ready" }],
    max_tokens: 12,
    temperature: 0,
  });

  return {
    ok: true,
    provider: config.provider,
    model: config.model,
    latencyMs: Date.now() - startedAt,
    response: response.choices[0]?.message.content?.trim() ?? "",
  };
}

export async function analyzeChange(input: { text: string; sourceId?: string }, override?: ProviderOverride): Promise<ImpactAnalysis & { provider: AiProvider; model: string }> {
  const config = getProviderConfig(override);
  if (!config.client) return { ...demoAnalysis(input.text, input.sourceId), provider: config.provider, model: config.model };

  const prompt = `You are Ripple, an evidence-first event operations analyst.
Extract the changed fact and identify only plausible downstream consequences.
Never invent a source. Every impact must cite the supplied source ID.
Return valid JSON with exactly this shape:
{
  "change": {"summary": string, "kind": "venue"|"schedule"|"speaker"|"capacity"|"vendor"|"other", "before": string|null, "after": string, "effectiveAt": string|null, "confidence": number, "evidence": [{"quote": string, "sourceId": string}]},
  "impacts": [{"area": string, "title": string, "explanation": string, "severity": "low"|"medium"|"high"|"critical", "affectedEntityIds": string[], "evidenceSourceIds": string[], "suggestedOwner": string|null, "suggestedAction": string}],
  "unknowns": string[]
}

Source ID: ${input.sourceId ?? "manual-change"}
Change report: ${input.text}`;

  const response = await config.client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("The model returned an empty analysis.");
  const parsed = impactAnalysisSchema.parse(JSON.parse(content));
  return { ...parsed, provider: config.provider, model: config.model };
}

function demoAnalysis(text: string, sourceId = "manual-change"): ImpactAnalysis {
  const normalized = text.toLowerCase();
  const isVenue = normalized.includes("hall") || normalized.includes("venue") || normalized.includes("auditorium");
  const isSpeaker = normalized.includes("speaker") || normalized.includes("panel");
  const kind = isVenue ? "venue" : isSpeaker ? "speaker" : "schedule";
  const before = isVenue ? "Main Auditorium" : isSpeaker ? "3 confirmed panelists" : "Registration at 8:30 AM";
  const after = isVenue ? "Innovation Hall" : isSpeaker ? "2 confirmed panelists" : "Registration at 8:00 AM";
  const impacts = isVenue
    ? [
        ["Capacity", "Confirm overflow plan for 120 attendees", "Innovation Hall seats 380 while registration is 500.", "high"],
        ["Production", "Move keynote AV setup", "The production plan assigns the encoder to Main Auditorium.", "high"],
        ["Communication", "Draft venue update for attendees", "Calendar and welcome email still name Main Auditorium.", "medium"],
      ]
    : isSpeaker
      ? [
          ["Programme", "Choose a replacement or change panel format", "The panel now has two confirmed speakers.", "high"],
          ["Website", "Update the published agenda", "The cancelled speaker remains on the agenda.", "medium"],
        ]
      : [
          ["Staffing", "Move the volunteer call time", "Volunteers need to arrive before registration opens.", "high"],
          ["Communication", "Update calendar and welcome email", "Attendee sources still show the previous time.", "medium"],
        ];

  return impactAnalysisSchema.parse({
    change: { summary: text, kind, before, after, effectiveAt: null, confidence: 0.96, evidence: [{ quote: text, sourceId }] },
    impacts: impacts.map(([area, title, explanation, severity]) => ({
      area, title, explanation, severity, affectedEntityIds: [], evidenceSourceIds: [sourceId], suggestedOwner: null, suggestedAction: title,
    })),
    unknowns: isVenue ? ["Whether an overflow room is available"] : [],
  });
}
