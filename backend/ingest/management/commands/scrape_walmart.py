import asyncio, json, re, random
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from playwright.async_api import async_playwright, TimeoutError

from core.models import Item, Price

PRODUCT_URL = "https://www.walmart.com/ip/Great-Value-Large-White-Eggs-12-Count/145051970"
PRODUCT_STORE_ID = "145051970"
PRODUCT_CANONICAL = {"name": "Great Value Large White Eggs 12ct", "brand": "Great Value"}

PRICE_RX = re.compile(r"\$([\d,]+\.\d{2})", re.M)

def _norm(s: str | None) -> str:
    return (s or "").strip()

COMMON_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

async def new_context_for_zip(browser, state_file: Path | None):
    ctx = await browser.new_context(
        storage_state=str(state_file) if (state_file and state_file.exists()) else None,
        user_agent=COMMON_UA,
        locale="en-US",
        viewport={"width": 1366, "height": 768},
        timezone_id="America/New_York",
    )
    await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
    return ctx

async def is_bot_wall(page) -> bool:
    try:
        title = (await page.title()).lower()
        if "robot or human" in title or "are you human" in title:
            return True
        body = ((await page.text_content("body")) or "").lower()
        return ("robot or human" in body) or ("are you human" in body)
    except:
        return False

async def set_zip(page, zip_code: str):
    btn_selector = (
        "button[aria-label*='location'], button[aria-label*='ZIP'], "
        "button[aria-label*='delivery'], button[aria-label*='store']"
    )
    try:
        await page.click(btn_selector, timeout=4000)
    except TimeoutError:
        await page.evaluate("window.scrollTo(0,0)")
        try:
            await page.click(btn_selector, timeout=4000)
        except TimeoutError:
            return  # maybe already set

    try:
        zip_input = await page.wait_for_selector(
            "input[name='postalCode'], input[aria-label='Enter ZIP code'], input[id*='postal']",
            timeout=5000
        )
        await zip_input.fill(zip_code)
        await zip_input.press("Enter")
        try:
            await page.click("button:has-text('Set store')", timeout=5000)
        except TimeoutError:
            pass
        await page.wait_for_timeout(1500)
    except TimeoutError:
        pass

async def extract_identity(page) -> dict:
    for s in await page.query_selector_all("script[type='application/ld+json']"):
        try:
            data = json.loads(await s.inner_text())
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for d in items:
            brand = d.get("brand", {})
            if isinstance(brand, dict):
                brand = brand.get("name")
            name = d.get("name")
            if brand or name:
                size_hint = None
                if name:
                    m = re.search(r"\b(\d+\s*Count|\d+\s*ct)\b", name, re.I)
                    size_hint = m.group(1) if m else None
                return {"brand": _norm(brand), "name": _norm(name), "size_hint": _norm(size_hint)}
    title = await page.title()
    m = re.search(r"\b(\d+\s*Count|\d+\s*ct)\b", title, re.I)
    return {"brand": "", "name": _norm(title), "size_hint": _norm(m.group(1) if m else "")}

def identity_ok(seen: dict) -> bool:
    if seen.get("brand") and PRODUCT_CANONICAL["brand"].lower() != seen["brand"].lower():
        return False
    size = (seen.get("size_hint") or "").lower()
    name = (seen.get("name") or "").lower()
    has_12 = ("12" in size) or ("12 count" in name) or ("12 ct" in name)
    has_count_word = ("count" in size) or (" ct" in size) or ("12 count" in name) or ("12 ct" in name)
    return has_12 and has_count_word

async def extract_price(page) -> float | None:
    selectors = [
        "span[itemprop='price']",
        "span[data-automation-id*='price']",
        "div[data-automation-id*='price'] span",
        "span[class*='price']",
    ]
    for sel in selectors:
        el = await page.query_selector(sel)
        if el:
            txt = (await el.inner_text()).strip()
            m = PRICE_RX.search(txt)
            if m:
                return float(m.group(1).replace(",", ""))
    html = await page.content()
    m = PRICE_RX.search(html)
    return float(m.group(1).replace(",", "")) if m else None

async def scrape_one_zip(zip_code: str, url: str, item: Item) -> dict:
    state_file = Path(f".state_zip_{zip_code}.json")
    # headful only the first time so you can pass any challenge + set ZIP
    headless = state_file.exists()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        ctx = await new_context_for_zip(browser, state_file)
        page = await ctx.new_page()

        try:
            # 1) Go to homepage first and set ZIP there (stickier + fewer bot checks)
            await page.goto("https://www.walmart.com/", timeout=35000, wait_until="domcontentloaded")

            if not state_file.exists():
                # If bot wall, solve it once manually
                if await is_bot_wall(page):
                    print(f"\n[{zip_code}] Bot check detected on homepage. Solve it in the browser, then press ENTER here...")
                    input()

                # Ask you to set ZIP if needed (we also try programmatically)
                print(f"[{zip_code}] Set ZIP/store to {zip_code} in the site UI if needed, then press ENTER...")
                try:
                    await set_zip(page, zip_code)
                except Exception:
                    pass
                input()

                # Save state for this ZIP so later runs can be headless
                await ctx.storage_state(path=str(state_file))
                print(f"[{zip_code}] Saved state to {state_file.name}")

            # 2) Now go to the specific product URL
            await page.goto(url, timeout=35000, wait_until="domcontentloaded")

            # If a challenge popped up again, bail cleanly (state may need redoing)
            if await is_bot_wall(page):
                return {"zip": zip_code, "price": None, "status": "captcha", "ident": {"name": "bot wall"}}

            # small human-ish pause
            await page.wait_for_timeout(800 + int(random.random() * 600))

            ident = await extract_identity(page)
            ok_ident = identity_ok(ident)
            price = await extract_price(page) if ok_ident else None

            status = "ok" if (ok_ident and price is not None) else ("mismatch" if not ok_ident else "missing")
            return {"zip": zip_code, "price": price, "status": status, "ident": ident}

        except Exception as e:
            try:
                shot = f"error_{zip_code}.png"
                await page.screenshot(path=shot, full_page=True)
                print(f"[{zip_code}] ERROR: {e}\nScreenshot saved: {shot}")
            except Exception:
                print(f"[{zip_code}] ERROR: {e} (screenshot failed)")
            return {"zip": zip_code, "price": None, "status": "error", "ident": {}, "error": str(e)}
        finally:
            await ctx.close(); await browser.close()

class Command(BaseCommand):
    help = "Scrape Walmart eggs 12ct across ZIPs and save to Price"

    def add_arguments(self, parser):
        parser.add_argument("--zips", default="30328,30309,30332")
        parser.add_argument("--url", default=PRODUCT_URL)

    def handle(self, *args, **opts):
        zips = [z.strip() for z in opts["zips"].split(",") if z.strip()]
        url = opts["url"]

        item, _ = Item.objects.get_or_create(
            store_item_id=PRODUCT_STORE_ID,
            defaults=dict(
                name=PRODUCT_CANONICAL["name"],
                brand=PRODUCT_CANONICAL["brand"],
                category="eggs",
                unit="ct",
                unit_size_std=12,
                upc=""
            )
        )

        async def runner():
            out = []
            for z in zips:
                res = await scrape_one_zip(z, url, item)
                out.append(res)
                await asyncio.sleep(0.8 + random.random() * 0.7)
            return out

        results = asyncio.run(runner())

        today = date.today()
        with transaction.atomic():
            for r in results:
                Price.objects.create(
                    item=item,
                    store="walmart",
                    zip=r["zip"],
                    date=today,
                    price=(r["price"] or 0),
                    unit_size_observed=item.unit_size_std or 12,
                    url=url,
                    status=r["status"],
                )

        ok_count = sum(1 for r in results if r["status"] == "ok")
        self.stdout.write(self.style.SUCCESS(f"Saved {len(results)} rows for {today} ({ok_count} ok)"))
        for r in results:
            extra = f" | error={r.get('error')}" if r.get("status") in ("error","captcha") and r.get("error") else ""
            self.stdout.write(f"{r['zip']}: status={r['status']} price={r['price']} ident={r.get('ident')}{extra}")
