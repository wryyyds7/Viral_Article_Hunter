# LLM Prompt 设计文档

> **版本**：v1.0  
> **最后更新**：2025-06  
> **引用方法论**：yao-open-prompts 结构化 Prompt 工程、arXiv:2512.21402 Virality Rubric、Opus Clip AI 传播潜力评分  
> **约束**：所有 Prompt 必须输出合法 JSON，便于程序解析；禁止在 Prompt 中包含任何 API Key 或敏感信息

---

## 目录

1. [设计原则与通用结构](#1-设计原则与通用结构)
2. [爆款基因分析 Prompt](#2-爆款基因分析-prompt)
3. [跨平台改写 Prompt](#3-跨平台改写-prompt)
4. [改写质量自检 Prompt](#4-改写质量自检-prompt)
5. [术语与方法论词典](#5-术语与方法论词典)
6. [Prompt 版本管理与迭代规范](#6-prompt版本管理与迭代规范)
7. [Token 消耗预估与成本控制](#7-token消耗预估与成本控制)

---

## 1. 设计原则与通用结构

### 1.1 Prompt 五层结构（参考 yao-open-prompts）

所有 Prompt 统一遵循以下五层结构：

```
┌─────────────────────────────┐
│  Role（角色定义）             │  Who am I? 定义身份与核心能力
├─────────────────────────────┤
│  Skills（技能清单）           │  What can I do? 列出具体能力项
├─────────────────────────────┤
│  Rules（规则约束）            │  What must I follow? 红线/标准/禁止
├─────────────────────────────┤
│  Workflow（执行流程）         │  How do I work? 步骤化执行路径
├─────────────────────────────┤
│  Output Format（输出格式）    │  What do I return? JSON Schema 约束
└─────────────────────────────┘
```

### 1.2 设计红线

| 规则 | 说明 |
|------|------|
| **JSON Only** | 所有 Prompt 输出必须为合法 JSON，不含 Markdown 包裹 |
| **禁止幻觉** | 分析结论必须有原文依据，不可凭空推断数据指标 |
| **禁止编造** | 如果原文信息不足以完成某个维度分析，该字段返回 null 并在 confidence 中标注 |
| **平台规则优先** | 改写时平台规则 > 用户偏好，冲突时降级而非忽略 |
| **相似度红线** | 改写结果与原文相似度不得超过 60%，超限自动触发二次改写 |
| **安全红线** | 不生成涉政/涉黄/涉暴/涉诈内容，检测到时返回 safety_flag: true |

### 1.3 模型选择策略

| 用途 | 推荐模型 | 原因 |
|------|----------|------|
| 爆款基因分析 | DeepSeek-Chat / Doubao-Pro | 需要强推理能力，结构化输出 |
| 跨平台改写 | DeepSeek-Chat / Doubao-Pro | 需要长文本理解和生成能力 |
| 质量自检 | Doubao-Lite / DeepSeek-Lite | 判定任务，可用轻量模型降低成本 |
| 标题评分 | Doubao-Lite | 短文本分类，轻量模型足够 |

### 1.4 通用 System Prompt 前缀

所有业务 Prompt 前统一添加：

```
你是一个专业的中文内容分析引擎。你必须：
1. 严格按照指定的 JSON Schema 输出，不得添加任何额外文本
2. 所有分析结论必须有原文依据，不得编造数据
3. 如果信息不足，对应字段返回 null
4. 使用中文输出所有文本内容
```

---

## 2. 爆款基因分析 Prompt

### 2.1 分析维度总览

参考 arXiv:2512.21402 的 Virality Rubric 框架和 yao-open-prompts 的对标分析师方法论，定义六大分析维度：

| 维度 | 权重 | 分析内容 |
|------|------|----------|
| 标题公式 | 25% | 识别标题结构模式、情绪触发机制、点击率预估 |
| 情绪基因 | 25% | 识别情绪类型与强度、情绪鸡尾酒配比、情绪曲线 |
| 结构拆解 | 20% | 内容框架、节奏设计、信息密度分布 |
| 互动钩子 | 15% | 互动引导策略、评论诱因、分享动机 |
| 选题价值 | 10% | 受众覆盖面、时效性、话题延展性 |
| 平台适配 | 5% | 与目标平台调性的匹配度 |

### 2.2 爆款基因分析 Prompt（完整版）

```python
VIRAL_GENE_ANALYSIS_PROMPT = """
# Role: 爆款基因分析师

你是一位专业的内容基因分析师，擅长拆解爆款内容的底层逻辑。你不只是描述现象，而是挖掘成功要素背后的心理机制和传播规律。

## Skills

### 标题公式识别
1. **公式分类**：识别以下8种标题公式
   - 数字清单型：「N个方法/N种类型/N个真相」
   - 反向冲击型：「千万别/不要/最怕」
   - 对比冲突型：「A vs B / 从X到Y」
   - 权威视角型：「HR说/领导最/医生建议」
   - 悬念留白型：「原来…/没想到…/竟然…」
   - 痛点共鸣型：「是不是也…/每次都…」
   - 利益承诺型：「学会这X招/只需X步」
   - 故事引入型：「我如何…/从X到Y的经历」
2. **情绪触发点**：识别标题中触发的情绪类型（好奇/恐惧/欲望/愤怒/惊喜）
3. **关键词提取**：提取标题中的流量关键词和长尾关键词

### 情绪基因分析
1. **情绪类型识别**：识别8种核心情绪
   - 焦虑/恐惧：担心错过、害怕做错
   - 好奇/惊喜：想知道答案、意外发现
   - 愤怒/不平：对不公/不合理的反应
   - 共鸣/认同：说到心坎里了
   - 羡慕/渴望：想要成为那样的人
   - 痛苦/无奈：深有同感的痛苦
   - 感动/温暖：被真诚打动
   - 优越/满足：学到了/懂了的感觉
2. **情绪鸡尾酒配比**：分析多种情绪的组合比例（参考"情绪鸡尾酒"理论）
   - 单一情绪型：单一强情绪驱动
   - 二元对立型：如"焦虑+释放"
   - 三层递进型：如"好奇→惊讶→满足"
   - 复合型：3种以上情绪交织
3. **情绪曲线**：分析情绪随内容推进的变化节奏
   - 开头情绪强度（1-10）
   - 峰值情绪位置（前/中/后）
   - 结尾情绪落点（高/平/反转）

### 结构拆解
1. **框架识别**：识别内容结构模式
   - 总分总 / 清单体 / 故事线 / 对比论证 / 递进式 / 问答式
2. **节奏设计**：分析信息密度和节奏变化
   - 开头钩子强度（1-10）
   - 信息密度分布（均匀/前重/后重/脉冲式）
   - 每200字的信息点数量
3. **黄金比例**：分析内容配比
   - 悬念占比 / 价值占比 / 情感占比 / 紧迫占比

### 互动钩子分析
1. **钩子类型**：识别互动引导策略
   - 提问式：「你怎么看？/你中了几条？」
   - 争议式：故意留出争议空间
   - 补充式：「你还知道哪些？」
   - 共享式：「转给你朋友看看」
   - 挑战式：「敢不敢试试？」
2. **评论诱因**：分析激发评论的心理机制
3. **分享动机**：分析用户分享的心理驱动

### 选题价值评估
1. **受众覆盖**：估算潜在受众范围（广/中/窄）
2. **时效性**：长期价值 vs 热点窗口
3. **可延展性**：是否可系列化、矩阵化

### 平台适配度
1. **调性匹配**：与采集来源平台的内容调性匹配度
2. **格式适配**：内容形式是否符合平台偏好

## Rules

1. 所有评分使用 1-10 的整数
2. 所有分析结论必须引用原文具体内容作为依据
3. 不得编造数据指标（如点赞数、阅读数等原文未提供的数据）
4. 原文信息不足以分析某个维度时，该维度 confidence 标为 "low"
5. 标题公式可能是多种公式的组合，需标注主公式和辅助公式
6. 情绪分析至少识别2种情绪

## Workflow

1. 通读全文，理解内容主题和核心观点
2. 分析标题公式，提取关键词和情绪触发点
3. 逐段分析情绪变化，绘制情绪曲线
4. 拆解内容结构，标注信息密度
5. 识别互动钩子和分享动机
6. 评估选题价值
7. 综合打分，输出爆款基因报告

## Output Format

请严格按照以下 JSON Schema 输出：

```json
{
  "article_id": "string",
  "analysis_version": "string",
  "title_analysis": {
    "formula_type": "string",
    "formula_secondary": "string | null",
    "formula_detail": "string",
    "emotion_triggers": ["string"],
    "keywords": ["string"],
    "long_tail_keywords": ["string"],
    "click_potential": "number (1-10)",
    "confidence": "high | medium | low"
  },
  "emotion_analysis": {
    "primary_emotion": "string",
    "secondary_emotions": ["string"],
    "cocktail_type": "string",
    "cocktail_ratio": "string",
    "curve": {
      "opening_intensity": "number (1-10)",
      "peak_position": "front | middle | end",
      "peak_emotion": "string",
      "ending_type": "high | flat | twist"
    },
    "confidence": "high | medium | low"
  },
  "structure_analysis": {
    "framework": "string",
    "framework_detail": "string",
    "rhythm": "string",
    "info_density": "string",
    "golden_ratio": {
      "suspense_pct": "number",
      "value_pct": "number",
      "emotion_pct": "number",
      "urgency_pct": "number"
    },
    "sections": [
      {
        "type": "hook | body | transition | climax | ending",
        "content_summary": "string",
        "char_count": "number",
        "info_points": "number"
      }
    ],
    "confidence": "high | medium | low"
  },
  "interaction_analysis": {
    "hook_types": ["string"],
    "hook_detail": "string",
    "comment_triggers": ["string"],
    "share_motivations": ["string"],
    "interaction_potential": "number (1-10)",
    "confidence": "high | medium | low"
  },
  "topic_analysis": {
    "audience_scope": "broad | medium | narrow",
    "timeliness": "evergreen | seasonal | trending",
    "extensibility": "high | medium | low",
    "series_potential": "string | null",
    "confidence": "high | medium | low"
  },
  "platform_fit": {
    "source_platform": "string",
    "fit_score": "number (1-10)",
    "fit_detail": "string",
    "confidence": "high | medium | low"
  },
  "overall_score": {
    "virality_potential": "number (1-100)",
    "score_breakdown": {
      "title": "number (weighted)",
      "emotion": "number (weighted)",
      "structure": "number (weighted)",
      "interaction": "number (weighted)",
      "topic": "number (weighted)",
      "platform": "number (weighted)"
    },
    "top_3_genes": [
      {
        "gene_name": "string",
        "gene_detail": "string",
        "contribution_pct": "number"
      }
    ]
  }
}
```
"""
```

### 2.3 LLM 输出到 API 响应的适配映射

> **⚠️ 关键设计**：LLM 的输出结构（深度嵌套、面向分析）和 API 的响应结构（扁平化、面向前端展示）天然不同。
> 后端需要一个适配层，将 LLM 的 JSON 输出转换为 A02 接口定义的 `AnalysisDetail` 结构。
> 以下映射表是适配层的**唯一规格说明**。

#### 2.3.1 字段映射表

| LLM 输出路径 | → A02 API 字段 | 转换规则 |
|-------------|---------------|----------|
| `overall_score.virality_potential` | `hotness_score.total` | 直接映射（1-100） |
| — | `hotness_score.level` | 计算映射：≥80→viral, ≥60→potential, ≥40→average, <40→low |
| `overall_score.score_breakdown.title` | `hotness_score.dimensions.title_power` | 直接映射 |
| `overall_score.score_breakdown.emotion` | `hotness_score.dimensions.emotion_density` | 直接映射 |
| `overall_score.score_breakdown.interaction` | `hotness_score.dimensions.interaction_hook` | 直接映射 |
| `overall_score.score_breakdown.structure` | `hotness_score.dimensions.structure_density` | 直接映射 |
| `title_analysis.formula_type` | `title_formulas[0].type` | 直接映射为主公式 |
| `title_analysis.formula_secondary` | `title_formulas[1].type` | 映射为次公式（如有） |
| `title_analysis.formula_detail` | `title_formulas[0].display` | 直接映射 |
| `title_analysis.formula_detail` | `title_formulas[0].matched_text` | 截取公式说明中引用的原文片段 |
| `title_analysis.confidence` | `title_formulas[0].confidence` | high→0.9, medium→0.6, low→0.3 |
| — | `title_formulas[].is_user_modified` | 默认 false，用户修正后置 true |
| `emotion_analysis.primary_emotion` | `emotion_tags[0]` (is_primary=true) | 主情绪映射 |
| `emotion_analysis.secondary_emotions[]` | `emotion_tags[1..n]` (is_primary=false) | 次情绪逐个映射 |
| `emotion_analysis.cocktail_type` | `emotion_tags[0].category` | 鸡尾酒类型→情绪分类 |
| `emotion_analysis.curve.opening_intensity` | `emotion_tags[0].level` | ≥7→strong, ≥4→medium, <4→weak |
| `structure_analysis.framework` | `structure_template.type` | 直接映射 |
| `structure_analysis.framework_detail` | `structure_template.display` | 直接映射 |
| `structure_analysis.confidence` | `structure_template.confidence` | high→0.9, medium→0.6, low→0.3 |
| `structure_analysis.sections[]` | `structure_template.segments[]` | type→role, content_summary→summary |
| `interaction_analysis.hook_types[]` | `interaction_hooks[]` ⬅️ 新增 | 直接映射，A02补充此字段 |
| `interaction_analysis.interaction_potential` | `interaction_score` ⬅️ 新增 | 直接映射（1-10） |
| `topic_analysis.audience_scope` | `audience_scope` ⬅️ 新增 | 直接映射 |
| `topic_analysis.timeliness` | `timeliness` ⬅️ 新增 | 直接映射 |
| `overall_score.top_3_genes[]` | `top_genes[]` ⬅️ 新增 | 直接映射 |

#### 2.3.2 适配层代码骨架

```python
# app/services/analysis_adapter.py
"""LLM 输出 → API 响应适配层"""

CONFIDENCE_MAP = {"high": 0.9, "medium": 0.6, "low": 0.3}
INTENSITY_LEVEL_MAP = lambda v: "strong" if v >= 7 else "medium" if v >= 4 else "weak"
VIRALITY_LEVEL_MAP = lambda v: "viral" if v >= 80 else "potential" if v >= 60 else "average" if v >= 40 else "low"


def adapt_analysis(llm_output: dict, article_id: str) -> dict:
    """将 LLM 的 JSON 输出适配为 A02 AnalysisDetail 结构"""
    overall = llm_output.get("overall_score", {})
    title_a = llm_output.get("title_analysis", {})
    emotion_a = llm_output.get("emotion_analysis", {})
    structure_a = llm_output.get("structure_analysis", {})
    interaction_a = llm_output.get("interaction_analysis", {})
    topic_a = llm_output.get("topic_analysis", {})

    # 热度评分
    virality = overall.get("virality_potential", 0)
    breakdown = overall.get("score_breakdown", {})
    hotness_score = {
        "total": virality,
        "level": VIRALITY_LEVEL_MAP(virality),
        "dimensions": {
            "title_power": breakdown.get("title", 0),
            "emotion_density": breakdown.get("emotion", 0),
            "interaction_hook": breakdown.get("interaction", 0),
            "structure_density": breakdown.get("structure", 0),
        }
    }

    # 标题公式
    title_formulas = []
    if title_a.get("formula_type"):
        title_formulas.append({
            "type": title_a["formula_type"],
            "display": title_a.get("formula_detail", ""),
            "confidence": CONFIDENCE_MAP.get(title_a.get("confidence", "medium"), 0.6),
            "matched_text": _extract_matched_text(title_a.get("formula_detail", "")),
            "is_user_modified": False,
        })
    if title_a.get("formula_secondary"):
        title_formulas.append({
            "type": title_a["formula_secondary"],
            "display": "",
            "confidence": CONFIDENCE_MAP.get(title_a.get("confidence", "medium"), 0.6) * 0.8,
            "matched_text": "",
            "is_user_modified": False,
        })

    # 情绪标签
    emotion_tags = []
    if emotion_a.get("primary_emotion"):
        emotion_tags.append({
            "tag": emotion_a["primary_emotion"],
            "display": _emotion_display(emotion_a["primary_emotion"]),
            "level": INTENSITY_LEVEL_MAP(emotion_a.get("curve", {}).get("opening_intensity", 5)),
            "is_primary": True,
            "category": emotion_a.get("cocktail_type", "mixed"),
            "is_user_modified": False,
        })
    for sec in emotion_a.get("secondary_emotions", []):
        emotion_tags.append({
            "tag": sec,
            "display": _emotion_display(sec),
            "level": "medium",
            "is_primary": False,
            "category": "mixed",
            "is_user_modified": False,
        })

    # 结构模板
    sections = structure_a.get("sections", [])
    segments = [{"role": s.get("type", "body"), "summary": s.get("content_summary", "")} for s in sections]
    structure_template = {
        "type": structure_a.get("framework", "unknown"),
        "display": structure_a.get("framework_detail", ""),
        "confidence": CONFIDENCE_MAP.get(structure_a.get("confidence", "medium"), 0.6),
        "segments": segments,
    }

    # 新增字段（A02补充）
    interaction_hooks = interaction_a.get("hook_types", [])
    interaction_score = interaction_a.get("interaction_potential", 0)
    audience_scope = topic_a.get("audience_scope", "medium")
    timeliness = topic_a.get("timeliness", "evergreen")
    top_genes = overall.get("top_3_genes", [])

    return {
        "hotness_score": hotness_score,
        "title_formulas": title_formulas,
        "emotion_tags": emotion_tags,
        "structure_template": structure_template,
        # 新增字段
        "interaction_hooks": interaction_hooks,
        "interaction_score": interaction_score,
        "audience_scope": audience_scope,
        "timeliness": timeliness,
        "top_genes": top_genes,
    }
```

#### 2.3.3 A02 接口新增字段（需同步更新 A02 文档）

| 新增字段 | 类型 | 说明 | 来源 |
|----------|------|------|------|
| `interaction_hooks` | string[] | 互动钩子类型列表 | `interaction_analysis.hook_types` |
| `interaction_score` | integer | 互动潜力评分 1-10 | `interaction_analysis.interaction_potential` |
| `audience_scope` | string | 受众面：broad/medium/narrow | `topic_analysis.audience_scope` |
| `timeliness` | string | 时效性：evergreen/seasonal/trending | `topic_analysis.timeliness` |
| `top_genes` | TopGene[] | TOP3爆款基因 | `overall_score.top_3_genes` |

**TopGene 结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| gene_name | string | 基因名称 |
| gene_detail | string | 基因说明 |
| contribution_pct | number | 贡献占比% |

### 2.4 批量分析 Prompt（精简版）

当需要一次性分析多篇素材时，使用精简版 Prompt 降低 Token 消耗：

```python
VIRAL_GENE_BATCH_PROMPT = """
# Role: 爆款基因快速扫描器

对以下文章进行快速爆款基因扫描，仅输出核心指标。

## Rules
1. 评分使用 1-10 整数
2. 每篇文章输出不超过 200 token
3. 识别最显著的1个标题公式和1个主情绪
4. 重点标注 TOP3 爆款基因

## Output Format

```json
{
  "articles": [
    {
      "article_id": "string",
      "title_formula": "string",
      "primary_emotion": "string",
      "virality_score": "number (1-100)",
      "top_genes": ["string"],
      "one_line_verdict": "string"
    }
  ]
}
```

待分析文章：
{articles_content}
"""
```

---

## 3. 跨平台改写 Prompt

### 3.1 平台规则知识库

改写 Prompt 的核心是"平台规则注入"。以下是 7 个平台的规则摘要：

| 平台 | 调性 | 字数建议 | 标题风格 | 排版特征 | Emoji密度 | 互动风格 |
|------|------|----------|----------|----------|-----------|----------|
| 小红书 | 种草/生活/闺蜜分享 | 300-600字 | 数字+痛点+悬念 | 大量Emoji、分段短句、加粗重点 | 高(8-15个) | "姐妹们冲/听劝" |
| 公众号 | 深度/观点/专业 | 1500-3000字 | 悬念/反常识/利益 | 长段落、小标题、引用框 | 低(0-3个) | "点赞在看/留言讨论" |
| 抖音 | 口播/节奏/冲击 | 100-300字口播稿 | 冲突/反转/好奇 | 短句、节奏感、画面标注 | 中(3-5个) | "双击/评论区" |
| 快手 | 接地气/真实/共鸣 | 100-300字口播稿 | 痛点/共鸣/故事 | 口语化、方言感、真诚 | 低(1-3个) | "老铁双击/关注" |
| B站 | 干货/趣味/弹幕文化 | 800-2000字 | 知识型/趣味型 | 专业排版、分P逻辑、弹幕预埋 | 中(2-5个) | "一键三连/弹幕" |
| 知乎 | 专业/深度/理性 | 1500-5000字 | 问题型/数据型 | 结构化论述、引用、数据支撑 | 极低(0-1个) | "赞同/收藏/关注" |
| 视频号 | 社交/温情/信任 | 100-300字口播稿 | 共鸣/温情/社交 | 真诚分享、社交货币 | 中(3-5个) | "转发/点赞" |

### 3.2 改写 Prompt（统一模板 + 平台规则注入）

采用"统一模板 + 平台规则参数注入"策略，而非 7 个独立 Prompt：

```python
REWRITE_PROMPT_TEMPLATE = """
# Role: 跨平台内容改写专家

你是一位精通中文社交媒体的跨平台内容改写专家。你能够将一篇内容改写为适配不同平台调性的版本，同时保留其核心爆款基因。

## 平台规则

当前改写目标平台：{platform_name}

{platform_rules}

## Skills

1. **基因保留**：从原文中提取爆款基因（标题公式/情绪钩子/互动设计），在改写中保留核心基因
2. **平台适配**：按照目标平台的调性、字数、排版、Emoji密度、互动风格进行改写
3. **去重处理**：确保改写后与原文相似度不超过60%（词汇级+句法级双重去重）
4. **质量保证**：改写后内容必须通顺、完整、有逻辑，不能是拼接或替换词的简单改写

## Rules

1. **必须保留**原文的核心观点和爆款基因
2. **必须适配**目标平台的调性和格式
3. **禁止照搬**原文超过连续10个字
4. **禁止添加**原文没有的虚假信息
5. **标题必须重新创作**，符合目标平台标题风格
6. **字数必须**在平台建议范围内
7. **Emoji密度必须**符合平台特征
8. 如果用户参数与平台规则冲突，**平台规则优先**，并在 conflicts 字段说明
9. 输出内容不得包含涉政/涉黄/涉暴/涉诈内容

## Workflow

1. 提取原文核心观点（3-5个关键信息点）
2. 提取原文爆款基因（标题公式/情绪类型/互动钩子）
3. 根据目标平台规则，重新设计标题
4. 按平台调性改写正文（调整语气/字数/排版/Emoji）
5. 设计符合平台的互动引导
6. 自检：与原文相似度、平台适配度、内容完整性
7. 输出改写结果

## Output Format

```json
{
  "platform": "string",
  "title": "string",
  "content": "string",
  "word_count": "number",
  "emoji_count": "number",
  "interaction_cta": "string",
  "preserved_genes": [
    {
      "gene": "string",
      "how_preserved": "string"
    }
  ],
  "similarity_check": {
    "lexical_similarity": "number (0-1)",
    "structural_similarity": "number (0-1)",
    "overall_similarity": "number (0-1)"
  },
  "platform_compliance": {
    "tone_match": "number (1-10)",
    "length_match": "number (1-10)",
    "emoji_match": "number (1-10)",
    "interaction_match": "number (1-10)"
  },
  "conflicts": [
    {
      "user_param": "string",
      "platform_rule": "string",
      "resolution": "string"
    }
  ],
  "safety_flag": "boolean",
  "safety_detail": "string | null"
}
```

## 原文内容

{source_content}

## 用户改写参数

{user_params}
"""
```

### 3.3 平台规则注入模板

每个平台有一个独立的规则文本块，在运行时注入 `{platform_rules}` 占位符：

```python
PLATFORM_RULES = {
    "xiaohongshu": """
### 小红书平台规则
- **调性**：种草/闺蜜分享/生活美学，像真实用户分享而非官方号
- **字数**：300-600字，不宜过长
- **标题**：必须包含数字或痛点词，如"N个方法""千万别""绝绝子"
- **排版**：大量使用Emoji（8-15个），短句分段，重点加粗或用【】标注
- **开头**：场景切入+情绪共鸣，如"姐妹们！/天哪/绝了"
- **中间**：干货分点，每点1-2句，配Emoji
- **结尾**：互动引导，如"评论区告诉我/收藏不迷路/姐妹们冲"
- **关键词**：正文首段必须包含核心搜索关键词，用于SEO
- **标签**：生成10-15个话题标签
- **禁止**：官方口吻、硬广推销、超长段落
""",
    
    "wechat": """
### 公众号平台规则
- **调性**：深度/专业/有观点，像专栏作者
- **字数**：1500-3000字，深度文章
- **标题**：悬念型或反常识型，如"原来…/颠覆认知/真相是"
- **排版**：长段落、小标题分隔、可引用数据/名言
- **开头**：抛出问题或反常识观点，引发思考
- **中间**：论点+论据+案例，结构化论述
- **结尾**：金句收尾+行动号召（点赞在看/留言讨论）
- **禁止**：过度口语化、大量Emoji、标题党（内容要能撑住标题）
""",
    
    "douyin": """
### 抖音平台规则
- **调性**：节奏快/冲击力强/口语化，像朋友面对面说
- **字数**：口播稿100-300字（对应15-60秒视频）
- **标题**：冲突型/反转型/好奇型，如"千万别…/没想到…/真相了"
- **排版**：短句、每句不超过15字、标注画面和表情
- **开头（黄金3秒）**：必须在前3秒抛出冲突或悬念
- **节奏**：每10秒有新信息点，保持紧凑
- **结尾**：互动引导，如"评论区告诉我/双击支持"
- **禁止**：慢热开头、拖沓节奏、书面化表达
""",
    
    "kuaishou": """
### 快手平台规则
- **调性**：接地气/真诚/老铁文化，像邻居家聊天
- **字数**：口播稿100-300字
- **标题**：痛点型/共鸣型/故事型，如"说实话/我经历过"
- **排版**：极度口语化、可适度使用方言表达、真诚感
- **开头**：直接切入痛点，"说实话/我之前也…"
- **结尾**：老铁式互动，"双击/关注/老铁们"
- **禁止**：高端文艺腔、过度包装、精英视角
""",
    
    "bilibili": """
### B站平台规则
- **调性**：干货/趣味/弹幕文化，像UP主的专业分享
- **字数**：800-2000字（视频脚本或图文）
- **标题**：知识型或趣味型，可适度二次元化
- **排版**：专业排版、分章节、可预埋弹幕梗
- **开头**：抛出有趣的知识点或反转
- **中间**：干货铺陈+趣味解读+弹幕互动预埋
- **结尾**：一键三连引导，"弹幕告诉我/投币支持"
- **特色**：可以适当使用B站梗/二次元元素/弹幕互动设计
- **禁止**：过于严肃、纯学术腔、无互动设计
""",
    
    "zhihu": """
### 知乎平台规则
- **调性**：专业/理性/有深度，像行业专家回答
- **字数**：1500-5000字，深度长文
- **标题**：问题型或数据型，如"为什么…/如何理解…/数据告诉你"
- **排版**：结构化论述、引用来源、数据支撑、逻辑清晰
- **开头**：亮出核心观点，给出明确立场
- **中间**：论点+论据+案例+数据，层层递进
- **结尾**：总结升华+引导赞同收藏
- **禁止**：口语化、大量Emoji、无依据的观点、标题党
""",
    
    "weixin_video": """
### 视频号平台规则
- **调性**：社交/温情/信任感，像朋友间分享
- **字数**：口播稿100-300字
- **标题**：共鸣型/温情型/社交货币型
- **排版**：真诚分享风格，不花哨
- **开头**：温情切入或共鸣场景
- **结尾**：引导转发/点赞
- **核心**：内容要有"社交货币"属性，用户愿意转发到朋友圈
- **禁止**：过于商业化、硬广、低俗
"""
}
```

---

## 4. 改写质量自检 Prompt

### 4.1 设计思路

改写完成后，使用独立的轻量模型进行四维质量自检（参考 Opus Clip AI 的多因素分析框架）：

| 维度 | 检查内容 | 阈值 |
|------|----------|------|
| 去重校验 | 与原文相似度 | ≤ 0.6 |
| 平台合规 | 调性/字数/Emoji/互动 | 各项 ≥ 7/10 |
| 内容完整 | 核心观点保留率 | ≥ 80% |
| 安全合规 | 涉政/涉黄/涉暴/涉诈 | 0 检出 |

### 4.2 质量自检 Prompt

```python
QUALITY_CHECK_PROMPT = """
# Role: 改写质量审核员

你是一位严格的内容质量审核员，负责对改写结果进行四维质量检查。

## Workflow

1. **去重校验**：逐句比较改写结果与原文，计算词汇级和句法级相似度
2. **平台合规**：根据平台规则检查调性/字数/Emoji密度/互动引导
3. **内容完整**：检查原文核心观点在改写中是否保留
4. **安全合规**：扫描是否包含涉政/涉黄/涉暴/涉诈内容

## Rules

1. 相似度使用 0-1 浮点数，计算方式：重复词汇数 / 改写总词汇数
2. 平配合规各项评分 1-10
3. 核心观点保留率 = 已保留观点数 / 原文总观点数
4. 安全检查为布尔判断

## Output Format

```json
{
  "rewrite_id": "string",
  "platform": "string",
  "quality_score": "number (0-100)",
  "deduplication": {
    "lexical_similarity": "number (0-1)",
    "structural_similarity": "number (0-1)",
    "pass": "boolean",
    "overlapping_phrases": ["string"]
  },
  "platform_compliance": {
    "tone_score": "number (1-10)",
    "length_score": "number (1-10)",
    "emoji_score": "number (1-10)",
    "interaction_score": "number (1-10)",
    "pass": "boolean",
    "issues": ["string"]
  },
  "content_integrity": {
    "original_points": "number",
    "preserved_points": "number",
    "retention_rate": "number (0-1)",
    "pass": "boolean",
    "missing_points": ["string"]
  },
  "safety": {
    "politics": "boolean",
    "pornography": "boolean",
    "violence": "boolean",
    "fraud": "boolean",
    "pass": "boolean",
    "flagged_content": ["string"]
  },
  "overall_pass": "boolean",
  "retry_recommended": "boolean",
  "retry_reason": "string | null"
}
```

## 原文

{source_content}

## 改写结果

{rewrite_content}

## 目标平台规则

{platform_rules_summary}
"""
```

### 4.3 自动重试机制

```python
# 质量自检未通过时的自动重试策略
RETRY_STRATEGY = {
    "deduplication_fail": {
        "max_retries": 2,
        "action": "在改写Prompt中追加约束：'上一次改写与原文相似度过高({similarity})，请进一步调整用词和句式结构，确保不出现连续5个以上相同词汇'"
    },
    "platform_compliance_fail": {
        "max_retries": 2,
        "action": "在改写Prompt中追加约束：'上一次改写不符合平台规范({issues})，请严格按照平台规则调整'"
    },
    "content_integrity_fail": {
        "max_retries": 1,
        "action": "在改写Prompt中追加约束：'上一次改写丢失了核心观点({missing_points})，请确保这些观点被完整保留'"
    },
    "safety_fail": {
        "max_retries": 0,
        "action": "不重试，直接返回safety_flag=True，记录审核日志"
    }
}
```

---

## 5. 术语与方法论词典

### 5.1 DAIG 模型

**全称**：Drive-Attention-Interest-Guide（驱动-注意-兴趣-引导）

**来源**：头条内容运营团队总结的短视频/图文内容创作框架，用于解释爆款内容的传播机制。

| 阶段 | 作用 | 对应内容策略 |
|------|------|-------------|
| **Drive（驱动）** | 给用户一个点击的理由 | 标题/封面制造冲突、悬念、利益承诺 |
| **Attention（注意）** | 让用户停下来看 | 黄金3秒/开头钩子/视觉冲击 |
| **Interest（兴趣）** | 让用户愿意看完 | 信息密度节奏/情绪曲线/价值输出 |
| **Guide（引导）** | 让用户产生互动 | 互动钩子/评论诱因/分享动机 |

**在爆文猎人中的应用**：爆款基因分析的"互动钩子"维度直接对应 Guide 阶段，"标题公式"对应 Drive 阶段，"情绪基因"对应 Interest 阶段，"结构拆解"对应 Attention 阶段。

### 5.2 情绪鸡尾酒

**定义**：爆款内容往往不是触发单一情绪，而是多种情绪的精确配比组合，如同调酒师调配鸡尾酒。

**常见配方**：

| 配方名 | 情绪组合 | 典型场景 |
|--------|----------|----------|
| 焦虑释放 | 焦虑(40%) + 好奇(30%) + 满足(30%) | "5个症状说明你该换工作了" |
| 愤怒共鸣 | 愤怒(45%) + 认同(35%) + 优越(20%) | "职场PUA的3种表现" |
| 羡慕驱动 | 羡慕(35%) + 渴望(35%) + 行动(30%) | "95后如何做到月入5万" |
| 惊喜反转 | 好奇(40%) + 惊讶(40%) + 满足(20%) | "这个方法太绝了" |
| 恐惧驱动 | 恐惧(50%) + 焦虑(30%) + 安全(20%) | "90%的人都不知道的隐患" |

**在爆文猎人中的应用**：情绪基因分析的 `cocktail_type` 和 `cocktail_ratio` 字段直接输出情绪配比。

### 5.3 互动钩子

**定义**：内容中设计用来激发用户互动（评论/点赞/收藏/分享）的策略性设计。

**六大互动钩子类型**（参考 yao-open-prompts 和清华大学总裁班课程）：

| 钩子类型 | 心理机制 | 示例 |
|----------|----------|------|
| 提问式 | 参与欲 | "你中了几条？/你怎么看？" |
| 争议式 | 表达欲 | 故意留出争议空间引发辩论 |
| 补充式 | 成就感 | "你还知道哪些？/评论区补充" |
| 共享式 | 社交货币 | "转给你朋友看看/收藏备用" |
| 挑战式 | 竞争心 | "敢不敢试试？/你做不到吧" |
| 悬空式 | 完形心理 | "下期告诉你答案/未完待续" |

### 5.4 黄金三秒

**定义**：短视频/图文内容的前3秒（或前50字）决定了用户是否继续消费，必须在此期间建立注意力锚点。

**五种开头类型**（参考抖音爆款策划师方法论）：

| 类型 | 机制 | 示例 |
|------|------|------|
| 悬念开头 | 好奇心 | "我用了3年才发现，原来…" |
| 冲突开头 | 认知反差 | "别再每天跑步了！" |
| 利益开头 | 获得感 | "学会这3招，月薪翻倍" |
| 共鸣开头 | 被理解 | "是不是每次开会都想…" |
| 反常识开头 | 打破认知 | "早起的人其实更累" |

### 5.5 内容金字塔

**定义**：健康的内容矩阵由三层构成（参考清华大学总裁班内容创作课程）：

| 层级 | 占比 | 作用 |
|------|------|------|
| 流量型 | 60% | 热点借势、情绪共鸣、获取曝光 |
| 专业型 | 30% | 知识拆解、深度测评、建立信任 |
| 转化型 | 10% | 场景化方案、信任构建、促转化 |

---

## 6. Prompt 版本管理与迭代规范

### 6.1 版本命名规则

```
{module}/{version}_{date}_{description}

示例：
analysis/v1.0_20250601_initial
analysis/v1.1_20250615_add_emotion_cocktail
rewrite/v1.0_20250601_initial
rewrite/v1.1_20250620_add_safety_check
quality_check/v1.0_20250601_initial
```

### 6.2 存储位置

```
app/prompts/
├── analysis/
│   ├── v1.0.py          # 爆款基因分析完整版
│   ├── v1.0_batch.py    # 批量扫描精简版
│   └── CHANGELOG.md     # 版本变更记录
├── rewrite/
│   ├── v1.0.py          # 改写统一模板
│   ├── platform_rules/  # 7个平台规则文件
│   │   ├── xiaohongshu.py
│   │   ├── wechat.py
│   │   ├── douyin.py
│   │   ├── kuaishou.py
│   │   ├── bilibili.py
│   │   ├── zhihu.py
│   │   └── weixin_video.py
│   └── CHANGELOG.md
├── quality_check/
│   ├── v1.0.py          # 质量自检
│   ├── retry_strategy.py # 重试策略配置
│   └── CHANGELOG.md
└── system/
    └── common_prefix.py # 通用System Prompt前缀
```

### 6.3 迭代流程

1. **创建新版本**：复制当前版本文件，更新版本号
2. **A/B 测试**：新旧版本同时运行，对比输出质量（使用相同输入集）
3. **质量评估**：人工标注 20 条样本的改写质量，计算满意度
4. **灰度发布**：新版本先对 10% 用户生效
5. **全量切换**：满意度提升 ≥ 5% 后全量切换
6. **归档旧版**：旧版本保留但不再活跃调用

---

## 7. Token 消耗预估与成本控制

### 7.1 单次调用预估

| 场景 | Prompt Token | Completion Token | 总计 Token | 模型 |
|------|-------------|-----------------|-----------|------|
| 爆款分析（完整版） | ~800 | ~1200 | ~2000 | DeepSeek-Chat |
| 爆款扫描（精简版/篇） | ~300 | ~200 | ~500 | DeepSeek-Chat |
| 跨平台改写（单平台） | ~600 | ~800 | ~1400 | DeepSeek-Chat |
| 质量自检 | ~400 | ~300 | ~700 | Doubao-Lite |
| 改写重试（追加约束） | ~800 | ~800 | ~1600 | DeepSeek-Chat |

### 7.2 完整流程消耗

```
场景：用户上传10篇文章 → 分析 → 改写7个平台

1. 批量扫描10篇：10 × 500 = 5,000 tokens
2. 完整分析TOP3：3 × 2,000 = 6,000 tokens
3. 改写7个平台：7 × 1,400 = 9,800 tokens
4. 质量自检7次：7 × 700 = 4,900 tokens
5. 可能的重试2次：2 × 1,600 = 3,200 tokens

总计：约 28,900 tokens ≈ 29K tokens
```

### 7.3 成本控制策略

| 策略 | 说明 |
|------|------|
| **精简版优先** | 批量扫描用精简版，仅 TOP N 做完整分析 |
| **轻量模型降本** | 质量自检用 Doubao-Lite，成本仅为 Pro 的 1/5 |
| **缓存分析结果** | 同一篇文章不重复分析，结果缓存 30 天 |
| **用户配额** | 管理后台可设置每用户每日 LLM 调用次数上限 |
| **超长内容截断** | 超过 5000 字的文档只分析前 3000 字 + 最后 500 字 |

---

## 8. LLM 输出适配层设计

### 8.1 为什么需要适配层

LLM 输出存在以下不确定性，必须通过适配层转换为接口响应格式：
- **字段缺失**：LLM 可能跳过某些字段（如 platform_fit 为空数组）
- **类型偏移**：数字字段返回了字符串（如 `"85"` 而非 `85`）
- **枚举越界**：返回了 JSON Schema 中未定义的枚举值
- **嵌套层级错误**：扁平化或过度嵌套
- **格式异常**：Markdown 混入 JSON、多余换行等

### 8.2 适配层架构

```
LLM Raw Output (JSON字符串)
    │
    ▼
┌─────────────────────────────────┐
│  Step 1: 格式清洗              │
│  - 提取JSON（去除Markdown包裹）│
│  - 去除BOM/零宽字符            │
│  - 修复常见JSON语法错误         │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Step 2: Schema 校验           │
│  - JSON Schema Validation      │
│  - 必填字段检查                │
│  - 类型强制转换(str→int等)     │
│  - 枚举值校验(越界→默认值)     │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Step 3: 字段映射              │
│  - LLM字段 → 接口响应字段      │
│  - 缺失字段填充默认值           │
│  - 计算派生字段                 │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Step 4: 业务校验              │
│  - 分数范围校验(0-100)          │
│  - 数组非空校验                 │
│  - 逻辑一致性校验               │
└─────────────┬───────────────────┘
              │
              ▼
        API Response
```

### 8.3 分析结果适配映射表

| LLM 输出字段 | 接口响应字段 | 适配规则 | 缺失默认值 |
|-------------|-------------|----------|-----------|
| `overall_score.total` | `hotness_score.score` | 直接映射，clamp(0,100) | `0` |
| `overall_score.level` | `hotness_score.level` | 直接映射 | `"unknown"` |
| `overall_score.top_3_genes` | `top_3_genes` | 直接映射 | `[]` |
| `overall_score.confidence` | `hotness_score.confidence` | 直接映射 | `0.0` |
| `title_analysis.formula_type` | `title_formulas[0].name` | 包装为数组 | `[{"name":"unknown","description":"分析失败"}]` |
| `title_analysis.formula_description` | `title_formulas[0].description` | 同上 | |
| `title_analysis.score` | `title_formulas[0].score` | 同上 | `0` |
| `title_analysis.keywords` | `title_keywords` | 直接映射 | `[]` |
| `emotion_analysis.primary_emotion` | `emotion_tags[0]` | 拆分为标签数组 | `[]` |
| `emotion_analysis.secondary_emotions` | `emotion_tags[1:]` | 追加到标签数组 | |
| `emotion_analysis.cocktail_type` | `emotion_cocktail_type` | 直接映射 | `"unknown"` |
| `emotion_analysis.intensity` | `emotion_intensity` | 直接映射 | `0.0` |
| `structure_analysis.pattern` | `structure_template.pattern` | 嵌套映射 | `"unknown"` |
| `structure_analysis.sections` | `structure_template.sections` | 直接映射 | `[]` |
| `structure_analysis.golden_ratio` | `structure_template.golden_ratio` | 直接映射 | `{}` |
| `interaction_analysis` | `interaction_hooks` | 字段重映射 | `[]` |
| `topic_analysis` | `topic_analysis` | 直接映射（A02新增字段） | `{}` |
| `platform_fit` | `platform_fit` | 直接映射（A02新增字段） | `[]` |
| `raw_content` | `raw_content` | 直接映射 | `""` |

### 8.4 改写结果适配映射表

| LLM 输出字段 | 接口响应字段 | 适配规则 | 缺失默认值 |
|-------------|-------------|----------|-----------|
| `rewritten_title` | `title` | 直接映射 | `""` |
| `rewritten_content` | `content` | 直接映射 | `""` |
| `platform` | `platform` | 枚举校验 | 必填，失败则丢弃 |
| `word_count` | `word_count` | 直接映射 | `0` |
| `similarity_score` | `similarity_score` | clamp(0,100) | `0` |
| `self_check` | `quality_check` | 字段重映射 | `null` |

### 8.5 适配层代码骨架

```python
# app/services/llm_adapter.py

import json
import re
from typing import Any, Optional
from pydantic import BaseModel, validator

# ---------- Step 1: 格式清洗 ----------

def extract_json_from_llm(raw: str) -> str:
    """从LLM输出中提取JSON，兼容Markdown包裹"""
    # 尝试提取 ```json ... ``` 包裹
    match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw, re.DOTALL)
    if match:
        return match.group(1).strip()
    # 去除前后非JSON字符
    start = raw.find('{')
    end = raw.rfind('}') + 1
    if start >= 0 and end > start:
        return raw[start:end]
    return raw

# ---------- Step 2: Schema 校验 + 类型强转 ----------

def coerce_type(value: Any, target_type: type, default: Any = None) -> Any:
    """类型强制转换，失败返回默认值"""
    try:
        if target_type == int and isinstance(value, str):
            return int(float(value))  # "85.5" → 85
        if target_type == float and isinstance(value, (int, str)):
            return float(value)
        if target_type == str:
            return str(value)
        return target_type(value)
    except (ValueError, TypeError):
        return default

def clamp(value: Any, min_val: float, max_val: float) -> float:
    """数值范围限制"""
    num = coerce_type(value, float, 0)
    return max(min_val, min(max_val, num))

def validate_enum(value: str, allowed: list[str], default: str) -> str:
    """枚举校验，越界返回默认值"""
    return value if value in allowed else default

# ---------- Step 3: 字段映射（分析结果） ----------

def adapt_analysis_result(llm_output: dict) -> dict:
    """将LLM爆款分析输出适配为A02 AnalysisDetail格式"""
    score_data = llm_output.get("overall_score", {})
    title_data = llm_output.get("title_analysis", {})
    emotion_data = llm_output.get("emotion_analysis", {})
    structure_data = llm_output.get("structure_analysis", {})

    # emotion_tags: 拆分 primary + secondary 为标签数组
    emotion_tags = []
    if emotion_data.get("primary_emotion"):
        emotion_tags.append(emotion_data["primary_emotion"])
    emotion_tags.extend(emotion_data.get("secondary_emotions", []))

    # title_formulas: 包装为数组
    title_formulas = []
    if title_data.get("formula_type"):
        title_formulas.append({
            "name": title_data["formula_type"],
            "description": title_data.get("formula_description", ""),
            "score": clamp(title_data.get("score", 0), 0, 100)
        })

    # hotness_score: 从overall_score映射
    hotness_score = {
        "score": clamp(score_data.get("total", 0), 0, 100),
        "level": validate_enum(
            score_data.get("level", ""), 
            ["explosive", "high", "medium", "low"], 
            "unknown"
        ),
        "factors": score_data.get("factors", {}),
        "confidence": clamp(score_data.get("confidence", 0), 0, 1)
    }

    return {
        "hotness_score": hotness_score,
        "title_formulas": title_formulas or [{"name": "unknown", "description": "分析失败", "score": 0}],
        "title_keywords": title_data.get("keywords", []),
        "emotion_tags": emotion_tags,
        "emotion_cocktail_type": validate_enum(
            emotion_data.get("cocktail_type", ""),
            ["fear_hope", "anger_curiosity", "nostalgia_surprise", "contrast_resonance", "other"],
            "other"
        ),
        "emotion_intensity": clamp(emotion_data.get("intensity", 0), 0, 1),
        "structure_template": {
            "pattern": structure_data.get("pattern", "unknown"),
            "sections": structure_data.get("sections", []),
            "golden_ratio": structure_data.get("golden_ratio", {})
        },
        "interaction_hooks": llm_output.get("interaction_analysis", {}).get("hooks", []),
        "topic_analysis": llm_output.get("topic_analysis", {}),
        "platform_fit": llm_output.get("platform_fit", []),
        "top_3_genes": score_data.get("top_3_genes", []),
        "raw_content": llm_output.get("raw_content", "")
    }

# ---------- Step 3: 字段映射（改写结果） ----------

def adapt_rewrite_result(llm_output: dict, platform: str) -> dict:
    """将LLM改写输出适配为A03 RewriteResult格式"""
    return {
        "platform": platform,
        "title": llm_output.get("rewritten_title", ""),
        "content": llm_output.get("rewritten_content", ""),
        "word_count": coerce_type(llm_output.get("word_count", 0), int, 0),
        "similarity_score": clamp(llm_output.get("similarity_score", 0), 0, 100),
        "quality_check": llm_output.get("self_check") or None
    }

# ---------- Step 4: 完整适配流程 ----------

async def process_llm_analysis(raw_output: str) -> dict:
    """完整适配流程：原始LLM字符串 → API响应"""
    # Step 1
    json_str = extract_json_from_llm(raw_output)
    # Step 2
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        return {"error": f"LLM输出JSON解析失败: {e}", "fallback": True}
    # Step 3 + 4
    result = adapt_analysis_result(data)
    return result
```

### 8.6 适配失败兜底策略

| 场景 | 兜底方案 |
|------|----------|
| JSON 解析失败 | 记录原始输出到 `llm_raw_logs` 表，返回 `{"error": "分析失败", "fallback": true}` |
| 必填字段全部缺失 | 标记该条分析为 `failed`，不写入 `analysis_results`，重试1次 |
| 部分字段缺失 | 用默认值填充，标记 `is_partial: true` |
| 枚举越界 | 用 `unknown` / `other` 兜底，记录日志 |
| 分数越界 | clamp 到 0-100，记录日志 |
| 适配成功但质量差 | 质量自检分数 < 60 时自动重试，最多2次 |

### 8.7 适配层测试要求

| 测试类型 | 说明 | 频率 |
|----------|------|------|
| 单元测试 | 每个映射函数，含正常/异常/边界case | 每次提交 |
| 快照测试 | 真实LLM输出 → 适配后结果，存为快照对比 | Prompt变更时 |
| 集成测试 | 完整流程：LLM调用 → 适配 → 接口返回 | 每日 |
| 回归测试 | 旧Prompt输出仍能正确适配 | Prompt版本升级时 |
| **批量合并** | 批量扫描时将多篇文章合并为一次 LLM 调用，减少请求次数 |
