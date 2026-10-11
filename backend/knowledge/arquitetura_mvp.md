# Arquitetura do MVP – Módulo 7 (Assistente RAG)

## Visão geral
- **Frontend**: React + TypeScript (Vite), em `frontend/`. Interface de chat baseada no protótipo do Figma e no Guia de Identidade Visual do Módulo 6.
- **Backend**: Python + FastAPI, em `backend/`. Expõe a API REST usada pelo chat.
- **LLM**: Google Gemini (`gemini-2.5-flash`) via biblioteca `google-genai`. A chave `GEMINI_API_KEY` fica só no backend (arquivo `.env`, fora do git). Sem chave, o assistente funciona em modo offline e devolve apenas os trechos encontrados.

## Fluxo de uma pergunta
1. O usuário envia a pergunta pelo chat (`POST /api/chat`) com o perfil (Desenvolvedor, Product Owner ou Gerente de Projetos) e a temperatura.
2. O backend faz a busca semântica na base de conhecimento (`backend/knowledge/`).
3. Os 3 trechos mais similares, o histórico da conversa e a pergunta são enviados ao Gemini.
4. A resposta volta em markdown junto com as fontes consultadas e o percentual de similaridade.
5. Se o LLM falhar, o usuário recebe uma mensagem amigável no lugar de um erro técnico.

## Busca semântica
- **Chunking**: cada arquivo é dividido em blocos de 30 linhas com sobreposição de 5 linhas.
- **Embeddings**: vetores TF-IDF gerados localmente (sem custo de API).
- **Similaridade**: similaridade de cosseno entre o vetor da pergunta e o vetor de cada bloco.
- Para adicionar conhecimento, coloque arquivos `.md`, `.txt`, `.py`, `.ts`, `.tsx` etc. em `backend/knowledge/` e reinicie o backend.

## Endpoints
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Status, modo do LLM e quantidade de documentos indexados |
| GET | `/api/conversations` | Conversas recentes da sessão |
| POST | `/api/conversations` | Inicia uma nova conversa |
| GET | `/api/conversations/{id}` | Histórico de mensagens de uma conversa |
| POST | `/api/chat` | Envia uma pergunta ao assistente RAG |
| POST | `/api/feedback` | Registra útil/não útil em `backend/data/feedback.jsonl` |
