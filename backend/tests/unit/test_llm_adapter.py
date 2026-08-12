"""LLM 适配层测试"""
import pytest
from app.llm.adapter import (
    clean_llm_output, parse_json_safely, validate_schema,
    adapt_analysis_output, adapt_rewrite_output,
    ANALYSIS_SCHEMA, REWRITE_SCHEMA,
)


class TestCleanLLMOutput:
    def test_plain_json(self):
        assert clean_llm_output('{"key": "value"}') == '{"key": "value"}'

    def test_markdown_code_block(self):
        raw = '```json\n{"key": "value"}\n```'
        assert clean_llm_output(raw) == '{"key": "value"}'

    def test_with_prefix_text(self):
        raw = 'Here is the result:\n```json\n{"key": "value"}\n```'
        cleaned = clean_llm_output(raw)
        assert '"key"' in cleaned

    def test_plain_text_with_json(self):
        raw = 'Some text {"key": "value"} more text'
        cleaned = clean_llm_output(raw)
        assert '{"key": "value"}' in cleaned


class TestParseJsonSafely:
    def test_valid_json(self):
        assert parse_json_safely('{"a": 1}') == {"a": 1}

    def test_invalid_json(self):
        assert parse_json_safely('not json') is None

    def test_array(self):
        assert parse_json_safely('[1, 2, 3]') == [1, 2, 3]


class TestValidateSchema:
    def test_valid(self):
        data = {"hotness_score": {"level": "S"}, "emotion_tags": [], "title_formulas": [], "structure_template": {}, "top_3_genes": [], "platform_fit": []}
        errors = validate_schema(data, ANALYSIS_SCHEMA)
        assert errors == []

    def test_missing_required(self):
        errors = validate_schema({}, ANALYSIS_SCHEMA)
        assert len(errors) > 0
        assert any("hotness_score" in e for e in errors)


class TestAdaptAnalysisOutput:
    def test_valid_output(self):
        raw = '''```json
        {
            "hotness_score": {"level": "S", "score": 92, "factors": ["factor1"]},
            "emotion_tags": ["好奇-惊喜"],
            "title_formulas": [{"name": "数字+痛点", "confidence": 0.9}],
            "structure_template": {"type": "list"},
            "top_3_genes": [{"rank": 1, "gene": "gene1", "reason": "reason1"}],
            "platform_fit": [{"platform": "xiaohongshu", "fit_score": 85, "reason": "适合"}]
        }
        ```'''
        adapted, errors = adapt_analysis_output(raw)
        assert adapted is not None
        assert adapted["hotness_score"]["level"] == "S"
        assert errors == [] or len(errors) == 0

    def test_invalid_output(self):
        adapted, errors = adapt_analysis_output("not json at all")
        # When JSON parsing fails completely, adapted is None
        assert len(errors) > 0


class TestAdaptRewriteOutput:
    def test_valid_output(self):
        raw = '{"title": "新标题", "content": "新内容", "rewrite_notes": "注释"}'
        adapted, errors = adapt_rewrite_output(raw, "原文内容")
        assert adapted is not None
        assert adapted["title"] == "新标题"
        assert adapted["content"] == "新内容"

    def test_missing_fields(self):
        raw = '{"title": "只有标题"}'
        adapted, errors = adapt_rewrite_output(raw, "原文")
        assert adapted is not None  # Should fill defaults
        assert len(errors) > 0  # Should report missing content
