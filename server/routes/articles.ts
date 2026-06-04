// ABOUTME: Articles routes - CRUD for article/materials
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// GET /api/v1/articles - list articles with pagination & filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const page_size = Math.min(50, Math.max(1, parseInt(req.query.page_size as string) || 20));
    const source_platform = req.query.source_platform as string;
    const is_favorited = req.query.is_favorited as string;
    const keyword = req.query.keyword as string;
    const user_id = req.query.user_id as string;

    const client = getSupabaseClient();
    let query = client.from('article').select('id, title, summary, source_platform, source_author, collection_method, tags, is_favorited, created_at', { count: 'exact' });

    if (source_platform) query = query.eq('source_platform', source_platform);
    if (is_favorited === 'true') query = query.eq('is_favorited', true);
    if (keyword) query = query.or(`title.ilike.%${keyword}%,summary.ilike.%${keyword}%`);
    if (user_id) query = query.eq('user_id', user_id);

    query = query.order('created_at', { ascending: false }).range((page - 1) * page_size, page * page_size - 1);

    const { data, error, count } = await query;
    if (error) {
      res.status(500).json({ error: '查询失败: ' + error.message, code: 40201 });
      return;
    }
    res.json({
      data: { items: data ?? [], total: count ?? 0, page, page_size },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询失败: ' + msg });
  }
});

// GET /api/v1/articles/:id - single article detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('article').select('*').eq('id', req.params.id).single();
    if (error || !data) {
      res.status(404).json({ error: '文章不存在', code: 40202 });
      return;
    }
    res.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询失败: ' + msg });
  }
});

// POST /api/v1/articles - create article (from upload/crawl)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, title, content, summary, source_url, source_platform, source_author, collection_method, tags } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: '标题和内容不能为空', code: 40203 });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client.from('article').insert({
      user_id,
      title,
      content,
      summary,
      source_url,
      source_platform: source_platform || 'upload',
      source_author,
      collection_method: collection_method || 'upload',
      tags: tags || [],
    }).select().single();

    if (error) {
      res.status(500).json({ error: '创建失败: ' + error.message, code: 40204 });
      return;
    }
    res.status(201).json({ data, message: '创建成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '创建失败: ' + msg });
  }
});

// DELETE /api/v1/articles/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('article').delete().eq('id', req.params.id);
    if (error) {
      res.status(500).json({ error: '删除失败: ' + error.message, code: 40205 });
      return;
    }
    res.json({ message: '删除成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '删除失败: ' + msg });
  }
});

// PATCH /api/v1/articles/:id/favorite - toggle favorite
router.patch('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data: article } = await client.from('article').select('is_favorited').eq('id', req.params.id).single();
    if (!article) {
      res.status(404).json({ error: '文章不存在', code: 40202 });
      return;
    }
    const { data, error } = await client.from('article').update({ is_favorited: !article.is_favorited }).eq('id', req.params.id).select().single();
    if (error) {
      res.status(500).json({ error: '操作失败: ' + error.message, code: 40206 });
      return;
    }
    res.json({ data, message: data.is_favorited ? '已收藏' : '已取消收藏' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '操作失败: ' + msg });
  }
});

export default router;
