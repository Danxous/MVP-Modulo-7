"""Busca semântica simples: chunking + vetores TF-IDF + similaridade de cosseno."""

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ALLOWED_EXTENSIONS = {".md", ".txt", ".py", ".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".yml", ".yaml", ".sql"}
CHUNK_LINES = 30
CHUNK_OVERLAP = 5

STOPWORDS = {
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas",
    "um", "uma", "uns", "umas", "para", "por", "com", "que", "se", "ao", "aos", "eu", "como",
    "quero", "meu", "minha", "ou", "the", "and", "of", "to", "in", "is", "it", "for",
}


def tokenize(text: str) -> list[str]:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return [t for t in re.findall(r"[a-z0-9_]+", text) if len(t) > 1 and t not in STOPWORDS]


@dataclass
class Chunk:
    path: str
    start_line: int
    end_line: int
    text: str
    vector: dict[str, float] | None = None


def split_into_chunks(path: str, content: str) -> list[Chunk]:
    lines = content.splitlines()
    chunks = []
    step = CHUNK_LINES - CHUNK_OVERLAP
    for start in range(0, max(len(lines), 1), step):
        piece = lines[start:start + CHUNK_LINES]
        text = "\n".join(piece).strip()
        if text:
            chunks.append(Chunk(path, start + 1, start + len(piece), text))
        if start + CHUNK_LINES >= len(lines):
            break
    return chunks


def cosine_similarity(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(value * b.get(term, 0.0) for term, value in a.items())
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)


class KnowledgeBase:
    def __init__(self, directory: Path):
        self.directory = directory
        self.chunks: list[Chunk] = []
        self.idf: dict[str, float] = {}
        self.documents = 0

    def load(self) -> None:
        self.chunks = []
        files = sorted(p for p in self.directory.rglob("*") if p.is_file() and p.suffix in ALLOWED_EXTENSIONS)
        for file in files:
            content = file.read_text(encoding="utf-8", errors="ignore")
            self.chunks.extend(split_into_chunks(str(file.relative_to(self.directory)), content))
        self.documents = len(files)

        doc_freq: Counter[str] = Counter()
        for chunk in self.chunks:
            doc_freq.update(set(tokenize(chunk.text)))
        total = len(self.chunks) or 1
        self.idf = {term: math.log((1 + total) / (1 + freq)) + 1 for term, freq in doc_freq.items()}
        for chunk in self.chunks:
            chunk.vector = self.embed(chunk.text)

    def embed(self, text: str) -> dict[str, float]:
        counts = Counter(tokenize(text))
        return {term: count * self.idf.get(term, 0.0) for term, count in counts.items()}

    def search(self, query: str, top_k: int = 3) -> list[tuple[Chunk, float]]:
        query_vector = self.embed(query)
        scored = [(chunk, cosine_similarity(query_vector, chunk.vector or {})) for chunk in self.chunks]
        scored = [item for item in scored if item[1] > 0]
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]
