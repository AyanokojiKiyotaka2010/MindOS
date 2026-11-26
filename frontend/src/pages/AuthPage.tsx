import { useState, type FormEvent } from "react";
import { BrainCircuit } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { login, register } from "../services/api";

type Props = { mode: "login" | "register" };

export default function AuthPage({ mode }: Props) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "register") await register(email, password, displayName);
      else await login(email, password);
      await refresh();
      navigate("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/50 md:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white"><BrainCircuit size={22} /></div>
        <h1 className="mt-5 text-center text-2xl font-semibold text-ink">{mode === "register" ? "Create your MINDOS" : "Welcome back"}</h1>
        <p className="mt-2 text-center text-sm text-slate-500">{mode === "register" ? "Start building your private knowledge workspace." : "Sign in to continue to your workspace."}</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {mode === "register" && (
            <label className="block text-xs font-semibold text-slate-600">Display name
              <input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-400" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-600">Email
            <input type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-400" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Password
            <input type="password" required minLength={mode === "register" ? 12 : 1} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-400" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button disabled={submitting} className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          {mode === "register" ? "Already have an account?" : "New to MINDOS?"}{" "}
          <Link className="font-bold text-brand" to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create account"}</Link>
        </p>
      </div>
    </div>
  );
}
