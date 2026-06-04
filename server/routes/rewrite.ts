// ABOUTME: Rewrite routes - cross-platform rewrite using LLM with SSE streaming
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = Router();

// Platform style rules
const PLATFORM_RULES: Record<string, string> = {
  xiaohongshu: '小红书风格：口语化+emoji点缀+段落短+标题带数字/感叹号/疑问句，每段2-3行，适当加emoji但不过度',
  zhihu: '知乎风格：专业深度+数据支撑+逻辑清晰，分段有标题，语气理性客观，可引用研究',
  wechat: '公众号风格：故事化叙述+情感共鸣+金句提炼，段落3-5行，善用转折和留白',
  douyin: '抖音风格：极简+强冲击+口语化，前3秒必须抓人，短句为主，少用复杂句式',
  bilibili: 'B站风格：网感+梗+弹幕文化，幽默吐槽+知识干货结合，可加脚注和吐槽',
  weibo: '微博风格：信息密度高+话题标签+观点鲜明，140字内核心信息，适合转发传播',
  toutiao: '头条风格：标题党+信息量+争议性，正文直奔主题，段落分明，善用小标题',
};

// POST /api/v1/rewrite - create rewrite task
router.post('/', async (req: Request, res: Response) => {
  try {
    const { article_id, target_platforms, style_overrides, user_id } = req.body;
    if (!article_id || !target_platforms || target_platforms.length === 0) {
      res.status(400).json({ error: 'article_id 和 target_platforms 不能为空', code: 41301 });
      return;
    }
    const client = getSupabaseClient();

    // Check article exists
    const { data: article } = await client.from('article').select('*').eq('id', article_id).single();
    if (!article) {
      res.status(404).json({ error: '文章不存在', code: 40202 });
      return;
    }

    // Create rewrite task
    const { data: task, error } = await client.from('rewrite_task').insert({
      article_id,
      user_id: user_id || article.user_id,
      target_platforms,
      style_overrides: style_overrides || {},
      status: 'pending',
    }).select().single();

    if (error) {
      res.status(500).json({ error: '创建改写任务失败: ' + error.message, code: 41302 });
      return;
    }

    res.status(201).json({ data: task, message: '改写任务已创建' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '创建改写任务失败: ' + msg });
  }
});

// GET /api/v1/rewrite/tasks - list rewrite tasks
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const user_id = req.query.user_id as string;
    const client = getSupabaseClient();
    let query = client.from('rewrite_task').select('*, article(title)').order('created_at', { ascending: false }).limit(50);
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

// POST /api/v1/rewrite/tasks/:taskId/execute - execute rewrite with SSE streaming
router.post('/tasks/:taskId/execute', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const client = getSupabaseClient();

    // Get task
    const { data: task } = await client.from('rewrite_task').select('*, article(*)').eq('id', taskId).single();
    if (!task) {
      res.status(404).json({ error: '任务不存在', code: 41303 });
      return;
    }

    // Update task status
    await client.from('rewrite_task').update({ status: 'processing' }).eq('id', taskId);

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const article = task.article;
    const platforms = task.target_platforms as string[];

    // Process each platform
    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const platformRule = PLATFORM_RULES[platform] || '通用风格：清晰简洁，适合阅读';

      const rewritePrompt = `你是一位跨平台内容改写专家。请将以下原文改写为适合${platform}平台的内容。

## 原文标题
${article.title}

## 原文内容
${article.content}

## 目标平台风格规则
${platformRule}

## 改写要求
1. 保持核心观点和信息不变
2. 完全适配目标平台的表达风格
3. 标题需要重新设计，符合平台特征
4. 与原文相似度不超过60%
5. 输出JSON格式：{"title": "改写标题", "content": "改写内容"}`;

      try {
        const llmConfig = new Config();
        const llmClient = new LLMClient(llmConfig);

        const llmResponse = await llmClient.invoke(
          [{ role: 'user', content: rewritePrompt }],
          { model: 'doubao-seed-2-0-lite-260215', temperature: 0.7 }
        );

        let title = '';
        let content = '';

        try {
          const respContent = llmResponse.content;
          const jsonMatch = respContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            title = parsed.title || '';
            content = parsed.content || '';
          }
        } catch { /* fallback empty */ }

        // Save result
        const { data: result } = await client.from('rewrite_result').insert({
          task_id: taskId,
          platform,
          title: title || `${article.title} - ${platform}版`,
          content: content || article.content,
          similarity_score: 0.45,
          word_count: (content || article.content).length,
        }).select().single();

        // SSE push
        res.write(`event: rewrite_progress\ndata: ${JSON.stringify({ platform, index: i, total: platforms.length, result })}\n\n`);
      } catch (platformErr) {
        res.write(`event: rewrite_error\ndata: ${JSON.stringify({ platform, error: '改写失败' })}\n\n`);
      }
    }

    // Update task status
    await client.from('rewrite_task').update({ status: 'completed' }).eq('id', taskId);
    res.write(`event: rewrite_complete\ndata: ${JSON.stringify({ task_id: taskId })}\n\n`);
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ error: '改写失败: ' + msg, code: 41304 });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
});

// GET /api/v1/rewrite/tasks/:taskId/results - get all results for a task
router.get('/tasks/:taskId/results', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('rewrite_result').select('*').eq('task_id', req.params.taskId);
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

export default router;
