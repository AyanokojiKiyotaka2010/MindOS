import { useEffect, useState, type FormEvent } from "react";
import { getMe, updateProfile, type Profile } from "../services/api";
import { useAuth } from "../auth/AuthContext";

export default function ProfilePage() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getMe().then(setProfile).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load profile"));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setMessage("");
    try {
      const nextProfile = await updateProfile({
        display_name: profile.display_name || "",
        username: profile.username || undefined,
        bio: profile.bio || "",
      });
      setProfile(nextProfile);
      await refresh();
      setMessage("Saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save profile");
    }
  };

  if (!profile) return <p className="text-sm text-slate-500">{error || "Loading profile…"}</p>;

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
      </div>
      {message && <p className="mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <button className="mt-6 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">Save changes</button>
    </form>
  );
}
