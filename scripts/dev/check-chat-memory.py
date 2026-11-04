# -*- coding: utf-8 -*-
"""Job 8 (2026-11-03) in a real browser: the chat's status line, memory view, pairing a phone, synced ticks,
"More detail", where questions go, the monthly cap. Needs Python Playwright with Chromium (used on this laptop).

    python scripts/dev/check-chat-memory.py

Starts the real server on 8808 (temp folders; a phone listener on 127.0.0.2 stands in for the home network)
and a fake AI on 8809, then drives a laptop page (1280 px) and a phone page (390 px). Screenshots go to
the system temp folder. Exit 1 on any failure."""
import json, os, re, subprocess, sys, tempfile, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TMP = tempfile.mkdtemp(prefix="ga-chatmem-")
PORT, AI, PHONE = 8808, 8809, "127.0.0.2"
LAPTOP_URL = "http://127.0.0.1:%d/index.html#ga-open" % PORT
PHONE_URL = "http://%s:%d/index.html#ga-open" % (PHONE, PORT)
fails = []
# the page has characters such as ⚙ that a cp1252 console cannot print: always write UTF-8 (2026-11-04: this
# crashed check 10 in a shell whose stdout was cp1252, and the suite stopped at 9 of 18)
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (("  [" + str(info)[:200] + "]") if info != "" else ""))
    if not ok:
        fails.append(name)


class FakeAI(BaseHTTPRequestHandler):
    calls = 0
    empty_calls = 0
    where = ""

    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0)) or 0) or b"{}")
        user = ([m for m in body.get("messages", []) if m.get("role") == "user"] or [{}])[-1].get("content", "")
        FakeAI.calls += 1
        q = (re.search(r"USER QUESTION: (.*)$", user, re.M) or [None, ""])[1]
        FakeAI.where = (re.search(r"WHERE SHAD IS IN THE BUILD:\n(.*)", user) or [None, ""])[1]
        step = (re.search(r"WHERE SHAD IS IN THE BUILD:\nStep (\d)", user) or [None, "?"])[1]
        text = "At step %s, fit the part with the arrow facing forward." % step
        chunks = None
        if re.search(r"arrived", q, re.I):
            text = "Good: charge them first at 1.0 A.\n[[REMEMBER The 4S flight packs arrived]]"
        if q.startswith("More detail"):
            text = "In more detail, for step %s: first check the order of the motors, then the arrow." % step
        if "EMPTYCHECK" in q:      # a model that spends its whole budget thinking: no text the first time
            FakeAI.empty_calls += 1
            if FakeAI.empty_calls == 1:
                chunks = [{"choices": [{"index": 0, "delta": {"reasoning": "thinking " * 200}}]},
                          {"choices": [{"index": 0, "delta": {}, "finish_reason": "length"}]}]
            text = "Answer after a second try: start with the practice board."
        if re.search(r"suggest I buy", q):    # an answer with a price and no checked date: the five bans block it
            text = "Buy the RadioMaster Pocket radio for CA$99.99 and the tool kit for CA$103.99."
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.end_headers()
        for o in (chunks or [{"choices": [{"index": 0, "delta": {"content": text}}]}]) + \
                [{"choices": [], "usage": {"prompt_tokens": 1500, "completion_tokens": 120}}]:
            self.wfile.write(("data: " + json.dumps(o) + "\n\n").encode())
        self.wfile.write(b"data: [DONE]\n\n")


def up(url):
    try:
        urllib.request.urlopen(url, timeout=2)
        return True
    except Exception:
        return False


ai = ThreadingHTTPServer(("127.0.0.1", AI), FakeAI)
threading.Thread(target=ai.serve_forever, daemon=True).start()
mem_dir = os.path.join(TMP, "memory")
env = dict(os.environ, PORT=str(PORT), GA_TEST="1", PHONE_BIND=PHONE, MEMORY_DIR=mem_dir,
           SETTINGS_FILE=os.path.join(TMP, "settings.json"), CONVERSATIONS_DIR=os.path.join(TMP, "conv"),
           BASE_URL="http://127.0.0.1:%d/v1" % AI, PROVIDER="openai", MODEL="mock-model", CHEAP_MODEL="mock-model",
           STRONG_MODEL="mock-model", API_KEY="", DAILY_USD_MAX="0")
srv = subprocess.Popen(["node", "server/assistant-server.js"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        if up("http://127.0.0.1:%d/api/health" % PORT):
            break
        time.sleep(0.25)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        errs = []
        lp = b.new_page(viewport={"width": 1280, "height": 900})
        lp.on("pageerror", lambda e: errs.append("laptop: " + e.message))
        lp.goto(LAPTOP_URL)
        lp.wait_for_function("document.getElementById('ga-status') && !document.getElementById('ga-status').hidden", timeout=15000)

        # 4 Nov 2026, Shad's chat. Nothing bought yet: the chat says where the Home card says (a stage, not Step 1).
        st0 = lp.evaluate("document.getElementById('ga-status').textContent")
        lp.evaluate("GuideAssistant.ask('How do I start the practice board?').then(()=>true)")
        lp.wait_for_function("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText.includes('arrow')", timeout=15000)
        check("stage: with nothing bought, the chat and the AI's context say Stage 1 practice, as the Home card does",
              st0.startswith("Stage 1") and FakeAI.where.startswith("Stage 1"), st0 + " | " + FakeAI.where)
        src = lp.evaluate("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText")
        check("an AI answer says it is one: its source names the model, not 'Retrieved from this guide'",
              "AI answer (mock-model)" in src and "Retrieved from this guide" not in src, src[-120:])
        def last_card():
            return lp.evaluate("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText")
        n0 = FakeAI.calls
        lp.evaluate("GuideAssistant.ask('Hi').then(()=>true)"); time.sleep(0.3)
        hi = last_card()
        check("greeting: 'Hi' gets one short reply with where you are, no welcome card and no AI call",
              hi.strip().startswith("Hi") and "You are at Stage 1" in hi and "Ask me about this build" not in hi and FakeAI.calls == n0, hi[:140])
        lp.evaluate("GuideAssistant.ask('What model are you running?').then(()=>true)"); time.sleep(0.3)
        mo = last_card()
        check("model: 'What model are you running?' is answered from the settings (the model, never a key)",
              "mock-model" in mo and "Settings" in mo and FakeAI.calls == n0, mo[:160])
        lp.evaluate("GuideAssistant.ask('EMPTYCHECK what goes first on the bench?').then(()=>true)")
        lp.wait_for_function("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText.includes('second try')", timeout=15000)
        check("empty: an answer that came back empty (all thinking) is asked once more, and that answer shows",
              FakeAI.empty_calls == 2, "empty-test calls: %d" % FakeAI.empty_calls)
        lp.evaluate("GuideAssistant.ask('If I had to buy stuff today, what would you suggest I buy?').then(()=>true)")
        lp.wait_for_function("[...document.querySelectorAll('#ga-log .ga-card')].some(c => c.innerText.includes('broke one of the five bans'))", timeout=15000)
        check("bans: an AI buying answer with an undated price is blocked, then the guide's own Buy-today answer follows",
              "Buy" in last_card(), last_card()[:160])

        # from here on he has bought Stages 1 to 4, so the chat is at a build step, as the Home card would be
        lp.evaluate("""() => { const s = JSON.parse(localStorage.getItem('shad-drone-guide-v1') || '{}');
          const lines = JSON.parse(document.getElementById('buy-data').textContent).lines;
          s.owned = s.owned || {}; lines.filter(l => l.stage >= 1 && l.stage <= 4).forEach(l => { s.owned[l.id] = true; });
          localStorage.setItem('shad-drone-guide-v1', JSON.stringify(s)); }""")
        lp.reload()
        lp.wait_for_function("document.getElementById('ga-status') && !document.getElementById('ga-status').hidden && /^Step/.test(document.getElementById('ga-status').textContent)", timeout=15000)
        st = lp.evaluate("document.getElementById('ga-status').textContent")
        check("laptop: the chat shows the step, the model and the month's spend against the cap",
              re.match(r"^Step \d · AI on \(mock-model\) · US\$0\.00 of US\$2\.00 this month$", st) is not None, st)

        # a real typed question that it should remember
        lp.fill("#ga-input", "My batteries arrived today")
        lp.press("#ga-input", "Enter")
        lp.wait_for_function("document.querySelectorAll('.ga-remembered').length > 0", timeout=15000)
        card = lp.evaluate("(()=>{const c=[...document.querySelectorAll('#ga-log .ga-card')].pop(); return [c.innerText, !!c.querySelector('.ga-more')]})()")
        check("laptop: the answer hides the [[REMEMBER]] line, shows 'Remembered: ...' with Forget, and offers More detail",
              "REMEMBER" not in card[0] and "Remembered: The 4S flight packs arrived" in card[0] and "Forget" in card[0] and card[1], card[0][:160])
        lp.evaluate("[...document.querySelectorAll('#ga-log .ga-more')].pop().click()")
        lp.wait_for_function("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText.includes('In more detail')", timeout=15000)
        check("laptop: More detail asks again for a longer answer about the same step", True)
        lp.click("#ga-memory-btn")
        lp.wait_for_function("document.querySelectorAll('#ga-memory-list li').length > 0", timeout=10000)
        items = lp.evaluate("[...document.querySelectorAll('#ga-memory-list li')].map(li => li.innerText)")
        check("laptop: What I remember lists the fact, where it was told, with Delete",
              len(items) == 1 and "The 4S flight packs arrived" in items[0] and "told on the laptop" in items[0] and "Delete" in items[0], items)
        lp.screenshot(path=os.path.join(TMP, "memory-1280.png"))
        lp.click("#ga-memory-list li .ga-link")
        lp.wait_for_function("document.querySelector('#ga-memory-list li') && document.querySelector('#ga-memory-list li').innerText.startsWith('Nothing yet')", timeout=10000)
        check("laptop: Delete removes it from the laptop's memory", json.loads(urllib.request.urlopen("http://127.0.0.1:%d/api/memory" % PORT).read())["facts"] == [])
        lp.click("#ga-memory-btn")

        # settings: where questions go, the monthly cap, phone access, pairing code
        lp.click("#ga-settings-btn")
        lp.wait_for_function("document.getElementById('ga-month-cap') && document.getElementById('ga-month-cap').value !== ''", timeout=10000)
        where = lp.evaluate("document.getElementById('ga-sends-to').textContent")
        check("settings: says plainly where questions go", "on this laptop" in where or "Where your questions go" in where, where)
        lp.fill("#ga-month-cap", "5")
        lp.click("#ga-month-save")
        lp.wait_for_function("document.getElementById('ga-month-msg').textContent.startsWith('Saved')", timeout=10000)
        check("settings: the monthly budget saves on the laptop's server", lp.evaluate("document.getElementById('ga-month-msg').textContent").startswith("Saved: US$5.00 a month"))
        lp.click("#ga-phone-toggle")
        lp.wait_for_function("document.getElementById('ga-phone-toggle').textContent === 'Phone access: on'", timeout=10000)
        info = lp.evaluate("document.getElementById('ga-phone-info').textContent")
        check("settings: Phone access on gives the address to open on the phone and says to use home Wi-Fi only",
              ("http://%s:%d/" % (PHONE, PORT)) in info and "home Wi-Fi" in info and "click Allow" in info, info)
        lp.click("#ga-pair-start")
        lp.wait_for_function("/^\\d{6}$/.test(document.getElementById('ga-pair-codeshow').textContent)", timeout=10000)
        code = lp.evaluate("document.getElementById('ga-pair-codeshow').textContent")
        lp.screenshot(path=os.path.join(TMP, "settings-1280.png"))
        check("settings: Pair a phone shows a 6-digit code", re.match(r"^\d{6}$", code) is not None, code)
        lp.click("#ga-settings-btn")

        # the phone
        pc = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        pp = pc.new_page()
        pp.on("pageerror", lambda e: errs.append("phone: " + e.message))
        pp.goto(PHONE_URL)
        pp.wait_for_function("document.getElementById('ga-pair') && !document.getElementById('ga-pair').hidden", timeout=15000)
        note = pp.evaluate("document.getElementById('ga-offline-note').textContent")
        pp.screenshot(path=os.path.join(TMP, "phone-pair-390.png"))
        check("phone, not paired: the chat says so and shows the code box", "not paired" in note, note[:120])
        pp.fill("#ga-pair-code", code)
        pp.click("#ga-pair-go")
        pp.wait_for_function("document.getElementById('ga-status') && !document.getElementById('ga-status').hidden", timeout=15000)
        check("phone: the laptop's code pairs it, and the AI turns on", pp.evaluate("document.getElementById('ga-pair').hidden")
              and pp.evaluate("!!localStorage.getItem('ga-device-token')"))

        # ticks: laptop -> phone
        lp.evaluate("(()=>{const b=document.querySelector('input[type=checkbox][data-asm=\"1\"]'); b.checked=true; b.dispatchEvent(new Event('change',{bubbles:true}));})()")
        lp.evaluate("GuideAssistant.syncProgress()")
        time.sleep(0.5)
        pp.evaluate("GuideAssistant.syncProgress()")
        pp.wait_for_function("document.querySelector('input[type=checkbox][data-asm=\"1\"]').checked === true", timeout=10000)
        check("ticks: step 1 ticked on the laptop shows as ticked on the phone", True)
        stp = pp.evaluate("document.getElementById('ga-status').textContent")
        check("phone: the status line moves on to step 2 after step 1 is ticked", stp.startswith("Step 2"), stp)

        # bought: laptop -> phone (the Buy page's "I bought" boxes ride the same store, as own:<line id>)
        lp.evaluate("(()=>{const b=document.querySelector('input[type=checkbox][data-own=\"radio\"]'); b.checked=true; b.dispatchEvent(new Event('change',{bubbles:true}));})()")
        lp.evaluate("GuideAssistant.syncProgress()")
        time.sleep(0.5)
        stored = json.load(open(os.path.join(mem_dir, "progress.json"), encoding="utf-8")).get("ticks", {})
        check("bought: a part ticked bought on the laptop is kept in the laptop's store as own:radio",
              (stored.get("own:radio") or {}).get("v") is True, json.dumps(stored.get("own:radio")))
        pp.evaluate("GuideAssistant.syncProgress()")
        pp.wait_for_function("document.querySelector('input[type=checkbox][data-own=\"radio\"]').checked === true", timeout=10000)
        check("bought: the same part shows as bought on the phone", True)

        # Shad's browser, 4 Nov 2026: an older assistant.js from the offline cache had filed own:<id> under the step ticks
        # and noted their times, so the newer code skipped them and the Buy page showed nothing bought. A returning
        # browser holding exactly those leftovers must show the part as bought after one ordinary reload.
        own_at = stored["own:radio"]["at"]
        rc = b.new_context(viewport={"width": 1280, "height": 900})
        rp = rc.new_page(); rp.on("pageerror", lambda e: errs.append("returning: " + e.message))
        rp.goto(LAPTOP_URL); rp.wait_for_function("window.GuideAssistant && GuideAssistant.syncProgress", timeout=15000)
        rp.evaluate("""(at) => { const s = JSON.parse(localStorage.getItem('shad-drone-guide-v1') || '{}');
          s.ticks = Object.assign({}, s.ticks, { 'own:radio': true }); s.owned = {};
          localStorage.setItem('shad-drone-guide-v1', JSON.stringify(s));
          localStorage.setItem('ga-progress-at', JSON.stringify({ 'own:radio': at })); }""", own_at)
        rp.reload(); rp.wait_for_function("document.querySelector('input[type=checkbox][data-own=\"radio\"]') && document.querySelector('input[type=checkbox][data-own=\"radio\"]').checked === true", timeout=15000)
        left = rp.evaluate("Object.keys(JSON.parse(localStorage.getItem('shad-drone-guide-v1')).ticks).filter(k => k.startsWith('own:')).length")
        check("bought: a returning browser with the old code's leftovers shows the part as bought after one reload", left == 0, "own: keys left in ticks: %d" % left)
        rc.close()
        sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
        page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
        cache = re.search(r'const CACHE = "([^"]+)"', sw).group(1)
        check("the page asks for assistant.js with the service worker's cache name, so a page and its script always come together",
              ('src="docs/js/assistant.js?v=%s"' % cache) in page, cache)
        pp.evaluate("GuideAssistant.ask('The batteries arrived').then(()=>true)")
        pp.wait_for_function("document.querySelectorAll('.ga-remembered').length > 0", timeout=15000)
        pp.screenshot(path=os.path.join(TMP, "phone-answer-390.png"))
        facts = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/api/memory" % PORT).read())["facts"]
        check("phone: a question asked on the phone is remembered on the laptop, marked as told on the phone",
              any(f["from"] == "phone" and "packs arrived" in f["text"] for f in facts), facts)
        nox = pp.evaluate("document.documentElement.scrollWidth <= innerWidth")
        check("phone: nothing sticks out sideways", nox)

        # remove the phone on the laptop: its next request asks to pair again
        devs = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/api/phone" % PORT).read())["devices"]
        req = urllib.request.Request("http://127.0.0.1:%d/api/devices/%s" % (PORT, devs[0]["id"]), method="DELETE")
        urllib.request.urlopen(req)
        pp.evaluate("GuideAssistant.ask('How do I fit the stack now?').then(()=>true)")
        pp.wait_for_function("!document.getElementById('ga-pair').hidden", timeout=15000)
        check("devices: a removed phone is asked to pair again", True)

        # the monthly cap, said plainly in the chat
        month = json.loads(urllib.request.urlopen("http://127.0.0.1:%d/api/health" % PORT).read())["month"]["month"]
        with open(os.path.join(mem_dir, "spend.json"), "w") as fh:
            json.dump({"month": month, "usd": 5.0}, fh)
        before = FakeAI.calls
        lp.evaluate("GuideAssistant.ask('Is the budget spent now?').then(()=>true)")
        lp.wait_for_function("[...document.querySelectorAll('#ga-log .ga-card')].pop().innerText.includes(\"This month's AI budget is spent\")", timeout=15000)
        check("monthly cap: at the cap the chat says plainly that this month's AI budget is spent, and the AI is not called",
              FakeAI.calls == before)
        check("no page errors on the laptop or the phone", not errs, errs[:3])
        b.close()
except Exception as e:
    # an error must name itself in the gate's summary, not just leave the count short (2026-11-04)
    import traceback
    traceback.print_exc()
    check("the browser run finished without an error", False, "%s: %s" % (type(e).__name__, str(e)[:300]))
finally:
    srv.terminate()
    ai.shutdown()
print("screenshots in", TMP)
print("%d failed" % len(fails))
sys.exit(1 if fails else 0)
