// ABOUTME: API client for all backend endpoints
const API_BASE = '/api/v1';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...rest.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiFetch<{ data: UserInfo; message: string }>('/auth/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ data: UserInfo; message: string }>('/auth/login', { method: 'POST', body: data }),
  getProfile: (id: string) =>
    apiFetch<{ data: UserInfo }>(`/auth/profile/${id}`),
};

// Articles
export const articleApi = {
  list: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ data: PaginatedResponse<Article> }>(`/articles?${qs}`);
  },
  get: (id: string) =>
    apiFetch<{ data: Article }>(`/articles/${id}`),
  create: (data: Partial<Article>) =>
    apiFetch<{ data: Article; message: string }>('/articles', { method: 'POST', body: data }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/articles/${id}`, { method: 'DELETE' }),
  toggleFavorite: (id: string) =>
    apiFetch<{ data: Article; message: string }>(`/articles/${id}/favorite`, { method: 'PATCH' }),
};

// Analysis
export const analysisApi = {
  analyze: (data: { article_id: string; user_id?: string }) =>
    apiFetch<{ data: AnalysisResult; message: string }>('/analysis', { method: 'POST', body: data }),
  get: (articleId: string) =>
    apiFetch<{ data: AnalysisResult }>(`/analysis/${articleId}`),
};

// Rewrite
export const rewriteApi = {
  createTask: (data: { article_id: string; target_platforms: string[]; style_overrides?: Record<string, unknown>; user_id?: string }) =>
    apiFetch<{ data: RewriteTask; message: string }>('/rewrite', { method: 'POST', body: data }),
  listTasks: (userId?: string) =>
    apiFetch<{ data: RewriteTask[] }>(`/rewrite/tasks${userId ? `?user_id=${userId}` : ''}`),
  executeTask: async (taskId: string): Promise<EventSource> => {
    // Use EventSource-like approach via fetch with SSE
    const es = new EventSource(`${API_BASE}/rewrite/tasks/${taskId}/execute`);
    return es;
  },
  executeTaskPost: (taskId: string) =>
    fetch(`${API_BASE}/rewrite/tasks/${taskId}/execute`, { method: 'POST' }),
  getResults: (taskId: string) =>
    apiFetch<{ data: RewriteResult[] }>(`/rewrite/tasks/${taskId}/results`),
};

// Collection
export const collectionApi = {
  create: (data: { user_id?: string; keyword: string; platforms?: string[]; max_results?: number }) =>
    apiFetch<{ data: CollectionTask; message: string }>('/collection', { method: 'POST', body: data }),
  listTasks: (userId?: string) =>
    apiFetch<{ data: CollectionTask[] }>(`/collection/tasks${userId ? `?user_id=${userId}` : ''}`),
};

// Upload
export const uploadApi = {
  batch: (data: { user_id?: string; files: Array<{ name: string; format: string; size: number; content: string }> }) =>
    apiFetch<{ data: UploadBatchResult; message: string }>('/upload', { method: 'POST', body: data }),
  getBatch: (batchId: string) =>
    apiFetch<{ data: UploadBatchDetail }>(`/upload/batch/${batchId}`),
};

// Analytics
export const analyticsApi = {
  overview: (userId?: string) =>
    apiFetch<{ data: AnalyticsOverview }>(`/analytics/overview${userId ? `?user_id=${userId}` : ''}`),
  trends: (days: number = 7, userId?: string) =>
    apiFetch<{ data: Record<string, number> }>(`/analytics/trends?days=${days}${userId ? `&user_id=${userId}` : ''}`),
  topArticles: (limit: number = 10, userId?: string) =>
    apiFetch<{ data: Article[] }>(`/analytics/top-articles?limit=${limit}${userId ? `&user_id=${userId}` : ''}`),
};

// Admin
export const adminApi = {
  listUsers: (page: number = 1) =>
    apiFetch<{ data: PaginatedResponse<UserInfo> }>(`/admin/users?page=${page}`),
  updateUserStatus: (id: string, status: string, adminId: string) =>
    apiFetch<{ data: UserInfo; message: string }>(`/admin/users/${id}/status`, { method: 'PATCH', body: { status, admin_id: adminId } }),
  updateUserRole: (id: string, role: string, adminId: string) =>
    apiFetch<{ data: UserInfo; message: string }>(`/admin/users/${id}/role`, { method: 'PATCH', body: { role, admin_id: adminId } }),
  getAuditLog: (page: number = 1) =>
    apiFetch<{ data: PaginatedResponse<AuditLogEntry> }>(`/admin/audit-log?page=${page}`),
  getSystemConfig: () =>
    apiFetch<{ data: SystemConfig[] }>('/admin/system-config'),
  updateSystemConfig: (key: string, value: unknown, adminId: string) =>
    apiFetch<{ data: SystemConfig; message: string }>(`/admin/system-config/${key}`, { method: 'PATCH', body: { value, admin_id: adminId } }),
};

// Settings
export const settingsApi = {
  getQuota: (userId: string) =>
    apiFetch<{ data: UserQuota }>(`/settings/quota/${userId}`),
  updateProfile: (userId: string, data: { username?: string; email?: string }) =>
    apiFetch<{ data: UserInfo; message: string }>(`/settings/profile/${userId}`, { method: 'PATCH', body: data }),
};

// Types
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'banned' | 'suspended';
  created_at: string;
  updated_at?: string;
}

export interface Article {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary?: string;
  source_url?: string;
  source_platform: string;
  source_author?: string;
  collection_method: string;
  tags: string[];
  is_favorited: boolean;
  hotness: number;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  article_id: string;
  user_id: string;
  hotness_score: { level: string; score: number; factors: string[] };
  emotion_tags: string[];
  title_formulas: Array<{ name: string; confidence: number }>;
  structure_template: Record<string, unknown>;
  top_3_genes: Array<{ rank: number; gene: string; reason: string }>;
  platform_fit: Array<{ platform: string; fit_score: number; reason: string }>;
  raw_llm_response?: string;
  llm_model?: string;
  created_at: string;
}

export interface RewriteTask {
  id: string;
  article_id: string;
  user_id: string;
  target_platforms: string[];
  style_overrides: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  article?: Article;
}

export interface RewriteResult {
  id: string;
  task_id: string;
  platform: string;
  title: string;
  content: string;
  similarity_score: number;
  word_count: number;
  created_at: string;
}

export interface CollectionTask {
  id: string;
  user_id: string;
  keyword: string;
  platforms: string[];
  max_results: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  collected_count: number;
  created_at: string;
}

export interface UploadBatchResult {
  batch_id: string;
  total_count: number;
  success_count: number;
  fail_count: number;
  threshold_met: boolean;
  articles: Array<{ file_id: string; article_id: string }>;
}

export interface UploadBatchDetail {
  id: string;
  user_id: string;
  total_count: number;
  success_count: number;
  fail_count: number;
  threshold_met: boolean;
  status: string;
  upload_file: UploadFile[];
}

export interface UploadFile {
  id: string;
  batch_id: string;
  original_name: string;
  file_format: string;
  file_size: number;
  status: string;
  parsed_title?: string;
  article_id?: string;
  error_message?: string;
}

export interface AnalyticsOverview {
  article_count: number;
  analysis_count: number;
  rewrite_count: number;
  collection_count: number;
  platform_distribution: Record<string, number>;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  description?: string;
  category?: string;
}

export interface UserQuota {
  user_id: string;
  daily_llm_tokens: number;
  daily_rewrites: number;
  daily_collections: number;
  daily_uploads: number;
  used_llm_tokens: number;
  used_rewrites: number;
  used_collections: number;
  used_uploads: number;
  quota_reset_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
