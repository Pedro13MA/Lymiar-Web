#!/usr/bin/env python3
"""Fast product/landing sitemaps from public API (L1 categories)."""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.sax.saxutils as sax
from datetime import datetime, timezone
from pathlib import Path

ORIGIN = "https://lymiar.com"
API = "https://api.lymiar.com"
CHUNK = 40_000
OUT = Path(__file__).resolve().parents[1] / "public"
UA = {"User-Agent": "LymiarSitemapBot/1.0"}
PAGE = 48
MAX_PAGES = 25


def log(msg: str) -> None:
    print(msg, flush=True)


def get_json(path: str) -> dict:
    req = urllib.request.Request(f"{API}{path}", headers=UA)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def add_ean(seen: set[str], row: object) -> None:
    if not isinstance(row, dict):
        return
    for key in ("ean", "slug"):
        val = row.get(key)
        if val is None:
            continue
        s = str(val).strip()
        if len(s) >= 8 and s.replace("-", "").isalnum():
            seen.add(s)
            return


def harvest_list(seen: set[str], rows: object) -> None:
    if isinstance(rows, list):
        for row in rows:
            add_ean(seen, row)
    elif isinstance(rows, dict):
        for val in rows.values():
            harvest_list(seen, val)


def write_urlset(path: Path, keys: list[str], priority: str = "0.6") -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for key in keys:
        loc = f"{ORIGIN}/p/{sax.escape(key)}/"
        lines.extend(
            [
                "  <url>",
                f"    <loc>{loc}</loc>",
                "    <changefreq>daily</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_index(path: Path, names: list[str]) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for name in names:
        lines.extend(
            [
                "  <sitemap>",
                f"    <loc>{ORIGIN}/{name}</loc>",
                f"    <lastmod>{now}</lastmod>",
                "  </sitemap>",
            ]
        )
    lines.append("</sitemapindex>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()

    home = get_json("/api/v1/home")
    harvest_list(seen, home)
    log(f"home {len(seen)}")

    for path in (
        "/api/v1/deals/now?limit=48",
        "/api/v1/deals/fair?limit=48",
        "/api/v1/deals/wait?limit=48",
        "/api/v1/deals/radar?limit_each=48",
    ):
        try:
            harvest_list(seen, get_json(path))
        except Exception as e:
            log(f"deals warn {path} {e}")
    log(f"deals {len(seen)}")

    cats = get_json("/api/v1/categorias").get("categories") or []
    slugs = [str(c["slug"]) for c in cats if isinstance(c, dict) and c.get("slug")]
    log(f"l1 cats {len(slugs)}")

    for slug in slugs:
        for page in range(MAX_PAGES):
            offset = page * PAGE
            path = (
                f"/api/v1/categorias/{urllib.parse.quote(slug)}/produtos"
                f"?limit={PAGE}&offset={offset}"
            )
            try:
                data = get_json(path)
            except Exception as e:
                log(f"cat warn {slug} {e}")
                break
            rows = data.get("results") or []
            if not rows:
                break
            harvest_list(seen, rows)
            total = int(data.get("total") or data.get("total_in_category") or 0)
            if len(rows) < PAGE or (total and offset + len(rows) >= total):
                break
            time.sleep(0.03)
        log(f"cat {slug} -> {len(seen)}")

    for q in (
        "ssd",
        "iphone",
        "samsung",
        "rtx",
        "ps5",
        "tv",
        "portatil",
        "air fryer",
        "aspirador",
        "auscultadores",
    ):
        try:
            data = get_json(f"/api/v1/search?q={urllib.parse.quote(q)}&limit=48")
            harvest_list(seen, data.get("results") or [])
        except Exception as e:
            log(f"search warn {q} {e}")
    log(f"search {len(seen)}")

    keys = sorted(k for k in seen if k.isdigit() or len(k) >= 8)
    eans = [k for k in keys if k.isdigit()] or keys
    log(f"urls {len(eans)}")

    product_files: list[str] = []
    parts = max(1, math.ceil(len(eans) / CHUNK) if eans else 1)
    if not eans:
        write_urlset(OUT / "sitemap-products-1.xml", [])
        product_files = ["sitemap-products-1.xml"]
    else:
        for i in range(parts):
            chunk = eans[i * CHUNK : (i + 1) * CHUNK]
            name = f"sitemap-products-{i + 1}.xml"
            write_urlset(OUT / name, chunk)
            product_files.append(name)
            log(f"wrote {name} {len(chunk)}")

    # Landing
    pages = [
        ("/", "1.0"),
        ("/radar/", "0.9"),
        ("/categorias/", "0.85"),
        ("/search/", "0.7"),
        ("/comparar/", "0.6"),
        ("/mercado/", "0.7"),
        ("/afiliados/", "0.4"),
    ]
    for slug in slugs:
        pages.append((f"/categoria/{slug}/", "0.75"))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    seen_loc: set[str] = set()
    for loc, pri in pages:
        if loc in seen_loc:
            continue
        seen_loc.add(loc)
        lines.extend(
            [
                "  <url>",
                f"    <loc>{ORIGIN}{loc}</loc>",
                "    <changefreq>daily</changefreq>",
                f"    <priority>{pri}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    (OUT / "sitemap-landing.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")

    index_names = [
        "sitemap.xml",
        "sitemap-categorias.xml",
        "sitemap-landing.xml",
        *product_files,
    ]
    write_index(OUT / "sitemap-index.xml", index_names)

    robots = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /timeline/",
        "Disallow: /minha-area/",
        "Disallow: /favoritos/",
        "Disallow: /alertas/",
        "Disallow: /listas/",
        "Disallow: /carrinho/",
        "Disallow: /projetos/",
        "Disallow: /perfil/",
        "Disallow: /entrar/",
        "Disallow: /notificacoes/",
        "Disallow: /control-center/",
        "Disallow: /catalogo/",
        "",
        f"Sitemap: {ORIGIN}/sitemap-index.xml",
        *[f"Sitemap: {ORIGIN}/{n}" for n in index_names],
        "",
    ]
    (OUT / "robots.txt").write_text("\n".join(robots), encoding="utf-8")

    top = eans[:40]
    (OUT.parent / "scripts" / "_seo_priority_urls.txt").write_text(
        "\n".join([f"{ORIGIN}/"] + [f"{ORIGIN}/radar/", f"{ORIGIN}/categorias/"] + [f"{ORIGIN}/p/{e}/" for e in top])
        + "\n",
        encoding="utf-8",
    )

    # Telegram draft from top deals
    try:
        deals = get_json("/api/v1/deals/now?limit=10").get("results") or []
    except Exception:
        deals = []
    draft_lines = [
        "Lymiar — oportunidades com histórico (não inventamos promoções)",
        "",
    ]
    for d in deals[:5]:
        if not isinstance(d, dict):
            continue
        name = (d.get("name") or "Produto")[:80]
        price = d.get("currentPrice")
        ean = d.get("ean") or d.get("slug")
        if not ean:
            continue
        draft_lines.append(f"• {name}")
        if price is not None:
            draft_lines.append(f"  {price:.2f} €".replace(".", ","))
        draft_lines.append(f"  {ORIGIN}/p/{ean}/")
        draft_lines.append("")
    draft_lines.append("Veredicto com evidência → lymiar.com")
    (OUT.parent / "scripts" / "_telegram_draft.txt").write_text(
        "\n".join(draft_lines), encoding="utf-8"
    )
    log("done")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FATAL {e}")
        sys.exit(1)
