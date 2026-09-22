"use client";

import { useState } from "react";
import { FiCheck, FiEye, FiEyeOff, FiKey, FiLoader, FiShield, FiX, FiZap } from "react-icons/fi";
import type { AiPreferences } from "@/lib/data/live-types";

const models = {
  demo: [{ value: "ripple-demo-engine", label: "Ripple offline engine", note: "Reliable presentation fallback" }],
  openai: [
    { value: "gpt-5-mini", label: "GPT-5 mini", note: "Fast extraction and routine analysis" },
    { value: "gpt-5", label: "GPT-5", note: "Deeper impact reasoning" },
  ],
  nvidia: [
    { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B", note: "Fast, open-weight model hosted by NVIDIA" },
    { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B", note: "Stronger reasoning, higher latency" },
    { value: "qwen/qwen3-next-80b-a3b-instruct", label: "Qwen3 Next 80B", note: "Strong structured extraction" },
  ],
} as const;

export function AiSettings({ preferences, onSave, onClose }: { preferences: AiPreferences; onSave: (value: AiPreferences) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(preferences);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const providerModels = models[draft.provider];
  function changeProvider(provider: AiPreferences["provider"]) {
    setDraft({ provider, model: models[provider][0].value, apiKey: provider === "demo" ? "" : draft.apiKey });
    setResult(null);
  }

  async function testConnection() {
    setTesting(true); setResult(null);
    try {
      const response = await fetch("/api/ai/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: draft.provider, model: draft.model, ...(draft.apiKey ? { apiKey: draft.apiKey } : {}) }) });
      const data = await response.json();
      setResult({ ok: response.ok && data.provider === draft.provider, message: response.ok && data.provider === draft.provider ? `Connected to ${data.model} in ${data.latencyMs ?? 0} ms.` : data.message ?? "The requested provider is not configured." });
    } catch { setResult({ ok: false, message: "Could not reach the test endpoint." }); }
    finally { setTesting(false); }
  }

  function save() {
    sessionStorage.setItem("ripple-ai-key", draft.apiKey);
    localStorage.setItem("ripple-ai-provider", draft.provider);
    localStorage.setItem("ripple-ai-model", draft.model);
    onSave(draft); onClose();
  }

  return <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
    <button className="settings-scrim" onClick={onClose} aria-label="Close settings"/>
    <section className="settings-sheet">
      <header><div><span className="live-eyebrow">AI engine</span><h2 id="ai-settings-title">Choose how Ripple thinks</h2><p>Use the offline engine for a reliable demo, or bring a key for live analysis.</p></div><button className="round-icon-button" onClick={onClose} aria-label="Close"><FiX/></button></header>
      <div className="provider-choice">
        <button className={draft.provider === "demo" ? "selected" : ""} onClick={() => changeProvider("demo")}><span className="provider-symbol ripple-symbol">◉</span><div><strong>Offline demo</strong><small>No key · deterministic</small></div>{draft.provider === "demo" && <FiCheck/>}</button>
        <button className={draft.provider === "openai" ? "selected" : ""} onClick={() => changeProvider("openai")}><span className="provider-symbol openai-symbol">◎</span><div><strong>OpenAI</strong><small>Best live experience</small></div>{draft.provider === "openai" && <FiCheck/>}</button>
        <button className={draft.provider === "nvidia" ? "selected" : ""} onClick={() => changeProvider("nvidia")}><span className="provider-symbol nvidia-symbol">N</span><div><strong>NVIDIA NIM</strong><small>Free prototyping</small></div>{draft.provider === "nvidia" && <FiCheck/>}</button>
      </div>

      <label className="settings-field"><span>Model</span><select value={draft.model} onChange={(event) => { setDraft({ ...draft, model: event.target.value }); setResult(null); }}>{providerModels.map((model) => <option value={model.value} key={model.value}>{model.label} — {model.note}</option>)}</select></label>

      {draft.provider !== "demo" && <label className="settings-field"><span>Session API key</span><div className="secret-input"><FiKey/><input type={showKey ? "text" : "password"} value={draft.apiKey} onChange={(event) => { setDraft({ ...draft, apiKey: event.target.value.trim() }); setResult(null); }} placeholder={draft.provider === "openai" ? "sk-… or leave empty to use Vercel" : "nvapi-… or leave empty to use Vercel"}/><button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? "Hide key" : "Show key"}>{showKey ? <FiEyeOff/> : <FiEye/>}</button></div><small><FiShield/>Stored only in this browser tab. Ripple sends it to its own server for each request and never writes it to Supabase.</small></label>}

      <div className="settings-test-row"><button className="secondary-live-button" onClick={testConnection} disabled={testing}>{testing ? <FiLoader className="spin"/> : <FiZap/>}{testing ? "Testing…" : "Test connection"}</button>{result && <span className={result.ok ? "test-success" : "test-error"}>{result.ok ? <FiCheck/> : <FiX/>}{result.message}</span>}</div>

      <aside className="settings-note"><FiShield/><div><strong>For Vercel</strong><p>Environment keys are safer for the live deployment. Leave the field empty and configure OPENAI_API_KEY or NVIDIA_API_KEY in Vercel; Ripple will use the deployment key without exposing it.</p></div></aside>
      <footer><button className="text-live-button" onClick={onClose}>Cancel</button><button className="primary-live-button" onClick={save}><FiCheck/>Use this configuration</button></footer>
    </section>
  </div>;
}
