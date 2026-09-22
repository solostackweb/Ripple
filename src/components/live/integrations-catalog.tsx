"use client";

import { useEffect, useState, type ComponentType } from "react";
import { FiArrowUpRight, FiCheck, FiFileText, FiLoader, FiLock, FiSettings, FiX } from "react-icons/fi";
import { FaMicrosoft, FaSlack } from "react-icons/fa";
import { SiAsana, SiGmail, SiGooglecalendar, SiGoogledrive, SiLinear, SiNotion, SiTrello, SiWhatsapp, SiZoom } from "react-icons/si";

type Integration = {
  slug: string; name: string; Icon: ComponentType<{ size?: number }>;
  color: string; category: string; description: string; value: string;
  setup: string[]; composio?: boolean; native?: boolean;
};

const integrations: Integration[] = [
  { slug: "upload", name: "Files & notes", Icon: FiFileText, color: "#174d3c", category: "Core", description: "Upload briefs, CSV schedules, notes and exports directly into the event graph.", value: "Best first source · works now", native: true, setup: ["Choose Live mode", "Create or open an event", "Upload .md, .txt, .csv, or .json files"] },
  { slug: "gmail", name: "Gmail", Icon: SiGmail, color: "#ea4335", category: "Communication", description: "Detect decisions, cancellations, approvals and changed facts in selected event threads.", value: "Read selected threads · draft replies", composio: true, setup: ["Create a Gmail auth config in Composio", "Copy its ID to COMPOSIO_AUTH_CONFIG_GMAIL", "Add COMPOSIO_API_KEY in Vercel", "Return here and select Connect"] },
  { slug: "googledrive", name: "Google Drive", Icon: SiGoogledrive, color: "#0f9d58", category: "Documents", description: "Import event folders, Docs, Sheets, PDFs and planning files as grounded sources.", value: "Import selected files and folders", composio: true, setup: ["Create a Google Drive auth config in Composio", "Copy its ID to COMPOSIO_AUTH_CONFIG_GOOGLEDRIVE", "Add COMPOSIO_API_KEY in Vercel", "Connect and choose the Astra folder"] },
  { slug: "googlecalendar", name: "Google Calendar", Icon: SiGooglecalendar, color: "#4285f4", category: "Schedule", description: "Track sessions, rooms, speaker holds and deadlines for contradictions.", value: "Watch event calendars", composio: true, setup: ["Create a Google Calendar auth config in Composio", "Copy its ID to COMPOSIO_AUTH_CONFIG_GOOGLECALENDAR", "Connect the calendar used for Astra"] },
  { slug: "slack", name: "Slack", Icon: FaSlack, color: "#611f69", category: "Communication", description: "Capture confirmed team decisions from selected planning channels.", value: "Read channels · draft updates", composio: true, setup: ["Create a Slack auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_SLACK", "Connect the event workspace"] },
  { slug: "notion", name: "Notion", Icon: SiNotion, color: "#111111", category: "Documents", description: "Use runbooks, databases and speaker pages as maintained sources of truth.", value: "Read selected pages and databases", composio: true, setup: ["Create a Notion auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_NOTION", "Grant only the Astra pages"] },
  { slug: "trello", name: "Trello", Icon: SiTrello, color: "#0c66e4", category: "Execution", description: "Create response cards only after an organiser approves an impact.", value: "Create and update cards", composio: true, setup: ["Create a Trello auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_TRELLO", "Choose the event board after connecting"] },
  { slug: "linear", name: "Linear", Icon: SiLinear, color: "#5e6ad2", category: "Execution", description: "Send approved technical and production work to an engineering team.", value: "Create issues with evidence", composio: true, setup: ["Create a Linear auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_LINEAR", "Select the event project"] },
  { slug: "asana", name: "Asana", Icon: SiAsana, color: "#f06a6a", category: "Execution", description: "Turn accepted event impacts into assigned tasks with deadlines.", value: "Create tasks · sync status", composio: true, setup: ["Create an Asana auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_ASANA", "Connect the event workspace"] },
  { slug: "outlook", name: "Microsoft 365", Icon: FaMicrosoft, color: "#0078d4", category: "Workspace", description: "Import Outlook mail and calendar context for Microsoft-based teams.", value: "Mail · calendar · contacts", composio: true, setup: ["Create an Outlook auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_OUTLOOK", "Connect the organising account"] },
  { slug: "onedrive", name: "OneDrive", Icon: FaMicrosoft, color: "#0364b8", category: "Documents", description: "Ground the graph in selected OneDrive event documents and spreadsheets.", value: "Import selected files", composio: true, setup: ["Create a OneDrive auth config in Composio", "Set COMPOSIO_AUTH_CONFIG_ONEDRIVE", "Connect and choose an event folder"] },
  { slug: "zoom", name: "Zoom", Icon: SiZoom, color: "#2d8cff", category: "Meetings", description: "Turn planning meeting transcripts into decisions and changed facts.", value: "Import recordings and transcripts", setup: ["Planned after the conference demo", "Use file upload for exported transcripts today"] },
  { slug: "whatsapp", name: "WhatsApp", Icon: SiWhatsapp, color: "#25d366", category: "Attendees", description: "Prepare opt-in urgent attendee messages after human approval.", value: "Draft templates · approval required", setup: ["Requires a WhatsApp Business account", "Create approved message templates", "Keep explicit attendee opt-in records"] },
];

export function IntegrationsCatalog({ accessToken, onUseUpload }: { accessToken: string; onUseUpload: () => void }) {
  const [accounts, setAccounts] = useState<Array<{ toolkit?: string; status: string }>>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState("");
  const [setup, setSetup] = useState<Integration | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/integrations/composio/status", { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.json()).then((data) => { setConfigured(Boolean(data.configured)); setAccounts(data.accounts ?? []); }).catch(() => setError("Could not check connector status.")).finally(() => setLoading(false));
  }, [accessToken]);

  async function connect(item: Integration) {
    if (item.native) { onUseUpload(); return; }
    if (!item.composio) { setSetup(item); return; }
    setConnecting(item.slug); setError("");
    try {
      const response = await fetch("/api/integrations/composio/connect", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ toolkit: item.slug }) });
      const data = await response.json();
      if (data.redirectUrl) { window.location.assign(data.redirectUrl); return; }
      if (data.needsSetup) { setSetup(item); setConfigured(false); }
      else throw new Error(data.message ?? "Connection could not start.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection could not start."); }
    finally { setConnecting(""); }
  }

  function isConnected(slug: string) { return accounts.some((account) => account.toolkit?.toLowerCase() === slug && account.status === "ACTIVE"); }

  return <div className="live-integrations">
    <div className="integrations-summary"><div><span className="live-eyebrow">Integration layer</span><h2>Bring the event together</h2><p>Start with direct uploads. Add accounts only when they provide useful event evidence or an approved action destination.</p></div><span className={configured ? "system-chip good" : "system-chip"}>{loading ? <FiLoader className="spin"/> : configured ? <FiCheck/> : <FiSettings/>}{loading ? "Checking" : configured ? `${accounts.length} accounts connected` : "Composio setup needed"}</span></div>
    {error && <div className="inline-error"><FiX/>{error}</div>}
    <div className="integration-card-grid">{integrations.map((item) => { const connected = item.native || isConnected(item.slug); return <article className="real-integration-card" key={item.slug}><div className="integration-card-head"><span className="real-brand-icon" style={{ color: item.color, background: `${item.color}12` }}><item.Icon size={22}/></span><span className="integration-category">{item.category}</span></div><h3>{item.name}</h3><p>{item.description}</p><span className="integration-value">{item.value}</span><footer>{connected ? <span className="connected-badge"><FiCheck/>{item.native ? "Ready" : "Connected"}</span> : <button onClick={() => connect(item)} disabled={connecting === item.slug}>{connecting === item.slug ? <FiLoader className="spin"/> : item.composio ? <FiLock/> : <FiSettings/>}{connecting === item.slug ? "Starting…" : item.composio ? "Connect" : "Setup guide"}</button>}<button className="icon-only" onClick={() => setSetup(item)} aria-label={`Setup guide for ${item.name}`}><FiArrowUpRight/></button></footer></article>; })}</div>
    {setup && <div className="integration-drawer"><button className="settings-scrim" onClick={() => setSetup(null)} aria-label="Close setup"/><aside><header><span className="real-brand-icon" style={{ color: setup.color, background: `${setup.color}12` }}><setup.Icon size={24}/></span><button onClick={() => setSetup(null)} aria-label="Close"><FiX/></button></header><span className="live-eyebrow">Setup guide</span><h2>{setup.name}</h2><p>{setup.description}</p><ol>{setup.setup.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>{setup.composio && <div className="connector-note"><FiLock/><p>OAuth tokens stay in Composio. Ripple receives a connected-account ID and calls tools through the server.</p></div>}<button className="primary-live-button full-live" onClick={() => connect(setup)} disabled={connecting === setup.slug}>{connecting === setup.slug ? <FiLoader className="spin"/> : <FiArrowUpRight/>}{setup.native ? "Open uploader" : setup.composio ? "Connect account" : "Got it"}</button></aside></div>}
  </div>;
}
