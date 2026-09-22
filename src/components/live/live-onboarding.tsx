"use client";

import { useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiFile, FiFolder, FiLoader, FiUploadCloud, FiX } from "react-icons/fi";
import { SiGoogledrive } from "react-icons/si";
import { astraEntities, astraEvent, astraRelationships, astraSources, type ImportSource } from "@/lib/data/astra";
import type { AiPreferences, LiveEventData } from "@/lib/data/live-types";

type EventDraft = { name: string; startsAt: string; endsAt: string; location: string; attendeeCount: number };

export function LiveOnboarding({ accessToken, ai, onReady, onBack, onOpenIntegrations }: { accessToken: string; ai: AiPreferences; onReady: (data: LiveEventData) => void; onBack: () => void; onOpenIntegrations: () => void }) {
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<EventDraft>(astraEvent);
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((file) => /\.(md|txt|csv|json)$/i.test(file.name));
    const parsed = await Promise.all(accepted.map(async (file): Promise<ImportSource> => ({ name: file.name, kind: "file", mimeType: file.type || "text/plain", content: await file.text() })));
    setSources((current) => [...current, ...parsed.filter((item) => !current.some((existing) => existing.name === item.name))]);
  }

  function loadAstraPack() {
    setEvent(astraEvent);
    setSources(astraSources);
    setStep(3);
  }

  async function buildWorkspace() {
    setProcessing(true); setError(""); setProcessStep(0);
    const timers = [window.setTimeout(() => setProcessStep(1), 450), window.setTimeout(() => setProcessStep(2), 1050), window.setTimeout(() => setProcessStep(3), 1750)];
    try {
      const response = await fetch("/api/live/bootstrap", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ event, sources, entities: astraEntities, relationships: astraRelationships }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "The workspace could not be created.");
      const changeSource = (data.sources as LiveEventData["sources"]).find((source) => source.kind === "gmail");
      const changeText = astraSources.find((source) => source.kind === "gmail")?.content;
      if (changeSource && changeText) {
        await fetch("/api/live/analyze", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ eventId: data.event.id, text: changeText, sourceId: changeSource.id, ai }) });
      }
      const refreshed = await fetch("/api/live/data", { headers: { Authorization: `Bearer ${accessToken}` } });
      const refreshedData = await refreshed.json();
      setProcessStep(4);
      window.setTimeout(() => onReady((refreshed.ok ? refreshedData : data) as LiveEventData), 550);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The workspace could not be created."); setProcessing(false); }
    finally { timers.forEach(window.clearTimeout); }
  }

  const stages = ["Securing your workspace", "Saving sources to Supabase", "Extracting event facts", "Connecting the knowledge graph", "Workspace ready"];

  if (processing) return <main className="onboarding-processing"><div className="ripple-loader"><span/><span/><span/><i/></div><span className="live-eyebrow">Building {event.name}</span><h1>{stages[processStep]}</h1><p>Ripple is turning {sources.length} sources into one traceable event model.</p><div className="processing-steps">{stages.map((label, index) => <div className={index < processStep ? "done" : index === processStep ? "active" : ""} key={label}><span>{index < processStep ? <FiCheck/> : index === processStep ? <FiLoader className="spin"/> : index + 1}</span><p>{label}</p></div>)}</div>{error && <div className="onboarding-error"><FiX/><span>{error}</span><button onClick={() => setProcessing(false)}>Back to setup</button></div>}</main>;

  return <main className="live-onboarding">
    <header className="onboarding-top"><button onClick={onBack}><FiArrowLeft/>Back to demo</button><div className="onboarding-brand"><span className="mini-ripple">◉</span>ripple <em>Live</em></div><span>Step {step} of 3</span></header>
    <div className="onboarding-progress"><i style={{ width: `${step * 33.333}%` }}/></div>
    <div className="onboarding-stage">
      {step === 1 && <section key="event" className="onboarding-card live-view-enter"><span className="live-eyebrow">Start with the event</span><h1>What are we protecting from change?</h1><p>These details become the root of the event graph. You can edit them after import.</p><div className="event-form"><label className="wide-field"><span>Event name</span><input value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })}/></label><label><span>Starts</span><input type="datetime-local" value={event.startsAt.slice(0, 16)} onChange={(e) => setEvent({ ...event, startsAt: `${e.target.value}:00+05:30` })}/></label><label><span>Ends</span><input type="datetime-local" value={event.endsAt.slice(0, 16)} onChange={(e) => setEvent({ ...event, endsAt: `${e.target.value}:00+05:30` })}/></label><label><span>Location</span><input value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })}/></label><label><span>Expected attendees</span><input type="number" value={event.attendeeCount} onChange={(e) => setEvent({ ...event, attendeeCount: Number(e.target.value) })}/></label></div><footer><button className="text-live-button" onClick={loadAstraPack}>Use complete Astra pack</button><button className="primary-live-button" onClick={() => setStep(2)}>Continue to sources<FiArrowRight/></button></footer></section>}

      {step === 2 && <section key="sources" className="onboarding-card source-step live-view-enter"><span className="live-eyebrow">Add event context</span><h1>Bring the plans out of their silos.</h1><p>Ripple reads selected sources, extracts facts, and keeps the original evidence attached.</p><div className="source-methods"><button onClick={() => fileInput.current?.click()}><span><FiUploadCloud/></span><div><strong>Upload event files</strong><small>Markdown, text, CSV or JSON · up to 30 files</small></div><FiArrowRight/></button><button onClick={onOpenIntegrations}><span className="drive-method"><SiGoogledrive/></span><div><strong>Import from Google Drive</strong><small>Connect an account and choose an event folder</small></div><FiArrowRight/></button><button onClick={loadAstraPack}><span className="astra-method"><FiFolder/></span><div><strong>Load the Astra data pack</strong><small>Seven realistic sources prepared for tomorrow</small></div><FiArrowRight/></button></div><input ref={fileInput} type="file" multiple accept=".md,.txt,.csv,.json,text/plain,text/csv,application/json" hidden onChange={(e) => addFiles(e.target.files)}/>{sources.length > 0 && <div className="selected-sources"><header><span>{sources.length} sources selected</span><button onClick={() => setSources([])}>Clear all</button></header>{sources.map((source) => <div key={source.name}><span><FiFile/></span><div><strong>{source.name}</strong><small>{source.mimeType} · {(source.content.length / 1024).toFixed(1)} KB</small></div><button onClick={() => setSources((current) => current.filter((item) => item.name !== source.name))}><FiX/></button></div>)}</div>}<footer><button className="text-live-button" onClick={() => setStep(1)}><FiArrowLeft/>Event details</button><button className="primary-live-button" disabled={!sources.length} onClick={() => setStep(3)}>Review import<FiArrowRight/></button></footer></section>}

      {step === 3 && <section key="review" className="onboarding-card review-step live-view-enter"><span className="live-eyebrow">Ready to build</span><h1>Your event, with its evidence attached.</h1><p>Ripple will store these sources privately, extract the event graph, and surface the late venue conflict.</p><div className="import-review"><div><span>Event</span><strong>{event.name}</strong><small>{new Date(event.startsAt).toLocaleDateString("en-IN", { dateStyle: "long" })} · {event.location}</small></div><div><span>Sources</span><strong>{sources.length}</strong><small>{sources.filter((s) => s.mimeType === "text/csv").length} structured tables · {sources.filter((s) => s.mimeType !== "text/csv").length} documents</small></div><div><span>Expected graph</span><strong>{astraEntities.length} facts</strong><small>{astraRelationships.length} traceable relationships</small></div></div><div className="privacy-callout"><FiCheck/><div><strong>Human review stays in the loop</strong><p>Ripple proposes facts and impacts. It will not send messages or create external tasks without approval.</p></div></div>{error && <div className="inline-error"><FiX/>{error}</div>}<footer><button className="text-live-button" onClick={() => setStep(2)}><FiArrowLeft/>Sources</button><button className="primary-live-button" onClick={buildWorkspace}>Build live workspace<FiArrowRight/></button></footer></section>}
    </div>
  </main>;
}
