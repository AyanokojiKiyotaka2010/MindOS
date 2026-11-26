import { useEffect, useState, type FormEvent } from "react";
import { Archive, Plus, Search, Star } from "lucide-react";
import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  importKnowledgeUrl,
  listKnowledgeItems,
  uploadKnowledgeFile,
  updateKnowledgeItem,
  type KnowledgeItem,
} from "../services/api";

export default function VaultPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [itemType, setItemType] = useState<KnowledgeItem["item_type"]>("note");
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [importUrl, setImportUrl] = useState("");

  const load = async (nextSearch = "") => {
    try {
      setItems(await listKnowledgeItems(nextSearch));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load knowledge");
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await createKnowledgeItem({
        title,
        content,
        item_type: itemType,
        understanding_status: "captured",
        is_favorite: false,
        tags: tagInput.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      setTitle("");
      setContent("");
      setTagInput("");
      setItemType("note");
      await load(search);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save");
    }
  };

  const toggleFavorite = async (item: KnowledgeItem) => {
    await updateKnowledgeItem(item.id, { is_favorite: !item.is_favorite });
    await load(search);
  };

  const archiveItem = async (item: KnowledgeItem) => {
    await updateKnowledgeItem(item.id, { is_archived: true });
    await load(search);
  };

  const removeItem = async (item: KnowledgeItem) => {
    await deleteKnowledgeItem(item.id);
    await load(search);
  };

  const importUrlItem = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await importKnowledgeUrl(importUrl);
      setImportUrl("");
      await load(search);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import URL");
    }
  };

  const uploadFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      await uploadKnowledgeFile(file);
      await load(search);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload file");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Knowledge Vault</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Capture and understand</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={importUrlItem} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <input required type="url" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="https://example.com/article" value={importUrl} onChange={(event) => setImportUrl(event.target.value)} />
            <button className="rounded-xl bg-brand px-4 text-sm font-bold text-white">Import URL</button>
          </form>
          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-4 text-sm font-bold text-violet-700">
            Upload text, Markdown, or PDF
            <input type="file" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" className="hidden" onChange={(event) => void uploadFile(event.target.files?.[0])} />
          </label>
        </div>
        <label className="flex min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder="Search your knowledge"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              void load(event.target.value);
            }}
          />
        </label>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 md:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
          Title
          <input required maxLength={255} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Type
          <select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={itemType} onChange={(event) => setItemType(event.target.value as KnowledgeItem["item_type"])}>
            <option value="note">Note</option>
            <option value="concept">Concept</option>
            <option value="question">Question</option>
            <option value="insight">Insight</option>
            <option value="quote">Quote</option>
            <option value="resource">Resource</option>
            <option value="summary">Summary</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Tags
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="design, systems" value={tagInput} onChange={(event) => setTagInput(event.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-4">
          Content
          <textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={content} onChange={(event) => setContent(event.target.value)} />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-4">{error}</p>}
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white md:col-span-4 md:w-fit">
          <Plus size={16} /> Capture knowledge
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{item.item_type} · {item.understanding_status.replace("_", " ")}</p>
                <h2 className="mt-2 text-lg font-semibold text-ink">{item.title}</h2>
              </div>
              <button onClick={() => void toggleFavorite(item)} className={item.is_favorite ? "text-amber-500" : "text-slate-300"} aria-label="Toggle favorite"><Star size={18} fill={item.is_favorite ? "currentColor" : "none"} /></button>
            </div>
            {item.content && <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">{item.content}</p>}
            {item.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">{tag}</span>)}
              </div>
            )}
            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => void archiveItem(item)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700"><Archive size={14} /> Archive</button>
              <button onClick={() => void removeItem(item)} className="ml-auto text-xs font-semibold text-rose-400 hover:text-rose-700">Delete</button>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No knowledge captured yet.</p>}
    </div>
  );
}
