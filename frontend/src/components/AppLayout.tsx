import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Activity, BookOpen, BrainCircuit,
  Compass, LayoutDashboard, Menu, Network, Settings,
  Share2, UserRound, X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getApiHealth } from "../services/api";
import { useAuth } from "../auth/AuthContext";

const navigation = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Knowledge Vault", path: "/vault", icon: BookOpen },
  { label: "Knowledge Graph", path: "/graph", icon: Network },
  { label: "Learning", path: "/learning", icon: Compass },
  { label: "Mindtrace", path: "/mindtrace", icon: BrainCircuit },
  { label: "Community", path: "/community", icon: Share2 }
];

const secondaryNavigation = [
  { label: "My Profile", path: "/profile", icon: UserRound },
  { label: "Settings", path: "/settings", icon: Settings }
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data, isError, isLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
    refetchInterval: 15000
  });

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-violet-200">
          <BrainCircuit size={22} />
        </div>
        <div>
          <div className="text-[17px] font-extrabold tracking-[0.16em] text-ink">MINDOS</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Personal intelligence</div>
        </div>
        <button className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={19} />
        </button>
      </div>

      <div className="px-4 pt-7">
        <p className="section-label px-3">Workspace</p>
        <nav className="mt-3 space-y-1">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {path === "/vault" && <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">NEW</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-8 px-4">
        <p className="section-label px-3">Personal</p>
        <nav className="mt-3 space-y-1">
          {secondaryNavigation.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-[#f5f3ff] p-4">
          <div className="mb-2 flex items-center gap-2 text-brand">
            <Activity size={16} />
            <span className="text-xs font-bold">Your space, your pace</span>
          </div>
          <p className="text-xs leading-5 text-slate-500">Build a clearer picture of what you know and where you want to grow.</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full w-1/4 rounded-full bg-brand" />
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Your workspace is just getting started</p>
        </div>
        <div className="mt-4 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">Y</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{user?.display_name || "Your workspace"}</p>
            <p className="text-[10px] text-slate-400">{user?.email || "Personal account"}</p>
          </div>
          <button type="button" onClick={() => void logout()} className="text-[10px] font-bold text-slate-400 hover:text-brand" title="Sign out">OUT</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] border-r border-slate-100 bg-white lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
          <aside className="relative h-full w-[280px] bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-100 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs text-slate-400">Personal workspace</p>
              <p className="text-sm font-semibold text-ink">Think. Learn. Connect.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium sm:flex ${data ? "bg-emerald-50 text-emerald-700" : isError ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${data ? "bg-emerald-500" : isError ? "bg-rose-500" : "bg-slate-400"}`} />
              {isLoading ? "Checking API…" : data ? "API connected" : "API unavailable"}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eeeaff] text-xs font-bold text-brand">Y</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">
          <Outlet />
          <footer className="mt-12 border-t border-slate-200/70 pt-5 text-center text-[11px] text-slate-400">
            MINDOS · Your knowledge, thoughtfully organized
          </footer>
        </main>
      </div>
    </div>
  );
}
