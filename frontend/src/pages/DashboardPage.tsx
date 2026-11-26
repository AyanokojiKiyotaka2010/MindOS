import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit,
  CircleHelp, Compass, GitBranch, Layers3, Network,
  Plus, Sparkles, Target
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getDashboardSummary, listKnowledgeItems, listKnowledgeRelations,
  type DashboardSummary, type KnowledgeItem, type KnowledgeRelation
} from "../services/api";

function statusColor(status: KnowledgeItem["understanding_status"]) {
  if (status === "understood") return "#a3e635";
  if (status === "reviewing") return "#a78bfa";
  if (status === "needs_clarification") return "#fb923c";
  return "#67e8f9";
}

function KnowledgeConstellation({
  items,
  relations,
  loading
}: {
  items: KnowledgeItem[];
  relations: KnowledgeRelation[];
  loading: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const points = useMemo(() => items.slice(0, 8).map((item, index, list) => {
    const angle = (Math.PI * 2 * index) / Math.max(list.length, 1) - Math.PI / 2;
    return { item, x: 300 + Math.cos(angle) * 186, y: 170 + Math.sin(angle) * 104 };
  }), [items]);
  const pointById = useMemo(() => new Map(points.map((point) => [point.item.id, point])), [points]);
  const selected = points.find((point) => point.item.id === selectedId) ?? points[0];
  const visibleRelations = showConnections ? relations.filter((relation) =>
    pointById.has(relation.source_item_id) && pointById.has(relation.target_item_id)
  ) : [];

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  };

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Your knowledge universe</span>
            <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-800">Live map</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-ink">Ideas, in orbit</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowConnections((visible) => !visible)}
          aria-pressed={showConnections}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition ${showConnections ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500"}`}
        >
          <GitBranch size={14} /> {showConnections ? "Connections on" : "Connections off"}
        </button>
      </div>

      {points.length === 0 && loading ? (
        <div className="m-5 flex min-h-[270px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/70">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />Mapping your ideas…</span>
        </div>
      ) : points.length === 0 ? (
        <div className="relative m-5 flex min-h-[270px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-[#f7f6ff] px-6 text-center">
          <div className="absolute h-48 w-48 rounded-full border border-violet-200/70" />
          <div className="absolute h-32 w-32 rounded-full border border-violet-200/70" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-soft"><BrainCircuit size={22} /></div>
          <h3 className="relative mt-4 text-sm font-semibold text-ink">Your first idea starts the map</h3>
          <p className="relative mt-1 max-w-xs text-xs leading-5 text-slate-500">Capture a note or concept and watch your knowledge universe take shape.</p>
          <Link to="/vault" className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700">
            <Plus size={14} /> Capture an idea
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-[#151627]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(101,88,211,0.22),transparent_65%)]" />
            <svg viewBox="0 0 600 340" role="img" aria-label="Interactive map of your knowledge items" className="relative block h-[280px] w-full sm:h-[320px]">
              <defs>
                <pattern id="constellation-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#ffffff" fillOpacity=".08" />
                </pattern>
                <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect width="600" height="340" fill="url(#constellation-grid)" />
              <circle cx="300" cy="170" r="122" fill="none" stroke="#ffffff" strokeOpacity=".07" strokeDasharray="2 7" />
              <circle cx="300" cy="170" r="74" fill="none" stroke="#ffffff" strokeOpacity=".08" />
              <circle cx="300" cy="170" r="5" fill="#a78bfa" opacity=".8" />
              {visibleRelations.map((relation) => {
                const source = pointById.get(relation.source_item_id);
                const target = pointById.get(relation.target_item_id);
                if (!source || !target) return null;
                return <line key={relation.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#a78bfa" strokeOpacity=".34" strokeWidth="1.5" />;
              })}
              {points.map(({ item, x, y }) => {
                const isSelected = selected?.item.id === item.id;
                const color = statusColor(item.understanding_status);
                return (
                  <g
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${item.title}, ${item.understanding_status.replace("_", " ")}`}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => handleKeyDown(event, item.id)}
                    className="cursor-pointer outline-none"
                  >
                    {isSelected && <circle cx={x} cy={y} r="25" fill={color} fillOpacity=".2" filter="url(#node-glow)" />}
                    <circle cx={x} cy={y} r={isSelected ? 15 : 11} fill={color} fillOpacity={isSelected ? ".95" : ".72"} stroke="#fff" strokeOpacity=".8" strokeWidth="2" />
                    <circle cx={x} cy={y} r="3" fill="#151627" />
                    <text x={x} y={y + 31} textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight={isSelected ? "700" : "500"} opacity={isSelected ? ".98" : ".7"}>
                      {item.title.length > 19 ? `${item.title.slice(0, 18)}…` : item.title}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="absolute bottom-3 left-4 flex flex-wrap gap-3 text-[9px] font-medium text-slate-300">
              {[["#67e8f9", "Captured"], ["#a78bfa", "Reviewing"], ["#a3e635", "Understood"], ["#fb923c", "Clarify"]].map(([color, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>
              ))}
            </div>
            {items.length > 8 && <span className="absolute bottom-3 right-4 text-[9px] text-slate-400">Showing 8 of {items.length}</span>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">Selected idea</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{selected?.item.title}</p>
              <p className="mt-0.5 text-[11px] capitalize text-slate-500">{selected?.item.item_type} · {selected?.item.understanding_status.replace("_", " ")}</p>
            </div>
            <Link to="/graph" className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-brand transition hover:gap-3">
              Open full graph <ArrowUpRight size={14} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSummary, nextItems, nextRelations] = await Promise.all([
        getDashboardSummary(), listKnowledgeItems(), listKnowledgeRelations()
      ]);
      setSummary(nextSummary);
      setItems(nextItems);
      setRelations(nextRelations);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = user?.display_name?.trim().split(/\s+/)[0] || "there";
  const understoodPercent = summary?.knowledge_items
    ? Math.round((summary.understood_knowledge / summary.knowledge_items) * 100)
    : 0;
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const stats = [
    { label: "Knowledge captured", value: summary?.knowledge_items ?? 0, note: `${summary?.understood_knowledge ?? 0} understood`, icon: Layers3, href: "/vault", color: "violet" },
    { label: "Active learning", value: summary?.active_learning_goals ?? 0, note: `of ${summary?.learning_goals ?? 0} goals`, icon: Compass, href: "/learning", color: "cyan" },
    { label: "Ideas connected", value: summary?.relations ?? 0, note: "in your knowledge graph", icon: Network, href: "/graph", color: "lime" },
    { label: "Reflections", value: summary?.reflections ?? 0, note: `${summary?.decisions ?? 0} decisions logged`, icon: BrainCircuit, href: "/mindtrace", color: "orange" }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="dashboard-hero relative overflow-hidden rounded-[28px] px-6 py-7 text-white md:px-9 md:py-9">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-violet-200"><Sparkles size={14} /> {dateLabel}</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {firstName}<span className="text-lime-300">.</span></h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">A little clarity goes a long way. Pick up where your curiosity takes you today.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/vault" className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-3 text-xs font-extrabold text-[#17182a] transition hover:-translate-y-0.5 hover:bg-lime-200">
                <Plus size={15} /> Capture an idea
              </Link>
              <Link to="/mindtrace" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/10">
                Take a mindful pause <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center lg:mr-8">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-4 rounded-full border border-dashed border-violet-300/30" />
            <div className="absolute inset-[34px] rounded-full border border-white/10" />
            <div className="absolute inset-0 animate-[spin_32s_linear_infinite]">
              <span className="absolute left-[18px] top-[35px] h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_16px_#bef264]" />
              <span className="absolute right-[20px] top-[88px] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]" />
              <span className="absolute bottom-[18px] left-[64px] h-1.5 w-1.5 rounded-full bg-violet-300" />
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/15 bg-white/[0.08] text-lime-200 shadow-[0_0_48px_rgba(167,139,250,0.18)] backdrop-blur">
              <BrainCircuit size={30} strokeWidth={1.4} />
            </div>
            <span className="absolute -bottom-1 rounded-full border border-white/10 bg-[#202039] px-3 py-1 text-[9px] font-semibold tracking-wider text-violet-200">YOUR SECOND BRAIN</span>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-400/[0.07] blur-3xl" />
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-bold underline underline-offset-2">Try again</button>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><p className="section-label">Your signal</p><h2 className="mt-1 text-lg font-semibold text-ink">A living snapshot</h2></div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`} />{loading ? "Syncing your space" : "Up to date"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, href, color }) => (
            <Link key={label} to={href} className="stat-card group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl stat-icon-${color}`}><Icon size={18} /></span>
                <ArrowUpRight size={15} className="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
              <div className="mt-5 flex items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-semibold tracking-tight text-ink">{loading ? "—" : value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{label}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{note}</p>
                </div>
                {label === "Knowledge captured" && <span className="mb-1 text-[10px] font-bold text-violet-600">{understoodPercent}%<span className="block font-medium text-slate-400">understood</span></span>}
              </div>
              <span className={`absolute -bottom-8 -right-5 h-20 w-20 rounded-full opacity-[0.06] stat-orb-${color}`} />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <KnowledgeConstellation items={items} relations={relations} loading={loading} />

        <div className="space-y-5">
          <section className="surface-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="section-label">Understanding</p><h2 className="mt-1 text-base font-semibold text-ink">Knowledge, not just notes</h2></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-50 text-lime-700"><Target size={19} /></div>
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#84cc16 ${understoodPercent}%, #f1f0f8 ${understoodPercent}% 100%)` }}>
                <div className="flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-lg font-bold leading-none text-ink">{loading ? "—" : `${understoodPercent}%`}</span>
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">understood</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">{summary?.understood_knowledge ?? 0} of {summary?.knowledge_items ?? 0} ideas</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Marked as understood. Revisit one idea to strengthen the connections.</p>
              </div>
            </div>
            <Link to="/vault" className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-brand">
              Review your knowledge <ArrowRight size={14} />
            </Link>
          </section>

          <section className="surface-card overflow-hidden p-5 md:p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-brand"><Sparkles size={15} /></div>
              <p className="section-label">A gentle nudge</p>
            </div>
            <h2 className="mt-4 text-lg font-semibold leading-snug text-ink">Curiosity compounds.</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Capture one thought, connect it to something you know, and your personal map gets a little clearer.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Capture", icon: BookOpen, href: "/vault" },
                { label: "Explore", icon: Compass, href: "/learning" },
                { label: "Reflect", icon: CircleHelp, href: "/mindtrace" }
              ].map(({ label, icon: Icon, href }) => (
                <Link key={label} to={href} className="group flex flex-col items-center gap-2 rounded-xl bg-slate-50 px-2 py-3 text-center transition hover:bg-violet-50">
                  <Icon size={17} className="text-slate-500 transition group-hover:text-brand" />
                  <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-[#f5f3ff] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand"><ArrowDownRight size={17} /></div>
          <div><p className="text-xs font-semibold text-ink">Your next insight is one connection away.</p><p className="mt-0.5 text-[10px] text-slate-500">Build your own web of understanding, one idea at a time.</p></div>
        </div>
        <Link to="/graph" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold text-brand transition hover:bg-white">Explore connections <ArrowRight size={13} /></Link>
      </div>
    </div>
  );
}
