import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, ArrowUpRight, BookOpen, BrainCircuit, Compass, LayoutDashboard,
  Menu, Moon, Network, Plus, Settings, Share2, Sparkles, Sun, UserRound, X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApiHealth } from "../services/api";
import { useAuth } from "../auth/AuthContext";

const navigation = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Knowledge Vault", path: "/vault", icon: BookOpen },
  { label: "Knowledge Graph", path: "/graph", icon: Network },
  { label: "Learning paths", path: "/learning", icon: Compass },
  { label: "Mindtrace", path: "/mindtrace", icon: BrainCircuit },
  { label: "Community", path: "/community", icon: Share2 }
];

const secondaryNavigation = [
  { label: "My profile", path: "/profile", icon: UserRound },
  { label: "Settings", path: "/settings", icon: Settings }
];

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/vault": "Knowledge Vault",
  "/import": "Import knowledge",
  "/graph": "Knowledge Graph",
  "/learning": "Learning paths",
  "/mindtrace": "Mindtrace",
  "/community": "Community",
  "/profile": "My profile",
  "/settings": "Settings & privacy"
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.localStorage.getItem("mindos-theme") === "dark" ? "dark" : "light"
  );
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data, isError, isLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
    refetchInterval: 15000
  });
  const displayName = user?.display_name || "Your workspace";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
  const pageTitle = pageTitles[location.pathname] || "Your workspace";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("mindos-theme", theme);
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#111522" : "#f7f8fc"
    );
  }, [theme]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[82px] items-center gap-3 border-b border-white/[0.08] px-5">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-violet-400 to-indigo-500 text-white shadow-lg shadow-violet-950/40">
          <BrainCircuit size={21} strokeWidth={1.8} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#171827] bg-lime-300" />
        </div>
        <div>
          <div className="text-[16px] font-extrabold tracking-[0.17em] text-white">MINDOS</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Personal intelligence</div>
        </div>
        <button className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pt-7">
        <p className="px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <nav className="mt-3 space-y-1">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {path === "/vault" && <span className="ml-auto rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">Space</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-7 px-3">
        <p className="px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">You</p>
        <nav className="mt-3 space-y-1">
          {secondaryNavigation.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3">
        <NavLink to="/vault" onClick={() => setMobileOpen(false)} className="group relative mb-3 block overflow-hidden rounded-2xl border border-violet-300/10 bg-gradient-to-br from-violet-400/[0.13] to-indigo-400/[0.06] p-4">
          <div className="relative z-10 flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200"><Sparkles size={16} /></span>
            <ArrowUpRight size={14} className="text-violet-300/70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
          </div>
          <p className="relative z-10 mt-3 text-xs font-semibold text-white">Make room for ideas</p>
          <p className="relative z-10 mt-1 text-[10px] leading-4 text-slate-400">Capture a thought before it slips away.</p>
          <span className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full border border-violet-300/10" />
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-300 to-cyan-200 text-[11px] font-extrabold text-[#25223e]">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-white">{displayName}</p>
            <p className="truncate text-[9px] text-slate-500">{user?.email || "Personal account"}</p>
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300" title="Sign out">Exit</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-white/[0.06] bg-[#171827] lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
          <aside className="relative h-full w-[280px] bg-[#171827] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/70 bg-canvas/90 px-4 backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-brand lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400"><span>Workspace</span><span className="text-slate-300">/</span><span className="truncate text-slate-500">{pageTitle}</span></div>
              <p className="mt-0.5 truncate text-sm font-semibold tracking-tight text-ink">{pageTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold sm:flex ${data ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700" : isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${data ? "bg-emerald-500" : isError ? "bg-rose-500" : "animate-pulse bg-amber-400"}`} />
              {isLoading ? "Connecting" : data ? "All systems ready" : "Connection issue"}
            </div>
            <NavLink to="/vault" aria-label="Capture a new idea" className="hidden items-center gap-1.5 rounded-xl bg-[#24233c] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-brand sm:inline-flex">
              <Plus size={14} /> <span>Capture</span>
            </NavLink>
            <button
              type="button"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              aria-pressed={theme === "dark"}
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-brand"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <NavLink to="/profile" aria-label="Open your profile" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-200 to-cyan-100 text-[10px] font-extrabold text-violet-900 ring-2 ring-white shadow-sm">
              {initials}
            </NavLink>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 md:py-8 lg:px-9">
          <Outlet />
          <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-5 text-[10px] text-slate-400">
            <span>MINDOS <span className="mx-1 text-slate-300">·</span> Your knowledge, thoughtfully connected</span>
            <span className="inline-flex items-center gap-1.5"><Activity size={12} /> A little progress, every day</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
