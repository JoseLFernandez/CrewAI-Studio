import os
from dotenv import load_dotenv
import streamlit as st
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic
from crewai import LLM
from langchain_openai.chat_models.base import BaseChatOpenAI
from litellm import completion

def _safe_has_session_env() -> bool:
    try:
        return hasattr(st, "session_state") and ("env_vars" in st.session_state)
    except Exception:
        return False


def load_secrets_fron_env():
    """Load .env and cache into Streamlit session if available; otherwise no-op."""
    load_dotenv(override=True)
    try:
        if "env_vars" not in st.session_state:
            st.session_state.env_vars = {
                "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
                "OPENAI_API_BASE": os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1/"),
                "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
                "LMSTUDIO_API_BASE": os.getenv("LMSTUDIO_API_BASE"),
                "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
                "OLLAMA_HOST": os.getenv("OLLAMA_HOST"),
                "XAI_API_KEY": os.getenv("XAI_API_KEY"),
            }
    except Exception:
        # Not running under Streamlit; environment variables are still loaded via dotenv
        pass

def switch_environment(new_env_vars):
    """Set os.environ values; mirror into Streamlit session if available."""
    for key, value in new_env_vars.items():
        if value is not None:
            os.environ[key] = value
            try:
                if _safe_has_session_env():
                    st.session_state.env_vars[key] = value
            except Exception:
                pass

def restore_environment():
    """Restore environment from Streamlit cache if present; otherwise no-op."""
    try:
        for key, value in (st.session_state.env_vars.items() if _safe_has_session_env() else []):
            if value is not None:
                os.environ[key] = value
            elif key in os.environ:
                del os.environ[key]
    except Exception:
        pass

def safe_pop_env_var(key):
    os.environ.pop(key, None)

def _get_env(key: str, default: str | None = None) -> str | None:
    try:
        if _safe_has_session_env():
            return st.session_state.env_vars.get(key, os.getenv(key, default))
    except Exception:
        pass
    return os.getenv(key, default)


def create_openai_llm(model, temperature):
    # Ensure .env is loaded at least once
    load_dotenv(override=False)
    switch_environment({
        "OPENAI_API_KEY": _get_env("OPENAI_API_KEY"),
        "OPENAI_API_BASE": _get_env("OPENAI_API_BASE", "https://api.openai.com/v1/"),
    })
    api_key = os.getenv("OPENAI_API_KEY")
    api_base = os.getenv("OPENAI_API_BASE")

    if api_key:
        return LLM(model=model, temperature=temperature, base_url=api_base)
    else:
        raise ValueError("OpenAI API key not set in .env file")

def create_anthropic_llm(model, temperature):
    switch_environment({
        "ANTHROPIC_API_KEY": _get_env("ANTHROPIC_API_KEY"),
    })
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if api_key:
        # Newer LangChain providers read API keys from environment; pass minimal args
        return ChatAnthropic(
            model=model,
            temperature=temperature,
        )
    else:
        raise ValueError("Anthropic API key not set in .env file")

def create_groq_llm(model, temperature):
    switch_environment({
        "GROQ_API_KEY": _get_env("GROQ_API_KEY"),
    })
    api_key = os.getenv("GROQ_API_KEY")

    if api_key:
        return ChatGroq(model=model, temperature=temperature)
    else:
        raise ValueError("Groq API key not set in .env file")

def create_ollama_llm(model, temperature):
    host = _get_env("OLLAMA_HOST")
    if host:
        switch_environment({
            "OPENAI_API_KEY": "ollama",  # Nastaví OpenAI API klíč na "ollama"
            "OPENAI_API_BASE": host,    # Nastaví OpenAI API Base na hodnotu OLLAMA_HOST
        })
        return LLM(model=model, temperature=temperature, base_url=host)
    else:
        raise ValueError("Ollama Host is not set in .env file")


def create_xai_llm(model, temperature):
    host = "https://api.x.ai/v1"
    api_key = _get_env("XAI_API_KEY")

    if not api_key:
        raise ValueError("XAI_API_KEY must be set in .env file")

    switch_environment({
        "OPENAI_API_KEY": api_key,
        "OPENAI_API_BASE": host,
    })

    return LLM(
        model=model,
        temperature=temperature,
        api_key=api_key,
        base_url=host
    )

def create_lmstudio_llm(model, temperature):
    switch_environment({
        "OPENAI_API_KEY": "lm-studio",
        "OPENAI_API_BASE": _get_env("LMSTUDIO_API_BASE"),
    })
    api_base = os.getenv("OPENAI_API_BASE")

    if api_base:
        return ChatOpenAI(
            model=model,
            api_key="lm-studio",
            base_url=api_base,
            temperature=temperature,
        )
    else:
        raise ValueError("LM Studio API base not set in .env file")

LLM_CONFIG = {
    "OpenAI": {
        "models": os.getenv("OPENAI_PROXY_MODELS", "").split(",") if os.getenv("OPENAI_PROXY_MODELS") else ["gpt-4.1-mini","gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo", "gpt-4-turbo"],
        "create_llm": create_openai_llm,
    },
    "Groq": {
        "models": ["groq/llama3-8b-8192", "groq/llama3-70b-8192", "groq/mixtral-8x7b-32768"],
        "create_llm": create_groq_llm,
    },
    "Ollama": {
        "models": os.getenv("OLLAMA_MODELS", "").split(",") if os.getenv("OLLAMA_MODELS") else [],
        "create_llm": create_ollama_llm,
    },
    "Anthropic": {
        "models": ["claude-3-5-sonnet-20240620","claude-3-7-sonnet-20250219"],
        "create_llm": create_anthropic_llm,
    },
    "LM Studio": {
        "models": ["lms-default"],
        "create_llm": create_lmstudio_llm,
    },
     "Xai": {
        "models": ["xai/grok-2-1212", "xai/grok-beta"],
        "create_llm": create_xai_llm,
    },
}

def llm_providers_and_models():
    return [f"{provider}: {model}" for provider in LLM_CONFIG.keys() for model in LLM_CONFIG[provider]["models"]]

def create_llm(provider_and_model, temperature=0.15):
    provider, model = provider_and_model.split(": ")
    create_llm_func = LLM_CONFIG.get(provider, {}).get("create_llm")

    if create_llm_func:
        llm = create_llm_func(model, temperature)
        restore_environment()  # Obnoví původní prostředí po vytvoření LLM
        return llm
    else:
        raise ValueError(f"LLM provider {provider} is not recognized or not supported")
