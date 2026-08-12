// ABOUTME: Main application logic - SPA with all pages
import { router } from './router';
import {
  authApi, articleApi, analysisApi, rewriteApi, collectionApi,
  uploadApi, analyticsApi, adminApi, settingsApi,
  setAuthToken, getAuthToken,
  type UserInfo, type Article, type AnalysisResult, type RewriteResult,
  type CollectionTask,
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
  const navItems = [
    { path: '/dashboard', label: '数据看板', icon: '📊' },
    { path: '/collect', label: '热点采集', icon: '🔍' },
    { path: '/articles', label: '素材库', icon: '📚' },
    { path: '/upload', label: '文档上传', icon: '📄' },
    { path: '/rewrite', label: '一键改写', icon: '✍️' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ];
  if (currentUser?.role === 'admin') {
    navItems.push({ path: '/admin', label: '管理后台', icon: '🛡️' });
  }

  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="min-h-screen flex" style="background:var(--background)">
      <aside class="w-60 flex-shrink-0 border-r flex flex-col" style="border-color:var(--border);background:var(--card)">
        <div class="p-5 border-b" style="border-color:var(--border)">
          <h1 class="text-xl font-bold" style="color:var(--primary)">🔥 爆文猎人</h1>
          <p class="text-xs mt-1" style="color:var(--muted-foreground)">AI爆款内容创作平台</p>
        </div>
        <nav class="flex-1 py-2">
          ${navItems.map(item => `
            <a href="#${item.path}" data-nav-link class="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-gray-50 ${activePath === item.path ? 'nav-active' : ''}" style="${activePath === item.path ? 'color:var(--primary);font-weight:600;border-right:3px solid var(--primary)' : 'color:var(--muted-foreground)'}">
              <span>${item.icon}</span> ${item.label}
            </a>
          `).join('')}
        </nav>
        <div class="p-4 border-t" style="border-color:var(--border)">
          <div class="flex items-center justify-between">
            <div class="text-xs">
              <p class="font-medium">${currentUser?.username || '未登录'}</p>
              <p style="color:var(--muted-foreground)">${currentUser?.email || ''}</p>
            </div>
            <button id="logout-btn" class="text-xs px-2 py-1 rounded hover:bg-gray-100" style="color:var(--muted-foreground)">退出</button>
          </div>
        </div>
      </aside>
      <main class="flex-1 p-8 overflow-auto">
        ${content}
      </main>
    </div>
  `;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setAuthToken(null);
      setCurrentUser(null);
      router.navigate('/login');
    });
  }
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
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">用户名 / 邮箱</label>
              <input type="text" id="login-username" class="input" placeholder="输入用户名或邮箱" required />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">密码</label>
              <input type="password" id="login-password" class="input" placeholder="请输入密码" required />
            </div>
            <div id="login-error" class="text-sm hidden" style="color:var(--destructive)"></div>
            <button type="submit" class="btn-primary w-full justify-center py-3">登录</button>
          </form>
          <form id="register-form" class="space-y-4 hidden">
            <div>
              <label class="block text-sm font-medium mb-1">用户名</label>
              <input type="text" id="reg-username" class="input" placeholder="字母、数字、下划线" required />
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
    const username = (document.getElementById('login-username') as HTMLInputElement).value;
    const password = (document.getElementById('login-password') as HTMLInputElement).value;
    const errEl = document.getElementById('login-error')!;
    errEl.classList.add('hidden');

    try {
      const res = await authApi.login({ username, password });
      setAuthToken(res.data.access_token);
      setCurrentUser(res.data.user);
      router.navigate('/dashboard');
    } catch (err) {
      errEl.textContent = err instanceof Error ? err.message : '登录失败';
      errEl.classList.remove('hidden');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('reg-username') as HTMLInputElement).value;
    const email = (document.getElementById('reg-email') as HTMLInputElement).value;
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;
    const errEl = document.getElementById('register-error')!;
    errEl.classList.add('hidden');

    try {
      const res = await authApi.register({ username, email, password });
      setAuthToken(res.data.access_token);
      setCurrentUser(res.data.user);
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
    <div class="flex gap-2 mb-6">
      ${['7d', '30d', '90d'].map(r => `<button class="btn-secondary dashboard-range" data-range="${r}">${r === '7d' ? '近7天' : r === '30d' ? '近30天' : '近90天'}</button>`).join('')}
    </div>
    <div id="dashboard-stats" class="grid grid-cols-4 gap-4 mb-6">
      ${['文章数', '分析次数', '改写次数', '平均热度'].map(label => `
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
        <h3 class="font-semibold mb-4">热门标签</h3>
        <div id="top-tags" class="flex flex-wrap gap-2">
          <div class="skeleton h-8 w-20"></div>
          <div class="skeleton h-8 w-16"></div>
          <div class="skeleton h-8 w-24"></div>
        </div>
      </div>
    </div>
    <div class="card mt-4">
      <h3 class="font-semibold mb-4">采集趋势</h3>
      <div id="collection-trend" class="space-y-2">
        <div class="skeleton h-32 w-full"></div>
      </div>
    </div>
  `, '/dashboard');

  let currentRange = '7d';
  loadDashboard(currentRange);

  document.querySelectorAll('.dashboard-range').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRange = (btn as HTMLElement).dataset.range!;
      document.querySelectorAll('.dashboard-range').forEach(b => (b as HTMLElement).style.background = '');
      (btn as HTMLElement).style.background = 'var(--primary)';
      (btn as HTMLElement).style.color = 'white';
      loadDashboard(currentRange);
    });
  });
  // Highlight default
  const firstBtn = document.querySelector('.dashboard-range') as HTMLElement;
  if (firstBtn) { firstBtn.style.background = 'var(--primary)'; firstBtn.style.color = 'white'; }

  async function loadDashboard(range: string) {
    try {
      const res = await analyticsApi.overview(range);
      const d = res.data;
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', weixin: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条', upload: '上传' };
      const statsHtml = [
        { label: '文章数', value: d.total_articles },
        { label: '分析次数', value: d.total_analyses },
        { label: '改写次数', value: d.total_rewrites },
        { label: '平均热度', value: d.avg_hotness_score?.toFixed(1) || '-' },
      ].map(s => `
        <div class="card text-center">
          <div class="text-2xl font-bold" style="color:var(--primary)">${s.value}</div>
          <div class="text-xs mt-1" style="color:var(--muted-foreground)">${s.label}</div>
        </div>
      `).join('');
      document.getElementById('dashboard-stats')!.innerHTML = statsHtml;

      const maxCount = Math.max(...(d.platform_distribution || []).map(p => p.count), 1);
      document.getElementById('platform-chart')!.innerHTML = (d.platform_distribution || []).length > 0
        ? d.platform_distribution.map(p => `
          <div class="flex items-center gap-3">
            <span class="text-sm w-20">${platformNames[p.platform] || p.platform}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div class="h-full rounded-full" style="width:${(p.count / maxCount * 100)}%;background:var(--primary)"></div>
            </div>
            <span class="text-sm font-medium w-8 text-right">${p.count}</span>
          </div>
        `).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无数据</p>';

      document.getElementById('top-tags')!.innerHTML = (d.top_tags || []).length > 0
        ? d.top_tags.map(t => `<span class="px-3 py-1 rounded-full text-xs" style="background:var(--primary);color:white">${t.tag} (${t.count})</span>`).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无标签</p>';

      const maxTrend = Math.max(...(d.collection_trend || []).map(t => t.count), 1);
      document.getElementById('collection-trend')!.innerHTML = (d.collection_trend || []).length > 0
        ? `<div class="flex items-end gap-1 h-32">${d.collection_trend.map(t => `
            <div class="flex-1 flex flex-col items-center justify-end">
              <div class="w-full rounded-t" style="height:${(t.count / maxTrend * 100)}%;background:var(--primary);min-height:4px" title="${t.date}: ${t.count}"></div>
              <span class="text-xs mt-1" style="color:var(--muted-foreground)">${t.date.slice(5)}</span>
            </div>
          `).join('')}</div>`
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无趋势数据</p>';
    } catch { /* ignore */ }
  }
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
              { id: 'weixin', name: '公众号' },
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
          <label class="block text-sm font-medium mb-1">采集数量（每平台）</label>
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
    const maxResults = parseInt((document.getElementById('collect-max') as HTMLInputElement).value);
    try {
      await collectionApi.createTask({ keyword, platforms, max_results: maxResults });
      alert('采集任务已创建，正在后台执行');
      loadCollectHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败');
    }
  });

  async function loadCollectHistory() {
    try {
      const res = await collectionApi.listTasks(1, 20);
      const statusColors: Record<string, string> = { completed: 'badge-success', running: 'badge-primary', failed: 'badge-destructive', pending: 'badge-warning' };
      const statusNames: Record<string, string> = { completed: '已完成', running: '进行中', failed: '失败', pending: '等待中', partial: '部分完成' };
      document.getElementById('collect-history')!.innerHTML = res.data.items.length > 0
        ? res.data.items.map((t: CollectionTask) => `
          <div class="flex items-center justify-between p-3 rounded-lg border" style="border-color:var(--border)">
            <div>
              <p class="font-medium text-sm">${t.keyword}</p>
              <p class="text-xs mt-1" style="color:var(--muted-foreground)">${t.platforms.join(', ')} · ${new Date(t.created_at).toLocaleString()}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium">${t.collected_count} 篇</span>
              <span class="badge ${statusColors[t.status] || 'badge-warning'}">${statusNames[t.status] || t.status}</span>
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
      const params: Record<string, string | number | boolean> = { page: currentPage, page_size: 20 };
      if (searchKeyword) params.keyword = searchKeyword;
      const res = await articleApi.list(params);
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', weixin: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条', upload: '上传' };

      document.getElementById('articles-list')!.innerHTML = res.data.items.length > 0
        ? res.data.items.map((a: Article) => `
          <div class="card flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="badge badge-primary">${platformNames[a.source_platform] || a.source_platform}</span>
                ${a.is_favorited ? '<span class="badge badge-warning">⭐ 已收藏</span>' : ''}
              </div>
              <h3 class="font-medium text-sm">${a.title}</h3>
              <p class="text-xs mt-1" style="color:var(--muted-foreground)">${a.summary || a.content.substring(0, 100)}...</p>
            </div>
            <div class="flex gap-2">
              <button class="btn-ghost text-xs" data-analyze-id="${a.id}">分析</button>
              <button class="btn-ghost text-xs" data-view-id="${a.id}">详情</button>
              <button class="btn-ghost text-xs" data-fav-id="${a.id}">${a.is_favorited ? '取消收藏' : '收藏'}</button>
              <button class="btn-ghost text-xs" data-del-id="${a.id}" style="color:var(--destructive)">删除</button>
            </div>
          </div>
        `).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无文章，去采集或上传一些内容吧</p>';

      const totalPages = Math.ceil(res.data.total / 20);
      document.getElementById('articles-pagination')!.innerHTML = totalPages > 1
        ? Array.from({ length: Math.min(totalPages, 5) }, (_, i) => `
          <button class="btn-ghost text-xs ${currentPage === i + 1 ? 'font-bold' : ''}" data-page="${i + 1}">${i + 1}</button>
        `).join('')
        : '';

      document.querySelectorAll('[data-analyze-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const articleId = (btn as HTMLElement).dataset.analyzeId!;
          try {
            await analysisApi.batchAnalyze({ article_ids: [articleId] });
            alert('分析已触发，请稍后查看结果');
            router.navigate(`/analysis/${articleId}`);
          } catch (err) {
            alert(err instanceof Error ? err.message : '分析失败');
          }
        });
      });

      document.querySelectorAll('[data-view-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const articleId = (btn as HTMLElement).dataset.viewId!;
          router.navigate(`/analysis/${articleId}`);
        });
      });

      document.querySelectorAll('[data-fav-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const articleId = (btn as HTMLElement).dataset.favId!;
          try {
            await articleApi.toggleFavorite(articleId);
            loadArticles();
          } catch { /* ignore */ }
        });
      });

      document.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const articleId = (btn as HTMLElement).dataset.delId!;
          if (!confirm('确认删除？')) return;
          try {
            await articleApi.delete(articleId);
            loadArticles();
          } catch { /* ignore */ }
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

// ============ Analysis Detail Page ============
function renderAnalysisDetail(articleId: string): void {
  renderLayout(`
    <div class="mb-6">
      <a href="#/articles" class="text-sm" style="color:var(--muted-foreground)">← 返回素材库</a>
      <h2 class="text-2xl font-bold mt-2">分析结果</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">文章爆款基因深度分析</p>
    </div>
    <div id="analysis-content">
      <div class="skeleton h-96 w-full"></div>
    </div>
  `, '/articles');

  async function loadAnalysis() {
    const contentEl = document.getElementById('analysis-content')!;
    try {
      // 先获取文章信息
      const articleRes = await articleApi.get(articleId);
      const article = articleRes.data;

      // 尝试获取分析结果
      let analysis: AnalysisResult | null = null;
      try {
        const res = await analysisApi.get(articleId);
        analysis = res.data;
      } catch {
        // 404 = 尚未分析
      }

      if (!analysis) {
        contentEl.innerHTML = `
          <div class="card text-center py-12">
            <p class="text-lg font-medium mb-2">该文章尚未分析</p>
            <p class="text-sm mb-4" style="color:var(--muted-foreground)">文章标题：${article.title}</p>
            <button id="trigger-analysis" class="btn-primary">触发爆款分析</button>
          </div>
        `;
        document.getElementById('trigger-analysis')!.addEventListener('click', async () => {
          try {
            await analysisApi.batchAnalyze({ article_ids: [articleId] });
            alert('分析已触发，请等待几秒后刷新');
            setTimeout(() => loadAnalysis(), 2000);
          } catch (err) {
            alert(err instanceof Error ? err.message : '分析失败');
          }
        });
        return;
      }

      const levelColors: Record<string, string> = { S: '#ef4444', A: '#f97316', B: '#eab308', C: '#22c55e', D: '#94a3b8' };
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', weixin: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条' };

      contentEl.innerHTML = `
        <div class="card mb-4">
          <h3 class="font-semibold mb-2">${article.title}</h3>
          <p class="text-sm" style="color:var(--muted-foreground)">${article.summary || ''}</p>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="card">
            <h3 class="font-semibold mb-3">热度评分</h3>
            <div class="flex items-center gap-4">
              <div class="text-4xl font-bold" style="color:${levelColors[analysis.hotness_score.level] || 'var(--primary)'}">${analysis.hotness_score.level}</div>
              <div>
                <div class="text-2xl font-bold">${analysis.hotness_score.score}</div>
                <div class="text-xs" style="color:var(--muted-foreground)">满分100</div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-1">
              ${analysis.hotness_score.factors.map(f => `<span class="badge badge-warning">${f}</span>`).join('')}
            </div>
          </div>
          <div class="card">
            <h3 class="font-semibold mb-3">情绪标签</h3>
            <div class="flex flex-wrap gap-2">
              ${analysis.emotion_tags.map(t => `<span class="badge badge-primary">${t}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="card">
            <h3 class="font-semibold mb-3">标题公式</h3>
            <div class="space-y-2">
              ${analysis.title_formulas.map(tf => `
                <div class="flex items-center justify-between">
                  <span class="text-sm">${tf.name}</span>
                  <div class="flex items-center gap-2">
                    <div class="w-24 bg-gray-100 rounded-full h-2"><div class="h-full rounded-full" style="width:${tf.confidence * 100}%;background:var(--primary)"></div></div>
                    <span class="text-xs">${(tf.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card">
            <h3 class="font-semibold mb-3">Top 3 爆款基因</h3>
            <div class="space-y-2">
              ${analysis.top_3_genes.map(g => `
                <div class="flex items-start gap-3">
                  <span class="badge badge-primary">${g.rank}</span>
                  <div>
                    <p class="text-sm font-medium">${g.gene}</p>
                    <p class="text-xs" style="color:var(--muted-foreground)">${g.reason}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="card mb-4">
          <h3 class="font-semibold mb-3">结构模板</h3>
          <pre class="text-xs overflow-auto p-3 rounded" style="background:var(--background);color:var(--muted-foreground)">${JSON.stringify(analysis.structure_template, null, 2)}</pre>
        </div>
        <div class="card">
          <h3 class="font-semibold mb-3">平台适配度</h3>
          <div class="space-y-3">
            ${analysis.platform_fit.map(pf => `
              <div class="flex items-center gap-3">
                <span class="text-sm w-20">${platformNames[pf.platform] || pf.platform}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div class="h-full rounded-full flex items-center justify-end pr-2" style="width:${pf.fit_score}%;background:var(--primary)">
                    <span class="text-xs text-white font-medium">${pf.fit_score}</span>
                  </div>
                </div>
              </div>
              <p class="text-xs pl-23" style="color:var(--muted-foreground)">${pf.reason}</p>
            `).join('')}
          </div>
        </div>
        <div class="mt-4 text-center">
          <p class="text-xs" style="color:var(--muted-foreground)">分析模型: ${analysis.llm_model || '-'} · 消耗Token: ${analysis.llm_tokens_used || 0} · 时间: ${new Date(analysis.created_at).toLocaleString()}</p>
          <a href="#/rewrite" class="btn-primary inline-block mt-3">去改写这篇文章</a>
        </div>
      `;
    } catch (err) {
      contentEl.innerHTML = `<p class="text-sm" style="color:var(--destructive)">加载失败: ${err instanceof Error ? err.message : 'Unknown'}</p>`;
    }
  }
  loadAnalysis();
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
      <div class="flex items-center justify-between p-2 rounded border" style="border-color:var(--border)">
        <span class="text-sm">${f.name}</span>
        <div class="flex items-center gap-2">
          <span class="text-xs" style="color:var(--muted-foreground)">${(f.size / 1024).toFixed(1)}KB</span>
          <button class="text-xs" data-remove="${i}" style="color:var(--destructive)">移除</button>
        </div>
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
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';
    try {
      const res = await uploadApi.uploadFiles(selectedFiles);
      const resultEl = document.getElementById('upload-result')!;
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <h3 class="font-semibold mb-3">上传结果</h3>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center"><div class="text-2xl font-bold">${res.data.total_count}</div><div class="text-xs" style="color:var(--muted-foreground)">总文件数</div></div>
          <div class="text-center"><div class="text-2xl font-bold" style="color:var(--success)">${res.data.success_count}</div><div class="text-xs" style="color:var(--muted-foreground)">成功</div></div>
          <div class="text-center"><div class="text-2xl font-bold" style="color:var(--destructive)">${res.data.fail_count}</div><div class="text-xs" style="color:var(--muted-foreground)">失败</div></div>
        </div>
        <p class="text-sm">${res.message}</p>
      `;
      selectedFiles = [];
      renderFileList();
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '开始上传';
    }
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
              { id: 'weixin', name: '公众号' },
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
  articleApi.list({ page: 1, page_size: 50 }).then(res => {
    const select = document.getElementById('rewrite-article') as HTMLSelectElement;
    select.innerHTML = '<option value="">请选择文章</option>' + res.data.items.map((a: Article) => `<option value="${a.id}">${a.title}</option>`).join('');
  }).catch(() => {
    const select = document.getElementById('rewrite-article') as HTMLSelectElement;
    select.innerHTML = '<option value="">加载失败</option>';
  });

  document.getElementById('rewrite-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const articleId = (document.getElementById('rewrite-article') as HTMLSelectElement).value;
    const platforms = Array.from(document.querySelectorAll('.rewrite-platform-cb:checked')).map(cb => (cb as HTMLInputElement).value);

    if (!articleId) { alert('请选择文章'); return; }
    if (platforms.length === 0) { alert('请至少选择一个目标平台'); return; }

    try {
      // Create task
      const taskRes = await rewriteApi.createTask({ article_id: articleId, target_platforms: platforms });
      const taskId = taskRes.data.id;

      // Show progress
      const progressEl = document.getElementById('rewrite-progress')!;
      progressEl.classList.remove('hidden');
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', weixin: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条' };
      progressEl.innerHTML = `
        <h3 class="font-semibold mb-3">改写进度</h3>
        <div id="rewrite-progress-items" class="space-y-2">
          ${platforms.map(p => `<div id="progress-${p}" class="flex items-center gap-2"><span class="skeleton h-4 w-4 rounded-full inline-block"></span><span class="text-sm">${platformNames[p] || p} 改写中...</span></div>`).join('')}
        </div>
      `;

      // SSE: poll for results via stream endpoint
      const results: RewriteResult[] = [];
      const eventSource = new EventSource(rewriteApi.streamUrl(taskId));

      eventSource.addEventListener('result', (ev) => {
        try {
          const data = JSON.parse(ev.data);
          results.push(data);
          const pi = document.getElementById(`progress-${data.platform}`);
          if (pi) {
            pi.innerHTML = `<span class="inline-block w-4 h-4 rounded-full" style="background:var(--success)"></span><span class="text-sm">${platformNames[data.platform] || data.platform} 完成 ✓</span>`;
          }
        } catch { /* ignore */ }
      });

      eventSource.addEventListener('done', () => {
        try {
          eventSource.close();
          // Fetch full results
          loadResults(taskId);
        } catch {
          eventSource.close();
          loadResults(taskId);
        }
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
        // Fallback: try REST API
        loadResults(taskId);
      });

      eventSource.addEventListener('timeout', () => {
        eventSource.close();
        alert('改写超时，请稍后查看结果');
        loadResults(taskId);
      });

      // Also poll REST as fallback after 5s
      setTimeout(() => {
        if (results.length < platforms.length) {
          loadResults(taskId);
        }
      }, 60000);

    } catch (err) {
      alert(err instanceof Error ? err.message : '改写失败');
    }
  });

  async function loadResults(taskId: string) {
    try {
      const res = await rewriteApi.getTask(taskId);
      const platformNames: Record<string, string> = { xiaohongshu: '小红书', zhihu: '知乎', weixin: '公众号', douyin: '抖音', bilibili: 'B站', weibo: '微博', toutiao: '头条' };
      const resultsEl = document.getElementById('rewrite-results')!;
      resultsEl.innerHTML = res.data.results.length > 0
        ? res.data.results.map(r => `
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold">${platformNames[r.platform] || r.platform}</h3>
              <div class="flex gap-2">
                <span class="badge badge-warning">相似度 ${(r.similarity_score * 100).toFixed(0)}%</span>
                <span class="text-xs" style="color:var(--muted-foreground)">${r.word_count} 字</span>
              </div>
            </div>
            <p class="font-medium text-sm mb-2">${r.title}</p>
            <div class="text-sm whitespace-pre-wrap p-3 rounded" style="background:var(--background)">${r.content}</div>
            <div class="flex gap-2 mt-3">
              <button class="btn-secondary text-xs" data-copy="${r.id}">复制内容</button>
            </div>
          </div>
        `).join('')
        : '<p class="text-sm" style="color:var(--muted-foreground)">暂无改写结果</p>';

      resultsEl.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const rId = (btn as HTMLElement).dataset.copy!;
          const result = res.data.results.find(r => r.id === rId);
          if (result) {
            navigator.clipboard.writeText(`${result.title}\n\n${result.content}`);
            alert('已复制到剪贴板');
          }
        });
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '获取结果失败');
    }
  }
}

// ============ Settings Page ============
function renderSettings(): void {
  renderLayout(`
    <div class="mb-6">
      <h2 class="text-2xl font-bold">设置</h2>
      <p class="text-sm mt-1" style="color:var(--muted-foreground)">管理您的账户和偏好设置</p>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-semibold mb-4">个人信息</h3>
        <form id="profile-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">用户名</label>
            <input type="text" id="settings-username" class="input" value="${currentUser?.username || ''}" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">邮箱</label>
            <input type="email" id="settings-email" class="input" value="${currentUser?.email || ''}" />
          </div>
          <button type="submit" class="btn-primary">保存</button>
        </form>
      </div>
      <div class="card">
        <h3 class="font-semibold mb-4">修改密码</h3>
        <form id="password-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">当前密码</label>
            <input type="password" id="old-password" class="input" required />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">新密码</label>
            <input type="password" id="new-password" class="input" placeholder="至少6位" required />
          </div>
          <button type="submit" class="btn-primary">修改密码</button>
        </form>
      </div>
    </div>
    <div class="card mt-4">
      <h3 class="font-semibold mb-4">偏好设置</h3>
      <form id="preferences-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">默认采集平台</label>
          <div class="flex flex-wrap gap-2">
            ${[
              { id: 'xiaohongshu', name: '小红书' },
              { id: 'zhihu', name: '知乎' },
              { id: 'weixin', name: '公众号' },
              { id: 'douyin', name: '抖音' },
              { id: 'bilibili', name: 'B站' },
              { id: 'weibo', name: '微博' },
              { id: 'toutiao', name: '头条' },
            ].map(p => `
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-gray-50" style="border-color:var(--border)">
                <input type="checkbox" value="${p.id}" class="pref-platform-cb" />
                <span class="text-sm">${p.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="pref-auto-analyze" class="rounded" />
          <label class="text-sm" for="pref-auto-analyze">采集/上传后自动触发爆款分析</label>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="pref-notification" class="rounded" />
          <label class="text-sm" for="pref-notification">开启通知提醒</label>
        </div>
        <button type="submit" class="btn-primary">保存偏好</button>
      </form>
    </div>
  `, '/settings');

  // Load settings
  settingsApi.get().then(res => {
    const s = res.data;
    if (s.default_platforms) {
      s.default_platforms.forEach(p => {
        const cb = document.querySelector(`.pref-platform-cb[value="${p}"]`) as HTMLInputElement;
        if (cb) cb.checked = true;
      });
    }
    if (s.auto_analyze !== undefined) (document.getElementById('pref-auto-analyze') as HTMLInputElement).checked = s.auto_analyze;
    if (s.notification_enabled !== undefined) (document.getElementById('pref-notification') as HTMLInputElement).checked = s.notification_enabled;
  }).catch(() => {});

  // Profile form
  document.getElementById('profile-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Python backend uses PUT /settings/ for user settings, profile update via auth
    alert('个人信息修改功能即将上线');
  });

  // Password form
  document.getElementById('password-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPwd = (document.getElementById('old-password') as HTMLInputElement).value;
    const newPwd = (document.getElementById('new-password') as HTMLInputElement).value;
    try {
      await authApi.changePassword({ old_password: oldPwd, new_password: newPwd });
      alert('密码修改成功');
      (document.getElementById('password-form') as HTMLFormElement).reset();
    } catch (err) {
      alert(err instanceof Error ? err.message : '修改失败');
    }
  });

  // Preferences form
  document.getElementById('preferences-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const platforms = Array.from(document.querySelectorAll('.pref-platform-cb:checked')).map(cb => (cb as HTMLInputElement).value);
    const autoAnalyze = (document.getElementById('pref-auto-analyze') as HTMLInputElement).checked;
    const notification = (document.getElementById('pref-notification') as HTMLInputElement).checked;
    try {
      await settingsApi.update({
        default_platforms: platforms,
        auto_analyze: autoAnalyze,
        notification_enabled: notification,
      });
      alert('偏好设置已保存');
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
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
      <button class="btn-secondary admin-tab" data-tab="monitor">系统监控</button>
    </div>
    <div id="admin-content"></div>
  `, '/admin');

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => {
        (t as HTMLElement).style.background = '';
        (t as HTMLElement).style.color = '';
        (t as HTMLElement).style.borderColor = '';
      });
      (tab as HTMLElement).style.background = 'var(--primary)';
      (tab as HTMLElement).style.color = 'white';
      (tab as HTMLElement).style.borderColor = 'var(--primary)';
      loadAdminTab((tab as HTMLElement).dataset.tab!);
    });
  });

  loadAdminTab('users');

  async function loadAdminTab(tab: string) {
    const content = document.getElementById('admin-content')!;
    if (tab === 'users') {
      try {
        const res = await adminApi.listUsers({ page: 1, page_size: 50 });
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">用户</th>
                <th class="text-left py-3 font-medium">邮箱</th>
                <th class="text-left py-3 font-medium">角色</th>
                <th class="text-left py-3 font-medium">状态</th>
                <th class="text-left py-3 font-medium">注册时间</th>
              </tr></thead>
              <tbody>
                ${res.data.items.map((u) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3 font-medium">${u.username}</td>
                    <td class="py-3" style="color:var(--muted-foreground)">${u.email}</td>
                    <td class="py-3"><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}">${u.role}</span></td>
                    <td class="py-3"><span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-destructive'}">${u.status}</span></td>
                    <td class="py-3" style="color:var(--muted-foreground)">${new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch (err) {
        content.innerHTML = `<p class="text-sm" style="color:var(--destructive)">加载失败: ${err instanceof Error ? err.message : 'Unknown'}</p>`;
      }
    } else if (tab === 'audit') {
      try {
        const res = await adminApi.listAuditLogs({ page: 1, page_size: 50 });
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">时间</th>
                <th class="text-left py-3 font-medium">操作</th>
                <th class="text-left py-3 font-medium">目标</th>
              </tr></thead>
              <tbody>
                ${res.data.items.map((l) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3" style="color:var(--muted-foreground)">${new Date(l.created_at).toLocaleString()}</td>
                    <td class="py-3">${l.action}</td>
                    <td class="py-3">${l.target_type}/${l.target_id?.substring(0, 8)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch { content.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground)">暂无审计记录</p>'; }
    } else if (tab === 'config') {
      try {
        const res = await adminApi.listConfigs();
        content.innerHTML = `
          <div class="card">
            <table class="w-full text-sm">
              <thead><tr class="border-b" style="border-color:var(--border)">
                <th class="text-left py-3 font-medium">配置项</th>
                <th class="text-left py-3 font-medium">当前值</th>
                <th class="text-left py-3 font-medium">分组</th>
              </tr></thead>
              <tbody>
                ${res.data.map((c) => `
                  <tr class="border-b" style="border-color:var(--border)">
                    <td class="py-3 font-mono text-xs">${c.key}</td>
                    <td class="py-3">${JSON.stringify(c.value)}</td>
                    <td class="py-3" style="color:var(--muted-foreground)">${c.config_group || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } catch { content.innerHTML = '<p class="text-sm" style="color:var(--muted-foreground)">加载失败</p>'; }
    } else if (tab === 'monitor') {
      try {
        const res = await adminApi.getMonitor();
        const m = res.data;
        content.innerHTML = `
          <div class="grid grid-cols-3 gap-4">
            ${[
              { label: '总用户数', value: m.total_users },
              { label: '24h活跃', value: m.active_users_24h },
              { label: '文章总数', value: m.total_articles },
              { label: '分析总数', value: m.total_analyses },
              { label: '改写总数', value: m.total_rewrites },
              { label: '今日Token', value: m.llm_tokens_used_today || 0 },
            ].map(s => `
              <div class="card text-center">
                <div class="text-3xl font-bold" style="color:var(--primary)">${s.value}</div>
                <div class="text-xs mt-2" style="color:var(--muted-foreground)">${s.label}</div>
              </div>
            `).join('')}
          </div>
        `;
      } catch (err) {
        content.innerHTML = `<p class="text-sm" style="color:var(--destructive)">加载失败: ${err instanceof Error ? err.message : 'Unknown'}</p>`;
      }
    }
  }
}

// ============ App Init ============
export function initApp(): void {
  loadSavedUser();

  router.addRoute('/login', renderLogin);
  router.addRoute('/', () => {
    if (!currentUser || !getAuthToken()) {
      router.navigate('/login');
    } else {
      router.navigate('/dashboard');
    }
  });
  router.addRoute('/dashboard', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderDashboard();
  });
  router.addRoute('/collect', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderCollect();
  });
  router.addRoute('/articles', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderArticles();
  });
  router.addRoute('/upload', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderUpload();
  });
  router.addRoute('/rewrite', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderRewrite();
  });
  router.addRoute('/settings', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderSettings();
  });
  router.addRoute('/admin', () => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderAdmin();
  });
  // Analysis detail route
  router.addRoute('/analysis/:id', (params?: Record<string, string>) => {
    if (!currentUser || !getAuthToken()) { router.navigate('/login'); return; }
    renderAnalysisDetail(params?.id || '');
  });

  // Handle dynamic routes
  const origResolve = router.resolve.bind(router);
  router.resolve = function() {
    const path = window.location.hash.slice(1) || '/';
    // Check for /analysis/:id pattern
    const analysisMatch = path.match(/^\/analysis\/(.+)$/);
    if (analysisMatch) {
      renderAnalysisDetail(analysisMatch[1]);
      return;
    }
    origResolve();
  };

  router.start();

  // If not logged in, go to login
  if (!currentUser || !getAuthToken()) {
    router.navigate('/login');
  }
}
