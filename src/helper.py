# src/helper.py
import os
import time
import logging
from dotenv import load_dotenv
load_dotenv()

# Try to import the wrappers you use in your project.
# Adjust these import lines if your wrappers are named differently.
try:
    from langchain_groq import ChatGroq
    from langchain_openai import ChatOpenAI
except Exception:
    ChatGroq = None
    ChatOpenAI = None

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

DEFAULT_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", 0.5))
DEFAULT_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", 1024))

log = logging.getLogger("llm_fallback")
if not log.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    log.addHandler(handler)
log.setLevel(logging.INFO)


def _extract_text_from_llm_response(resp) -> str:
    """Robust extractor for many response shapes."""
    if resp is None:
        return ""
    if isinstance(resp, str):
        return resp
    # LangChain-like .generations
    if hasattr(resp, "generations"):
        try:
            gens = resp.generations
            if isinstance(gens, list) and len(gens) > 0:
                first = gens[0]
                if isinstance(first, list) and len(first) > 0 and hasattr(first[0], "text"):
                    return first[0].text
                if hasattr(first, "text"):
                    return first.text
        except Exception:
            pass
    # dict-style (OpenRouter-like)
    if isinstance(resp, dict):
        if "choices" in resp and isinstance(resp["choices"], list) and len(resp["choices"]) > 0:
            ch = resp["choices"][0]
            if isinstance(ch, dict):
                if "message" in ch and isinstance(ch["message"], dict) and "content" in ch["message"]:
                    return ch["message"]["content"]
                if "text" in ch:
                    return ch["text"]
                for k in ("content", "output", "answer"):
                    if k in ch:
                        return ch[k]
    # openai-like .choices
    if hasattr(resp, "choices"):
        try:
            first = resp.choices[0]
            if hasattr(first, "message") and hasattr(first.message, "content"):
                return first.message.content
            if hasattr(first, "text"):
                return first.text
        except Exception:
            pass
    try:
        return str(resp)
    except Exception:
        return ""


def _classify_error(exc: Exception):
    """
    Heuristic classification of exceptions:
      - 'fatal_auth' : auth/invalid/expired -> switch provider
      - 'rate_limit' : rate limit/quota -> switch provider
      - 'retryable'  : transient network/5xx -> retry this provider
    """
    msg = str(exc).lower()
    status = None
    for attr in ("status_code", "status", "http_status", "code"):
        if hasattr(exc, attr):
            try:
                status = int(getattr(exc, attr))
                break
            except Exception:
                continue

    if status in (401, 403) or "unauthorized" in msg or "invalid" in msg or "expired" in msg:
        return "fatal_auth"
    if status == 429 or "rate limit" in msg or "quota" in msg or "quota exceeded" in msg:
        return "rate_limit"
    if (status and 500 <= status < 600) or "timeout" in msg or "connection" in msg or "failed to connect" in msg:
        return "retryable"
    return "retryable"


class BaseProvider:
    name = "base"

    def create_llm(self):
        raise NotImplementedError

    def invoke(self, llm, prompt: str, **kwargs):
        raise NotImplementedError


class GroqProvider(BaseProvider):
    name = "groq"

    def __init__(self, api_key):
        self.api_key = api_key

    def create_llm(self):
        if ChatGroq is None:
            raise RuntimeError("ChatGroq wrapper not available (check imports).")
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=self.api_key,
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=DEFAULT_MAX_TOKENS,
            model_kwargs={"top_p": 0.95},
            timeout=60,
            max_retries=0,
        )

    def invoke(self, llm, prompt: str, **kwargs):
        """
        Preferred single-method invocation: try `invoke()` (LangChain's new method),
        else fall back to calling the llm object directly if callable.
        """
        # Preferred: llm.invoke
        if hasattr(llm, "invoke"):
            return llm.invoke(prompt, **kwargs)
        # Fallback to calling the llm if it is callable (some wrappers implement __call__)
        if callable(llm):
            return llm(prompt, **kwargs)
        raise RuntimeError("Groq LLM instance has no supported invocation method (invoke or callable).")


class OpenRouterProvider(BaseProvider):
    name = "openrouter"

    def __init__(self, api_key, base_url="https://openrouter.ai/api/v1"):
        self.api_key = api_key
        self.base_url = base_url

    def create_llm(self):
        if ChatOpenAI is None:
            raise RuntimeError("ChatOpenAI wrapper not available (check imports).")
        return ChatOpenAI(
            model="mistralai/mistral-small-3.2-24b-instruct:free",
            api_key=self.api_key,
            base_url=self.base_url,
            temperature=DEFAULT_TEMPERATURE,
            max_tokens=DEFAULT_MAX_TOKENS,
            model_kwargs={"top_p": 0.95},
            timeout=60,
            max_retries=0,
        )

    def invoke(self, llm, prompt: str, **kwargs):
        """
        Preferred single-method invocation: try `invoke()` then fallback to callable.
        """
        if hasattr(llm, "invoke"):
            return llm.invoke(prompt, **kwargs)
        if callable(llm):
            return llm(prompt, **kwargs)
        raise RuntimeError("OpenRouter LLM instance has no supported invocation method (invoke or callable).")


class LLMManager:
    def __init__(self, providers):
        if not providers:
            raise ValueError("Provide at least one provider")
        self.providers = providers
        self._llms = [None] * len(providers)

    def ask(self, prompt: str, max_tokens: int = None, temperature: float = None,
            per_provider_retries: int = 2, backoff_factor: float = 1.0):
        last_exc = None
        for idx, provider in enumerate(self.providers):
            log.info(f"Trying provider: {provider.name}")
            try:
                if self._llms[idx] is None:
                    self._llms[idx] = provider.create_llm()
            except Exception as e:
                log.warning(f"Failed to initialize provider {provider.name}: {e}")
                last_exc = e
                continue

            llm = self._llms[idx]
            attempt = 0
            while True:
                attempt += 1
                try:
                    call_kwargs = {}
                    if temperature is not None:
                        call_kwargs["temperature"] = temperature
                    if max_tokens is not None:
                        call_kwargs["max_tokens"] = max_tokens
                    raw = provider.invoke(llm, prompt, **call_kwargs)
                    text = _extract_text_from_llm_response(raw)
                    log.info(f"Provider {provider.name} succeeded.")
                    return text
                except Exception as e:
                    typ = _classify_error(e)
                    last_exc = e
                    log.warning(f"Provider {provider.name} error (attempt {attempt}): {e} -> classified as {typ}")
                    if typ in ("fatal_auth", "rate_limit"):
                        log.info(f"Switching provider due to {typ} on {provider.name}")
                        break
                    if attempt > per_provider_retries:
                        log.info(f"Exceeded retries for provider {provider.name}. Moving to next provider.")
                        break
                    sleep_for = backoff_factor * (2 ** (attempt - 1))
                    log.info(f"Retrying provider {provider.name} after {sleep_for:.1f}s backoff")
                    time.sleep(sleep_for)
        log.error("All LLM providers failed.")
        raise last_exc


# Build provider list in preference order (Groq first, then OpenRouter)
providers = []
if GROQ_API_KEY:
    providers.append(GroqProvider(GROQ_API_KEY))
if OPENROUTER_API_KEY:
    providers.append(OpenRouterProvider(OPENROUTER_API_KEY))

if not providers:
    log.error("No LLM provider keys found (GROQ_API_KEY or OPENROUTER_API_KEY).")

llm_manager = LLMManager(providers) if providers else None


def ask_with_fallback(prompt: str, max_tokens: int = DEFAULT_MAX_TOKENS, temperature: float = None):
    if llm_manager is None:
        raise ValueError("LLM manager not configured: no providers available.")
    return llm_manager.ask(prompt, max_tokens=max_tokens, temperature=temperature)



