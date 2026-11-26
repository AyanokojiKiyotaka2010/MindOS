import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import {
  ArrowUpRight, Compass, Focus, GitBranch, LoaderCircle, Minus, Network,
  Plus, Search, Sparkles, X
} from "lucide-react";
import {
  createKnowledgeRelation,
  deleteKnowledgeRelation,
  listKnowledgeItems,
  listKnowledgeRelations,
  type KnowledgeItem,
  type KnowledgeRelation,
} from "../services/api";

type GraphNode = KnowledgeItem & {
  id: string;
  degree: number;
  x?: number;
  y?: number;
};

type GraphLink = KnowledgeRelation & {
  source: string | GraphNode;
  target: string | GraphNode;
};

function nodeColor(status: KnowledgeItem["understanding_status"]) {
  if (status === "understood") return "#bef264";
  if (status === "reviewing") return "#c4b5fd";
  if (status === "needs_clarification") return "#fdba74";
  return "#67e8f9";
}

export default function GraphPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<KnowledgeRelation["relation_type"]>("related_to");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 560 });
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const canvasRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextItems, nextRelations] = await Promise.all([listKnowledgeItems(), listKnowledgeRelations()]);
      setItems(nextItems);
      setRelations(nextRelations);
      setSelectedId((current) => current && nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load graph");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(360, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const tagOptions = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags))).sort(), [items]);
  const degreeById = useMemo(() => {
    const degrees = new Map<string, number>();
    for (const relation of relations) {
      degrees.set(relation.source_item_id, (degrees.get(relation.source_item_id) || 0) + 1);
      degrees.set(relation.target_item_id, (degrees.get(relation.target_item_id) || 0) + 1);
    }
    return degrees;
  }, [relations]);
  const filteredItems = useMemo(() => items.filter((item) =>
    (!selectedTag || item.tags.includes(selectedTag))
    && (!selectedStatus || item.understanding_status === selectedStatus)
  ), [items, selectedTag, selectedStatus]);
  const visibleIds = useMemo(() => new Set(filteredItems.map((item) => item.id)), [filteredItems]);
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = filteredItems.map((item) => ({ ...item, degree: degreeById.get(item.id) || 0 }));
    const links: GraphLink[] = relations
      .filter((relation) => visibleIds.has(relation.source_item_id) && visibleIds.has(relation.target_item_id))
      .map((relation) => ({ ...relation, source: relation.source_item_id, target: relation.target_item_id }));
    return { nodes, links };
  }, [filteredItems, relations, visibleIds, degreeById]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const neighborIds = useMemo(() => {
    const result = new Set<string>();
    if (selectedId) {
      result.add(selectedId);
      for (const relation of relations) {
        if (relation.source_item_id === selectedId) result.add(relation.target_item_id);
        if (relation.target_item_id === selectedId) result.add(relation.source_item_id);
      }
    }
    return result;
  }, [relations, selectedId]);
  const searchMatches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return new Set(filteredItems.filter((item) => !term || item.title.toLocaleLowerCase().includes(term)).map((item) => item.id));
  }, [filteredItems, search]);
  const selectedRelations = selected ? relations.filter((relation) =>
    relation.source_item_id === selected.id || relation.target_item_id === selected.id
  ) : [];
  const currentNodes = new Set(graphData.nodes.map((node) => node.id));

  const focusNode = (node: GraphNode) => {
    setSelectedId(node.id);
    graphRef.current?.centerAt(node.x, node.y, 500);
    graphRef.current?.zoom(2.2, 500);
  };

  const addRelation = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createKnowledgeRelation({ source_item_id: sourceId, target_item_id: targetId, relation_type: relationType });
      setSourceId("");
      setTargetId("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create relation");
    } finally {
      setBusy(false);
    }
  };

  const removeRelation = async (relation: KnowledgeRelation) => {
    setError("");
    try {
      await deleteKnowledgeRelation(relation.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove relation");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedTag("");
    setSelectedStatus("");
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Knowledge Graph</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">See how ideas connect</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Move through your knowledge like a living map. Drag ideas, zoom in, and follow the connections.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm">
          <Sparkles size={13} className="text-violet-500" /> Drag to explore <span className="text-slate-300">·</span> Scroll to zoom
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200/70 bg-[#111321] shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Network size={17} /></span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">Your knowledge universe</p>
                <p className="mt-0.5 text-[9px] text-slate-400">{graphData.nodes.length} visible ideas · {graphData.links.length} connections</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Zoom out" onClick={() => graphRef.current?.zoom(Math.max(0.5, (graphRef.current?.zoom() || 1) / 1.4), 250)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><Minus size={15} /></button>
              <button type="button" aria-label="Zoom in" onClick={() => graphRef.current?.zoom(Math.min(8, (graphRef.current?.zoom() || 1) * 1.4), 250)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><Plus size={15} /></button>
              <button type="button" aria-label="Fit graph to view" onClick={() => graphRef.current?.zoomToFit(500, 60)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><Focus size={15} /></button>
            </div>
          </div>

          <div className="relative h-[500px] sm:h-[580px]" ref={canvasRef}>
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400"><LoaderCircle size={16} className="mr-2 animate-spin" />Arranging your ideas…</div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-violet-200"><Network size={24} /></div>
                <h2 className="mt-4 text-sm font-semibold text-white">Your graph is waiting for its first ideas</h2>
                <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">Import an Obsidian vault or add knowledge notes. MINDOS can suggest concepts and links for you to review.</p>
                <a href="/import" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-300 px-4 py-2.5 text-xs font-bold text-[#171827] transition hover:bg-lime-200">Import a knowledge base <ArrowUpRight size={14} /></a>
              </div>
            ) : graphData.nodes.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
                <p className="text-sm font-semibold text-white">No ideas match these filters</p><p className="mt-2 text-xs">Clear a filter to bring nodes back into view.</p>
              </div>
            ) : (
              <ForceGraph2D<GraphNode, GraphLink>
                ref={graphRef}
                graphData={graphData}
                width={canvasSize.width}
                height={canvasSize.height}
                backgroundColor="#111321"
                nodeId="id"
                nodeLabel={(node) => `${node.title} · ${node.tags.join(", ") || node.understanding_status.replace("_", " ")}`}
                nodeVal={(node) => Math.min(7, 2.5 + Math.sqrt(node.degree) * 1.5)}
                nodeColor={(node) => {
                  if (search.trim() && !searchMatches.has(node.id)) return "#33384c";
                  if (selectedId && !neighborIds.has(node.id)) return "#42445a";
                  return nodeColor(node.understanding_status);
                }}
                nodeCanvasObjectMode={() => "after"}
                nodeCanvasObject={(node, context, globalScale) => {
                  const fontSize = Math.max(3, 11 / globalScale);
                  context.save();
                  context.font = `${fontSize}px Inter, ui-sans-serif, sans-serif`;
                  context.textAlign = "center";
                  context.textBaseline = "top";
                  context.fillStyle = search.trim() && !searchMatches.has(node.id) ? "rgba(226,232,240,.3)" : "rgba(248,250,252,.9)";
                  const label = node.title.length > 30 ? `${node.title.slice(0, 29)}…` : node.title;
                  context.fillText(label, node.x || 0, (node.y || 0) + (4 + Math.sqrt(node.degree) * 2.5) + 3);
                  context.restore();
                }}
                linkColor={(link) => link.relation_type === "contradicts" ? "rgba(251,146,60,.55)" : "rgba(167,139,250,.48)"}
                linkWidth={(link) => selectedId && (link.source as GraphNode).id === selectedId ? 1.8 : 1}
                linkLabel={(link) => `${link.relation_type.replace("_", " ")}${link.note ? ` · ${link.note}` : ""}`}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={0.9}
                linkDirectionalParticles={1}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleColor={() => "#c4b5fd"}
                onNodeClick={(node) => focusNode(node)}
                onBackgroundClick={() => setSelectedId(null)}
                enableNodeDrag
                enableZoomInteraction
                enablePanInteraction
                cooldownTicks={120}
                d3AlphaDecay={0.035}
                minZoom={0.3}
                maxZoom={8}
              />
            )}
            <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-xl border border-white/[0.08] bg-[#171827]/85 px-3 py-2 text-[9px] font-medium text-slate-300 backdrop-blur">
              {[
                ["#67e8f9", "Captured"],
                ["#c4b5fd", "Reviewing"],
                ["#bef264", "Understood"],
                ["#fdba74", "Clarify"]
              ].map(([color, label]) => <span key={label} className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="surface-card p-4">
            <div className="flex items-center gap-2"><Search size={15} className="text-brand" /><h2 className="text-xs font-semibold text-ink">Find a thought</h2></div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search idea titles…" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400" />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-slate-400 hover:text-ink"><X size={13} /></button>}
            </div>
            {search.trim() && (
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {items.filter((item) => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setSelectedTag(""); setSelectedStatus(""); const node = graphData.nodes.find((entry) => entry.id === item.id); if (node) focusNode(node); }} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 hover:bg-violet-50 hover:text-brand">{item.title}</button>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status
                <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-600">
                  <option value="">All statuses</option>
                  <option value="captured">Captured</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="understood">Understood</option>
                  <option value="needs_clarification">Needs clarification</option>
                </select>
              </label>
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tag
                <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-600">
                  <option value="">All tags</option>
                  {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>
            </div>
            {(selectedTag || selectedStatus || search) && <button type="button" onClick={clearFilters} className="mt-3 text-[10px] font-bold text-brand hover:text-violet-800">Clear filters</button>}
          </section>

          <section className="surface-card min-h-[230px] p-4">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="section-label">Selected idea</p>
                    <h2 className="mt-2 break-words text-base font-semibold leading-snug text-ink">{selected.title}</h2>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-brand"><Compass size={17} /></span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold capitalize text-slate-600">{selected.item_type}</span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-semibold capitalize text-violet-700">{selected.understanding_status.replace("_", " ")}</span>
                  {selected.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-semibold text-cyan-800">#{tag}</span>)}
                </div>
                {selected.content && <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{selected.content}</p>}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{selectedRelations.length} direct connection{selectedRelations.length === 1 ? "" : "s"}</p>
                  {selectedRelations.length > 0 && <div className="mt-2 space-y-1.5">
                    {selectedRelations.slice(0, 5).map((relation) => {
                      const neighborId = relation.source_item_id === selected.id ? relation.target_item_id : relation.source_item_id;
                      const neighbor = items.find((item) => item.id === neighborId);
                      return <button key={relation.id} type="button" onClick={() => { const node = graphData.nodes.find((entry) => entry.id === neighborId); if (node) focusNode(node); }} className="flex w-full items-center gap-2 text-left text-[10px] text-slate-600 hover:text-brand"><GitBranch size={12} className="shrink-0 text-violet-400" /><span className="truncate">{neighbor?.title || "Idea"} · {relation.relation_type.replace("_", " ")}</span></button>;
                    })}
                  </div>}
                </div>
              </>
            ) : <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Focus size={17} /></div><p className="mt-3 text-xs font-semibold text-ink">Select an idea to inspect it</p><p className="mt-1 text-[10px] text-slate-400">Click a node or search for a title.</p></div>}
          </section>
        </aside>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}

      <details className="surface-card overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
          <span><span className="section-label">Manual curation</span><span className="mt-1 block text-sm font-semibold text-ink">Add a connection between ideas</span></span>
          <span className="rounded-lg bg-violet-50 p-2 text-brand"><GitBranch size={16} /></span>
        </summary>
        <form onSubmit={addRelation} className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_1fr_180px_auto]">
          <select required className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            <option value="">Source idea</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <select required className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            <option value="">Target idea</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={relationType} onChange={(event) => setRelationType(event.target.value as KnowledgeRelation["relation_type"])}>
            <option value="related_to">Related to</option>
            <option value="supports">Supports</option>
            <option value="contradicts">Contradicts</option>
            <option value="expands">Expands</option>
            <option value="depends_on">Depends on</option>
            <option value="example_of">Example of</option>
          </select>
          <button disabled={busy || items.length < 2} className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Add connection"}</button>
        </form>
      </details>

      {relations.length > 0 && (
        <details className="surface-card overflow-hidden">
          <summary className="cursor-pointer list-none p-5 text-sm font-semibold text-ink">Connection list <span className="ml-1 text-xs font-medium text-slate-400">({relations.length})</span></summary>
          <div className="grid gap-2 border-t border-slate-100 p-4 md:grid-cols-2">
            {relations.map((relation) => (
              <div key={relation.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-3 text-[10px]">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{items.find((item) => item.id === relation.source_item_id)?.title || "Idea"} <span className="font-medium text-violet-500">{relation.relation_type.replace("_", " ")}</span> {items.find((item) => item.id === relation.target_item_id)?.title || "Idea"}</span>
                <button type="button" onClick={() => void removeRelation(relation)} className="shrink-0 rounded-lg px-2 py-1 font-bold text-rose-400 hover:bg-rose-50 hover:text-rose-700">Remove</button>
              </div>
            ))}
          </div>
        </details>
      )}
      {!loading && items.length > 0 && currentNodes.size < items.length && <p className="text-center text-[10px] text-slate-400">Some items are hidden by the current filters.</p>}
    </div>
  );
}
