// ABOUTME: Auth routes - register, login, profile
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: '用户名、邮箱和密码不能为空', code: 40101 });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码至少6位', code: 40102 });
      return;
    }

    const client = getSupabaseClient();

    // Check if first user (will be admin)
    const { count } = await client.from('users').select('*', { count: 'exact', head: true });
    const role = (count ?? 0) === 0 ? 'admin' : 'user';

    // Check duplicate
    const { data: existing } = await client.from('users').select('id').or(`email.eq.${email},username.eq.${username}`).maybeSingle();
    if (existing) {
      res.status(409).json({ error: '用户名或邮箱已存在', code: 40103 });
      return;
    }

    // Hash password (simple bcrypt-like for MVP - in production use bcrypt)
    const crypto = await import('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex') + ':' + salt;

    // Insert user
    const { data: user, error } = await client.from('users').insert({
      username,
      email,
      hashed_password: hashedPassword,
      role,
    }).select('id, username, email, role, status, created_at').single();

    if (error) {
      res.status(500).json({ error: '注册失败: ' + error.message, code: 40104 });
      return;
    }

    // Create quota
    await client.from('user_quota').insert({ user_id: user.id });

    res.status(201).json({ data: user, message: role === 'admin' ? '注册成功，您是首位管理员' : '注册成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '注册失败: ' + msg, code: 40104 });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: '邮箱和密码不能为空', code: 40105 });
      return;
    }

    const client = getSupabaseClient();
    const { data: user, error } = await client.from('users').select('id, username, email, role, status, hashed_password').eq('email', email).single();

    if (error || !user) {
      res.status(401).json({ error: '邮箱或密码错误', code: 40106 });
      return;
    }

    if (user.status === 'banned') {
      res.status(403).json({ error: '账号已被封禁', code: 40107 });
      return;
    }

    // Verify password
    const [storedHash, salt] = user.hashed_password.split(':');
    const crypto = await import('crypto');
    const inputHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

    if (inputHash !== storedHash) {
      res.status(401).json({ error: '邮箱或密码错误', code: 40106 });
      return;
    }

    // Return user info (without password)
    const { hashed_password: _, ...userSafe } = user;
    res.json({ data: userSafe, message: '登录成功' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '登录失败: ' + msg, code: 40108 });
  }
});

// GET /api/v1/auth/profile/:id
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('users').select('id, username, email, role, status, created_at, updated_at').eq('id', req.params.id).single();

    if (error || !data) {
      res.status(404).json({ error: '用户不存在', code: 40109 });
      return;
    }
    res.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '获取用户信息失败: ' + msg });
  }
});

export default router;
