"""LLM 客户端封装 - 支持 OpenAI 兼容接口"""
import logging
from typing import AsyncGenerator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """LLM 调用客户端，封装 OpenAI Chat Completions 接口"""

    def __init__(self):
        self.base_url = settings.LLM_BASE_URL
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.max_tokens = settings.LLM_MAX_TOKENS
        self.temperature = 0.7

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        response_format: dict | None = None,
    ) -> dict:
        """同步调用 LLM，返回完整响应"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": model or self.model,
                "messages": messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
            }
            if response_format:
                payload["response_format"] = response_format

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            try:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                return data
            except httpx.HTTPStatusError as e:
                logger.error("LLM API 错误: %d - %s", e.response.status_code, e.response.text[:200])
                raise
            except httpx.RequestError as e:
                logger.error("LLM 请求失败: %s", e)
                raise

    async def chat_stream(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        """流式调用 LLM，逐 token 输出"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": model or self.model,
                "messages": messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
                "stream": True,
            }
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data_str)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except Exception:
                        continue

    def count_tokens_estimate(self, text: str) -> int:
        """估算 Token 数（中文≈1.5字/token，英文≈4字符/token）"""
        chinese_chars = sum(1 for c in text if "\u4e00" <= c <= "\u9fa5")
        other_chars = len(text) - chinese_chars
        return int(chinese_chars / 1.5 + other_chars / 4)


# 全局客户端实例
llm_client = LLMClient()
