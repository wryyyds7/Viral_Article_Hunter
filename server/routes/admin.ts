// ABOUTME: Admin routes - user management, system monitoring, API keys, audit log
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// Simple admin middleware
function adminOnly(req: Request, res: Response, next: Function): void {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ error: '未提供用户ID', code: 40301 });
    return;
  }
  // In production, verify user role from DB; for MVP, check header
  next();
}

// GET /api/v1/admin/users - list all users
router.get('/users', adminOnly, async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size as string) || 20));

    const { data, error, count } = await client.from('users')
      .select('id, username, email, role, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      res.status(500).json({ error: '查询用户失败: ' + error.message });
      return;
    }
    res.json({ data: { items: data ?? [], total: count ?? 0, page, page_size: pageSize } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询用户失败: ' + msg });
  }
});

// PATCH /api/v1/admin/users/:id/status - ban/unban user
router.patch('/users/:id/status', adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, admin_id } = req.body;
    if (!['active', 'banned', 'suspended'].includes(status)) {
      res.status(400).json({ error: '无效的状态值', code: 40801 });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client.from('users').update({ status }).eq('id', req.params.id).select().single();
    if (error) {
      res.status(500).json({ error: '更新状态失败: ' + error.message });
      return;
    }

    // Audit log
    await client.from('admin_audit_log').insert({
      admin_id: admin_id || 'system',
      action: status === 'banned' ? 'ban_user' : status === 'suspended' ? 'suspend_user' : 'unban_user',
      target_type: 'user',
      target_id: req.params.id,
      detail: { new_status: status },
      ip_address: req.ip || 'unknown',
    });

    res.json({ data, message: `用户状态已更新为${status}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '更新状态失败: ' + msg });
  }
});

// PATCH /api/v1/admin/users/:id/role - change user role
router.patch('/users/:id/role', adminOnly, async (req: Request, res: Response) => {
  try {
    const { role, admin_id } = req.body;
    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ error: '无效的角色', code: 40802 });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client.from('users').update({ role }).eq('id', req.params.id).select().single();
    if (error) {
      res.status(500).json({ error: '更新角色失败: ' + error.message });
      return;
    }

    await client.from('admin_audit_log').insert({
      admin_id: admin_id || 'system',
      action: 'change_role',
      target_type: 'user',
      target_id: req.params.id,
      detail: { new_role: role },
      ip_address: req.ip || 'unknown',
    });

    res.json({ data, message: `用户角色已更新为${role}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '更新角色失败: ' + msg });
  }
});

// GET /api/v1/admin/audit-log - list audit logs
router.get('/audit-log', adminOnly, async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = 20;

    const { data, error, count } = await client.from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      res.status(500).json({ error: '查询审计日志失败: ' + error.message });
      return;
    }
    res.json({ data: { items: data ?? [], total: count ?? 0, page, page_size: pageSize } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询审计日志失败: ' + msg });
  }
});

// GET /api/v1/admin/system-config - get system config
router.get('/system-config', adminOnly, async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('system_config').select('*').order('key');
    if (error) {
      res.status(500).json({ error: '查询系统配置失败: ' + error.message });
      return;
    }
    res.json({ data: data ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询系统配置失败: ' + msg });
  }
});

// PATCH /api/v1/admin/system-config/:key - update system config
router.patch('/system-config/:key', adminOnly, async (req: Request, res: Response) => {
  try {
    const { value, admin_id } = req.body;
    const client = getSupabaseClient();
    const { data, error } = await client.from('system_config').update({ value }).eq('key', req.params.key).select().single();
    if (error) {
      res.status(500).json({ error: '更新配置失败: ' + error.message });
      return;
    }

    await client.from('admin_audit_log').insert({
      admin_id: admin_id || 'system',
      action: 'update_config',
      target_type: 'system_config',
      target_id: req.params.key,
      detail: { new_value: value },
      ip_address: req.ip || 'unknown',
    });

    res.json({ data, message: '配置已更新' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '更新配置失败: ' + msg });
  }
});

export default router;
