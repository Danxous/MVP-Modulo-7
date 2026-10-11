import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { api, ConversationSummary, Health, Message, Source } from "./api";

type IconName =
  | "book"
  | "check"
  | "chevron"
  | "clock"
  | "code"
  | "copy"
  | "file"
  | "menu"
  | "message"
  | "moon"
  | "plus"
  | "send"
  | "sparkles"
  | "sun"
  | "thumbDown"
  | "thumbUp"
  | "x";

const paths: Record<IconName, ReactNode> = {
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" /><path d="M8 7h8M8 11h6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  code: <><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 6l-4 12" /></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: <path d="M20 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />,
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" /><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  thumbDown: <path d="M7 3v11M7 4H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3l4 7 2-1v-6h5a2 2 0 0 0 2-2l-2-7a2 2 0 0 0-2-1Z" />,
  thumbUp: <path d="M7 21V10M7 20H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3l4-7 2 1v6h5a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1Z" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const suggestions = [
  { icon: "code" as IconName, title: "Analisar código", text: "Como estruturar endpoints assíncronos no FastAPI?" },
  { icon: "book" as IconName, title: "Explorar arquitetura", text: "Como funciona a busca semântica do RAG?" },
  { icon: "sparkles" as IconName, title: "Planejar produto", text: "Quais User Stories podemos simplificar no MVP?" },
];

const profiles: Record<string, string> = { "Desenvolvedor": "DV", "Product Owner": "PO", "Gerente de Projetos": "PM" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sourceIcon(path: string): IconName {
  if (/\.(py|tsx?|jsx?|css|sql)$/.test(path)) return "code";
  if (path.endsWith(".md")) return "book";
  return "file";
}

type HastNode = { type: string; value?: string; children?: HastNode[] };

function nodeText(node?: HastNode): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(nodeText).join("");
}

function Logo() {
  return (
    <div className="logo" aria-label="Mack AI">
      <span className="logo-mark">M</span>
      <span>Mack<span>AI</span></span>
    </div>
  );
}

function SourceCard({ source, open, onClick }: { source: Source; open: boolean; onClick: () => void }) {
  return (
    <button className={`source-card ${open ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="source-icon"><Icon name={sourceIcon(source.path)} size={17} /></span>
      <span className="source-copy">
        <strong>{source.path}</strong>
        <span>linhas {source.start_line}–{source.end_line}</span>
        <small>Similaridade {Math.round(source.similarity * 100)}%</small>
      </span>
      <Icon name="chevron" size={15} />
    </button>
  );
}

function AssistantAnswer({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [openSource, setOpenSource] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(message.feedback ?? null);
  const sources = message.sources ?? [];

  function sendFeedback(value: "up" | "down") {
    const next = feedback === value ? null : value;
    setFeedback(next);
    api.feedback(message.id, next).catch(() => setFeedback(feedback));
  }

  const components: Components = {
    pre({ node, children }) {
      const code = node?.children[0] as { properties?: { className?: string[] } } | undefined;
      const language = code?.properties?.className?.find((c) => c.startsWith("language-"))?.replace("language-", "") ?? "código";
      return (
        <div className="code-block">
          <div className="code-head">
            <span><Icon name="code" size={14} /> {language}</span>
            <button type="button" onClick={() => onCopy(nodeText(node as HastNode))}><Icon name="copy" size={14} /> Copiar código</button>
          </div>
          <pre>{children}</pre>
        </div>
      );
    },
  };

  return (
    <article className="message-row assistant-message">
      <div className="avatar ai-avatar"><Icon name="sparkles" size={17} /></div>
      <div className="message-content">
        <div className="message-meta"><strong>MackAI</strong><span>{formatTime(message.created_at)}</span></div>
        <div className="answer-copy">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>{message.content}</ReactMarkdown>
        </div>

        {sources.length > 0 && <div className="sources">
          <button className="sources-toggle" type="button" onClick={() => setSourcesOpen(!sourcesOpen)}>
            <span><Icon name="book" size={16} /> {sources.length} {sources.length === 1 ? "fonte consultada" : "fontes consultadas"}</span>
            <span className={sourcesOpen ? "rotate" : ""}><Icon name="chevron" size={15} /></span>
          </button>
          {sourcesOpen && <>
            <div className="source-grid">
              {sources.map((source, index) => (
                <SourceCard key={`${source.path}-${source.start_line}`} source={source} open={openSource === index} onClick={() => setOpenSource(openSource === index ? null : index)} />
              ))}
            </div>
            {openSource !== null && <pre className="source-excerpt">{sources[openSource].excerpt}</pre>}
          </>}
        </div>}
        <div className="answer-actions">
          <span>Esta resposta foi útil?</span>
          <button aria-label="Resposta útil" className={feedback === "up" ? "selected" : ""} type="button" onClick={() => sendFeedback("up")}><Icon name="thumbUp" size={15} /></button>
          <button aria-label="Resposta não útil" className={feedback === "down" ? "selected" : ""} type="button" onClick={() => sendFeedback("down")}><Icon name="thumbDown" size={15} /></button>
          <button aria-label="Copiar resposta" type="button" onClick={() => onCopy(message.content)}><Icon name="copy" size={15} /></button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState("Desenvolvedor");
  const [temperature, setTemperature] = useState(0.4);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.conversations().then(setConversations).catch(() => undefined);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [input]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    showToast("Copiado para a área de transferência");
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    try {
      const response = await api.chat({ message: text, conversation_id: conversationId, profile, temperature });
      setConversationId(response.conversation_id);
      setMessages((current) => [...current, response.message]);
      api.conversations().then(setConversations).catch(() => undefined);
    } catch {
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Não foi possível conectar ao assistente. Verifique se o backend está rodando e tente novamente.",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(id: string) {
    setSidebarOpen(false);
    const conversation = await api.conversation(id);
    setConversationId(id);
    setMessages(conversation.messages);
  }

  function startNew() {
    setConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="scrim" aria-label="Fechar menu" type="button" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="close-mobile" aria-label="Fechar menu" type="button" onClick={() => setSidebarOpen(false)}><Icon name="x" /></button>
        </div>
        <button className="new-chat" type="button" onClick={startNew}><Icon name="plus" size={17} /> Nova conversa</button>
        <div className="history-head"><span>Conversas recentes</span><Icon name="clock" size={14} /></div>
        <nav className="conversation-list" aria-label="Conversas recentes">
          {conversations.length === 0 && <p className="empty-history">Nenhuma conversa ainda.</p>}
          {conversations.map((item) => (
            <button className={item.id === conversationId ? "active" : ""} type="button" key={item.id} onClick={() => openConversation(item.id)}>
              <Icon name="message" size={16} />
              <span>{item.title}</span>
              <small>{formatTime(item.created_at)}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="profile">
          <div className="profile-avatar">{profiles[profile]}</div>
          <div><strong>{profile}</strong><span>Projeto Integrador</span></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="menu-mobile" aria-label="Abrir menu" type="button" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
          <div className="topbar-title">
            <strong>Assistente do projeto</strong>
            {health
              ? <span><i /> {health.documents} documentos indexados · {health.llm === "gemini" ? "Gemini" : "Modo offline"}</span>
              : <span><i className="offline" /> Backend indisponível</span>}
          </div>
          <div className="topbar-actions">
            <label className="role-select">
              <span>Perfil</span>
              <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                {Object.keys(profiles).map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <button className="icon-button" aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"} type="button" onClick={() => setDark(!dark)}><Icon name={dark ? "sun" : "moon"} /></button>
          </div>
        </header>

        <div className="chat-scroll">
          <div className="chat-content">
            {messages.length === 0 && <>
              <section className="welcome">
                <div className="welcome-icon"><Icon name="sparkles" size={24} /></div>
                <div>
                  <span className="eyebrow">ASSISTENTE RAG</span>
                  <h1>Olá! Como posso ajudar?</h1>
                  <p>Consulte o código, a documentação e o backlog do projeto em uma única conversa.</p>
                </div>
              </section>

              <div className="suggestion-grid">
                {suggestions.map((item) => <button type="button" key={item.title} onClick={() => { setInput(item.text); textareaRef.current?.focus(); }}>
                  <span className="suggestion-icon"><Icon name={item.icon} size={18} /></span>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                  <span className="arrow">→</span>
                </button>)}
              </div>
            </>}

            {messages.map((message) => message.role === "user"
              ? <article className="message-row user-message" key={message.id}>
                  <div className="avatar user-avatar">{profiles[profile]}</div>
                  <div className="message-content"><div className="message-meta"><strong>Você</strong><span>{formatTime(message.created_at)}</span></div><p>{message.content}</p></div>
                </article>
              : <AssistantAnswer key={message.id} message={message} onCopy={copy} />)}

            {loading && <article className="message-row typing-row">
              <div className="avatar ai-avatar"><Icon name="sparkles" size={17} /></div>
              <div className="typing"><span /><span /><span /><small>IA digitando... analisando {health?.chunks ?? ""} trechos do projeto</small></div>
            </article>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={submit}>
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Pergunte sobre o código, arquitetura ou backlog... (Shift+Enter para nova linha)" rows={1} />
            <div className="composer-foot">
              <label className="temperature" title="Temperatura do LLM: mais alta = respostas mais criativas">
                <Icon name="sparkles" size={14} /> Temperatura
                <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
                <span className="metric">{temperature.toFixed(1)}</span>
              </label>
              <button className="send-button" aria-label="Enviar mensagem" disabled={!input.trim() || loading} type="submit"><Icon name="send" size={17} /></button>
            </div>
          </form>
          <p className="disclaimer">A IA pode cometer erros. Confira as fontes antes de tomar decisões importantes.</p>
        </div>
      </main>
      {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}
