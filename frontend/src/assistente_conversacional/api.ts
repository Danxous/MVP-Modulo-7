export type Source = { path: string; start_line: number; end_line: number; similarity: number; excerpt: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: Source[];
  feedback?: "up" | "down" | null;
};

export type ConversationSummary = { id: string; title: string; created_at: string };
export type Health = { status: string; llm: "gemini" | "offline"; documents: number; chunks: number; indexed_at: string };

// Captura a URL do backend injetada pelo Vite ou usa o localhost como alternativa de desenvolvimento
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return response.json();
}

export const api = {
  health: () => request<Health>("/api/health"),
  conversations: () => request<ConversationSummary[]>("/api/conversations"),
  conversation: (id: string) => request<ConversationSummary & { messages: Message[] }>(`/api/conversations/${id}`),
  chat: (body: { message: string; conversation_id: string | null; profile: string; temperature: number }) =>
    request<{ conversation_id: string; message: Message }>("/api/chat", { method: "POST", body: JSON.stringify(body) }),
  feedback: (message_id: string, value: "up" | "down" | null) =>
    request<{ ok: boolean }>("/api/feedback", { method: "POST", body: JSON.stringify({ message_id, value }) }),
};
