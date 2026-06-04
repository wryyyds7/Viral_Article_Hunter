// ABOUTME: Analytics routes - dashboard & statistics
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// GET /api/v1/analytics/overview - dashboard overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const user_id = req.query.user_id as string;
    const client = getSupabaseClient();

    const [articlesRes, analysisRes, rewriteRes, collectionRes] = await Promise.all([
      client.from('article').select('*', { count: 'exact', head: true }).eq('user_id', user_id || 'default'),
      client.from('analysis_result').select('*', { count: 'exact', head: true }).eq('user_id', user_id || 'default'),
      client.from('rewrite_task').select('*', { count: 'exact', head: true }).eq('user_id', user_id || 'default'),
      client.from('collection_task').select('*', { count: 'exact', head: true }).eq('user_id', user_id || 'default'),
    ]);

    // Platform distribution
    const { data: platformData } = await client.from('article').select('source_platform').eq('user_id', user_id || 'default');

    const platformDist: Record<string, number> = {};
    (platformData || []).forEach((a: { source_platform: string }) => {
      platformDist[a.source_platform] = (platformDist[a.source_platform] || 0) + 1;
    });

    res.json({
      data: {
        article_count: articlesRes.count ?? 0,
        analysis_count: analysisRes.count ?? 0,
        rewrite_count: rewriteRes.count ?? 0,
        collection_count: collectionRes.count ?? 0,
        platform_distribution: platformDist,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '获取看板数据失败: ' + msg });
  }
});

// GET /api/v1/analytics/trends - activity trends (last 7/30 days)
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, parseInt(req.query.days as string) || 7);
    const user_id = req.query.user_id as string;
    const client = getSupabaseClient();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: articles } = await client.from('article')
      .select('created_at')
      .eq('user_id', user_id || 'default')
      .gte('created_at', since.toISOString());

    // Group by date
    const trendData: Record<string, number> = {};
    (articles || []).forEach((a: { created_at: string }) => {
      const date = new Date(a.created_at).toISOString().split('T')[0];
      trendData[date] = (trendData[date] || 0) + 1;
    });

    res.json({ data: trendData });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '获取趋势数据失败: ' + msg });
  }
});

// GET /api/v1/analytics/top-articles - top articles by hotness
router.get('/top-articles', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
    const user_id = req.query.user_id as string;
    const client = getSupabaseClient();

    let query = client.from('article').select('id, title, source_platform, hotness, created_at').order('hotness', { ascending: false }).limit(limit);
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

export default router;
