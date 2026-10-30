"""Generate public/freq/<lang>.json.gz: the top-N words by frequency, most common first.

Data: wordfreq (https://github.com/rspeer/wordfreq), whose word lists combine
OpenSubtitles, Wikipedia, Google Books, Reddit, Twitter and other sources.
The data is licensed CC BY-SA 4.0; see public/freq/ATTRIBUTION.md.

Usage (outside the extension's own deps):
    python -m venv .venv && .venv/bin/pip install wordfreq==3.1.1
    .venv/bin/python scripts/gen-freq.py
"""
import gzip
import json
import pathlib
import unicodedata

from wordfreq import top_n_list

LANGS = ["es", "fr", "en", "ja", "ko"]
N = 20000
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "freq"


def wordlike(w: str) -> bool:
    return any(unicodedata.category(c).startswith("L") for c in w) and not any(c.isdigit() for c in w)


for lang in LANGS:
    words = []
    seen = set()
    for w in top_n_list(lang, N * 2):
        w = unicodedata.normalize("NFC", w.lower())
        if wordlike(w) and w not in seen:
            seen.add(w)
            words.append(w)
        if len(words) == N:
            break
    data = json.dumps(words, ensure_ascii=False, separators=(",", ":")).encode()
    (OUT / f"{lang}.json.gz").write_bytes(gzip.compress(data, 9, mtime=0))
    print(lang, len(words), len(data) // 1024, "KB raw")
