import { ArrowUpRight, BookOpen, Brain, CheckCircle2, CircleHelp, Compass, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardSummary, type DashboardSummary } from "../services/api";

const steps = [
  ["Capture something you know", "Add a concept, insight, or useful note to your Knowledge Vault."],
  ["Connect related ideas", "Build links between concepts to see how your knowledge fits together."],
  ["Reflect and review", "Record your thinking and revisit decisions as you learn."]
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    void getDashboardSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const stats = [
    { label: "Knowledge items", value: String(summary?.knowledge_items || 0), note: `${summary?.understood_knowledge || 0} understood`, icon: BookOpen, tint: "bg-violet-50 text-violet-600" },
    { label: "Learning goals", value: String(summary?.learning_goals || 0), note: `${summary?.active_learning_goals || 0} active`, icon: Compass, tint: "bg-sky-50 text-sky-600" },
    { label: "Reflections", value: String(summary?.reflections || 0), note: "Thoughts captured", icon: Brain, tint: "bg-amber-50 text-amber-600" },
    { label: "Decisions recorded", value: String(summary?.decisions || 0), note: `${summary?.relations || 0} knowledge connections`, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" }
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#29234f] via-[#403777] to-[#6558d3] px-7 py-8 text-white shadow-soft md:px-10 md:py-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-violet-100">
            <Sparkles size={13} /> Your personal intelligence space
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-[38px]">Make your thinking visible.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100/85 md:text-base">MINDOS brings your knowledge, learning journey, reflections, and decisions into one connected space.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/vault" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#403777] transition hover:bg-violet-50">Explore Knowledge Vault <ArrowUpRight size={15} /></a>
            <a href="/mindtrace" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10">Start a reflection</a>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-14 h-60 w-60 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-36 right-32 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <Brain className="absolute bottom-8 right-10 hidden h-28 w-28 text-white/10 md:block" strokeWidth={1} />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="section-label">Your overview</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">A snapshot of your space</h2>
          </div>
          <span className="text-[11px] text-slate-400">Live workspace summary</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon, tint }) => (
            <div key={label} className="surface-card p-5">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}><Icon size={19} /></div>
                <span className="text-[10px] font-medium text-slate-300">START</span>
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-ink">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{label}</p>
              <p className="mt-1 text-[11px] text-slate-400">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="surface-card p-6 md:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Getting started</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Build your knowledge space</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-semibold text-brand">3 simple steps</span>
          </div>
          <div className="mt-6 space-y-5">
            {steps.map(([title, description], index) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xs font-bold text-slate-500">{String(index + 1).padStart(2, "0")}</div>
                <div><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card flex flex-col p-6 md:p-7">
          <div className="flex items-center gap-2 text-brand"><CircleHelp size={16} /><p className="section-label text-brand">A note about MINDOS</p></div>
          <h2 className="mt-3 text-lg font-semibold text-ink">Your data should reflect your understanding.</h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">Saving a document is not the same as understanding it. MINDOS will keep captured information distinct from concepts you have reviewed, understood, or practiced.</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge journey</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["Captured", "Reviewed", "Understood", "Practiced"].map((step, i) => (
                <span key={step} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${i === 0 ? "bg-violet-100 text-violet-700" : "bg-white text-slate-400"}`}>{step}</span>
              ))}
            </div>
          </div>
          <a href="/vault" className="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-bold text-brand hover:gap-3">Visit your Knowledge Vault <ArrowUpRight size={14} /></a>
        </div>
      </section>
    </div>
  );
}
