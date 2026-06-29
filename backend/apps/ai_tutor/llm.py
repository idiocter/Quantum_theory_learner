"""LLM provider abstraction for the AI tutor.

Dispatches a chat completion to the configured provider behind a single
``generate_chat`` call, so the Celery task doesn't care which backend is live.
Groq is the default; Anthropic stays available. Switch via the LLM_PROVIDER
setting (``groq`` or ``anthropic``).
"""
import logging
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the configured provider fails or is misconfigured."""


@dataclass
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int


def generate_chat(system: str, messages: list[dict], max_tokens: int = 2048) -> LLMResponse:
    """Generate one assistant turn.

    ``messages`` is the conversation history in OpenAI/Anthropic role format
    (``[{"role": "user"|"assistant", "content": ...}]``); ``system`` is the
    system prompt. Returns the text plus token usage. Raises ``LLMError`` on any
    provider/config failure so the caller can handle it uniformly.
    """
    provider = getattr(settings, "LLM_PROVIDER", "groq").lower()
    if provider == "groq":
        return _groq_chat(system, messages, max_tokens)
    if provider == "anthropic":
        return _anthropic_chat(system, messages, max_tokens)
    raise LLMError(f"Unknown LLM_PROVIDER '{provider}'. Use 'groq' or 'anthropic'.")


def _groq_chat(system: str, messages: list[dict], max_tokens: int) -> LLMResponse:
    try:
        from groq import Groq
    except ImportError as exc:  # pragma: no cover
        raise LLMError("The 'groq' package is not installed. Run: pip install groq") from exc

    api_key = getattr(settings, "GROQ_API_KEY", "")
    if not api_key:
        raise LLMError("GROQ_API_KEY is not configured on the server.")

    client = Groq(api_key=api_key)
    model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")

    # Groq is OpenAI-compatible: the system prompt is the first message.
    try:
        completion = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0.4,
            messages=[{"role": "system", "content": system}, *messages],
        )
    except Exception as exc:
        raise LLMError(f"Groq request failed: {exc}") from exc

    choice = completion.choices[0]
    usage = completion.usage
    return LLMResponse(
        text=choice.message.content or "",
        input_tokens=getattr(usage, "prompt_tokens", 0) or 0,
        output_tokens=getattr(usage, "completion_tokens", 0) or 0,
    )


def _anthropic_chat(system: str, messages: list[dict], max_tokens: int) -> LLMResponse:
    try:
        import anthropic
    except ImportError as exc:  # pragma: no cover
        raise LLMError("The 'anthropic' package is not installed.") from exc

    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        raise LLMError("ANTHROPIC_API_KEY is not configured on the server.")

    client = anthropic.Anthropic(api_key=api_key)
    model = getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6")
    try:
        with client.messages.stream(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        ) as stream:
            final = stream.get_final_message()
    except Exception as exc:
        raise LLMError(f"Anthropic request failed: {exc}") from exc

    text = "".join(block.text for block in final.content if block.type == "text")
    return LLMResponse(
        text=text,
        input_tokens=final.usage.input_tokens,
        output_tokens=final.usage.output_tokens,
    )
