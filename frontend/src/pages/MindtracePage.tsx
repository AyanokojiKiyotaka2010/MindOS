import { useEffect, useState, type FormEvent } from "react";
import {
  addDecisionOutcome,
  createDecision,
  createReflection,
  listDecisions,
  listReflections,
  type Decision,
  type Reflection,
} from "../services/api";

export default function MindtracePage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reflectionTitle, setReflectionTitle] = useState("");
  const [reflectionBody, setReflectionBody] = useState("");
  const [decisionTitle, setDecisionTitle] = useState("");
  const [options, setOptions] = useState("");
  const [chosen, setChosen] = useState("");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [nextReflections, nextDecisions] = await Promise.all([listReflections(), listDecisions()]);
      setReflections(nextReflections);
      setDecisions(nextDecisions);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Mindtrace");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveReflection = async (event: FormEvent) => {
    event.preventDefault();
    await createReflection({ title: reflectionTitle || undefined, body: reflectionBody });
    setReflectionTitle("");
    setReflectionBody("");
    await load();
  };

  const saveDecision = async (event: FormEvent) => {
    event.preventDefault();
    await createDecision({
      title: decisionTitle,
      options_considered: options.split(",").map((option) => option.trim()).filter(Boolean),
      chosen_option: chosen || undefined,
      rationale,
    });
    setDecisionTitle("");
    setOptions("");
    setChosen("");
    setRationale("");
    await load();
  };

  const recordOutcome = async (decision: Decision) => {
    await addDecisionOutcome(decision.id, { outcome_notes: "Outcome reviewed", outcome_status: "pending" });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div><p className="section-label">Mindtrace</p><h1 className="mt-2 text-3xl font-semibold text-ink">Understand your thinking</h1></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveReflection} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6">
          <h2 className="font-semibold text-ink">New reflection</h2>
          <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Title" value={reflectionTitle} onChange={(event) => setReflectionTitle(event.target.value)} />
          <textarea required className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="What changed in your thinking?" value={reflectionBody} onChange={(event) => setReflectionBody(event.target.value)} />
          <button className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">Save reflection</button>
        </form>

        <form onSubmit={saveDecision} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6">
          <h2 className="font-semibold text-ink">Record a decision</h2>
          <input required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Decision" value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} />
          <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Options, separated by commas" value={options} onChange={(event) => setOptions(event.target.value)} />
          <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Chosen option" value={chosen} onChange={(event) => setChosen(event.target.value)} />
          <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} />
          <button className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">Record decision</button>
        </form>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-semibold text-ink">Recent reflections</h2>
          {reflections.map((reflection) => (
            <article key={reflection.id} className="rounded-2xl border border-slate-100 bg-white p-5">
              {reflection.title && <h3 className="font-semibold text-ink">{reflection.title}</h3>}
              <p className="mt-2 text-sm leading-6 text-slate-500">{reflection.body}</p>
              <p className="mt-3 text-[10px] text-slate-400">{new Date(reflection.reflection_date).toLocaleString()}</p>
            </article>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-ink">Decision log</h2>
          {decisions.map((decision) => (
            <article key={decision.id} className="rounded-2xl border border-slate-100 bg-white p-5">
              <h3 className="font-semibold text-ink">{decision.title}</h3>
              {decision.chosen_option && <p className="mt-2 text-sm"><span className="font-semibold">Chosen:</span> {decision.chosen_option}</p>}
              {decision.rationale && <p className="mt-2 text-sm leading-6 text-slate-500">{decision.rationale}</p>}
              <button onClick={() => void recordOutcome(decision)} className="mt-4 text-xs font-bold text-violet-700">Record pending outcome</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
