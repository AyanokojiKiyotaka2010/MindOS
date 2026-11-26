import { useState, type FormEvent } from "react";
import { ArrowRight, BrainCircuit, Check, LockKeyhole, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { login, register } from "../services/api";

type Props = { mode: "login" | "register" };

const orbitNodes = [
  { className: "left-[13%] top-[25%] bg-lime-300", label: "Ideas" },
  { className: "right-[16%] top-[19%] bg-cyan-300", label: "Learning" },
  { className: "bottom-[22%] left-[22%] bg-violet-300", label: "Reflection" },
  { className: "bottom-[27%] right-[14%] bg-orange-300", label: "Growth" }
];

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
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#171827] px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_48%,rgba(106,91,197,0.22),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:44px_44px]" />
        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-violet-400 to-indigo-500 text-white"><BrainCircuit size={21} /></span>
          <span className="text-sm font-extrabold tracking-[0.18em]">MINDOS</span>
        </Link>

        <div className="relative z-10 my-auto max-w-xl">
          <div className="relative mx-auto mb-11 flex aspect-square w-full max-w-[390px] items-center justify-center">
            <div className="absolute inset-2 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-12 rounded-full border border-dashed border-violet-200/20" />
            <div className="absolute inset-[88px] rounded-full border border-white/[0.08]" />
            <div className="absolute inset-0 animate-[spin_46s_linear_infinite]">
              <span className="absolute left-[13%] top-[25%] h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_18px_#bef264]" />
              <span className="absolute right-[16%] top-[19%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_#67e8f9]" />
              <span className="absolute bottom-[22%] left-[22%] h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_18px_#c4b5fd]" />
              <span className="absolute bottom-[27%] right-[14%] h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_18px_#fdba74]" />
            </div>
            <svg viewBox="0 0 360 360" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M75 100 284 76M75 100l34 204M284 76l25 207M109 304l200-21M75 100l234 183" fill="none" stroke="#c4b5fd" strokeOpacity=".2" strokeWidth="1" strokeDasharray="3 7" />
            </svg>
            <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[32px] border border-white/15 bg-white/[0.07] text-lime-200 shadow-[0_0_70px_rgba(167,139,250,0.18)] backdrop-blur">
              <BrainCircuit size={48} strokeWidth={1.2} />
            </div>
            {orbitNodes.map(({ className, label }) => (
              <span key={label} className={`absolute rounded-full border border-white/10 bg-[#25243d]/90 px-3 py-1.5 text-[9px] font-semibold tracking-wide text-slate-200 shadow-lg ${className}`}>{label}</span>
            ))}
          </div>
          <div className="mx-auto max-w-md text-center">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200"><Sparkles size={13} /> A home for your ideas</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight xl:text-[38px]">Think deeper.<br /><span className="text-lime-300">See the connections.</span></h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-400">A quiet, private space to collect what you learn and make sense of what matters.</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.08] pt-5 text-[10px] text-slate-500">
          <span>YOUR PERSONAL INTELLIGENCE SPACE</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole size={11} /> Your space stays yours</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24233c] text-lime-200 shadow-lg shadow-violet-200/60 lg:hidden"><BrainCircuit size={23} /></Link>
          <div className="mt-5 text-center lg:mt-0 lg:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">{mode === "register" ? "Begin your journey" : "Your space is waiting"}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{mode === "register" ? "Create your account" : "Welcome back"}</h2>
            <p className="mt-2 text-sm text-slate-500">{mode === "register" ? "Start building your private knowledge space." : "Sign in and pick up where your curiosity left off."}</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            {mode === "register" && (
              <label className="block text-xs font-semibold text-slate-700">Display name
                <input autoComplete="name" className="auth-input mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-ink outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            )}
            <label className="block text-xs font-semibold text-slate-700">Email address
              <input autoComplete="email" type="email" required className="auth-input mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-ink outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-slate-700">Password
              <input autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" required minLength={mode === "register" ? 12 : 1} className="auth-input mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-ink outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" value={password} onChange={(event) => setPassword(event.target.value)} />
              {mode === "register" && <span className="mt-2 block text-[10px] font-medium text-slate-400">Use at least 12 characters.</span>}
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">{error}</p>}
            <button disabled={submitting} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#24233c] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-300/40 transition hover:-translate-y-0.5 hover:bg-brand disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
              {!submitting && <ArrowRight size={16} className="transition group-hover:translate-x-1" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            {mode === "register" ? "Already have an account?" : "New to MINDOS?"}{" "}
            <Link className="font-bold text-brand hover:text-violet-800" to={mode === "register" ? "/login" : "/register"}>{mode === "register" ? "Sign in" : "Create account"}</Link>
          </p>
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-[10px] text-slate-400">
            <Check size={13} className="text-emerald-500" /> Private by design <span className="text-slate-300">·</span> No noise, just your thinking
          </div>
        </div>
      </section>
    </main>
  );
}
