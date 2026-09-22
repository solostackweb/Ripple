"use client";

import { useEffect, useState } from "react";
import { FiDatabase, FiMonitor, FiZap } from "react-icons/fi";
import { RippleWorkspace } from "./ripple-workspace";
import { LiveExperience } from "./live/live-experience";
import { AiSettings } from "./settings/ai-settings";
import { defaultAiPreferences, type AiPreferences } from "@/lib/data/live-types";

export function RippleApp() {
  const [mode, setModeState] = useState<"demo" | "live">("demo");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ai, setAi] = useState<AiPreferences>(defaultAiPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const storedMode = localStorage.getItem("ripple-mode");
    const provider = (localStorage.getItem("ripple-ai-provider") as AiPreferences["provider"] | null) ?? "demo";
    const defaultModel = provider === "openai" ? "gpt-5-mini" : provider === "nvidia" ? "openai/gpt-oss-20b" : "ripple-demo-engine";
    queueMicrotask(() => {
      setModeState(query.get("mode") === "live" || storedMode === "live" ? "live" : "demo");
      setAi({ provider, model: localStorage.getItem("ripple-ai-model") ?? defaultModel, apiKey: sessionStorage.getItem("ripple-ai-key") ?? "" });
      setHydrated(true);
    });
  }, []);

  function setMode(next: "demo" | "live") {
    localStorage.setItem("ripple-mode", next);
    setModeState(next);
    window.history.replaceState({}, "", next === "live" ? "/?mode=live" : "/");
  }

  if (!hydrated) return <div className="app-boot"><div className="ripple-loader"><span/><span/><span/><i/></div></div>;

  return <>
    {mode === "demo" ? <RippleWorkspace ai={ai}/> : <LiveExperience ai={ai} onOpenSettings={() => setSettingsOpen(true)} onSwitchDemo={() => setMode("demo")}/>} 
    {mode === "demo" && <div className="demo-control"><div><span><FiMonitor/>Offline demo</span><small>Presentation-safe mock data</small></div><button onClick={() => setMode("live")}><FiDatabase/>Start Live mode</button><button aria-label="AI settings" onClick={() => setSettingsOpen(true)}><FiZap/></button></div>}
    {settingsOpen && <AiSettings preferences={ai} onSave={setAi} onClose={() => setSettingsOpen(false)}/>} 
  </>;
}
