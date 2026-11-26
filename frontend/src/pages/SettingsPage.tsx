import { useEffect, useState, type FormEvent } from "react";
import {
  Activity, Check, CircleAlert, Download, KeyRound, Link2, LoaderCircle,
  LockKeyhole, RefreshCw, ShieldCheck, Trash2, Upload
} from "lucide-react";
import {
  downloadUserData,
  getChessAnalytics,
  getIntegrations,
  getSettings,
  importChessGames,
  removeIntegration,
  saveIntegration,
  updateSettings,
  type AIProvider,
  type ChessAnalytics,
  type ChessProvider,
  type IntegrationsSummary,
  type Settings
} from "../services/api";

const aiProviders: Array<{ id: AIProvider; label: string; detail: string }> = [
  { id: "gemini", label: "Google Gemini", detail: "Use a personal key or the server-configured Gemini key." },
  { id: "openai", label: "OpenAI", detail: "Optional personal OpenAI API key." },
  { id: "anthropic", label: "Anthropic", detail: "Optional personal Anthropic API key." }
];

const chessProviders: Array<{ id: ChessProvider; label: string; detail: string }> = [
  { id: "chesscom", label: "Chess.com", detail: "Public game archives are fetched by username; no API key is needed." },
  { id: "lichess", label: "Lichess", detail: "Connect a username. An optional personal access token can unlock authenticated game export." }
];

const emptyKeys: Record<AIProvider, string> = { gemini: "", openai: "", anthropic: "" };
const emptyChessUsernames: Record<ChessProvider, string> = { chesscom: "", lichess: "" };
const emptyChessTokens: Record<ChessProvider, string> = { chesscom: "", lichess: "" };

function providerName(provider: AIProvider) {
  return aiProviders.find((item) => item.id === provider)?.label || provider;
}

function ChessSidePanel({ title, stats }: { title: string; stats: ChessAnalytics["by_side"]["white"] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-[11px] text-slate-500">{stats.games} games · {stats.wins} wins · {stats.draws} draws · {stats.losses} losses</p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{stats.score_percent}% score</span>
      </div>
      {stats.openings.length ? (
        <div className="mt-4 space-y-3">
          {stats.openings.map((opening) => (
            <div key={`${opening.eco || "unknown"}-${opening.name}`}>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="min-w-0 truncate font-medium text-slate-700">{opening.eco ? `${opening.eco} · ` : ""}{opening.name}</span>
                <span className="shrink-0 text-slate-500">{opening.games} games · {opening.score_percent}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${opening.score_percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : <p className="mt-4 text-xs text-slate-400">No games found for this side.</p>}
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsSummary | null>(null);
  const [apiKeys, setApiKeys] = useState(emptyKeys);
  const [chessUsernames, setChessUsernames] = useState(emptyChessUsernames);
  const [chessTokens, setChessTokens] = useState(emptyChessTokens);
  const [chessUsername, setChessUsername] = useState("");
  const [pgnText, setPgnText] = useState("");
  const [pgnUrl, setPgnUrl] = useState("");
  const [analytics, setAnalytics] = useState<ChessAnalytics | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSettings = async () => {
    try {
      const [nextSettings, nextIntegrations] = await Promise.all([getSettings(), getIntegrations()]);
      setSettings(nextSettings);
      setIntegrations(nextIntegrations);
      setChessUsernames({
        chesscom: nextIntegrations.chess_accounts.find((account) => account.provider === "chesscom")?.username || "",
        lichess: nextIntegrations.chess_accounts.find((account) => account.provider === "lichess")?.username || ""
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load settings");
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const savePrivacy = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setBusy("settings");
    setError("");
    setMessage("");
    try {
      setSettings(await updateSettings(settings));
      setMessage("Privacy and preference settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save settings");
    } finally {
      setBusy("");
    }
  };

  const saveApiKey = async (provider: AIProvider) => {
    const secret = apiKeys[provider].trim();
    if (!secret) {
      setError(`Enter a ${providerName(provider)} API key first.`);
      return;
    }
    setBusy(provider);
    setError("");
    setMessage("");
    try {
      await saveIntegration(provider, { secret });
      setApiKeys((current) => ({ ...current, [provider]: "" }));
      setMessage(`${providerName(provider)} key saved securely. It will not be shown again.`);
      await loadSettings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to save ${providerName(provider)} key`);
    } finally {
      setBusy("");
    }
  };

  const saveChessAccount = async (provider: ChessProvider) => {
    const username = chessUsernames[provider].trim();
    if (!username) {
      setError(`Enter your ${provider === "chesscom" ? "Chess.com" : "Lichess"} username first.`);
      return;
    }
    setBusy(provider);
    setError("");
    setMessage("");
    try {
      await saveIntegration(provider, {
        username,
        ...(provider === "lichess" && chessTokens.lichess.trim() ? { secret: chessTokens.lichess.trim() } : {})
      });
      setChessTokens(emptyChessTokens);
      setAnalytics(null);
      setMessage(`${provider === "chesscom" ? "Chess.com" : "Lichess"} account saved.`);
      await loadSettings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save chess account");
    } finally {
      setBusy("");
    }
  };

  const disconnect = async (provider: AIProvider | ChessProvider, label: string) => {
    if (!window.confirm(`Remove the saved ${label} integration?`)) return;
    setBusy(`remove-${provider}`);
    setError("");
    setMessage("");
    try {
      await removeIntegration(provider);
      setAnalytics(null);
      setMessage(`${label} integration removed.`);
      await loadSettings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to remove ${label}`);
    } finally {
      setBusy("");
    }
  };

  const refreshChessAnalytics = async (provider: ChessProvider) => {
    setBusy(`chess-${provider}`);
    setError("");
    setMessage("");
    try {
      setAnalytics(await getChessAnalytics(provider));
      setChessUsername(chessUsernames[provider]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retrieve chess analytics");
    } finally {
      setBusy("");
    }
  };

  const analyzePgnSource = async (event: FormEvent) => {
    event.preventDefault();
    if (Boolean(pgnText.trim()) === Boolean(pgnUrl.trim())) {
      setError("Enter either PGN text or one supported public URL.");
      return;
    }
    if (!chessUsername.trim()) {
      setError("Enter your Chess.com or Lichess username so your results can be identified in the PGN.");
      return;
    }
    setBusy("pgn");
    setError("");
    setMessage("");
    try {
      setAnalytics(await importChessGames({
        username: chessUsername.trim(),
        ...(pgnText.trim() ? { pgn: pgnText.trim() } : { url: pgnUrl.trim() })
      }));
      setPgnText("");
      setPgnUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze these chess games");
    } finally {
      setBusy("");
    }
  };

  const importPgnFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("PGN files must be 2 MB or smaller.");
      return;
    }
    setError("");
    try {
      setPgnText(await file.text());
      setPgnUrl("");
      setMessage(`${file.name} is ready to analyze.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read this PGN file");
    }
  };

  const exportData = async () => {
    setBusy("export");
    setError("");
    setMessage("");
    try {
      const blob = await downloadUserData();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "mindos-data-export.json";
      link.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Your data export has been downloaded. Provider credentials are intentionally excluded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to export your data");
    } finally {
      setBusy("");
    }
  };

  if (!settings || !integrations) {
    return <p className="text-sm text-slate-500">{error || "Loading settings…"}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <p className="section-label">Your controls</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Settings & privacy</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Choose what stays private, which services can process your data, and what you connect to your workspace.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{message}</p>}

      <form onSubmit={savePrivacy} className="surface-card p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-brand"><ShieldCheck size={19} /></span>
          <div>
            <h2 className="text-base font-semibold text-ink">Privacy and preferences</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Your profile starts private. Sharing and optional AI processing are separate choices.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Profile visibility
            <select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink" value={settings.profile_visibility} onChange={(event) => setSettings({ ...settings, profile_visibility: event.target.value as Settings["profile_visibility"] })}>
              <option value="private">Private</option>
              <option value="connections">Connections</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Timezone
            <input maxLength={64} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Language / locale
            <input maxLength={20} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-ink" value={settings.locale} onChange={(event) => setSettings({ ...settings, locale: event.target.value })} />
          </label>
          <div className="space-y-4 md:col-span-2">
            <label className="flex items-start gap-3 text-xs font-medium text-slate-600">
              <input type="checkbox" className="mt-0.5 accent-violet-600" checked={settings.allow_discovery} onChange={(event) => setSettings({ ...settings, allow_discovery: event.target.checked })} />
              <span><span className="font-semibold text-ink">Allow profile discovery</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">Lets other MINDOS users find your profile. It does not publish private knowledge or posts.</span></span>
            </label>
            <label className="flex items-start gap-3 text-xs font-medium text-slate-600">
              <input type="checkbox" className="mt-0.5 accent-violet-600" checked={settings.ai_features_enabled} onChange={(event) => setSettings({ ...settings, ai_features_enabled: event.target.checked })} />
              <span><span className="font-semibold text-ink">Enable optional AI features</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">When enabled, selected file text is sent only to the provider you choose when you start AI-assisted import. Local extraction stays on MINDOS.</span></span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-[10px] text-slate-400">Use the moon/sun button in the header to change the saved theme.</p>
          <button type="submit" disabled={busy === "settings"} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white disabled:opacity-50">
            {busy === "settings" ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Save preferences
          </button>
        </div>
      </form>

      <section className="surface-card p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><KeyRound size={19} /></span>
          <div>
            <h2 className="text-base font-semibold text-ink">AI providers</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use a provider key only when you need AI suggestions. Keys are encrypted by the backend and never sent back to this page.</p>
          </div>
        </div>
        {!integrations.ai_key_storage_available && (
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            <CircleAlert size={15} className="mt-0.5 shrink-0" />
            Personal keys are unavailable until the backend has an <code>INTEGRATION_ENCRYPTION_KEY</code>. Gemini may still be available through a server key.
          </p>
        )}
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {aiProviders.map((provider) => {
            const status = integrations.providers.find((item) => item.provider === provider.id);
            return (
              <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-ink">{provider.label}</h3><p className="mt-1 min-h-10 text-[10px] leading-4 text-slate-500">{provider.detail}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${status?.configured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{status?.configured ? "Ready" : "Not connected"}</span>
                </div>
                {provider.id === "gemini" && status?.server_key_available && <p className="mt-3 text-[10px] font-medium text-emerald-700">A site-managed Gemini key is available.</p>}
                <label className="mt-4 block text-[10px] font-semibold text-slate-600">
                  {status?.user_key_saved ? "Replace personal API key" : "Personal API key"}
                  <input
                    type="password"
                    autoComplete="new-password"
                    maxLength={8192}
                    disabled={!integrations.ai_key_storage_available}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={status?.user_key_saved ? "Saved securely · enter to replace" : "Paste key"}
                    value={apiKeys[provider.id]}
                    onChange={(event) => setApiKeys((current) => ({ ...current, [provider.id]: event.target.value }))}
                  />
                </label>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" disabled={!integrations.ai_key_storage_available || busy === provider.id} onClick={() => void saveApiKey(provider.id)} className="rounded-lg bg-[#24233c] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                    {busy === provider.id ? "Saving…" : "Save key"}
                  </button>
                  {status?.user_key_saved && <button type="button" disabled={busy === `remove-${provider.id}`} onClick={() => void disconnect(provider.id, provider.label)} className="rounded-lg px-2 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={13} className="inline" /> Remove key</button>}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-[10px] leading-5 text-slate-400">Provider usage may incur charges under your provider account. A key is used only after you enable optional AI and select that provider for an import.</p>
      </section>

      <section className="surface-card p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-800"><Activity size={19} /></span>
          <div>
            <h2 className="text-base font-semibold text-ink">Chess integrations</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Analyze up to 200 recent games by side, opening, and score. Only public games are fetched; no moves are sent to chess providers.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {chessProviders.map((provider) => {
            const account = integrations.chess_accounts.find((item) => item.provider === provider.id);
            return (
              <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-ink">{provider.label}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{provider.detail}</p></div>
                  {account?.connected && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">Connected</span>}
                </div>
                <label className="mt-4 block text-[10px] font-semibold text-slate-600">Username
                  <input autoComplete="off" maxLength={64} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-ink" value={chessUsernames[provider.id]} onChange={(event) => setChessUsernames((current) => ({ ...current, [provider.id]: event.target.value }))} />
                </label>
                {provider.id === "lichess" && (
                  <label className="mt-3 block text-[10px] font-semibold text-slate-600">Optional Lichess access token
                    <input type="password" autoComplete="new-password" maxLength={8192} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-ink" placeholder={account?.access_token_saved ? "Saved securely · enter to replace" : "Token with game-reading permission"} value={chessTokens.lichess} onChange={(event) => setChessTokens((current) => ({ ...current, lichess: event.target.value }))} />
                  </label>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy === provider.id} onClick={() => void saveChessAccount(provider.id)} className="rounded-lg bg-[#24233c] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">{account?.connected ? "Update account" : "Connect account"}</button>
                  {account?.connected && (
                    <>
                      <button type="button" disabled={busy === `chess-${provider.id}`} onClick={() => void refreshChessAnalytics(provider.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 disabled:opacity-50">
                        {busy === `chess-${provider.id}` ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />} Analyze games
                      </button>
                      <button type="button" disabled={busy === `remove-${provider.id}`} onClick={() => void disconnect(provider.id, provider.label)} className="rounded-lg px-2 py-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={13} className="inline" /> Disconnect</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <form onSubmit={analyzePgnSource} className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
          <div className="flex items-center gap-2"><Upload size={15} className="text-violet-500" /><h3 className="text-xs font-semibold text-ink">Analyze PGN or a public game URL</h3></div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Supported URLs: Chess.com member profiles and public monthly PGN archives, plus Lichess profiles and public game links. For a Chess.com game page, paste its PGN instead.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-[10px] font-semibold text-slate-600">Your username in the games
              <input required maxLength={64} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-ink" value={chessUsername} onChange={(event) => setChessUsername(event.target.value)} />
            </label>
            <label className="text-[10px] font-semibold text-slate-600">Public Chess.com / Lichess URL
              <input type="url" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-ink" placeholder="https://lichess.org/…" value={pgnUrl} onChange={(event) => { setPgnUrl(event.target.value); setPgnText(""); }} />
            </label>
          </div>
          <label className="mt-3 block text-[10px] font-semibold text-slate-600">Or paste PGN
            <textarea maxLength={2_000_000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-[10px] text-ink" placeholder={'[Event "Example"]\n[White "YourUsername"]\n[Black "Opponent"]\n[Result "1-0"]'} value={pgnText} onChange={(event) => { setPgnText(event.target.value); setPgnUrl(""); }} />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-slate-500">
              <Upload size={13} /> Choose PGN file
              <input type="file" accept=".pgn,text/plain" className="sr-only" onChange={(event) => void importPgnFile(event.target.files?.[0])} />
            </label>
            <button type="submit" disabled={busy === "pgn"} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-50">
              {busy === "pgn" ? <LoaderCircle size={13} className="animate-spin" /> : <Activity size={13} />} Analyze up to 200 games
            </button>
          </div>
        </form>
        {analytics && (
          <section className="mt-5 space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Chess report</p><h3 className="mt-1 text-sm font-semibold text-ink">{analytics.username} · {analytics.games_analyzed} games analyzed</h3></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-500">Most recent sample · max 200 games</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChessSidePanel title="Playing White · your openings" stats={analytics.by_side.white} />
              <ChessSidePanel title="Playing Black · your responses" stats={analytics.by_side.black} />
            </div>
            <p className="text-[10px] leading-5 text-slate-400">Opening labels and results come from public PGN game headers; unclassified or missing game metadata may be omitted. This is descriptive game history, not coaching or a skill diagnosis.</p>
          </section>
        )}
      </section>

      <section className="surface-card flex flex-wrap items-center justify-between gap-4 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><LockKeyhole size={19} /></span>
          <div><h2 className="text-base font-semibold text-ink">Your data</h2><p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">Download a JSON copy of your profile, settings, knowledge, learning goals, reflections, decisions, and social activity. API keys and access tokens are never included.</p></div>
        </div>
        <button type="button" disabled={busy === "export"} onClick={() => void exportData()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:text-brand disabled:opacity-50">
          {busy === "export" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} Export my data
        </button>
      </section>
      <p className="flex items-center gap-2 text-[10px] text-slate-400"><Link2 size={12} /> Theme and integrations are managed per account; external providers receive data only when you initiate an action.</p>
    </div>
  );
}
