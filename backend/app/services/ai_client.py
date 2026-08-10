"""DeepSeek 客户端封装（OpenAI 兼容接口）。

未配置 Key 时返回 None，调用方自动降级到规则化生成。
生成的提示词由用户复制到网页 ChatGPT / Midjourney 使用，因此不接 OpenAI。
"""
import httpx
import os

from app.config import settings


def _build_http_client() -> httpx.Client:
    # 兼容有/无代理的环境：显式构造 httpx 客户端，避免 OpenAI SDK 在带代理环境变量时
    # 向新版 httpx 传递已废弃的 `proxies` 参数而报错。
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy:
        return httpx.Client(proxy=proxy, timeout=30.0)
    return httpx.Client(timeout=30.0)


def call_ai(system: str, user: str, temperature: float = 0.7) -> str | None:
    if not settings.deepseek_api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
            http_client=_build_http_client(),
        )
        resp = client.chat.completions.create(
            model=settings.deepseek_model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:  # 任何异常都降级，保证接口可用
        print(f"[ai_client] DeepSeek 调用失败，降级规则化生成: {e}")
        return None


def call_ai_multi(system: str, messages: list[dict], temperature: float = 0.7) -> str | None:
    """支持多轮对话：messages 为 [{role, content}, ...]（不含 system）。"""
    if not settings.deepseek_api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
            http_client=_build_http_client(),
        )
        resp = client.chat.completions.create(
            model=settings.deepseek_model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                *messages,
            ],
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[ai_client] DeepSeek 多轮调用失败: {e}")
        return None
