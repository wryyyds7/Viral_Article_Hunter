// ABOUTME: Collection routes - multi-platform hot content collection
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// POST /api/v1/collection - create collection task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, keyword, platforms, max_results } = req.body;
    if (!keyword) {
      res.status(400).json({ error: '关键词不能为空', code: 41101 });
      return;
    }
    const client = getSupabaseClient();

    const { data: task, error } = await client.from('collection_task').insert({
      user_id: user_id || 'default',
      keyword,
      platforms: platforms || ['xiaohongshu'],
      max_results: Math.min(50, max_results || 20),
      status: 'pending',
    }).select().single();

    if (error) {
      res.status(500).json({ error: '创建采集任务失败: ' + error.message, code: 41102 });
      return;
    }

    // Simulate collection (in production, use real crawlers/APIs)
    setTimeout(async () => {
      try {
        const mockArticles = generateMockCollection(keyword, platforms || ['xiaohongshu'], max_results || 20);
        const client2 = getSupabaseClient();

        // Insert collected articles
        for (const art of mockArticles) {
          await client2.from('article').insert({
            user_id: user_id || 'default',
            title: art.title,
            content: art.content,
            summary: art.summary,
            source_platform: art.platform,
            source_author: art.author,
            source_url: art.url,
            collection_method: 'crawl',
            tags: art.tags,
            hotness: art.hotness,
          });
        }

        // Update task status
        await client2.from('collection_task').update({
          status: 'completed',
          collected_count: mockArticles.length,
        }).eq('id', task.id);
      } catch (e) {
        console.error('Collection background error:', e);
      }
    }, 2000);

    res.status(201).json({ data: task, message: '采集任务已创建，正在后台执行' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '创建采集任务失败: ' + msg });
  }
});

// GET /api/v1/collection/tasks - list collection tasks
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const user_id = req.query.user_id as string;
    const client = getSupabaseClient();
    let query = client.from('collection_task').select('*').order('created_at', { ascending: false }).limit(30);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: '查询失败: ' + error.message });
      return;
    }
    res.json({ data: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询失败: ' + msg });
  }
});

function generateMockCollection(keyword: string, platforms: string[], maxResults: number) {
  const templates = [
    { title: `${keyword}实操指南：3步掌握核心技巧`, content: `大家好，今天来分享关于${keyword}的实操经验。\n\n第一步：基础认知\n了解${keyword}的核心概念和常见误区非常重要...\n\n第二步：工具选择\n选择适合自己的工具可以事半功倍...\n\n第三步：持续优化\n坚持复盘和迭代是成功的关键...`, tags: [keyword, '干货', '实操'] },
    { title: `2024年${keyword}趋势分析，这5个变化必须关注`, content: `随着行业变化，${keyword}领域在2024年有几个重要趋势值得关注...\n\n1. AI驱动的自动化\n2. 内容质量优先\n3. 多平台协同\n4. 数据化运营\n5. 个性化推荐...`, tags: [keyword, '趋势', '2024'] },
    { title: `${keyword}踩坑总结｜新手必看的10个常见错误`, content: `作为一个在${keyword}领域摸爬滚打3年的老兵，总结一下新手最容易踩的10个坑...\n\n1. 盲目追求量忽略质\n2. 不重视数据分析\n3. 复制粘贴不做差异化...`, tags: [keyword, '避坑', '新手'] },
  ];

  const authors = ['小王老师', '内容达人', '运营老司机', '知识分享官', '干货博主'];
  const results = [];
  for (let i = 0; i < Math.min(maxResults, templates.length); i++) {
    const t = templates[i];
    const platform = platforms[i % platforms.length];
    results.push({
      title: t.title,
      content: t.content,
      summary: t.content.substring(0, 100) + '...',
      platform,
      author: authors[i % authors.length],
      url: `https://example.com/${platform}/article-${Date.now()}-${i}`,
      tags: t.tags,
      hotness: Math.floor(Math.random() * 60 + 40),
    });
  }
  return results;
}

export default router;
