// ABOUTME: API client for all backend endpoints — aligned with Python FastAPI backend
const API_BASE = '/api/v1';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

// ── Token management ──
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...rest.headers as Record<string, string>,
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '请求失败' }));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiFetch<{ data: TokenResponse; message: string }>('/auth/register', { method: 'POST', body: data }),
  login: (data: { username: string; password: string }) =>
    apiFetch<{ data: TokenResponse; message: string }>('/auth/login', { method: 'POST', body: data }),
  getProfile: () =>
    apiFetch<{ data: UserInfo }>('/auth/me'),
  changePassword: (data: { old_password: string; new_password: string }) =>
    apiFetch<{ data: boolean; message: string }>('/auth/password', { method: 'PUT', body: data }),
};

// ── Collection ──
export const collectionApi = {
  platforms: () =>
    apiFetch<{ data: PlatformInfo[] }>('/collect/platforms'),
  createTask: (data: { keyword: string; platforms: string[]; max_results?: number }) =>
    apiFetch<{ data: CollectionTask; message: string }>('/collect/tasks', { method: 'POST', body: data }),
  listTasks: (page: number = 1, page_size: number = 20) =>
    apiFetch<{ data: PageResult<CollectionTask> }>(`/collect/tasks?page=${page}&page_size=${page_size}`),
  getTask: (taskId: string) =>
    apiFetch<{ data: CollectionTask }>(`/collect/tasks/${taskId}`),
};

// ── Analysis ──
export const analysisApi = {
  get: (articleId: string) =>
    apiFetch<{ data: AnalysisResult }>(`/analysis/articles/${articleId}`),
  batchAnalyze: (data: { article_ids: string[] }) =>
    apiFetch<{ data: BatchAnalysisResult; message: string }>('/analysis/batch', { method: 'POST', body: data }),
};

// ── Rewrite ──
export const rewriteApi = {
  createTask: (data: { article_id: string; target_platforms: string[]; style_overrides?: Record<string, unknown> }) =>
    apiFetch<{ data: RewriteTask; message: string }>('/rewrite/tasks', { method: 'POST', body: data }),
  listTasks: (page: number = 1, page_size: number = 20) =>
    apiFetch<{ data: PageResult<RewriteTask> }>(`/rewrite/tasks?page=${page}&page_size=${page_size}`),
  getTask: (taskId: string) =>
    apiFetch<{ data: RewriteDetail }>(`/rewrite/tasks/${taskId}`),
  streamUrl: (taskId: string) =>
    `${API_BASE}/rewrite/tasks/${taskId}/stream`,
};

// ── Library (Articles) ──
export const articleApi = {
  list: (params: Record<string, string | number | boolean>) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch<{ data: PageResult<Article> }>(`/library/articles?${qs}`);
  },
  get: (id: string) =>
    apiFetch<{ data: Article }>(`/library/articles/${id}`),
  delete: (id: string) =>
    apiFetch<{ data: boolean; message: string }>(`/library/articles/${id}`, { method: 'DELETE' }),
  toggleFavorite: (articleId: string, groupId?: string) =>
    apiFetch<{ data: boolean; message: string }>('/library/favorite', { method: 'POST', body: { article_id: articleId, group_id: groupId } }),
  getTags: () =>
    apiFetch<{ data: string[] }>('/library/tags'),
  export: (data: { article_ids: string[]; format: string }) =>
    fetch(`${API_BASE}/library/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify(data),
    }),
};

// ── Upload ──
export const uploadApi = {
  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return fetch(`${API_BASE}/upload/files`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(res => res.json());
  },
  getBatch: (batchId: string) =>
    apiFetch<{ data: UploadBatchDetail }>(`/upload/batches/${batchId}`),
  getProgress: (batchId: string) =>
    apiFetch<{ data: UploadProgress }>(`/upload/batches/${batchId}/progress`),
};

// ── Dashboard ──
export const analyticsApi = {
  overview: (range: string = '7d') =>
    apiFetch<{ data: DashboardData }>(`/dashboard/overview?range=${range}`),
};

// ── Settings ──
export const settingsApi = {
  get: () =>
    apiFetch<{ data: UserSettings }>('/settings/'),
  update: (data: Partial<UserSettings>) =>
    apiFetch<{ data: UserSettings; message: string }>('/settings/', { method: 'PUT', body: data }),
};

// ── Admin ──
export const adminApi = {
  listUsers: (params: { keyword?: string; role?: string; status?: string; page?: number; page_size?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch<{ data: PageResult<AdminUser> }>(`/admin/users?${qs}`);
  },
  updateUser: (userId: string, data: { role?: string; status?: string }) =>
    apiFetch<{ data: AdminUser; message: string }>(`/admin/users/${userId}`, { method: 'PUT', body: data }),
  updateQuota: (userId: string, data: Record<string, number>) =>
    apiFetch<{ data: Record<string, unknown>; message: string }>(`/admin/users/${userId}/quota`, { method: 'PUT', body: data }),
  listApiKeys: () =>
    apiFetch<{ data: ApiKeyInfo[] }>('/admin/api-keys'),
  createApiKey: (data: { service: string; key_value: string }) =>
    apiFetch<{ data: ApiKeyInfo; message: string }>('/admin/api-keys', { method: 'POST', body: data }),
  toggleApiKey: (keyId: string, isActive: boolean) =>
    apiFetch<{ data: ApiKeyInfo; message: string }>(`/admin/api-keys/${keyId}/toggle?is_active=${isActive}`, { method: 'PUT' }),
  listConfigs: (group?: string) =>
    apiFetch<{ data: SystemConfig[] }>(`/admin/configs${group ? `?group=${group}` : ''}`),
  updateConfig: (key: string, value: unknown) =>
    apiFetch<{ data: SystemConfig; message: string }>(`/admin/configs/${key}`, { method: 'PUT', body: { value } }),
  listAuditLogs: (params: { action?: string; page?: number; page_size?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return apiFetch<{ data: PageResult<AuditLogEntry> }>(`/admin/audit-logs?${qs}`);
  },
  getMonitor: () =>
    apiFetch<{ data: SystemMonitor }>('/admin/monitor'),
};

// ── Types ──
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

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
  created_at: string;
  updated_at?: string;
}

export interface AnalysisResult {
  id: string;
  article_id: string;
  hotness_score: { level: string; score: number; factors: string[] };
  emotion_tags: string[];
  title_formulas: Array<{ name: string; confidence: number }>;
  structure_template: Record<string, unknown>;
  interaction_analysis?: Record<string, unknown>;
  top_3_genes: Array<{ rank: number; gene: string; reason: string }>;
  platform_fit: Array<{ platform: string; fit_score: number; reason: string }>;
  raw_llm_response?: string;
  llm_model?: string;
  llm_tokens_used?: number;
  created_at: string;
}

export interface BatchAnalysisResult {
  total: number;
  triggered: number;
  skipped: number;
  task_ids: string[];
}

export interface RewriteTask {
  id: string;
  article_id: string;
  user_id: string;
  target_platforms: string[];
  style_overrides: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  llm_call_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface RewriteResult {
  id: string;
  task_id: string;
  platform: string;
  title: string;
  content: string;
  similarity_score: number;
  word_count: number;
  rewrite_notes?: string;
  created_at: string;
}

export interface RewriteDetail {
  task: RewriteTask;
  results: RewriteResult[];
}

export interface CollectionTask {
  id: string;
  keyword: string;
  platforms: string[];
  max_results: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  collected_count: number;
  error_message?: string;
  created_at: string;
}

export interface UploadBatchDetail {
  id: string;
  user_id: string;
  total_count: number;
  success_count: number;
  fail_count: number;
  threshold_met: boolean;
  status: string;
  created_at: string;
  upload_file?: UploadFile[];
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

export interface UploadProgress {
  batch_id: string;
  total: number;
  completed: number;
  failed: number;
  processing: number;
  threshold_met: boolean;
}

export interface DashboardData {
  total_articles: number;
  total_analyses: number;
  total_rewrites: number;
  avg_hotness_score?: number;
  platform_distribution: Array<{ platform: string; count: number }>;
  collection_trend: Array<{ date: string; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
}

export interface UserSettings {
  default_platforms?: string[];
  default_style?: Record<string, unknown>;
  notification_enabled?: boolean;
  auto_analyze?: boolean;
  upload_threshold?: number;
}

export interface PlatformInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiKeyInfo {
  id: string;
  service: string;
  key_hint: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  description?: string;
  config_group?: string;
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

export interface SystemMonitor {
  total_users: number;
  active_users_24h: number;
  total_articles: number;
  total_analyses: number;
  total_rewrites: number;
  db_size_mb?: number;
  llm_tokens_used_today?: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
