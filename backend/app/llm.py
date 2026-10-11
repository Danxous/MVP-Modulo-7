"""Orquestração da chamada ao LLM (Gemini). Sem chave de API, responde em modo offline."""

import logging
import os

from .rag import Chunk

logger = logging.getLogger(__name__)

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
FRIENDLY_ERROR = (
    "Não consegui falar com o modelo de IA agora. Tente novamente em instantes. "
    "Enquanto isso, confira as fontes encontradas abaixo."
)

PROFILE_FOCUS = {
    "Desenvolvedor": "código, arquitetura e inovação técnica",
    "Product Owner": "negócio, escopo e valor entregue; evite jargão técnico",
    "Gerente de Projetos": "fluxo da equipe, impedimentos, riscos e métricas",
}


def is_enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def build_prompt(question: str, sources: list[tuple[Chunk, float]], history: list[dict]) -> str:
    context = "\n\n".join(
        f"[Fonte: {chunk.path} linhas {chunk.start_line}-{chunk.end_line}]\n{chunk.text}" for chunk, _ in sources
    ) or "Nenhum trecho relevante encontrado."
    past = "\n".join(f"{m['role']}: {m['content']}" for m in history[-10:])
    return f"Contexto do projeto:\n{context}\n\nHistórico da conversa:\n{past}\n\nPergunta: {question}"


def offline_answer(sources: list[tuple[Chunk, float]]) -> str:
    if not sources:
        return (
            "**Modo offline** (sem `GEMINI_API_KEY`). Não encontrei trechos relevantes na base de conhecimento. "
            "Tente reformular a pergunta ou adicione documentos em `backend/knowledge/`."
        )
    parts = ["**Modo offline** (sem `GEMINI_API_KEY`). Estes são os trechos mais relevantes encontrados:"]
    for chunk, _ in sources:
        parts.append(f"**{chunk.path}** · linhas {chunk.start_line}–{chunk.end_line}\n\n```text\n{chunk.text}\n```")
    return "\n\n".join(parts)


def generate_answer(question: str, profile: str, temperature: float,
                    sources: list[tuple[Chunk, float]], history: list[dict]) -> str:
    if not is_enabled():
        return offline_answer(sources)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        system = (
            "Você é o MackAI, assistente RAG do projeto integrador. Responda em português, em markdown, "
            "usando prioritariamente o contexto fornecido. Se o contexto não tiver a resposta, diga isso. "
            f"O usuário é {profile}; foque em {PROFILE_FOCUS.get(profile, PROFILE_FOCUS['Desenvolvedor'])}."
        )
        response = client.models.generate_content(
            model=MODEL,
            contents=build_prompt(question, sources, history),
            config=types.GenerateContentConfig(system_instruction=system, temperature=temperature),
        )
        return response.text or FRIENDLY_ERROR
    except Exception:
        logger.exception("Falha ao chamar o LLM")
        return FRIENDLY_ERROR
