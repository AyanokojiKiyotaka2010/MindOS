import { useEffect, useState, type FormEvent } from "react";
import {
  createKnowledgeRelation,
  deleteKnowledgeRelation,
  listKnowledgeItems,
  listKnowledgeRelations,
  type KnowledgeItem,
  type KnowledgeRelation,
} from "../services/api";

export default function GraphPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<KnowledgeRelation["relation_type"]>("related_to");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [nextItems, nextRelations] = await Promise.all([listKnowledgeItems(), listKnowledgeRelations()]);
      setItems(nextItems);
      setRelations(nextRelations);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load graph");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addRelation = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await createKnowledgeRelation({ source_item_id: sourceId, target_item_id: targetId, relation_type: relationType });
      setSourceId("");
      setTargetId("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create relation");
    }
  };

  const removeRelation = async (relation: KnowledgeRelation) => {
    await deleteKnowledgeRelation(relation.id);
    await load();
  };

  const positions = items.map((item, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(items.length, 1);
    return { item, x: 320 + Math.cos(angle) * 210, y: 220 + Math.sin(angle) * 150 };
  });

  const positionById = new Map(positions.map((position) => [position.item.id, position]));

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <p className="section-label">Knowledge Graph</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">See how ideas connect</h1>
      </div>

      <form onSubmit={addRelation} className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 md:grid-cols-[1fr_1fr_180px_auto]">
        <select required className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
          <option value="">Source item</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <select required className="rounded-xl border border-slate-200 px-3 py-3 text-sm" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
          <option value="">Target item</option>
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
        <button className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white">Add relation</button>
      </form>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400">Capture at least two knowledge items to build a graph.</p>
        ) : (
          <svg viewBox="0 0 640 440" className="h-[440px] w-full">
            {relations.map((relation) => {
              const source = positionById.get(relation.source_item_id);
              const target = positionById.get(relation.target_item_id);
              if (!source || !target) return null;
              return <line key={relation.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#a78bfa" strokeWidth="2" />;
            })}
            {positions.map(({ item, x, y }) => (
              <g key={item.id}>
                <circle cx={x} cy={y} r="34" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="2" />
                <text x={x} y={y + 52} textAnchor="middle" fill="#334155" fontSize="11">{item.title.slice(0, 24)}</text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {relations.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {relations.map((relation) => (
            <div key={relation.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 text-sm">
              <div>
                <span className="font-semibold text-ink">{items.find((item) => item.id === relation.source_item_id)?.title || "Item"}</span>
                <span className="mx-2 text-violet-500">{relation.relation_type.replace("_", " ")}</span>
                <span className="font-semibold text-ink">{items.find((item) => item.id === relation.target_item_id)?.title || "Item"}</span>
              </div>
              <button onClick={() => void removeRelation(relation)} className="text-xs font-bold text-rose-400">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
