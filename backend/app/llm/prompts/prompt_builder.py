"""Prompt 模板管理"""
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _load_template(name: str) -> str:
    """加载模板文件"""
    path = TEMPLATES_DIR / name
    if not path.exists():
        logger.warning("Prompt 模板不存在: %s", name)
        return ""
    return path.read_text(encoding="utf-8")


def build_analysis_prompt(article_title: str, article_content: str) -> list[dict]:
    """构建爆款基因分析 Prompt"""
    system_prompt = _load_template("analysis_system.md")
    user_prompt = f"""请分析以下文章的爆款基因：

## 文章标题
{article_title}

## 文章正文
{article_content}

请严格按照 JSON Schema 输出分析结果。"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_rewrite_prompt(
    article_title: str,
    article_content: str,
    target_platform: str,
    style_overrides: dict | None = None,
) -> list[dict]:
    """构建跨平台改写 Prompt"""
    system_prompt = _load_template("rewrite_system.md")
    platform_rules = _load_platform_rules(target_platform)

    # 用户参数映射
    style_text = _map_style_params(style_overrides or {})

    user_prompt = f"""请将以下文章改写为适合 {target_platform} 平台的内容：

## 原文标题
{article_title}

## 原文正文
{article_content}

## 目标平台风格规则
{platform_rules}

## 用户风格偏好
{style_text}

请严格按照 JSON 格式输出改写结果，包含 title、content、rewrite_notes 三个字段。"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_batch_analysis_prompt(articles: list[dict]) -> list[dict]:
    """构建批量分析精简版 Prompt"""
    system_prompt = _load_template("analysis_batch_system.md")

    articles_text = ""
    for i, a in enumerate(articles, 1):
        articles_text += f"\n### 文章 {i}\n标题：{a['title']}\n摘要：{a.get('summary', a['content'][:200])}\n"

    user_prompt = f"""请批量分析以下 {len(articles)} 篇文章的爆款潜力：
{articles_text}

对每篇文章给出：hotness_level(S/A/B/C/D)、top1_gene、recommended_platform。以 JSON 数组输出。"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_quality_check_prompt(
    original_title: str,
    original_content: str,
    rewritten_title: str,
    rewritten_content: str,
    target_platform: str,
) -> list[dict]:
    """构建改写质量自检 Prompt"""
    system_prompt = _load_template("quality_check_system.md")

    user_prompt = f"""请评估以下改写质量：

## 原文
标题：{original_title}
正文（前500字）：{original_content[:500]}

## 改写结果
标题：{rewritten_title}
正文：{rewritten_content}
目标平台：{target_platform}

请从4个维度评分(0-100)：readability(可读性)、style_match(平台风格匹配)、originality(原创性)、compliance(合规性)，并给出总体评分。JSON格式输出。"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _load_platform_rules(platform: str) -> str:
    """加载平台规则"""
    # 从 data/platform_rules/ 目录加载
    rules_dir = Path(__file__).parent.parent.parent / "data" / "platform_rules"
    rule_file = rules_dir / f"{platform}.md"
    if rule_file.exists():
        return rule_file.read_text(encoding="utf-8")
    return f"平台 {platform} 的风格规则尚未配置，请按通用风格改写。"


def _map_style_params(params: dict) -> str:
    """用户参数映射为自然语言描述"""
    descriptions = []

    param_map = {
        "tone": {
            "professional": "语气专业严谨",
            "casual": "语气轻松活泼",
            "humorous": "语气幽默风趣",
            "empathetic": "语气共情温暖",
        },
        "emoji_density": {
            0: "不使用 emoji",
            1: "极少使用 emoji",
            2: "适度使用 emoji",
            3: "大量使用 emoji",
        },
        "emotion_intensity": {
            1: "情绪表达含蓄内敛",
            2: "情绪表达适度",
            3: "情绪表达强烈饱满",
        },
        "length": {
            "short": "篇幅精简（300字以内）",
            "medium": "篇幅适中（300-800字）",
            "long": "篇幅详细（800字以上）",
        },
        "colloquial": {
            True: "使用口语化表达",
            False: "使用书面化表达",
        },
    }

    for key, value in params.items():
        if key in param_map:
            mapping = param_map[key]
            if value in mapping:
                descriptions.append(mapping[value])

    return "；".join(descriptions) if descriptions else "使用平台默认风格"
