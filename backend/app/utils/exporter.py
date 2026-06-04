"""导出工具：JSON / CSV / TXT"""
import csv
import io
import json


def export_json(articles: list[dict]) -> str:
    """导出为 JSON"""
    return json.dumps(articles, ensure_ascii=False, indent=2)


def export_csv(articles: list[dict]) -> str:
    """导出为 CSV"""
    if not articles:
        return ""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["title", "content", "source_platform", "source_url", "tags"])
    writer.writeheader()
    for a in articles:
        writer.writerow({
            "title": a.get("title", ""),
            "content": a.get("content", ""),
            "source_platform": a.get("source_platform", ""),
            "source_url": a.get("source_url", ""),
            "tags": "|".join(a.get("tags") or []),
        })
    return output.getvalue()


def export_txt(articles: list[dict]) -> str:
    """导出为纯文本"""
    parts = []
    for i, a in enumerate(articles, 1):
        parts.append(f"=== 第 {i} 篇 ===")
        parts.append(f"标题：{a.get('title', '')}")
        parts.append(f"来源：{a.get('source_platform', '')}")
        parts.append(f"正文：\n{a.get('content', '')}")
        parts.append("")
    return "\n".join(parts)
