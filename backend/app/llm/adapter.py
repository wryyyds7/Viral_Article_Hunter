"""LLM 输出适配层 - 四步流程：格式清洗→Schema校验→字段映射→业务校验"""
import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# ── 分析结果 Schema ──
ANALYSIS_SCHEMA = {
    "type": "object",
    "required": ["hotness_score", "emotion_tags", "title_formulas", "structure_template", "top_3_genes", "platform_fit"],
    "properties": {
        "hotness_score": {"type": "object"},
        "emotion_tags": {"type": "array", "items": {"type": "string"}},
        "title_formulas": {"type": "array", "items": {"type": "object"}},
        "structure_template": {"type": "object"},
        "top_3_genes": {"type": "array", "items": {"type": "object"}},
        "platform_fit": {"type": "array", "items": {"type": "object"}},
        "interaction_analysis": {"type": "object"},
    },
}

# ── 改写结果 Schema ──
REWRITE_SCHEMA = {
    "type": "object",
    "required": ["title", "content"],
    "properties": {
        "title": {"type": "string"},
        "content": {"type": "string"},
        "rewrite_notes": {"type": "string"},
    },
}


def clean_llm_output(raw: str) -> str:
    """第一步：格式清洗 - 去除 markdown 代码块标记等"""
    text = raw.strip()

    # 去除 ```json ... ``` 包裹
    if text.startswith("```"):
        lines = text.split("\n")
        # 去首行 ```json
        if lines[0].startswith("```"):
            lines = lines[1:]
        # 去末行 ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # 去除前后空白
    text = text.strip()

    # 尝试找到 JSON 对象的边界
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    start_arr = text.find("[")
    if start_arr != -1 and (start == -1 or start_arr < start):
        end_arr = text.rfind("]")
        if end_arr != -1:
            text = text[start_arr:end_arr + 1]

    return text


def parse_json_safely(text: str) -> dict | list | None:
    """安全解析 JSON"""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 尝试修复常见问题
        # 1. 尾逗号
        text = re.sub(r",\s*([}\]])", r"\1", text)
        # 2. 单引号→双引号
        text = text.replace("'", '"')
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error("JSON 解析失败: %s", text[:200])
            return None


def validate_schema(data: dict, schema: dict) -> list[str]:
    """第二步：Schema 校验 - 检查必填字段"""
    errors = []
    required = schema.get("required", [])
    for field in required:
        if field not in data:
            errors.append(f"缺少必填字段: {field}")
    return errors


# ── 字段映射表（Prompt输出 → 接口字段）──
ANALYSIS_FIELD_MAP = {
    "hotness_level": "hotness_score.level",
    "hotness_score_value": "hotness_score.score",
    "hotness_factors": "hotness_score.factors",
    "virality_potential": "hotness_score.score",  # 兼容旧 Prompt
}

REWRITE_FIELD_MAP = {
    "rewritten_title": "title",
    "rewritten_content": "content",
    "rewrite_notes": "rewrite_notes",
}


def map_fields(data: dict, field_map: dict) -> dict:
    """第三步：字段映射"""
    mapped = {}
    for src, dst in field_map.items():
        if src in data:
            # 支持嵌套字段 "hotness_score.level"
            parts = dst.split(".")
            target = mapped
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = data[src]
    # 保留原始数据中未映射的字段
    for key, value in data.items():
        if key not in field_map and key not in mapped:
            mapped[key] = value
    return mapped


def validate_analysis_business(data: dict) -> list[str]:
    """第四步：业务校验 - 分析结果"""
    errors = []
    score = data.get("hotness_score", {})
    if isinstance(score, dict):
        level = score.get("level", "")
        if level not in ("S", "A", "B", "C", "D"):
            errors.append(f"热度等级无效: {level}")

        score_val = score.get("score", 0)
        if not isinstance(score_val, (int, float)) or not (0 <= score_val <= 100):
            errors.append(f"热度分值无效: {score_val}")

    genes = data.get("top_3_genes", [])
    if not isinstance(genes, list) or len(genes) == 0:
        errors.append("top_3_genes 不能为空")

    return errors


def validate_rewrite_business(data: dict, source_content: str = "") -> list[str]:
    """第四步：业务校验 - 改写结果"""
    errors = []

    title = data.get("title", "")
    if not title or len(title) < 2:
        errors.append("改写标题过短")

    content = data.get("content", "")
    if not content or len(content) < 10:
        errors.append("改写正文过短")

    return errors


# ── 对外统一接口 ──

def adapt_analysis_output(raw_llm_text: str) -> tuple[dict | None, list[str]]:
    """适配分析结果：清洗→解析→校验→映射→业务校验"""
    # Step 1: 格式清洗
    cleaned = clean_llm_output(raw_llm_text)

    # Step 2: JSON 解析
    parsed = parse_json_safely(cleaned)
    if parsed is None:
        return None, ["JSON 解析失败"]

    # Step 3: Schema 校验
    errors = validate_schema(parsed, ANALYSIS_SCHEMA)
    if errors:
        # 尝试兜底：补充缺失字段
        parsed = _fill_analysis_defaults(parsed, errors)

    # Step 4: 字段映射
    mapped = map_fields(parsed, ANALYSIS_FIELD_MAP)

    # Step 5: 业务校验
    biz_errors = validate_analysis_business(mapped)

    all_errors = errors + biz_errors
    return mapped, all_errors


def adapt_rewrite_output(raw_llm_text: str, source_content: str = "") -> tuple[dict | None, list[str]]:
    """适配改写结果"""
    cleaned = clean_llm_output(raw_llm_text)
    parsed = parse_json_safely(cleaned)
    if parsed is None:
        return None, ["JSON 解析失败"]

    errors = validate_schema(parsed, REWRITE_SCHEMA)
    if errors:
        parsed = _fill_rewrite_defaults(parsed, errors)

    mapped = map_fields(parsed, REWRITE_FIELD_MAP)
    biz_errors = validate_rewrite_business(mapped, source_content)

    return mapped, errors + biz_errors


def _fill_analysis_defaults(data: dict, missing: list[str]) -> dict:
    """补充分析结果缺失字段的默认值"""
    defaults = {
        "hotness_score": {"level": "C", "score": 50, "factors": ["自动补充"]},
        "emotion_tags": ["中性"],
        "title_formulas": [{"name": "未知", "confidence": 0.5}],
        "structure_template": {"type": "unknown"},
        "top_3_genes": [{"rank": 1, "gene": "未知", "reason": "自动补充"}],
        "platform_fit": [],
        "interaction_analysis": {},
    }
    for key, default in defaults.items():
        if key not in data:
            data[key] = default
    return data


def _fill_rewrite_defaults(data: dict, missing: list[str]) -> dict:
    """补充改写结果缺失字段的默认值"""
    defaults = {
        "title": "改写标题",
        "content": "改写内容",
        "rewrite_notes": "",
    }
    for key, default in defaults.items():
        if key not in data:
            data[key] = default
    return data
