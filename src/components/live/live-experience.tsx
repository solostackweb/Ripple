"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiActivity, FiAlertCircle, FiArrowRight, FiCheck, FiCheckSquare, FiChevronRight, FiClock, FiDatabase, FiFileText, FiGrid, FiLoader, FiMenu, FiPlus, FiRefreshCw, FiSearch, FiSettings, FiShare2, FiSliders, FiUsers, FiX, FiZap } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import type { AiPreferences, LiveEventData } from "@/lib/data/live-types";
import { LiveOnboarding } from "./live-onboarding";
import { EventGraph } from "@/components/graph/event-graph";
import { IntegrationsCatalog } from "./integrations-catalog";

type View = "Overview" | "Event graph" | "Sources" | "Tasks" | "Integrations" | "System";
const nav: Array<{ name: View; icon: typeof FiGrid }> = [
  { name: "Overview", icon: FiGrid }, { name: "Event graph", icon: FiShare2 }, { name: "Sources", icon: FiDatabase },
  { name: "Tasks", icon: FiCheckSquare }, { name: "Integrations", icon: FiSliders }, { name: "System", icon: FiSettings },
];

function LiveMark() { return <div className="live-mark"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="3.7"/><path d="M24 13a11 11 0 1 1-8.7 17.7"/><path d="M24 5.5A18.5 18.5 0 1 1 8.5 34"/></svg><strong>ripple</strong></div>; }

export function LiveExperience({ ai, onOpenSettings, onSwitchDemo }: { ai: AiPreferences; onOpenSettings: () => void; onSwitchDemo: () => void }) {
  const [accessToken, setAccessToken] = useState("");
  const [data, setData] = useState<LiveEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIntegrationsBeforeEvent, setShowIntegrationsBeforeEvent] = useState(false);

  const loadData = useCallback(async (token: string) => {
    const response = await fetch("/api/live/data", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? "Could not load Live mode.");
    setData(result.event ? result as LiveEventData : null);
  }, []);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const supabase = createClient();
        let { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          const { data: anonymousData, error: authError } = await supabase.auth.signInAnonymously({ options: { data: { product: "ripple-live" } } });
          if (authError) throw new Error(authError.message.includes("Anonymous sign-ins are disabled") ? "Anonymous sign-ins are disabled in Supabase. Enable them under Authentication → Providers → Anonymous, then retry." : authError.message);
          sessionData = { session: anonymousData.session };
        }
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Supabase did not return a user session.");
        if (!active) return;
        setAccessToken(token);
        await loadData(token);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Live mode could not start."); }
      finally { if (active) setLoading(false); }
    }
    start();
    return () => { active = false; };
  }, [loadData]);

  if (loading) return <LiveSkeleton/>;
  if (error) return <LiveSetupError message={error} onRetry={() => window.location.reload()} onDemo={onSwitchDemo}/>;
  if (!data) {
    if (showIntegrationsBeforeEvent) return <div className="pre-event-integrations"><header><button onClick={() => setShowIntegrationsBeforeEvent(false)}>← Back to import</button><LiveMark/><span>Connect a source</span></header><IntegrationsCatalog accessToken={accessToken} onUseUpload={() => setShowIntegrationsBeforeEvent(false)}/></div>;
    return <LiveOnboarding accessToken={accessToken} ai={ai} onReady={setData} onBack={onSwitchDemo} onOpenIntegrations={() => setShowIntegrationsBeforeEvent(true)}/>;
  }
  return <LiveDashboard accessToken={accessToken} data={data} setData={setData} ai={ai} onOpenSettings={onOpenSettings} onSwitchDemo={onSwitchDemo}/>;
}

function LiveDashboard({ accessToken, data, setData, ai, onOpenSettings, onSwitchDemo }: { accessToken: string; data: LiveEventData; setData: (data: LiveEventData) => void; ai: AiPreferences; onOpenSettings: () => void; onSwitchDemo: () => void }) {
  const [view, setView] = useState<View>("Overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState("");

  async function refresh() {
    const response = await fetch("/api/live/data", { headers: { Authorization: `Bearer ${accessToken}` } });
    const result = await response.json(); if (response.ok) setData(result);
  }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2400); }
  async function analyze() {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/live/analyze", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ eventId: data.event.id, text: changeText, ai }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? "Analysis failed.");
      await refresh(); setChangeOpen(false); setChangeText(""); setView("Overview"); notify(`${result.impacts.length} impacts added from live analysis`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Analysis failed."); }
    finally { setAnalyzing(false); }
  }

  const title = view === "Event graph" ? "Event graph" : view;
  return <div className="live-shell">
    <aside className={mobileNav ? "live-sidebar open" : "live-sidebar"}><div className="live-sidebar-head"><LiveMark/><button onClick={() => setMobileNav(false)}><FiX/></button></div><div className="live-event-label"><span>A</span><div><strong>{data.event.name.replace(" OpenAI Conference", "")}</strong><small>Live workspace</small></div></div><nav>{nav.map((item) => <button className={view === item.name ? "active" : ""} key={item.name} onClick={() => { setView(item.name); setMobileNav(false); }}><item.icon/><span>{item.name}</span>{item.name === "Tasks" && <em>{data.tasks.filter((task) => task.status !== "done").length}</em>}</button>)}</nav><footer><button className="live-mode-card" onClick={onSwitchDemo}><span className="pulse-live"><i/></span><div><strong>Live mode</strong><small>Supabase connected</small></div><FiChevronRight/></button><button className="live-user"><span>A</span><div><strong>Akshat</strong><small>Anonymous live session</small></div></button></footer></aside>
    {mobileNav && <button className="live-nav-scrim" onClick={() => setMobileNav(false)}/>} 
    <main className="live-main"><header className="live-topbar"><button className="live-mobile-menu" onClick={() => setMobileNav(true)}><FiMenu/></button><div><span>{data.event.name}</span><FiChevronRight/><strong>{title}</strong></div><div className="live-top-actions"><button className="live-search" onClick={() => setSearchOpen(true)}><FiSearch/>Search event <kbd>Ctrl K</kbd></button><button className="ai-engine-button" onClick={onOpenSettings}><FiZap/><span>{ai.provider === "demo" ? "Offline engine" : ai.provider === "openai" ? "OpenAI" : "NVIDIA"}</span></button><button className="primary-live-button" onClick={() => setChangeOpen(true)}><FiPlus/>Report change</button></div></header>
      <div className="live-page"><div key={view} className="live-view-enter">{view === "Overview" && <LiveOverview data={data} accessToken={accessToken} refresh={refresh} notify={notify}/>} {view === "Event graph" && <GraphView data={data}/>} {view === "Sources" && <SourcesView data={data} onAdd={() => setView("Integrations")}/>} {view === "Tasks" && <TasksView data={data} accessToken={accessToken} refresh={refresh}/>} {view === "Integrations" && <IntegrationsCatalog accessToken={accessToken} onUseUpload={() => setView("Sources")}/>} {view === "System" && <SystemView ai={ai} onOpenSettings={onOpenSettings}/>}</div></div>
      {searchOpen && <EventSearch data={data} onClose={() => setSearchOpen(false)} onNavigate={(next) => { setView(next); setSearchOpen(false); }}/>} 
    </main>
    {changeOpen && <div className="live-modal"><button className="settings-scrim" onClick={() => setChangeOpen(false)}/><section><header><div><span className="live-eyebrow">Live intelligence</span><h2>Report a new change</h2><p>Paste the exact update. Ripple will analyze it with {ai.provider === "demo" ? "the offline engine" : ai.model} and save the evidence to Supabase.</p></div><button className="round-icon-button" onClick={() => setChangeOpen(false)}><FiX/></button></header><textarea autoFocus value={changeText} onChange={(event) => setChangeText(event.target.value)} placeholder="Example: The safety panel has moved from 2:00 PM to 3:00 PM in Lab B…" rows={7}/><div className="live-modal-source"><FiFileText/><span>Manual change report</span><small>Source will be attached automatically</small></div><footer><button className="text-live-button" onClick={() => setChangeOpen(false)}>Cancel</button><button className="primary-live-button" disabled={changeText.trim().length < 5 || analyzing} onClick={analyze}>{analyzing ? <FiLoader className="spin"/> : <FiZap/>}{analyzing ? "Tracing impact…" : "Analyze and save"}</button></footer></section></div>}
    {toast && <div className="live-toast"><FiCheck/>{toast}</div>}
  </div>;
}

function LiveOverview({ data, accessToken, refresh, notify }: { data: LiveEventData; accessToken: string; refresh: () => Promise<void>; notify: (message: string) => void }) {
  const latestChange = data.changes[0];
  const latestImpacts = latestChange ? data.impacts.filter((impact) => impact.change_id === latestChange.id) : [];
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  async function addTask(impact: LiveEventData["impacts"][number]) {
    const response = await fetch("/api/live/tasks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ eventId: data.event.id, impactId: impact.id, title: impact.title }) });
    if (response.ok) { await refresh(); notify("Task saved to Supabase"); }
  }
  return <><div className="live-page-title"><div><span className="live-eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span><h1>{data.event.name}</h1><p>{new Date(data.event.starts_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })} · {data.event.location}</p></div><span className="live-data-badge"><i/>Live data · refreshed now</span></div><div className="live-metrics"><article><span className="metric-icon healthy"><FiActivity/></span><div><small>Event health</small><strong>82<span>/100</span></strong><p>One capacity blocker</p></div></article><article><span className="metric-icon"><FiUsers/></span><div><small>Attendance</small><strong>{data.event.attendee_count}</strong><p>120 above new room capacity</p></div></article><article><span className="metric-icon"><FiDatabase/></span><div><small>Grounded sources</small><strong>{data.sources.length}</strong><p>{data.entities.length} extracted facts</p></div></article><article><span className="metric-icon"><FiCheckSquare/></span><div><small>Open actions</small><strong>{openTasks.length}</strong><p>{data.tasks.filter((task) => task.status === "doing").length} already in progress</p></div></article></div>
  <div className="live-overview-grid"><section className="live-panel live-change-panel"><header><div><span className="live-eyebrow danger">Live change intelligence</span><h2>{latestChange ? `One change, ${latestImpacts.length} consequences` : "No changes analyzed yet"}</h2></div><span><FiClock/>{latestChange ? "Saved in Supabase" : "Waiting for evidence"}</span></header>{latestChange && <div className="live-change-origin"><span><FiZap/></span><div><small>Confirmed change · {Math.round(latestChange.confidence * 100)}% confidence</small><strong>{latestChange.summary}</strong><p>Detected from the imported Facilities update and checked against the event graph.</p></div></div>}<div className="live-impact-trail">{latestImpacts.map((impact) => <article key={impact.id}><span className={`trail-node ${impact.severity}`}/><div><div><em>{impact.area}</em>{impact.severity === "high" && <b>Blocker</b>}</div><h3>{impact.title}</h3><p>{impact.explanation}</p><small><FiDatabase/>Evidence attached · live analysis</small></div>{impact.status === "accepted" ? <span className="saved-task"><FiCheck/>Task created</span> : <button onClick={() => addTask(impact)}>Add task<FiArrowRight/></button>}</article>)}</div></section><aside className="live-right-stack"><section className="live-panel live-actions"><header><div><span className="live-eyebrow">Response plan</span><h2>Next actions</h2></div><strong>{openTasks.length}</strong></header>{openTasks.slice(0, 5).map((task) => <div key={task.id}><span className={`task-state ${task.status}`}/><p><strong>{task.title}</strong><small>{task.status === "doing" ? "In progress" : "Needs action"}{task.due_at ? ` · ${new Date(task.due_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}</small></p><FiChevronRight/></div>)}</section><section className="live-panel live-source-pulse"><header><div><span className="live-eyebrow">Source pulse</span><h2>Recently imported</h2></div><span className="system-chip good"><i/>Live</span></header>{data.sources.slice(0, 4).map((source) => <div key={source.id}><span className={`source-kind ${source.kind}`}><FiFileText/></span><p><strong>{source.title}</strong><small>{source.kind.replaceAll("_", " ")} · stored privately</small></p><FiCheck/></div>)}</section></aside></div></>;
}

function GraphView({ data }: { data: LiveEventData }) { return <><div className="live-page-title"><div><span className="live-eyebrow">Interactive knowledge graph</span><h1>The event, connected.</h1><p>Explore every fact and dependency extracted from your live Supabase sources.</p></div><span className="live-data-badge"><i/>{data.entities.length} nodes · {data.relationships.length} edges</span></div><div className="live-panel graph-host"><EventGraph data={data}/></div></>; }

function SourcesView({ data, onAdd }: { data: LiveEventData; onAdd: () => void }) { return <><div className="live-page-title"><div><span className="live-eyebrow">Evidence library</span><h1>Sources of truth</h1><p>Every AI conclusion stays traceable to material you imported or connected.</p></div><button className="primary-live-button" onClick={onAdd}><FiPlus/>Add sources</button></div><div className="sources-list live-panel"><header><span>Source</span><span>Type</span><span>Extracted</span><span>Status</span></header>{data.sources.map((source) => <article key={source.id}><span className={`source-kind ${source.kind}`}><FiFileText/></span><div><strong>{source.title}</strong><small>Imported {new Date(source.observed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><span>{source.kind.replaceAll("_", " ")}</span><span>{String(source.metadata?.bytes ? `${Math.max(1, Math.round(Number(source.metadata.bytes) / 220))} facts` : "Analyzed")}</span><em><FiCheck/>Ready</em></article>)}</div></>; }

function EventSearch({ data, onClose, onNavigate }: { data: LiveEventData; onClose: () => void; onNavigate: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...data.sources.map((item) => ({ id: item.id, title: item.title, detail: item.kind.replaceAll("_", " "), view: "Sources" as View })),
      ...data.tasks.map((item) => ({ id: item.id, title: item.title, detail: item.status, view: "Tasks" as View })),
      ...data.entities.map((item) => ({ id: item.id, title: item.name, detail: item.kind, view: "Event graph" as View })),
      ...data.changes.map((item) => ({ id: item.id, title: item.summary, detail: "change", view: "Overview" as View })),
    ].filter((item) => `${item.title} ${item.detail}`.toLowerCase().includes(term)).slice(0, 8);
  }, [data, query]);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  return <div className="search-backdrop" onMouseDown={onClose}><section className="event-search-panel" onMouseDown={(event) => event.stopPropagation()}><header><FiSearch/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources, tasks, people and changes…"/><button onClick={onClose}><FiX/></button></header>{!query && <div className="search-hint"><FiZap/><p><strong>Search the whole event</strong><small>Try “Innovation Hall”, “keynote”, “Maya”, or “capacity”.</small></p></div>}{query && !results.length && <div className="search-empty">No event records match “{query}”.</div>}{results.map((result) => <button className="search-result" key={`${result.view}-${result.id}`} onClick={() => onNavigate(result.view)}><span>{result.view === "Sources" ? <FiFileText/> : result.view === "Tasks" ? <FiCheckSquare/> : result.view === "Event graph" ? <FiShare2/> : <FiActivity/>}</span><p><strong>{result.title}</strong><small>{result.detail} · open {result.view.toLowerCase()}</small></p><FiArrowRight/></button>)}</section></div>;
}

function TasksView({ data, accessToken, refresh }: { data: LiveEventData; accessToken: string; refresh: () => Promise<void> }) {
  async function move(task: LiveEventData["tasks"][number]) { const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo"; await fetch("/api/live/tasks", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ eventId: data.event.id, taskId: task.id, status: next }) }); await refresh(); }
  const columns = [["todo", "Needs action"], ["doing", "In progress"], ["done", "Resolved"]] as const;
  return <><div className="live-page-title"><div><span className="live-eyebrow">Response plan</span><h1>Turn consequences into action.</h1><p>Tasks created from accepted AI impacts retain their evidence and source change.</p></div></div><div className="real-task-board">{columns.map(([status, label]) => <section key={status}><header><span className={`task-state ${status}`}/><strong>{label}</strong><em>{data.tasks.filter((task) => task.status === status).length}</em></header>{data.tasks.filter((task) => task.status === status).map((task) => <article key={task.id} onClick={() => move(task)}><span className="live-eyebrow">Astra response</span><h3>{task.title}</h3><p>Created from live event intelligence.</p><footer><span>A</span><small>{task.due_at ? new Date(task.due_at).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "No deadline"}</small><FiArrowRight/></footer></article>)}{data.tasks.every((task) => task.status !== status) && <div className="empty-task-column"><FiCheck/><span>Nothing here</span></div>}</section>)}</div></>;
}

function SystemView({ ai, onOpenSettings }: { ai: AiPreferences; onOpenSettings: () => void }) {
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);
  useEffect(() => { fetch("/api/system/status").then((response) => response.json()).then(setStatus); }, []);
  const checks = [{ key: "supabase", label: "Supabase credentials" }, { key: "database", label: "Database schema" }, { key: "storage", label: "Private source storage" }, { key: "composio", label: "Composio connectors" }, { key: ai.provider, label: `${ai.provider === "demo" ? "Offline" : ai.provider} AI provider` }];
  return <><div className="live-page-title"><div><span className="live-eyebrow">Deployment health</span><h1>System and setup</h1><p>Everything required for a reliable live conference demonstration.</p></div><button className="secondary-live-button" onClick={() => window.location.reload()}><FiRefreshCw/>Refresh checks</button></div><div className="system-grid"><section className="live-panel system-checks"><header><div><span className="live-eyebrow">Environment</span><h2>Connection health</h2></div></header>{checks.map((check) => <div key={check.key}><span className={check.key === "demo" || status?.[check.key] ? "check-good" : "check-warn"}>{check.key === "demo" || status?.[check.key] ? <FiCheck/> : <FiAlertCircle/>}</span><p><strong>{check.label}</strong><small>{check.key === "demo" || status?.[check.key] ? "Configured and reachable" : "Needs setup"}</small></p></div>)}</section><section className="live-panel ai-config-card"><span className="metric-icon"><FiZap/></span><span className="live-eyebrow">Current AI engine</span><h2>{ai.provider === "demo" ? "Ripple offline engine" : ai.provider === "openai" ? "OpenAI" : "NVIDIA NIM"}</h2><p>{ai.model}. Keys entered in Settings live only for the browser session; deployment keys remain on the server.</p><button className="primary-live-button" onClick={onOpenSettings}><FiSettings/>Configure AI</button></section></div></>;
}

function LiveSkeleton() { return <div className="live-skeleton"><aside><div className="skeleton-line brand-line"/><div className="skeleton-block"/><div className="skeleton-nav">{Array.from({ length: 6 }).map((_, i) => <i key={i}/>)}</div></aside><main><header/><div><div className="skeleton-line title-line"/><div className="skeleton-line subtitle-line"/><section>{Array.from({ length: 4 }).map((_, i) => <i key={i}/>)}</section><article/></div></main><div className="ripple-loader small"><span/><span/><span/><i/></div></div>; }
function LiveSetupError({ message, onRetry, onDemo }: { message: string; onRetry: () => void; onDemo: () => void }) { return <main className="setup-error-page"><LiveMark/><span className="error-icon"><FiAlertCircle/></span><span className="live-eyebrow">Live mode needs one setting</span><h1>Supabase authentication is not ready.</h1><p>{message}</p><ol><li>Open Supabase Dashboard → Authentication → Providers.</li><li>Enable Anonymous Sign-Ins for the conference prototype.</li><li>Keep the existing row-level security policies enabled.</li><li>Return here and retry.</li></ol><div><button className="text-live-button" onClick={onDemo}>Use offline demo</button><button className="primary-live-button" onClick={onRetry}><FiRefreshCw/>Retry Live mode</button></div></main>; }
