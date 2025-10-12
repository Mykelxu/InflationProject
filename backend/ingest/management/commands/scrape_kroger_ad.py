import json, re
from datetime import date
from pathlib import Path

import httpx
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.models import Item, Price

NUM_RX = re.compile(r"(\d+\.\d{2})")
def norm(s): return (s or "").strip()
def to_lc(s): return norm(s).lower()

def load_catalog(path: Path):
    if not path.exists():
        raise CommandError(f"items catalog not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))

def text_has_all(text, tokens):
    t = to_lc(text)
    return all(tok in t for tok in (tok.lower() for tok in tokens))

def text_has_any(text, tokens):
    t = to_lc(text)
    return any(tok in t for tok in (tok.lower() for tok in tokens))

def flatten_items(json_obj):
    out = []
    def walk(node):
        if isinstance(node, dict):
            for key in ("items","cards","modules","categories","deals","entities","data"):
                v = node.get(key)
                if isinstance(v, list):
                    for it in v:
                        if isinstance(it, dict):
                            out.append(it); walk(it)
                        elif isinstance(it, list):
                            for sub in it:
                                if isinstance(sub, dict):
                                    out.append(sub); walk(sub)
                elif isinstance(v, dict):
                    out.append(v); walk(v)
            for v in node.values():
                if isinstance(v, (dict, list)): walk(v)
        elif isinstance(node, list):
            for v in node: walk(v)
    walk(json_obj)
    return out

def extract_name(d):
    for k in ("name","title","headline","productName","description"):
        v = d.get(k)
        if isinstance(v, str) and v.strip(): return v.strip()
    return ""

def extract_price_str(d):
    for k in ("price","salePrice","offerPrice","currentPrice","finalPrice","priceString","ctaText"):
        v = d.get(k)
        if isinstance(v, str) and v.strip(): return v.strip()
        if isinstance(v, (int,float)): return f"{v:.2f}"
    pr = d.get("pricing") or d.get("prices")
    if isinstance(pr, dict):
        for k in ("sale","current","regular"):
            v = pr.get(k)
            if isinstance(v, (int,float)): return f"{v:.2f}"
            if isinstance(v, str) and v.strip(): return v.strip()
    return ""

def parse_price(price_str):
    m = NUM_RX.search(price_str.replace(",", ""))
    return float(m.group(1)) if m else None

class Command(BaseCommand):
    help = "Scrape Kroger weekly-ad JSON endpoint for target staples and store prices to DB"

    def add_arguments(self, parser):
        parser.add_argument("--endpoint", required=True,
                            help="Paste a weekly-ad JSON URL captured from Network tab (includes storeId).")
        parser.add_argument("--zip", default="30328", help="ZIP stored on Price rows (regional filtering)")
        parser.add_argument("--catalog", default="ingest/items_ga.json", help="Path to items catalog JSON")
        parser.add_argument("--store-tag", default="kroger", help="Saved to Price.store")

    def handle(self, *args, **opts):
        endpoint = opts["endpoint"]
        zip_code = opts["zip"]
        catalog_path = Path(opts["catalog"])
        store_tag = opts["store_tag"]

        self.stdout.write(f"Fetching: {endpoint}")
        r = httpx.get(endpoint, headers={"User-Agent":"Mozilla/5.0"})
        r.raise_for_status()
        data = r.json()

        candidates = flatten_items(data)
        self.stdout.write(f"Scanned {len(candidates)} nodes for items")

        catalog = load_catalog(catalog_path)

        today = date.today()
        saved, misses = 0, []

        with transaction.atomic():
            for spec in catalog:
                name = spec["name"]
                match_any = spec.get("match_any", [])
                must_have = spec.get("must_have", [])
                unit_size_std = spec.get("unit_size_std", None)

                match = match_price = match_src_name = None
                for it in candidates:
                    n = extract_name(it)
                    if not n: continue
                    if match_any and not text_has_any(n, match_any): continue
                    if must_have and not text_has_all(n, must_have): continue
                    price_str = extract_price_str(it)
                    price_val = parse_price(price_str) if price_str else None
                    if price_val is None: continue
                    match = it; match_price = price_val; match_src_name = n
                    break

                if match is None:
                    misses.append(name); continue

                item, _ = Item.objects.get_or_create(
                    name=name,
                    defaults=dict(
                        brand=spec.get("brand",""),
                        category=spec.get("category",""),
                        unit=spec.get("unit",""),
                        unit_size_std=unit_size_std,
                        upc=spec.get("upc",""),
                        store_item_id=f"kroger_ad_{to_lc(name).replace(' ','_')}"
                    )
                )

                Price.objects.create(
                    item=item,
                    store=store_tag,
                    zip=zip_code,
                    date=today,
                    price=match_price,
                    unit_size_observed=unit_size_std or 0,
                    url=endpoint,
                    status="ok",
                )
                saved += 1

        self.stdout.write(self.style.SUCCESS(f"Saved {saved} prices for {today} (store={store_tag}, zip={zip_code})"))
        if misses:
            self.stdout.write(self.style.WARNING("No match for: " + ", ".join(misses)))
