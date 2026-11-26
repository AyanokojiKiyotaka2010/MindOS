export type HealthResponse = {
  status: string;
  application: string;
  version: string;
};

export async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/v1/health");

  if (!response.ok) {
    throw new Error(`API health check failed (${response.status})`);
  }

  return response.json() as Promise<HealthResponse>;
}

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  account_status: string;
};

export type Settings = {
  profile_visibility: "private" | "connections" | "public";
  allow_discovery: boolean;
  ai_features_enabled: boolean;
  timezone: string;
  locale: string;
};

function csrfHeaders(): HeadersInit {
  const csrf = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("mindos_csrf="))
    ?.split("=")[1];
  return csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {};
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

export const register = (email: string, password: string, displayName?: string) =>
  apiRequest<{ status: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name: displayName || null }),
  });

export const login = (email: string, password: string) =>
  apiRequest<{ status: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  apiRequest<{ status: string }>("/auth/logout", { method: "POST" });

export const getMe = () => apiRequest<Profile>("/users/me");

export const updateProfile = (values: {
  display_name?: string;
  username?: string;
  bio?: string;
}) => apiRequest<Profile>("/users/me/profile", {
  method: "PATCH",
  body: JSON.stringify(values),
});

export const getSettings = () => apiRequest<Settings>("/users/me/settings");

export const updateSettings = (values: Partial<Settings>) =>
  apiRequest<Settings>("/users/me/settings", {
    method: "PATCH",
    body: JSON.stringify(values),
  });

export type KnowledgeSource = {
  id: string;
  source_type: "manual" | "file" | "url" | "book" | "article" | "video" | "other";
  source_title: string | null;
  source_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_key: string | null;
};

export type KnowledgeItem = {
  id: string;
  title: string;
  content: string | null;
  item_type: "note" | "concept" | "question" | "insight" | "quote" | "resource" | "summary";
  understanding_status: "captured" | "reviewing" | "understood" | "needs_clarification";
  is_favorite: boolean;
  is_archived: boolean;
  captured_at: string;
  tags: string[];
  sources: KnowledgeSource[];
};

export const listKnowledgeItems = (search = "", includeArchived = false) =>
  apiRequest<KnowledgeItem[]>(
    `/knowledge/items?search=${encodeURIComponent(search)}&include_archived=${includeArchived}`,
  );

export const createKnowledgeItem = (values: {
  title: string;
  content?: string;
  item_type: KnowledgeItem["item_type"];
  understanding_status: KnowledgeItem["understanding_status"];
  is_favorite: boolean;
  tags: string[];
}) => apiRequest<KnowledgeItem>("/knowledge/items", {
  method: "POST",
  body: JSON.stringify(values),
});

export const updateKnowledgeItem = (id: string, values: Partial<KnowledgeItem>) =>
  apiRequest<KnowledgeItem>(`/knowledge/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });

export const deleteKnowledgeItem = (id: string) =>
  apiRequest<{ status: string }>(`/knowledge/items/${id}`, { method: "DELETE" });

export type KnowledgeRelation = {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relation_type: "related_to" | "supports" | "contradicts" | "expands" | "depends_on" | "example_of";
  note: string | null;
};

export const listKnowledgeRelations = () =>
  apiRequest<KnowledgeRelation[]>("/graph/relations");

export const createKnowledgeRelation = (values: {
  source_item_id: string;
  target_item_id: string;
  relation_type: KnowledgeRelation["relation_type"];
  note?: string;
}) => apiRequest<KnowledgeRelation>("/graph/relations", {
  method: "POST",
  body: JSON.stringify(values),
});

export const deleteKnowledgeRelation = (id: string) =>
  apiRequest<{ status: string }>(`/graph/relations/${id}`, { method: "DELETE" });

export const importKnowledgeUrl = (url: string) =>
  apiRequest<{ id: string; title: string; understanding_status: string }>("/acquisition/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });

export const uploadKnowledgeFile = async (file: File) => {
  const csrf = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("mindos_csrf="))
    ?.split("=")[1];
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/v1/acquisition/upload", {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {},
    body: form,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || `Upload failed (${response.status})`);
  }
  return response.json() as Promise<{ id: string; title: string; understanding_status: string }>;
};

export type LearningGoal = {
  id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "paused" | "completed" | "abandoned";
  target_date: string | null;
  completed_at: string | null;
};

export const listLearningGoals = () => apiRequest<LearningGoal[]>("/learning/goals");

export const createLearningGoal = (values: {
  title: string;
  description?: string;
  status: LearningGoal["status"];
  target_date?: string;
}) => apiRequest<LearningGoal>("/learning/goals", {
  method: "POST",
  body: JSON.stringify(values),
});

export const updateLearningGoal = (id: string, values: Partial<LearningGoal>) =>
  apiRequest<LearningGoal>(`/learning/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });

export const deleteLearningGoal = (id: string) =>
  apiRequest<{ status: string }>(`/learning/goals/${id}`, { method: "DELETE" });

export type Reflection = { id: string; title: string | null; body: string; reflection_date: string };
export type Decision = {
  id: string;
  title: string;
  context: string | null;
  options_considered: string[];
  chosen_option: string | null;
  rationale: string | null;
  decided_at: string | null;
};

export const listReflections = () => apiRequest<Reflection[]>("/mindtrace/reflections");
export const createReflection = (values: { title?: string; body: string }) =>
  apiRequest<Reflection>("/mindtrace/reflections", { method: "POST", body: JSON.stringify(values) });
export const listDecisions = () => apiRequest<Decision[]>("/mindtrace/decisions");
export const createDecision = (values: {
  title: string;
  context?: string;
  options_considered: string[];
  chosen_option?: string;
  rationale?: string;
}) => apiRequest<Decision>("/mindtrace/decisions", { method: "POST", body: JSON.stringify(values) });
export const addDecisionOutcome = (id: string, values: { outcome_notes: string; outcome_status: "positive" | "negative" | "mixed" | "unclear" | "pending" }) =>
  apiRequest<{ status: string; outcome_status: string }>(`/mindtrace/decisions/${id}/outcomes`, {
    method: "POST",
    body: JSON.stringify(values),
  });

export type DashboardSummary = {
  knowledge_items: number;
  active_knowledge: number;
  understood_knowledge: number;
  learning_goals: number;
  active_learning_goals: number;
  reflections: number;
  decisions: number;
  relations: number;
};

export const getDashboardSummary = () =>
  apiRequest<DashboardSummary>("/dashboard/summary");

export type CommunityPost = {
  id: string;
  author_id: string;
  body: string;
  visibility: "private" | "connections" | "public";
  created_at: string;
};

export const getCommunityFeed = () =>
  apiRequest<CommunityPost[]>("/community/feed");

export const createCommunityPost = (body: string, visibility: CommunityPost["visibility"]) =>
  apiRequest<CommunityPost>("/community/posts", {
    method: "POST",
    body: JSON.stringify({ body, visibility }),
  });

export const followUser = (userId: string) =>
  apiRequest<{ status: string }>(`/community/follow/${userId}`, { method: "POST" });
