"""AES-256 加密解密工具"""
import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import settings


def _get_fernet() -> Fernet:
    """从配置密钥派生 Fernet 密钥"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"viral_article_hunter_salt",
        iterations=100_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.ENCRYPT_KEY.encode()))
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    """加密字符串"""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """解密字符串"""
    f = _get_fernet()
    return f.decrypt(ciphertext.encode()).decode()


def mask_key(key_value: str) -> str:
    """脱敏显示 Key: sk-...3xYp"""
    if len(key_value) <= 8:
        return "***"
    return f"{key_value[:3]}...{key_value[-4:]}"
