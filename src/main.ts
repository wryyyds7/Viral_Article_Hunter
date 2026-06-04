// ABOUTME: Main application logic - SPA with all pages
import { router } from './router';
import {
  authApi, articleApi, analysisApi, rewriteApi, collectionApi,
  uploadApi, analyticsApi, adminApi, settingsApi,
  type UserInfo, type Article, type AnalysisResult, type RewriteTask, type RewriteResult,
  type CollectionTask, type AnalyticsOverview,
} from './api';

// ============ State ============
let currentUser: UserInfo | null = null;

function setCurrentUser(user: UserInfo | null) {
  currentUser = user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

function loadSavedUser(): void {
  const saved = localStorage.getItem('user');
  if (saved) {
    try { currentUser = JSON.parse(saved); } catch { /* ignore */ }
  }
}

// ============ Layout ============
function renderLayout(content: string, activePath: string = '/'): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-60 flex-shrink-0 border-r flex flex-col" style="background:var(--sidebar-bg);border-color:var(--sidebar-border)">
        <div class="p-5 border-b" style="border-color:var(--sidebar-border)">
          <h1 class="text-lg font-bold" style="color:var(--primary)">
            <span style="margin-right:6px">🔥</span>爆文猎人
          </h1>
          <p class="text-xs mt-1" style="color:var(--muted-foreground)">AI驱动的内容创作平台</p>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          <a href="#/dashboard" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/dashboard' ? 'nav-active' : ''}">
            <span>📊</span> 数据看板
          </a>
          <a href="#/collect" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/collect' ? 'nav-active' : ''}">
            <span>🔍</span> 热点采集
          </a>
          <a href="#/articles" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/articles' ? 'nav-active' : ''}">
            <span>📁</span> 素材库
          </a>
          <a href="#/upload" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/upload' ? 'nav-active' : ''}">
            <span>📤</span> 文档上传
          </a>
          <a href="#/rewrite" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/rewrite' ? 'nav-active' : ''}">
            <span>✍️</span> 一键改写
          </a>
          ${currentUser?.role === 'admin' ? `
          <a href="#/admin" data-nav-link class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${activePath === '/admin' ? 'nav-active' : ''}">
            <span>⚙️</span> 管理后台
          </a>` : ''}
        </nav>
        <div class="p-3 border-t" style="border-color:var(--sidebar-border)">
          ${currentUser ? `
          <div class="flex items-center gap-3 px-3 py-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style="background:var(--primary)">${currentUser.username[0].toUpperCase()}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">${currentUser.username}</div>
              <div class="text-xs" style="color:var(--muted-foreground)">${currentUser.role === 'admin' ? '管理员' : '普通用户'}</div>
            </div>
          </div>
          <button id="logout-btn" class="btn-ghost w-full text-xs mt-1" style="color:var(--muted-foreground)">退出登录</button>
          ` : ''}
        </div>
      </aside>
      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto" style="background:var(--background)">
        <div class="p-6 max-w-6xl mx-auto fade-in">
          ${content}
        </div>
      </main>
    </div>
  `;

  // Bind logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    setCurrentUser(null);
    router.navigate('/login');
  });

  // Style nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    const hel = el as HTMLElement;
    hel.addEventListener('mouseenter', () => { if (!hel.classList.contains('nav-active')) hel.style.background = 'var(--secondary)'; });
    hel.addEventListener('mouseleave', () => { if (!hel.classList.contains('nav-active')) hel.style.background = 'transparent'; });
  });
  document.querySelectorAll('.nav-active').forEach(el => {
    const hel = el as HTMLElement;
    hel.style.background = '#eef2ff';
    hel.style.color = 'var(--primary)';
    hel.style.fontWeight = '600';
  });
}

// ============ Login Page ============
function renderLogin(): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="flex h-screen items-center justify-center" style="background:var(--background)">
      <div class="w-full max-w-md p-8">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold" style="color:var(--primary)">🔥 爆文猎人</h1>
          <p class="mt-2 text-sm" style="color:var(--muted-foreground)">AI驱动的爆款内容创作平台</p>
        </div>
        <div class="card">
          <div class="flex mb-6 border-b" style="border-color:var(--border)">
            <button id="tab-login" class="flex-1 py-3 text-sm font-medium border-b-2" style="border-color:var(--primary);color:var(--primary)">登录</button>
            <button id="tab-register" class="flex-1 py-3 text-sm font-medium" style="color:var(--muted-foreground)">注册</button>
          </div>
          <!-- Login Form -->
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">邮箱</label>
              <input type="email" id="login-email" class="input" placeholder="请输入邮箱" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">密码</label>
              <input type="password" id="login-password" class="input" placeholder="请输入密码" required />
            </div>
            <div id="login-error" class="text-sm hidden" style="color:var(--destructive)"></div>
            <button type="submit" class="btn-primary w-full justify-center py-3">登录</button>
          </form>
          <!-- Register Form -->
          <form id="register-form" class="space-y-4 hidden">
            <div>
              <label class="block text-sm font-medium mb-1">用户名</label>
              <input type="text" id="reg-username" class="input" placeholder="请输入用户名" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">邮箱</label>
              <input type="email" id="reg-email" class="input" placeholder="请输入邮箱" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">密码</label>
              <input type="password" id="reg-password" class="input" placeholder="至少6位" required />
            </div>
            <div id="register-error" class="text-sm hidden" style="color:var(--destructive)"></div>
            <button type="submit" class="btn-primary w-full justify-center py-3">注册</button>
          </form>
        </div>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('login-form')!;
  const registerForm = document.getElementById('register-form')!;
  const tabLogin = document.getElementById('tab-login')!;
  const tabRegister = document.getElementById('tab-register')!;

  tabLogin.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.style.borderColor = 'var(--primary)';
    tabLogin.style.color = 'var(--primary)';
    tabRegister.style.borderColor = 'transparent';
    tabRegister.style.color = 'var(--muted-foreground)';
  });

  tabRegister.addEventListener('click', () => {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    tabRegister.style.borderColor = 'var(--primary)';
    tabRegister.style.color = 'var(--primary)';
    tabLogin.style.borderColor = 'transparent';
    tabLogin.style.color = 'var(--muted-foreground)';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error')!;
    errEl.classList.add('hidden');
    try {
      const res = await authApi.login({
        email: (document.getElementById('login-email') as HTMLInputElement).value,
        password: (document.getElementById('login-password') as HTMLInputElement).value,
      });
      setCurrentUser(res.data);
      router.navigate('/dashboard');
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : '登录失败';
      errEl.classList.remove('hidden');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error')!;
    errEl.classList.add('hidden');
    try {
      const res = await authApi.register({
        username: (document.getElementById('reg-username') as HTMLInputElement).value,
        email: (document.getElementById('reg-email') as HTMLInputElement).value,
        password: (document.getElementById('reg-password') as HTMLInputElement).value,
      });
      setCurrentUser(res.data);
      router.navigate('/dashboard');
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : '注册失败';
      errEl.classList.remove('hidden');
    }
  });
}

// ============ Dashboard Page ============
function renderDashboard(): void {
  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">数据看板</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">概览您的创作数据</p>
    </div>
    <div id="dashboard-stats" class="grid grid-cols-4 gap-4 mb-6">
      ${['文章数', '分析次数', '改写次数', '采集任务'].map(label => `
        <div class="card text-center">
          <div class="skeleton h-8 w-16 mx-auto mb-2"></div>
          <div class="text-xs" style="color:var(--muted-foreground)">${label}</div>
        </div>
      `).join('')}
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-semibold mb-4">平台分布</h3>
        <div id="platform-chart" class="space-y-3">
          <div class="skeleton h-6 w-full"></div>
          <div class="skeleton h-6 w-3/4"></div>
          <div class="skeleton h-6 w-1/2"></div>
        </div>
      </div>
      <div class="card">
        <h3 class="font-semibold mb-4">热门文章 TOP5</h3>
        <div id="top-articles" class="space-y-3">
          <div class="skeleton h-10 w-full"></div>
          <div class="skeleton h-10 w-full"></div>
          <div class="skeleton h-10 w-full"></div>
        </div>
      </div>
    </div>
  `, '/dashboard');

  // Load data
  const userId = currentUser?.id || 'default';
  analyticsApi.overview(userId).then(res => {
    const stats = res.data;
    document.getElementById('dashboard-stats')!.innerHTML = [
      { label: '文章数', value: stats.article_count, color: '#6366f1' },
      { label: '分析次数', value: stats.analysis_count, color: '#22c55e' },
      { label: '改写次数', value: stats.rewrite_count, color: '#f59e0b' },
      { label: '采集任务', value: stats.collection_count, color: '#3b82f6' },
    ].map(s => `
      <div class="card text-center">
        <div class="text-2xl font-bold" style="color:${s.color}">${s.value}</div>
        <div class="text-xs mt-1" style="color:var(--muted-foreground)">${s.label}</div>
      </div>
    `).join('');

    // Platform distribution
    const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', wechat: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条', upload: '上传' };
    const total = Object.values(stats.platform_distribution).reduce((a: number, b: number) => a + b, 0) || 1;
    document.getElementById('platform-chart')!.innerHTML = Object.entries(stats.platform_distribution)
      .sort(([, a]: [string, unknown], [, b]: [string, unknown]) => (b as number) - (a as number))
      .map(([k, v]) => `
        <div class="flex items-center gap-3">
          <span class="text-sm w-16">${platformNames[k] || k}</span>
          <div class="flex-1 h-6 rounded-full" style="background:var(--secondary)">
            <div class="h-6 rounded-full flex items-center pl-2 text-xs text-white" style="width:${Math.max(8, ((v as number) / total) * 100)}%;background:var(--primary)">${v as number}</div>
          </div>
        </div>
      `).join('') || '<p class="text-sm" style="color:var(--muted-foreground)">暂无数据</p>';
  }).catch(() => {});

  analyticsApi.topArticles(5, userId).then(res => {
    document.getElementById('top-articles')!.innerHTML = res.data.length > 0
      ? res.data.map((a: Article, i: number) => `
        <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" data-article-id="${a.id}">
          <span class="text-lg font-bold" style="color:${i < 3 ? 'var(--primary)' : 'var(--muted-foreground)'}">#${i + 1}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${a.title}</div>
            <div class="text-xs" style="color:var(--muted-foreground)">${a.source_platform} · 热度 ${a.hotness}</div>
          </div>
        </div>
      `).join('')
      : '<p class="text-sm" style="color:var(--muted-foreground)">暂无数据，先采集或上传一些内容吧</p>';
  }).catch(() => {});
}

// ============ Collection Page ============
function renderCollect(): void {
  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">热点采集</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">从多个平台采集热门内容</p>
    </div>
    <div class="card mb-6">
      <h3 class="font-semibold mb-4">新建采集任务</h3>
      <form id="collect-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">关键词</label>
          <input type="text" id="collect-keyword" class="input" placeholder="输入要采集的关键词" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">目标平台</label>
          <div class="flex flex-wrap gap-2" id="platform-checks">
            ${[
              { id: 'xiaohongshu', name: '小红书' },
              { id: 'zhihu', name: '知乎' },
              { id: 'wechat', name: '公众号' },
              { id: 'douyin', name: '抖音' },
              { id: 'bilibili', name: 'B站' },
              { id: 'weibo', name: '微博' },
              { id: 'toutiao', name: '头条' },
            ].map(p => `
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-50" style="border-color:var(--border)">
                <input type="checkbox" value="${p.id}" class="platform-checkbox" ${p.id === 'xiaohongshu' ? 'checked' : ''} />
                <span class="text-sm">${p.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">采集数量</label>
          <input type="number" id="collect-max" class="input" style="width:200px" value="20" min="1" max="50" />
        </div>
        <button type="submit" class="btn-primary">开始采集</button>
      </form>
    </div>
    <div class="card">
      <h3 class="font-semibold mb-4">采集历史</h3>
      <div id="collect-history" class="space-y-3">
        <div class="skeleton h-12 w-full"></div>
        <div class="skeleton h-12 w-full"></div>
      </div>
    </div>
  `, '/collect');

  document.getElementById('collect-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = (document.getElementById('collect-keyword') as HTMLInputElement).value;
    const platforms = Array.from(document.querySelectorAll('.platform-checkbox:checked')).map(cb => (cb as HTMLInputElement).value);
    const maxResults = parseInt((document.getElementById('collect-max') as HTMLInputElement).value) || 20;

    if (!keyword) return;
    if (platforms.length === 0) { alert('请至少选择一个平台'); return; }

    try {
      const res = await collectionApi.create({ user_id: currentUser?.id, keyword, platforms, max_results: maxResults });
      alert(res.message || '采集任务已创建');
      loadCollectHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  });

  async function loadCollectHistory() {
    try {
      const res = await collectionApi.listTasks(currentUser?.id);
      const statusColors: Record<string, string> = { completed: 'badge-success', running: 'badge-primary', failed: 'badge-destructive', pending: 'badge-warning' };
      const statusNames: Record<string, string> = { completed: '已完成', running: '进行中', failed: '失败', pending: '等待中', partial: '部分完成' };
      document.getElementById('collect-history')!.innerHTML = res.data.length > 0
        ? res.data.map((t: CollectionTask) => `
          <div class="flex items-center justify-between p-3 rounded-lg border" style="border-color:var(--border)">
            <div>
              <div class="font-medium text-sm">${t.keyword}</div>
              <div class="text-xs mt-1" style="color:var(--muted-foreground)">${(t.platforms as string[]).join(', ')} · 采集 ${t.collected_count} 篇</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge ${statusColors[t.status] || 'badge-primary'}">${statusNames[t.status] || t.status}</span>
              <span class="text-xs" style="color:var(--muted-foreground)">${new Date(t.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无采集记录</p>';
    } catch { /* ignore */ }
  }
  loadCollectHistory();
}

// ============ Articles Page ============
function renderArticles(): void {
  renderLayout(`
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">素材库</h2>
        <p class="text-sm mt-1" style="color:var(--muted-foreground)">管理您的所有文章素材</p>
      </div>
      <div class="flex gap-2">
        <input type="text" id="article-search" class="input" style="width:240px" placeholder="搜索文章标题..." />
        <button id="article-search-btn" class="btn-secondary">搜索</button>
      </div>
    </div>
    <div id="articles-list" class="space-y-3">
      <div class="skeleton h-20 w-full"></div>
      <div class="skeleton h-20 w-full"></div>
      <div class="skeleton h-20 w-full"></div>
    </div>
    <div id="articles-pagination" class="flex justify-center gap-2 mt-6"></div>
  `, '/articles');

  let currentPage = 1;
  let searchKeyword = '';

  async function loadArticles() {
    try {
      const params: Record<string, string> = { page: currentPage.toString(), page_size: '20' };
      if (searchKeyword) params.keyword = searchKeyword;
      if (currentUser) params.user_id = currentUser.id;
      const res = await articleApi.list(params);
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', wechat: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条', upload: '上传' };

      document.getElementById('articles-list')!.innerHTML = res.data.items.length > 0
        ? res.data.items.map((a: Article) => `
          <div class="card flex items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-medium text-sm truncate">${a.title}</h3>
                ${a.is_favorited ? '<span class="text-xs" style="color:var(--warning)">★</span>' : ''}
              </div>
              <p class="text-xs line-clamp-2" style="color:var(--muted-foreground)">${a.summary || a.content?.substring(0, 100) + '...' || ''}</p>
              <div class="flex items-center gap-3 mt-2">
                <span class="badge badge-primary">${platformNames[a.source_platform] || a.source_platform}</span>
                ${a.tags?.slice(0, 3).map((t: string) => `<span class="text-xs" style="color:var(--muted-foreground)">#${t}</span>`).join('') || ''}
                <span class="text-xs" style="color:var(--muted-foreground)">热度 ${a.hotness}</span>
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button class="btn-ghost text-xs" data-analyze-id="${a.id}">分析</button>
              <button class="btn-ghost text-xs" data-fav-id="${a.id}">${a.is_favorited ? '取消收藏' : '收藏'}</button>
            </div>
          </div>
        `).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无文章，去采集或上传一些内容吧</p>';

      // Pagination
      const totalPages = Math.ceil(res.data.total / 20);
      document.getElementById('articles-pagination')!.innerHTML = totalPages > 1
        ? Array.from({ length: Math.min(totalPages, 5) }, (_, i) => `
          <button class="btn-ghost text-xs ${currentPage === i + 1 ? 'font-bold' : ''}" data-page="${i + 1}">${i + 1}</button>
        `).join('')
        : '';

      // Bind events
      document.querySelectorAll('[data-analyze-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = (btn as HTMLElement).dataset.analyzeId!;
          try {
            btn.textContent = '分析中...';
            await analysisApi.analyze({ article_id: id, user_id: currentUser?.id });
            alert('分析完成！');
          } catch (err) {
            alert(err instanceof Error ? err.message : '分析失败');
          }
        });
      });

      document.querySelectorAll('[data-fav-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = (btn as HTMLElement).dataset.favId!;
          try {
            await articleApi.toggleFavorite(id);
            loadArticles();
          } catch (err) {
            alert(err instanceof Error ? err.message : '操作失败');
          }
        });
      });

      document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt((btn as HTMLElement).dataset.page!);
          loadArticles();
        });
      });
    } catch { /* ignore */ }
  }

  document.getElementById('article-search-btn')!.addEventListener('click', () => {
    searchKeyword = (document.getElementById('article-search') as HTMLInputElement).value;
    currentPage = 1;
    loadArticles();
  });

  loadArticles();
}

// ============ Upload Page ============
function renderUpload(): void {
  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">文档上传</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">上传文档解析为素材，至少10篇可获得更准确的分析</p>
    </div>
    <div class="card mb-6">
      <div id="drop-zone" class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors" style="border-color:var(--border)">
        <div class="text-4xl mb-3">📄</div>
        <p class="font-medium">拖拽文件到此处，或点击选择文件</p>
        <p class="text-xs mt-2" style="color:var(--muted-foreground)">支持 TXT、MD、DOCX、PDF、HTML，单文件最大5MB</p>
        <input type="file" id="file-input" multiple accept=".txt,.md,.docx,.pdf,.html" class="hidden" />
      </div>
      <div id="file-list" class="mt-4 space-y-2 hidden"></div>
      <div class="flex items-center justify-between mt-4">
        <span id="file-count" class="text-sm" style="color:var(--muted-foreground)"></span>
        <button id="upload-btn" class="btn-primary" disabled>开始上传</button>
      </div>
    </div>
    <div id="upload-result" class="card hidden"></div>
  `, '/upload');

  const dropZone = document.getElementById('drop-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const fileList = document.getElementById('file-list')!;
  const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
  const fileCountEl = document.getElementById('file-count')!;
  let selectedFiles: File[] = [];

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    handleFiles(Array.from(e.dataTransfer?.files || []));
  });
  fileInput.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files || []));
  });

  function handleFiles(files: File[]) {
    selectedFiles = [...selectedFiles, ...files];
    renderFileList();
  }

  function renderFileList() {
    if (selectedFiles.length === 0) {
      fileList.classList.add('hidden');
      uploadBtn.disabled = true;
      fileCountEl.textContent = '';
      return;
    }
    fileList.classList.remove('hidden');
    uploadBtn.disabled = false;
    fileCountEl.textContent = `已选择 ${selectedFiles.length} 个文件${selectedFiles.length < 10 ? '（未达10篇阈值，分析结果可能不够准确）' : '（已达分析阈值）'}`;

    fileList.innerHTML = selectedFiles.map((f, i) => `
      <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color:var(--border)">
        <div class="flex items-center gap-2">
          <span class="text-sm">📄</span>
          <span class="text-sm">${f.name}</span>
          <span class="text-xs" style="color:var(--muted-foreground)">${(f.size / 1024).toFixed(1)}KB</span>
        </div>
        <button class="btn-ghost text-xs" data-remove="${i}">移除</button>
      </div>
    `).join('');

    fileList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt((btn as HTMLElement).dataset.remove!), 1);
        renderFileList();
      });
    });
  }

  uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传解析中...';

    try {
      const files = await Promise.all(selectedFiles.map(async f => ({
        name: f.name,
        format: f.name.split('.').pop() || 'txt',
        size: f.size,
        content: await f.text(),
      })));

      const res = await uploadApi.batch({ user_id: currentUser?.id, files });
      const resultEl = document.getElementById('upload-result')!;
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <h3 class="font-semibold mb-3">上传结果</h3>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center"><div class="text-xl font-bold">${res.data.total_count}</div><div class="text-xs" style="color:var(--muted-foreground)">总计</div></div>
          <div class="text-center"><div class="text-xl font-bold" style="color:var(--success)">${res.data.success_count}</div><div class="text-xs" style="color:var(--muted-foreground)">成功</div></div>
          <div class="text-center"><div class="text-xl font-bold" style="color:var(--destructive)">${res.data.fail_count}</div><div class="text-xs" style="color:var(--muted-foreground)">失败</div></div>
        </div>
        <p class="text-sm" style="color:${res.data.threshold_met ? 'var(--success)' : 'var(--warning)'}">
          ${res.message}
        </p>
      `;

      selectedFiles = [];
      renderFileList();
      fileInput.value = '';
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    }
    uploadBtn.disabled = false;
    uploadBtn.textContent = '开始上传';
  });
}

// ============ Rewrite Page ============
function renderRewrite(): void {
  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">一键改写</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">选择文章和目标平台，AI帮你一键生成适配各平台的内容</p>
    </div>
    <div class="card mb-6">
      <h3 class="font-semibold mb-4">创建改写任务</h3>
      <form id="rewrite-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">选择文章</label>
          <select id="rewrite-article" class="input">
            <option value="">加载中...</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">目标平台</label>
          <div class="flex flex-wrap gap-2">
            ${[
              { id: 'xiaohongshu', name: '小红书' },
              { id: 'zhihu', name: '知乎' },
              { id: 'wechat', name: '公众号' },
              { id: 'douyin', name: '抖音' },
              { id: 'bilibili', name: 'B站' },
              { id: 'weibo', name: '微博' },
              { id: 'toutiao', name: '头条' },
            ].map(p => `
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-50" style="border-color:var(--border)">
                <input type="checkbox" value="${p.id}" class="rewrite-platform-cb" />
                <span class="text-sm">${p.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <button type="submit" class="btn-primary">开始改写</button>
      </form>
    </div>
    <div id="rewrite-progress" class="card hidden mb-6"></div>
    <div id="rewrite-results" class="space-y-4"></div>
  `, '/rewrite');

  // Load articles for select
  articleApi.list({ page: 1, page_size: 50, user_id: currentUser?.id || 'default' }).then(res => {
    const select = document.getElementById('rewrite-article') as HTMLSelectElement;
    select.innerHTML = '<option value="">请选择文章</option>' + res.data.items.map((a: Article) => `<option value="${a.id}">${a.title}</option>`).join('');
  }).catch(() => {});

  document.getElementById('rewrite-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const articleId = (document.getElementById('rewrite-article') as HTMLSelectElement).value;
    const platforms = Array.from(document.querySelectorAll('.rewrite-platform-cb:checked')).map(cb => (cb as HTMLInputElement).value);

    if (!articleId) { alert('请选择文章'); return; }
    if (platforms.length === 0) { alert('请至少选择一个目标平台'); return; }

    try {
      // Create task
      const taskRes = await rewriteApi.createTask({ article_id: articleId, target_platforms: platforms, user_id: currentUser?.id });
      const taskId = taskRes.data.id;

      // Show progress
      const progressEl = document.getElementById('rewrite-progress')!;
      progressEl.classList.remove('hidden');
      progressEl.innerHTML = `
        <h3 class="font-semibold mb-3">改写进度</h3>
        <div id="rewrite-progress-items" class="space-y-2">
          ${platforms.map(p => `<div id="progress-${p}" class="flex items-center gap-2"><span class="skeleton h-4 w-4 rounded-full inline-block"></span><span class="text-sm">${p} 改写中...</span></div>`).join('')}
        </div>
      `;

      // Execute task (POST for SSE-like)
      const results: RewriteResult[] = [];
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const progressItem = document.getElementById(`progress-${p}`);
        if (progressItem) {
          progressItem.innerHTML = `<span class="inline-block w-4 h-4 rounded-full" style="background:var(--warning)"></span><span class="text-sm">${p} 改写中...</span>`;
        }
      }

      // Call execute
      const execRes = await fetch(`/api/v1/rewrite/tasks/${taskId}/execute`, { method: 'POST' });
      if (execRes.ok) {
        const reader = execRes.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.platform) {
                  const pi = document.getElementById(`progress-${event.platform}`);
                  if (pi && event.result) {
                    pi.innerHTML = `<span class="inline-block w-4 h-4 rounded-full" style="background:var(--success)"></span><span class="text-sm">${event.platform} 完成</span>`;
                    results.push(event.result);
                  }
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }

      // Also fetch results via REST as fallback
      const resResults = await rewriteApi.getResults(taskId);

      // Render results
      const resultsEl = document.getElementById('rewrite-results')!;
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', wechat: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条' };
      resultsEl.innerHTML = resResults.data.map(r => `
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <span class="badge badge-primary">${platformNames[r.platform] || r.platform}</span>
            <span class="text-xs" style="color:var(--muted-foreground)">相似度 ${(r.similarity_score * 100).toFixed(0)}% · ${r.word_count}字</span>
          </div>
          <h4 class="font-semibold mb-2">${r.title}</h4>
          <div class="text-sm whitespace-pre-wrap" style="color:var(--muted-foreground)">${r.content}</div>
          <div class="mt-3">
            <button class="btn-secondary text-xs" data-copy="${r.id}">复制内容</button>
          </div>
        </div>
      `).join('');

      // Copy buttons
      resultsEl.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const rId = (btn as HTMLElement).dataset.copy!;
          const result = resResults.data.find(r => r.id === rId);
          if (result) {
            navigator.clipboard.writeText(result.title + '\n\n' + result.content);
            (btn as HTMLElement).textContent = '已复制';
            setTimeout(() => { (btn as HTMLElement).textContent = '复制内容'; }, 2000);
          }
        });
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '改写失败');
    }
  });
}

// ============ Admin Page ============
function renderAdmin(): void {
  if (currentUser?.role !== 'admin') {
    renderLayout(`<div class="text-center py-20"><p style="color:var(--destructive)">无权访问管理后台</p></div>`);
    return;
  }

  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">管理后台</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">用户管理、系统监控与配置</p>
    </div>
    <div class="flex gap-2 mb-6">
      <button class="btn-secondary admin-tab" data-tab="users" style="background:var(--primary);color:white;border-color:var(--primary)">用户管理</button>
      <button class="btn-secondary admin-tab" data-tab="audit">操作审计</button>
      <button class="btn-secondary admin-tab" data-tab="config">系统配置</button>
    </div>
    <div id="admin-content"></div>
  `, '/admin');

  document.querySelectorAll('.admin-tab').forEach(tab => {
    const htab = tab as HTMLElement;
    htab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => { const ht = t as HTMLElement; ht.style.background = ''; ht.style.color = ''; ht.style.borderColor = ''; });
      htab.style.background = 'var(--primary)';
      htab.style.color = 'white';
      htab.style.borderColor = 'var(--primary)';
      loadAdminTab((tab as HTMLElement).dataset.tab!);
    });
  });

  loadAdminTab('users');

  async function loadAdminTab(tab: string) {
    const content = document.getElementById('admin-content')!;
    if (tab === 'users') {
      try {
        const res = await adminApi.listUsers();
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">用户</th>
                <th class="text-left py-3 font-medium">邮箱</th>
                <th class="text-left py-3 font-medium">角色</th>
                <th class="text-left py-3 font-medium">状态</th>
                <th class="text-left py-3 font-medium">操作</th>
              </tr></thead>
              <tbody>
                ${res.data.items.map((u: UserInfo) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3">${u.username}</td>
                    <td class="py-3" style="color:var(--muted-foreground)">${u.email}</td>
                    <td class="py-3"><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-warning'}">${u.role === 'admin' ? '管理员' : '用户'}</span></td>
                    <td class="py-3"><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-destructive'}">${u.status === 'active' ? '正常' : '封禁'}</span></td>
                    <td class="py-3">
                      <button class="btn-ghost text-xs" data-toggle-status="${u.id}" data-status="${u.status}">${u.status === 'active' ? '封禁' : '解封'}</button>
                      <button class="btn-ghost text-xs" data-toggle-role="${u.id}" data-role="${u.role}">${u.role === 'admin' ? '降为用户' : '升为管理员'}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        content.querySelectorAll('[data-toggle-status]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = (btn as HTMLElement).dataset.toggleStatus!;
            const currentStatus = (btn as HTMLElement).dataset.status!;
            const newStatus = currentStatus === 'active' ? 'banned' : 'active';
            try {
              await adminApi.updateUserStatus(id, newStatus, currentUser!.id);
              loadAdminTab('users');
            } catch (err) { alert(err instanceof Error ? err.message : '操作失败'); }
          });
        });

        content.querySelectorAll('[data-toggle-role]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = (btn as HTMLElement).dataset.toggleRole!;
            const currentRole = (btn as HTMLElement).dataset.role!;
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            if (!confirm(`确定将用户角色更改为${newRole === 'admin' ? '管理员' : '普通用户'}？`)) return;
            try {
              await adminApi.updateUserRole(id, newRole, currentUser!.id);
              loadAdminTab('users');
            } catch (err) { alert(err instanceof Error ? err.message : '操作失败'); }
          });
        });
      } catch (err) {
        content.innerHTML = `<p class="text-sm" style="color:var(--destructive)">加载失败: ${err instanceof Error ? err.message : 'Unknown'}</p>`;
      }
    } else if (tab === 'audit') {
      try {
        const res = await adminApi.getAuditLog();
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">时间</th>
                <th class="text-left py-3 font-medium">操作</th>
                <th class="text-left py-3 font-medium">目标</th>
                <th class="text-left py-3 font-medium">IP</th>
              </tr></thead>
              <tbody>
                ${res.data.items.map((l: { created_at: string; action: string; target_type: string; target_id: string; ip_address: string }) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3" style="color:var(--muted-foreground)">${new Date(l.created_at).toLocaleString()}</td>
                    <td class="py-3">${l.action}</td>
                    <td class="py-3">${l.target_type}/${l.target_id?.substring(0, 8)}</td>
                    <td class="py-3" style="color:var(--muted-foreground)">${l.ip_address}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch { content.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground)">暂无审计记录</p>'; }
    } else if (tab === 'config') {
      try {
        const res = await adminApi.getSystemConfig();
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">配置项</th>
                <th class="text-left py-3 font-medium">当前值</th>
                <th class="text-left py-3 font-medium">描述</th>
              </tr></thead>
              <tbody>
                ${res.data.map((c: { key: string; value: unknown; description?: string }) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3 font-mono text-xs">${c.key}</td>
                    <td class="py-3">${JSON.stringify(c.value)}</td>
                    <td class="py-3" style="color:var(--muted-foreground)">${c.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch { content.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground)">加载失败</p>'; }
    }
  }
}

// ============ App Init ============
export function initApp(): void {
  loadSavedUser();

  router
    .addRoute('/login', renderLogin)
    .addRoute('/register', renderLogin)
    .addRoute('/dashboard', () => { if (!currentUser) { router.navigate('/login'); return; } renderDashboard(); })
    .addRoute('/collect', () => { if (!currentUser) { router.navigate('/login'); return; } renderCollect(); })
    .addRoute('/articles', () => { if (!currentUser) { router.navigate('/login'); return; } renderArticles(); })
    .addRoute('/upload', () => { if (!currentUser) { router.navigate('/login'); return; } renderUpload(); })
    .addRoute('/rewrite', () => { if (!currentUser) { router.navigate('/login'); return; } renderRewrite(); })
    .addRoute('/admin', () => { if (!currentUser) { router.navigate('/login'); return; } renderAdmin(); })
    .addRoute('/', () => { router.navigate(currentUser ? '/dashboard' : '/login'); });

  router.start();
}
