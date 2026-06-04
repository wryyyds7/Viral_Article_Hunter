// ABOUTME: Analysis routes - viral gene analysis using LLM
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = Router();

// POST /api/v1/analysis - analyze a single article
router.post('/', async (req: Request, res: Response) => {
  try {
    const { article_id, user_id } = req.body;
    if (!article_id) {
      res.status(400).json({ error: 'article_id 不能为空', code: 40201 });
      return;
    }
    const client = getSupabaseClient();

    // Fetch article
    const { data: article, error: articleError } = await client.from('article').select('*').eq('id', article_id).single();
    if (articleError || !article) {
      res.status(404).json({ error: '文章不存在', code: 40202 });
      return;
    }

    const llmConfig = new Config();
    const llmClient = new LLMClient(llmConfig);

    const analysisPrompt = `你是一位爆款内容分析专家。请分析以下文章的爆款基因。

## 文章标题
${article.title}

## 文章内容
${article.content}

## 分析要求
请从以下6个维度进行深度分析，并严格按照JSON格式输出：
1. **热度评分(hotness_score)**: level(S/A/B/C/D), score(0-100), factors(关键因素数组)
2. **情绪标签(emotion_tags)**: 2-4个情绪标签，格式为"大类-细分"
3. **标题公式(title_formulas)**: 识别使用的标题模式，包含name和confidence
4. **结构模板(structure_template)**: 文章结构类型和段落分析
5. **Top3爆款基因(top_3_genes)**: 最核心的3个爆款因素
6. **平台适配度(platform_fit)**: 各平台适配分数

输出JSON格式：
{
  "hotness_score": {"level": "S", "score": 92, "factors": ["..."]},
  "emotion_tags": ["好奇-惊喜", "焦虑-紧迫"],
  "title_formulas": [{"name": "数字+痛点", "confidence": 0.9}],
  "structure_template": {"type": "list", "description": "..."},
  "top_3_genes": [{"rank": 1, "gene": "...", "reason": "..."}],
  "platform_fit": [{"platform": "xiaohongshu", "fit_score": 85, "reason": "..."}]
}`;

    let analysisData: Record<string, unknown> = {};
    let rawResponse = '';

    try {
      const llmResponse = await llmClient.invoke(
        [{ role: 'user', content: analysisPrompt }],
        { model: 'doubao-seed-2-0-lite-260215', temperature: 0.3 }
      );
      rawResponse = llmResponse.content;
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      analysisData = { hotness_score: { level: 'C', score: 50, factors: ['分析结果解析失败'] } };
    }

    // Save analysis result
    const { data: result, error } = await client.from('analysis_result').insert({
      article_id,
      user_id: user_id || article.user_id,
      hotness_score: analysisData.hotness_score || { level: 'C', score: 50, factors: [] },
      emotion_tags: (analysisData.emotion_tags as string[]) || [],
      title_formulas: analysisData.title_formulas || [],
      structure_template: analysisData.structure_template || {},
      top_3_genes: analysisData.top_3_genes || [],
      platform_fit: analysisData.platform_fit || [],
      raw_llm_response: rawResponse,
      llm_model: 'coze-bot',
    }).select().single();

    if (error) {
      res.status(500).json({ error: '保存分析结果失败: ' + error.message, code: 40207 });
      return;
    }

    res.status(201).json({ data: result, message: '分析完成' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '分析失败: ' + msg, code: 40208 });
  }
});

// GET /api/v1/analysis/:article_id - get analysis result for an article
router.get('/:article_id', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('analysis_result').select('*').eq('article_id', req.params.article_id).order('created_at', { ascending: false }).limit(1);

    if (error) {
      res.status(500).json({ error: '查询失败: ' + error.message });
      return;
    }
    if (!data || data.length === 0) {
      res.status(404).json({ error: '暂无分析结果', code: 40209 });
      return;
    }
    res.json({ data: data[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: '查询失败: ' + msg });
  }
});

export default router;
