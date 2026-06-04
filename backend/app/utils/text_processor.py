"""文本处理工具"""
import re
import hashlib


def calculate_similarity(text1: str, text2: str) -> float:
    """计算两段文本的相似度（基于 SimHash + 汉明距离）"""
    hash1 = _simhash(text1)
    hash2 = _simhash(text2)
    
    # 汉明距离 → 相似度
    hamming = bin(hash1 ^ hash2).count("1")
    similarity = 1.0 - (hamming / 64.0)
    return round(similarity, 4)


def _simhash(text: str, hashbits: int = 64) -> int:
    """SimHash 算法"""
    tokens = _tokenize(text)
    if not tokens:
        return 0

    v = [0] * hashbits
    for token in tokens:
        token_hash = int(hashlib.md5(token.encode()).hexdigest(), 16)
        for i in range(hashbits):
            bitmask = 1 << i
            if token_hash & bitmask:
                v[i] += 1
            else:
                v[i] -= 1

    fingerprint = 0
    for i in range(hashbits):
        if v[i] > 0:
            fingerprint |= (1 << i)
    return fingerprint


def _tokenize(text: str) -> list[str]:
    """中文分词（简易版：按2-4字切分 + 标点分割）"""
    # 去除标点和空白
    cleaned = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9]", "", text)
    if not cleaned:
        return []

    # 2-gram + 3-gram
    tokens = []
    for n in [2, 3, 4]:
        for i in range(len(cleaned) - n + 1):
            tokens.append(cleaned[i:i + n])
    return tokens


def count_words(text: str) -> int:
    """统计字数（中文按字计，英文按空格分词计）"""
    chinese_chars = len(re.findall(r"[\u4e00-\u9fa5]", text))
    english_words = len(re.findall(r"[a-zA-Z]+", text))
    return chinese_chars + english_words


def truncate_text(text: str, max_length: int = 500) -> str:
    """截断文本，保留末尾省略号"""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def extract_title_from_content(content: str) -> str | None:
    """从正文第一行提取标题"""
    lines = content.strip().split("\n")
    for line in lines:
        line = line.strip().lstrip("#").strip()
        if line:
            return line[:200]
    return None
