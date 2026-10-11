# MVP Módulo 7 – MackAI (Assistente RAG)

Assistente conversacional com busca semântica (RAG) sobre o código, a documentação e o backlog do projeto, com orquestração de chamadas ao LLM (Gemini).

- **Backend:** Python + FastAPI (`backend/`)
- **Frontend:** React + TypeScript + Vite (`frontend/`), baseado no protótipo do Figma e no Guia de Identidade Visual do Módulo 6 (`frontend/src/tokens.css`)

Detalhes da arquitetura e dos endpoints: [`backend/knowledge/arquitetura_mvp.md`](backend/knowledge/arquitetura_mvp.md).

## Como rodar

Pré-requisitos: Python 3.11+ e Node 18+.

### 1. Backend (porta 8000)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # coloque sua GEMINI_API_KEY (opcional)
uvicorn app.main:app --reload
```
Sem `GEMINI_API_KEY`, o assistente roda em **modo offline**: faz a busca semântica e devolve os trechos mais relevantes, sem gerar texto com IA.

### 2. Frontend (porta 5173)
```bash
cd frontend
npm install
npm run dev
```
Acesse http://localhost:5173.

### Testes do backend
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Base de conhecimento
Os arquivos de `backend/knowledge/` são indexados quando o backend inicia. Para o assistente responder sobre o código e a documentação de vocês, copie os arquivos (`.md`, `.txt`, `.py`, `.ts`, `.tsx`, `.sql`...) para essa pasta e reinicie o backend.

## User Stories atendidas
| Funcionalidade | US |
|---|---|
| Perguntas ao assistente RAG sobre código, arquitetura, backlog etc., com perfil Desenvolvedor / PO / PM | 1–30, 41–100 |
| Busca semântica com chunking, embeddings (TF-IDF) e similaridade de cosseno | 24, 26, 27 |
| Integração com `google-genai` / `gemini-2.5-flash` | 21, 22 |
| Chave de API isolada no backend (`.env`) | 29 |
| Ajuste de temperatura do LLM | 30 |
| Blocos de código com syntax highlighting | 31 |
| Botão "Copiar código" | 32 |
| Renderização de markdown (tabelas, listas) | 33 |
| Indicador "IA digitando..." | 34 |
| Feedback útil / não útil (salvo em `backend/data/feedback.jsonl`) | 35 |
| Histórico da conversa mantido e enviado como contexto | 36 |
| Nova conversa | 37 |
| Fontes consultadas com trecho e similaridade | 38 |
| Entrada de textos longos (stack traces, logs) | 39 |
| Modo escuro | 40 |
| Mensagem amigável quando o LLM falha | 80 |

## Fluxo de branches
- `main` – versão estável. Não faça commits diretos.
- `develop` – integração do time. Crie sua branch a partir dela (`feature/minha-mudanca`) e abra Pull Request para `develop`.
- Quando `develop` estiver estável, abra Pull Request de `develop` para `main`.
