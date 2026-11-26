import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import {
  ArrowLeft, ArrowRight, BrainCircuit, Check, CircleAlert, FileArchive,
  FileText, LoaderCircle, Network, Upload, WandSparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  commitKnowledgeImport,
  getImportCapabilities,
  previewKnowledgeImport,
  type ImportCapabilities,
  type ImportPreview,
  type ImportPreviewRelation
} from "../services/api";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relationLabel(relation: ImportPreviewRelation, labels: Map<string, string>) {
  return `${labels.get(relation.source_draft_id) || "Idea"} ${relation.relation_type.replace(/_/g, " ")} ${labels.get(relation.target_draft_id) || "Idea"}`;
}

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [extractionMode, setExtractionMode] = useState<"local" | "gemini">("local");
  const [capabilities, setCapabilities] = useState<ImportCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [selectedRelations, setSelectedRelations] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ documents_imported: number; concepts_imported: number; relations_created: number } | null>(null);

  useEffect(() => {
    void getImportCapabilities().then(setCapabilities).catch((caught) => {
      setCapabilityError(caught instanceof Error ? caught.message : "Unable to check AI extraction availability");
    });
  }, []);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const document of preview?.documents ?? []) map.set(document.draft_id, document.title);
    for (const concept of preview?.concepts ?? []) map.set(concept.draft_id, concept.title);
    return map;
  }, [preview]);
  const canUseGemini = Boolean(capabilities?.ai_features_enabled && capabilities.gemini_available);
  const selectedNodeIds = useMemo(() => new Set([...selectedDocuments, ...selectedConcepts]), [selectedDocuments, selectedConcepts]);
  const commitReady = Boolean(preview && (selectedDocuments.size > 0 || selectedConcepts.size > 0));

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files || []));
    setPreview(null);
    setResult(null);
    setError("");
  };

  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setFiles(Array.from(event.dataTransfer.files));
    setPreview(null);
    setResult(null);
    setError("");
  };

  const analyze = async () => {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const next = await previewKnowledgeImport(files, extractionMode);
      setPreview(next);
      setSelectedDocuments(new Set(next.documents.map((document) => document.draft_id)));
      setSelectedConcepts(new Set(next.concepts.map((concept) => concept.draft_id)));
      setSelectedRelations(new Set(next.relations.map((relation) => relation.draft_id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze these files");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!preview || !commitReady) return;
    setBusy(true);
    setError("");
    try {
      const documents = preview.documents.filter((document) => selectedDocuments.has(document.draft_id));
      const concepts = preview.concepts.filter((concept) => selectedConcepts.has(concept.draft_id));
      const relations = preview.relations.filter((relation) =>
        selectedRelations.has(relation.draft_id)
        && selectedNodeIds.has(relation.source_draft_id)
        && selectedNodeIds.has(relation.target_draft_id)
      );
      const saved = await commitKnowledgeImport({
        documents: documents.map(({ draft_id, title, content, source_name, source_size_bytes, tags, item_type }) =>
          ({ draft_id, title, content, source_name, source_size_bytes, tags, item_type })),
        concepts: concepts.map(({ draft_id, title, description, tags }) =>
          ({ draft_id, title, description, tags })),
        relations: relations.map(({ source_draft_id, target_draft_id, relation_type, note }) =>
          ({ source_draft_id, target_draft_id, relation_type, note })),
      });
      setResult(saved);
      setPreview(null);
      setFiles([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the selected knowledge");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (current: Set<string>, id: string, update: (next: Set<string>) => void) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <Link to="/vault" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-brand"><ArrowLeft size={14} /> Back to Knowledge Vault</Link>
        <p className="section-label mt-5">Knowledge import</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Bring your ideas together</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Import a whole vault or a collection of files. MINDOS will map the notes and suggest concepts and connections for you to review before anything is saved.</p>
      </div>

      {result ? (
        <section className="surface-card p-7 md:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Check size={23} /></div>
          <h2 className="mt-5 text-xl font-semibold text-ink">Your knowledge is in</h2>
          <p className="mt-2 text-sm text-slate-500">Imported {result.documents_imported} documents, added {result.concepts_imported} concepts, and created {result.relations_created} connections.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/graph" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white">Explore your graph <Network size={14} /></Link>
            <Link to="/vault" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">Open Knowledge Vault <ArrowRight size={14} /></Link>
          </div>
        </section>
      ) : (
        <>
          {!preview && (
            <section className="surface-card p-5 md:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-brand"><FileArchive size={19} /></span>
                    <div><h2 className="text-sm font-semibold text-ink">Choose your files</h2><p className="mt-0.5 text-[11px] text-slate-500">ZIP vaults, Markdown, PDF, DOCX, PPTX, HTML, or CSV</p></div>
                  </div>
                  <label onDragOver={(event) => event.preventDefault()} onDrop={dropFiles} className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-[#f8f7ff] px-5 py-6 text-center transition hover:border-violet-400 hover:bg-violet-50/70">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand shadow-sm"><Upload size={19} /></span>
                    <span className="mt-3 text-sm font-semibold text-ink">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Drop files here or browse"}</span>
                    <span className="mt-1 text-[10px] text-slate-400">Up to 25 MB per file, 50 MB per import · legacy .doc/.ppt files need conversion</span>
                    <input type="file" multiple accept=".zip,.md,.markdown,.txt,.pdf,.docx,.pptx,.html,.htm,.csv" className="sr-only" onChange={chooseFiles} />
                  </label>
                  {files.length > 0 && (
                    <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
                      {files.map((file) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 text-[10px] text-slate-500"><FileText size={13} className="shrink-0 text-violet-400" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span>{formatBytes(file.size)}</span></div>)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><WandSparkles size={18} /></span>
                    <div><h2 className="text-sm font-semibold text-ink">Extract useful ideas</h2><p className="mt-0.5 text-[11px] text-slate-500">Choose how MINDOS finds concepts and relationships</p></div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${extractionMode === "local" ? "border-violet-300 bg-violet-50/60" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="radio" name="extractor" checked={extractionMode === "local"} onChange={() => setExtractionMode("local")} className="mt-0.5 accent-violet-600" />
                      <span><span className="block text-xs font-semibold text-ink">Private local extraction</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">Uses titles, headings, tags, recurring phrases, and Obsidian links. Your text stays in MINDOS.</span></span>
                    </label>
                    <label className={`flex gap-3 rounded-xl border p-4 transition ${canUseGemini ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${extractionMode === "gemini" ? "border-violet-300 bg-violet-50/60" : "border-slate-200"}`}>
                      <input type="radio" name="extractor" checked={extractionMode === "gemini"} disabled={!canUseGemini} onChange={() => setExtractionMode("gemini")} className="mt-0.5 accent-violet-600" />
                      <span><span className="block text-xs font-semibold text-ink">Gemini-assisted suggestions</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">Adds semantic idea and link suggestions. Selected file text is sent to Google Gemini only when you analyze.</span></span>
                    </label>
                    {!canUseGemini && (
                      <p className="flex items-start gap-2 px-1 text-[10px] leading-4 text-slate-500">
                        <CircleAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        {capabilityError || (!capabilities ? "Checking Gemini availability…" : !capabilities.ai_features_enabled ? "Enable optional AI features in Profile settings and configure the backend Gemini key to use this option." : "Configure GEMINI_API_KEY on the backend to use this option.")}
                      </p>
                    )}
                    {canUseGemini && extractionMode === "gemini" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">Gemini receives the text content of the selected files for this analysis. Review its suggestions before importing.</p>}
                  </div>
                </div>
              </div>
              {error && <p role="alert" className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <p className="text-[10px] text-slate-400">ZIP paths are inspected safely; no uploaded binaries are retained on the server.</p>
                <button type="button" disabled={!files.length || busy || (extractionMode === "gemini" && !canUseGemini)} onClick={() => void analyze()} className="inline-flex items-center gap-2 rounded-xl bg-[#24233c] px-5 py-3 text-xs font-bold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <><LoaderCircle size={14} className="animate-spin" /> Analyzing…</> : <>Analyze files <ArrowRight size={14} /></>}
                </button>
              </div>
            </section>
          )}

          {preview && (
            <>
              <section className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="section-label">Review before saving</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">Choose what belongs in your graph</h2>
                  <p className="mt-1 text-xs text-slate-500">Nothing is added until you confirm below. {preview.extraction_mode === "gemini" ? "Gemini suggestions may need editing." : "Local phrase extraction is heuristic; inspect the suggestions."}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div><p className="text-lg font-bold text-ink">{preview.documents.length}</p><p className="text-[9px] uppercase tracking-wider text-slate-400">documents</p></div>
                  <div><p className="text-lg font-bold text-brand">{preview.concepts.length}</p><p className="text-[9px] uppercase tracking-wider text-slate-400">ideas</p></div>
                  <div><p className="text-lg font-bold text-cyan-700">{preview.relations.length}</p><p className="text-[9px] uppercase tracking-wider text-slate-400">links</p></div>
                </div>
              </section>

              {preview.skipped_files.length > 0 && <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">Skipped {preview.skipped_files.length} unsupported files, including: {preview.skipped_files.slice(0, 5).join(", ")}{preview.skipped_files.length > 5 ? "…" : ""}</p>}
              {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>}

              <section className="surface-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><FileText size={16} className="text-violet-500" /><h3 className="text-sm font-semibold text-ink">Source documents</h3></div>
                  <span className="text-[10px] text-slate-400">{selectedDocuments.size} selected</span>
                </div>
                <div className="space-y-2">
                  {preview.documents.map((document) => (
                    <label key={document.draft_id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${selectedDocuments.has(document.draft_id) ? "border-violet-200 bg-violet-50/30" : "border-slate-100 bg-white opacity-70"}`}>
                      <input type="checkbox" checked={selectedDocuments.has(document.draft_id)} onChange={() => toggle(selectedDocuments, document.draft_id, setSelectedDocuments)} className="mt-1 accent-violet-600" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">{document.title}{document.duplicate && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase text-amber-800">Similar title exists</span>}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-400">{document.source_name} · {formatBytes(document.source_size_bytes)}</span>
                        {document.warnings.map((warning) => <span key={warning} className="mt-1 block text-[10px] text-amber-700">{warning}</span>)}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="surface-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><BrainCircuit size={16} className="text-lime-600" /><h3 className="text-sm font-semibold text-ink">Suggested core ideas</h3></div>
                  <span className="text-[10px] text-slate-400">{selectedConcepts.size} selected</span>
                </div>
                {preview.concepts.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {preview.concepts.map((concept) => (
                      <label key={concept.draft_id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${selectedConcepts.has(concept.draft_id) ? "border-lime-200 bg-lime-50/40" : "border-slate-100 bg-white opacity-70"}`}>
                        <input type="checkbox" checked={selectedConcepts.has(concept.draft_id)} onChange={() => toggle(selectedConcepts, concept.draft_id, setSelectedConcepts)} className="mt-1 accent-lime-600" />
                        <span className="min-w-0"><span className="block truncate text-xs font-semibold text-ink">{concept.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{concept.description || `From ${concept.source_document_ids.length} source note${concept.source_document_ids.length === 1 ? "" : "s"}`}</span></span>
                      </label>
                    ))}
                  </div>
                ) : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">No core ideas were identified. You can still import the source documents.</p>}
              </section>

              <section className="surface-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Network size={16} className="text-cyan-700" /><h3 className="text-sm font-semibold text-ink">Suggested connections</h3></div>
                  <span className="text-[10px] text-slate-400">{selectedRelations.size} selected</span>
                </div>
                {preview.relations.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {preview.relations.map((relation) => (
                      <label key={relation.draft_id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selectedRelations.has(relation.draft_id) ? "border-cyan-200 bg-cyan-50/40" : "border-slate-100 bg-white opacity-70"}`}>
                        <input type="checkbox" checked={selectedRelations.has(relation.draft_id)} onChange={() => toggle(selectedRelations, relation.draft_id, setSelectedRelations)} className="mt-0.5 accent-cyan-700" />
                        <span><span className="block text-xs font-semibold text-ink">{relationLabel(relation, labels)}</span>{relation.note && <span className="mt-1 block text-[10px] leading-4 text-slate-500">{relation.note}</span>}</span>
                      </label>
                    ))}
                  </div>
                ) : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">No explicit links found. You can connect ideas later from the graph.</p>}
              </section>

              <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur">
                <button type="button" onClick={() => { setPreview(null); setError(""); }} className="text-xs font-semibold text-slate-500 hover:text-ink">Choose different files</button>
                <button type="button" disabled={!commitReady || busy} onClick={() => void commit()} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <><LoaderCircle size={14} className="animate-spin" /> Saving…</> : <>Approve and import <Check size={14} /></>}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
