import { useEffect, useState, type FormEvent } from "react";
import {
  createCommunityPost,
  getCommunityFeed,
  type CommunityPost,
} from "../services/api";

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommunityPost["visibility"]>("private");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setPosts(await getCommunityFeed());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load community");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await createCommunityPost(body, visibility);
      setBody("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <p className="section-label">Community</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Share knowledge intentionally</h1>
        <p className="mt-2 text-sm text-slate-500">Posts remain private unless you explicitly choose connections or public visibility.</p>
      </div>

      <form onSubmit={publish} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6">
        <textarea required maxLength={2000} className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Share an idea, insight, or reflection…" value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as CommunityPost["visibility"])}>
            <option value="private">Private</option>
            <option value="connections">Connections</option>
            <option value="public">Public</option>
          </select>
          <button className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white">Publish</button>
        </div>
      </form>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="space-y-4">
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-brand">Community post</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{post.visibility}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{post.body}</p>
            <p className="mt-3 text-[10px] text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
