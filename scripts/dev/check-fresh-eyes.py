# -*- coding: utf-8 -*-
"""Fresh-eyes fixes (approved 4 Nov 2026) in a real browser: the Home "Where you are" card follows the stages before
the steps (A1), and "When a parcel arrives" shows only the tests for parts ticked bought, in stage order, with the new
threadlocker test (A2). Needs Python Playwright with Chromium (used on this laptop).

    python scripts/dev/check-fresh-eyes.py

Serves the repo on 127.0.0.1:8813 with Python's own static server and drives 1280 px and 390 px pages. The Buy-page
ticks are set the way the page stores them (localStorage), never typed by hand. Exit 1 on any failure."""
import json, os, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = 8813
URL = "http://127.0.0.1:%d/index.html" % PORT
SHOTS = tempfile.mkdtemp(prefix="ga-fresh-eyes-")
STORE = "shad-drone-guide-v1"
fails = []
# the page has characters such as ⚙ that a cp1252 console cannot print: always write UTF-8 (2026-11-04: this
# crashed check 10 in a shell whose stdout was cp1252, and the suite stopped at 9 of 18)
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (("  [" + str(info)[:200] + "]") if info != "" else ""))
    if not ok:
        fails.append(name)


srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(40):
        try:
            urllib.request.urlopen(URL, timeout=2); break
        except Exception:
            time.sleep(0.25)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        errs = []

        def page_with(owned, ticks=None, width=1280):
            ctx = b.new_context(viewport={"width": width, "height": 900})
            ctx.add_init_script("localStorage.setItem(%s, %s)" % (json.dumps(STORE), json.dumps(json.dumps({"owned": owned, "ticks": ticks or {}}))))
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errs.append(e.message))
            pg.goto(URL)
            pg.wait_for_function("document.getElementById('here-step') && !/Loading/.test(document.getElementById('here-step').textContent)", timeout=15000)
            return ctx, pg

        here = lambda pg: pg.evaluate("[document.getElementById('here-step').textContent, document.getElementById('here-go').textContent, document.getElementById('here-go').hidden]")
        ctx, pg = page_with({})
        buy = pg.evaluate("JSON.parse(document.getElementById('buy-data').textContent)")
        ids = lambda *st: {l["id"]: True for l in buy["lines"] if int(l["stage"]) in st}
        h0 = here(pg)
        check("Home, nothing bought: points to buying Stage 1, not to Step 1",
              h0[0].startswith("Next: Stage 1 · Workshop and safety") and h0[1] == "Go to Stage 1" and "Step 1" not in h0[0], h0)
        ctx.close()

        ctx, pg = page_with({**ids(1), **ids(3)})          # this week: the Stage 1 and Stage 3 parcels
        h1 = here(pg)
        check("Home, Stages 1 and 3 bought: \"Next: Stage 1 practice\", not \"Step 1 · Lay out all the parts\"",
              h1[0] == "Next: Stage 1 practice · Workshop and safety" and h1[1] == "Go to Stage 1", h1)
        pg.screenshot(path=os.path.join(SHOTS, "home-stage-1280.png"))
        pg.click("#here-go"); pg.wait_for_timeout(400)
        on = pg.evaluate("(()=>{const l=document.querySelector('[data-stage-list=\"1\"]'); const r=l.getBoundingClientRect(); return [!document.getElementById('p-parts').hidden, r.top < innerHeight && r.bottom > 0]})()")
        check("Home: Go to Stage 1 opens the Buy page at Stage 1", on[0] and on[1], on)
        pg.evaluate("(()=>{const c=document.querySelector('input[data-key=\"stg-1-done\"]'); c.click();})()"); pg.wait_for_timeout(200)
        h2 = here(pg)
        check("Home: ticking Stage 1 practice done moves the card on to Stage 3, at once", h2[0] == "Next: Stage 3 practice · Radio", h2)
        pg.evaluate("(()=>{const c=document.querySelector('input[data-key=\"stg-3-done\"]'); c.click();})()"); pg.wait_for_timeout(200)
        h3 = here(pg)
        check("Home: with the practice done, it says what still has to be bought before the steps", "Step 2 needs the frame and motors" in h3[0] and h3[0].startswith("Next: buy the rest of Stage"), h3)

        # the arrival list, Stages 1 and 3 bought
        # open the card the way the page's own links do (a data-open-arrival link with no test named keeps the filters)
        pg.evaluate("(()=>{const a=document.createElement('a'); a.href='#arrival-card'; a.setAttribute('data-open-arrival',''); a.textContent='x'; document.body.appendChild(a); a.click();})()")
        pg.wait_for_function("document.getElementById('arr-shop').getBoundingClientRect().height > 0", timeout=5000)
        pg.select_option("#arr-shop", "Rotor Village"); pg.wait_for_timeout(200)
        rv = pg.evaluate("[...document.querySelectorAll('#arr-groups .arr-row')].map(r => r.getAttribute('data-arr-item'))")
        allA = pg.evaluate("JSON.parse(document.getElementById('arrival-data').textContent)")
        owned = {**ids(1), **ids(3)}
        want = [a["item"] for a in allA if "Rotor Village" in a["shops"] and all(owned.get(n) for n in a["needs"])]
        check("parcels: Rotor Village shows only the tests for parts ticked bought (no frame, stack or pack tests)",
              sorted(rv) == sorted(want) and len(rv) >= 4 and "Frame" not in rv and "Stack" not in rv and "Packs and charger" not in rv, rv)
        pg.screenshot(path=os.path.join(SHOTS, "arrival-filter-1280.png"))
        pg.select_option("#arr-shop", "Canadian Tire"); pg.wait_for_timeout(200)
        ct = pg.evaluate("[...document.querySelectorAll('#arr-groups .arr-row')].map(r => r.getAttribute('data-arr-item'))")
        check("parcels: Canadian Tire shows the new threadlocker test and not the Stage 4 foam-tape tests", ct == ["Threadlocker"], ct)
        stages = [a["stage"] for a in allA]
        check("parcels: every test says what it needs, in stage order (%d tests)" % len(allA), len(allA) >= 31 and stages == sorted(stages) and all(a.get("needs") for a in allA), len(allA))
        pg.select_option("#arr-shop", ""); pg.uncheck("#arr-bought"); pg.wait_for_timeout(200)
        n_all = pg.evaluate("document.querySelectorAll('#arr-groups .arr-row').length")
        check("parcels: switching \"Only parts I have ticked bought\" off shows every test", n_all == len(allA), [n_all, len(allA)])
        pg.check("#arr-bought"); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{const a=document.createElement('a'); a.href='#arrival-card'; a.setAttribute('data-open-arrival',''); a.setAttribute('data-arrival-test','Frame'); a.textContent='x'; document.body.appendChild(a); a.click();})()")
        pg.wait_for_timeout(400)
        fr = pg.evaluate("[!!document.querySelector('#arr-groups .arr-row[data-arr-item=\"Frame\"]'), document.getElementById('arr-bought').checked]")
        check("parcels: a link to a test for a part not bought yet still shows it (the filter switches off)", fr[0] and fr[1] is False, fr)
        ctx.close()

        ctx, pg = page_with({**ids(1), **ids(2), **ids(3), **ids(4)}, {"stg-1-done": True, "stg-2-done": True, "stg-3-done": True})
        h4 = here(pg)
        check("Home, Stages 1 to 4 bought: now it points to Step 1", h4[0].startswith("Next: Step 1 ·") and h4[1] == "Go to this step", h4)
        ctx.close()

        ctx, pg = page_with({**ids(1), **ids(3)}, width=390)
        h5 = here(pg)
        nox = pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        pg.screenshot(path=os.path.join(SHOTS, "home-stage-390.png"))
        check("phone: the same Stage 1 practice card, nothing sticks out sideways", h5[0] == "Next: Stage 1 practice · Workshop and safety" and nox, h5)
        ctx.close()
        check("no page errors", not errs, errs[:3])
        b.close()
except Exception as e:
    # an error must name itself in the gate's summary, not just leave the count short (2026-11-04)
    import traceback
    traceback.print_exc()
    check("the browser run finished without an error", False, "%s: %s" % (type(e).__name__, str(e)[:300]))
finally:
    srv.terminate()
print("screenshots in", SHOTS)
print("%d failed" % len(fails))
sys.exit(1 if fails else 0)
