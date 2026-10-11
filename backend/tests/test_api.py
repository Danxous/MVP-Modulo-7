from fastapi.testclient import TestClient

from app.main import app
from app.rag import KnowledgeBase, cosine_similarity, split_into_chunks

client = TestClient(app)


def test_health_reports_indexed_knowledge():
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["documents"] > 0 and body["chunks"] > 0


def test_cosine_similarity():
    assert cosine_similarity({"a": 1.0}, {"a": 2.0}) == 1.0
    assert cosine_similarity({"a": 1.0}, {"b": 1.0}) == 0.0


def test_chunking_with_overlap():
    content = "\n".join(f"linha {i}" for i in range(70))
    chunks = split_into_chunks("doc.md", content)
    assert chunks[0].start_line == 1 and chunks[1].start_line == 26
    assert chunks[-1].end_line == 70


def test_semantic_search_finds_relevant_file(tmp_path):
    (tmp_path / "pagamento.md").write_text("O serviço de pagamento publica o evento payment.created.")
    (tmp_path / "cache.md").write_text("Bibliotecas de cache recomendadas: Redis.")
    kb = KnowledgeBase(tmp_path)
    kb.load()
    results = kb.search("Como funciona o serviço de pagamento?")
    assert results[0][0].path == "pagamento.md"


def test_chat_keeps_history_and_returns_sources(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    first = client.post("/api/chat", json={"message": "Quais User Stories podemos simplificar no MVP?"}).json()
    assert first["message"]["sources"]

    conversation_id = first["conversation_id"]
    client.post("/api/chat", json={"message": "E para o PO?", "conversation_id": conversation_id})
    conversation = client.get(f"/api/conversations/{conversation_id}").json()
    assert [m["role"] for m in conversation["messages"]] == ["user", "assistant", "user", "assistant"]
    assert any(c["id"] == conversation_id for c in client.get("/api/conversations").json())


def test_feedback_is_saved(tmp_path, monkeypatch):
    monkeypatch.setattr("app.main.FEEDBACK_FILE", tmp_path / "feedback.jsonl")
    answer = client.post("/api/chat", json={"message": "dark mode"}).json()["message"]
    assert client.post("/api/feedback", json={"message_id": answer["id"], "value": "up"}).status_code == 200
    assert (tmp_path / "feedback.jsonl").read_text().count('"up"') == 1
    assert client.post("/api/feedback", json={"message_id": "x", "value": "up"}).status_code == 404
