// ABOUTME: Settings routes - user settings and quota
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// GET /api/v1/settings/quota/:userId - get user quota
router.get('/quota/:userId', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('user_quota').select('*').eq('user_id', req.params.userId).single();
    if (error || !data) {
      res.status(404).json({ error: '配额信息不存在', code: 40601 });
      return;
    }
    res.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '获取配额失败: ' + msg });
  }
});

// PATCH /api/v1/settings/profile/:userId - update user profile
router.patch('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    const client = getSupabaseClient();
    const updateData: Record<string, string> = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const { data, error } = await client.from('users').update(updateData).eq('id', req.params.userId).select('id, username, email, role, status').single();
    if (error) {
      res.status(500).json({ error: '更新失败: ' + error.message });
      return;
    }
    res.json({ data, message: '更新成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '更新失败: ' + msg });
  }
});

export default router;
