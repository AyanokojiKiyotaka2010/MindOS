import { useEffect, useState, type FormEvent } from "react";
import {
  createLearningGoal,
  deleteLearningGoal,
  listLearningGoals,
  updateLearningGoal,
  type LearningGoal,
} from "../services/api";

export default function LearningPage() {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setGoals(await listLearningGoals());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load goals");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createLearningGoal({ title, description, status: "planned", target_date: targetDate || undefined });
      setTitle("");
      setDescription("");
      setTargetDate("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create goal");
    }
  };

  const changeStatus = async (goal: LearningGoal, status: LearningGoal["status"]) => {
    await updateLearningGoal(goal.id, { status });
    await load();
  };

  const remove = async (goal: LearningGoal) => {
    await deleteLearningGoal(goal.id);
    await load();
  };

  const completed = goals.filter((goal) => goal.status === "completed").length;
  const active = goals.filter((goal) => goal.status === "in_progress").length;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <p className="section-label">Learning Intelligence</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Choose what to learn next</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-xs text-slate-400">Active goals</p><p className="mt-2 text-3xl font-semibold text-ink">{active}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-xs text-slate-400">Completed</p><p className="mt-2 text-3xl font-semibold text-emerald-600">{completed}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-xs text-slate-400">Total goals</p><p className="mt-2 text-3xl font-semibold text-brand">{goals.length}</p></div>
      </div>

      <form onSubmit={create} className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Goal
          <input required maxLength={255} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Target date
          <input type="date" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">Description
          <textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 md:col-span-2">{error}</p>}
        <button className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white md:w-fit">Add learning goal</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <article key={goal.id} className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-brand">{goal.status.replace("_", " ")}</p><h2 className="mt-2 font-semibold text-ink">{goal.title}</h2></div>
              {goal.target_date && <p className="text-xs text-slate-400">Due {goal.target_date}</p>}
            </div>
            {goal.description && <p className="mt-3 text-sm leading-6 text-slate-500">{goal.description}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              {goal.status !== "in_progress" && <button onClick={() => void changeStatus(goal, "in_progress")} className="text-xs font-bold text-violet-700">Start</button>}
              {goal.status !== "completed" && <button onClick={() => void changeStatus(goal, "completed")} className="text-xs font-bold text-emerald-700">Complete</button>}
              {goal.status !== "paused" && <button onClick={() => void changeStatus(goal, "paused")} className="text-xs font-bold text-slate-500">Pause</button>}
              <button onClick={() => void remove(goal)} className="ml-auto text-xs font-bold text-rose-400">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
