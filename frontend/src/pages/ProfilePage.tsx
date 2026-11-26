import { useEffect, useState, type FormEvent } from "react";
import { getMe, getSettings, updateProfile, updateSettings, type Profile, type Settings } from "../services/api";
import { useAuth } from "../auth/AuthContext";

export default function ProfilePage() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMe(), getSettings()]).then(([nextProfile, nextSettings]) => {
      setProfile(nextProfile);
      setSettings(nextSettings);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load"));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !settings) return;
    setError("");
    setMessage("");
    try {
      const nextProfile = await updateProfile({
        display_name: profile.display_name || "",
        username: profile.username || undefined,
        bio: profile.bio || "",
      });
      const nextSettings = await updateSettings(settings);
      setProfile(nextProfile);
      setSettings(nextSettings);
      await refresh();
      setMessage("Saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save");
    }
  };

  if (!profile || !settings) return <p className="text-sm text-slate-500">{error || "Loading…"}</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-7 md:p-10">
      <p className="section-label">Account</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">My Profile</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Display name
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={profile.display_name || ""} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Username
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={profile.username || ""} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />
        </label>
        <label className="md:col-span-2 text-xs font-semibold text-slate-600">Bio
          <textarea maxLength={500} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={profile.bio || ""} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-600">Profile visibility
          <select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={settings.profile_visibility} onChange={(event) => setSettings({ ...settings, profile_visibility: event.target.value as Settings["profile_visibility"] })}>
            <option value="private">Private</option>
            <option value="connections">Connections</option>
            <option value="public">Public</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Timezone
          <input className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} />
        </label>
        <label className="flex items-center gap-3 text-xs font-semibold text-slate-600 md:col-span-2">
          <input type="checkbox" checked={settings.allow_discovery} onChange={(event) => setSettings({ ...settings, allow_discovery: event.target.checked })} /> Allow discovery
        </label>
        <label className="flex items-center gap-3 text-xs font-semibold text-slate-600 md:col-span-2">
          <input type="checkbox" checked={settings.ai_features_enabled} onChange={(event) => setSettings({ ...settings, ai_features_enabled: event.target.checked })} /> Enable optional AI features
        </label>
      </div>
      {message && <p className="mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <button className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">Save changes</button>
    </form>
  );
}
