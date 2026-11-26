import { ArrowLeft, ArrowUpRight, Construction } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  next: string;
};

export default function PlaceholderPage({ title, eyebrow, description, next }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-brand"><ArrowLeft size={14} /> Back to overview</Link>
      <div className="surface-card overflow-hidden p-7 md:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-brand"><Construction size={22} /></div>
        <p className="section-label mt-7">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
        <div className="mt-8 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-5">
          <p className="text-xs font-bold text-violet-800">Planned for a later phase</p>
          <p className="mt-1 text-xs leading-5 text-violet-700/80">{next}</p>
        </div>
        <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400">This page is a navigation placeholder <ArrowUpRight size={13} /></p>
      </div>
    </div>
  );
}
