"""文本处理工具测试"""
import pytest
from app.utils.text_processor import calculate_similarity, count_words, truncate_text, extract_title_from_content


class TestCalculateSimilarity:
    def test_identical_text(self):
        text = "这是一段测试文本，用于验证相似度计算功能"
        sim = calculate_similarity(text, text)
        assert sim == 1.0

    def test_completely_different(self):
        sim = calculate_similarity("完全不同的文本内容甲", "毫不相干的文字描述乙")
        assert 0 <= sim < 1.0

    def test_empty_text(self):
        # Both empty texts produce identical SimHash (0), so similarity = 1.0
        sim = calculate_similarity("", "")
        assert sim == 1.0

    def test_partial_overlap(self):
        text1 = "AI驱动的爆款内容分析平台"
        text2 = "AI驱动的内容分析平台"
        sim = calculate_similarity(text1, text2)
        assert 0 < sim <= 1.0


class TestCountWords:
    def test_chinese(self):
        assert count_words("你好世界") == 4

    def test_english(self):
        assert count_words("hello world") == 2

    def test_mixed(self):
        # chinese_chars=2, english_words=1 → 3
        assert count_words("你好world") == 3

    def test_empty(self):
        assert count_words("") == 0


class TestTruncateText:
    def test_short_text(self):
        assert truncate_text("short", 10) == "short"

    def test_long_text(self):
        result = truncate_text("a" * 100, 10)
        assert len(result) == 10
        assert result.endswith("...")

    def test_exact_length(self):
        assert truncate_text("12345", 5) == "12345"


class TestExtractTitle:
    def test_first_line(self):
        assert extract_title_from_content("第一行标题\n第二行内容") == "第一行标题"

    def test_markdown_heading(self):
        assert extract_title_from_content("# 标题\n正文") == "标题"

    def test_empty(self):
        assert extract_title_from_content("") is None

    def test_whitespace_only(self):
        assert extract_title_from_content("  \n  \n内容") == "内容"
