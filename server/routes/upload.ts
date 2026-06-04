// ABOUTME: Upload routes - user document upload and parsing
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

const router = Router();

const ALLOWED_FORMATS = ['txt', 'md', 'docx', 'pdf', 'html'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const THRESHOLD = 10; // minimum articles for auto-analysis

// POST /api/v1/upload - batch upload files
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: '请至少上传1个文件', code: 40700 });
      return;
    }
    if (files.length > 50) {
      res.status(400).json({ error: '单次最多上传50个文件', code: 40701 });
      return;
    }

    const client = getSupabaseClient();

    // Create batch
    const { data: batch, error: batchError } = await client.from('upload_batch').insert({
      user_id: user_id || 'default',
      total_count: files.length,
      success_count: 0,
      fail_count: 0,
      threshold_met: files.length >= THRESHOLD,
      status: 'processing',
    }).select().single();

    if (batchError) {
      res.status(500).json({ error: '创建上传批次失败: ' + batchError.message, code: 40702 });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const parsedArticles: Array<{ file_id: string; article_id: string }> = [];

    // Process each file
    for (const file of files) {
      const format = (file.format || 'txt').toLowerCase();
      if (!ALLOWED_FORMATS.includes(format)) {
        failCount++;
        await client.from('upload_file').insert({
          batch_id: batch.id,
          original_name: file.name || 'unknown',
          file_format: format,
          file_size: file.size || 0,
          status: 'failed',
          error_message: `不支持的文件格式: ${format}`,
        });
        continue;
      }

      if ((file.size || 0) > MAX_FILE_SIZE) {
        failCount++;
        await client.from('upload_file').insert({
          batch_id: batch.id,
          original_name: file.name || 'unknown',
          file_format: format,
          file_size: file.size || 0,
          status: 'failed',
          error_message: '文件超过5MB限制',
        });
        continue;
      }

      // Parse file content (for MVP, treat content as-is for txt/md)
      let parsedTitle = file.name?.replace(/\.[^.]+$/, '') || '未命名文档';
      let parsedContent = file.content || '';

      if (!parsedContent) {
        failCount++;
        await client.from('upload_file').insert({
          batch_id: batch.id,
          original_name: file.name || 'unknown',
          file_format: format,
          file_size: file.size || 0,
          status: 'failed',
          error_message: '文件内容为空',
        });
        continue;
      }

      // Create article
      const { data: article } = await client.from('article').insert({
        user_id: user_id || 'default',
        title: parsedTitle,
        content: parsedContent,
        summary: parsedContent.substring(0, 200),
        source_platform: 'upload',
        collection_method: 'upload',
        tags: [],
      }).select().single();

      // Create upload file record
      const { data: uploadFile } = await client.from('upload_file').insert({
        batch_id: batch.id,
        original_name: file.name || 'unknown',
        file_format: format,
        file_size: file.size || 0,
        status: 'success',
        parsed_title: parsedTitle,
        article_id: article?.id,
      }).select().single();

      if (article && uploadFile) {
        parsedArticles.push({ file_id: uploadFile.id, article_id: article.id });
      }

      successCount++;
    }

    // Update batch
    const batchStatus = failCount === 0 ? 'completed' : successCount === 0 ? 'all_failed' : 'partial_failed';
    await client.from('upload_batch').update({
      success_count: successCount,
      fail_count: failCount,
      status: batchStatus,
    }).eq('id', batch.id);

    res.status(201).json({
      data: {
        batch_id: batch.id,
        total_count: files.length,
        success_count: successCount,
        fail_count: failCount,
        threshold_met: files.length >= THRESHOLD,
        articles: parsedArticles,
      },
      message: files.length < THRESHOLD
        ? `上传成功${successCount}个文件。数量未达${THRESHOLD}篇阈值，建议补充更多内容以获得更准确的分析结果。`
        : `上传成功${successCount}个文件，已达到分析阈值，可进行爆款分析。`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '上传失败: ' + msg, code: 40703 });
  }
});

// GET /api/v1/upload/batch/:batchId - get batch details
router.get('/batch/:batchId', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('upload_batch').select('*, upload_file(*)').eq('id', req.params.batchId).single();
    if (error || !data) {
      res.status(404).json({ error: '批次不存在', code: 40704 });
      return;
    }
    res.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询失败: ' + msg });
  }
});

export default router;
