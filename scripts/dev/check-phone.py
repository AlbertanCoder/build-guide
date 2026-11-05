# -*- coding: utf-8 -*-
"""The phone pass (job 11, approved 4 Nov 2026) in a real browser: a phone (up to 600 px wide) gets simpler defaults
and the laptop keeps everything. Needs Python Playwright with Chromium (used on this laptop).

    python scripts/dev/check-phone.py

Serves the repo on 127.0.0.1:8815 with Python's own static server and drives a 1280 px laptop page and a 390 px
phone page: the 3D views (one "More 3D options" button; the finished drone a picture until tapped), the step line,
the chat button, the stock chips, no sideways scroll, no zoom-in on text boxes, and the one-time "Copy my ticks to my
phone" link (tick ids only, after the #; the phone asks first). Ticks are set the way the page stores them
(localStorage), never typed by hand. Exit 1 on any failure."""
import base64, json, os, re, subprocess, sys, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = 8815
URL = "http://127.0.0.1:%d/index.html" % PORT
PUBLIC = "https://albertancoder.github.io/build-guide/"
SHOTS = tempfile.mkdtemp(prefix="ga-phone-")
STORE = "shad-drone-guide-v1"
ID = re.compile(r"^[a-z0-9][a-z0-9:_-]{0,48}$", re.I)
fails = []
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

OWNED = {"radio": True, "radio-cells": True, "tools": True, "lipo-bag": False}
TICKS = {"asm-1": True, "stg-1-done": True, "stg-3-done": False}


def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (("  [" + str(info)[:240] + "]") if info != "" else ""))
    if not ok:
        fails.append(name)


def unb64url(t):
    return base64.urlsafe_b64decode(t + "=" * (-len(t) % 4)).decode("utf-8")


def same_text(chat, page):
    """the chat's lines are the page's lines: whole, or cut at 320 characters ending in an ellipsis (assistant.js clip())."""
    if len(chat) != len(page) or not page:
        return False
    for c, p in zip(chat, page):
        c = " ".join(c.split())
        if c != p and not (len(p) > 320 and c.endswith("…") and p.startswith(c[:-1])):
            return False
    return True


def b64url(t):
    return base64.urlsafe_b64encode(t.encode("utf-8")).decode("ascii").rstrip("=")


# the visible step 3D view (not the finished drone at the top of Build)
STEP_VIEW = "[...document.querySelectorAll('#p-steps .viewer3d')].find(v => v.offsetParent !== null && v.getAttribute('data-title') !== 'The finished build' && v.classList.contains('is-ready'))"
TOP_VIEW = "document.querySelector('#p-steps .viewer3d[data-title=\"The finished build\"]')"
SHOWN = "(e => !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none')"

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

        def page_with(owned, ticks, width, public=False, hash_=""):
            phone = width <= 600
            ctx = b.new_context(viewport={"width": width, "height": 844 if phone else 900}, is_mobile=phone, has_touch=phone)
            ctx.add_init_script("if (/^http/.test(location.protocol) && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(%s, %s); }"
                                % (json.dumps(STORE), json.dumps(json.dumps({"owned": owned, "ticks": ticks}))))
            if public:
                ctx.add_init_script("window.GUIDE_FORCE_PUBLIC = true;")
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errs.append("%d px: %s" % (width, e.message)))
            pg.goto(URL + hash_)
            pg.wait_for_function("document.getElementById('here-step') && !/Loading/.test(document.getElementById('here-step').textContent)", timeout=15000)
            return ctx, pg

        def step_view(pg):
            pg.evaluate("[...document.querySelectorAll('#p-steps .viewer3d')].find(v => v.offsetParent !== null && v.getAttribute('data-title') !== 'The finished build').scrollIntoView({ block: 'center' })")
            pg.wait_for_function("!!(" + STEP_VIEW + ")", timeout=40000)

        def store(pg):
            s_ = pg.evaluate("JSON.parse(localStorage.getItem(%s) || '{}')" % json.dumps(STORE))
            return {"owned": {k: v for k, v in (s_.get("owned") or {}).items() if v}, "ticks": {k: v for k, v in (s_.get("ticks") or {}).items() if v}}

        # ---------------- the laptop (1280 px): nothing changes ----------------
        ctx, pg = page_with(OWNED, TICKS, 1280, hash_="#steps")
        pg.wait_for_function(TOP_VIEW + ".classList.contains('is-ready')", timeout=40000)
        step_view(pg); pg.wait_for_timeout(800)
        lap = pg.evaluate("""(() => { const S = %s, top = %s, v = %s;
          return { topModel: top.getAttribute('data-model'), topPoster: top.classList.contains('v3d-poster-on'), posterShown: S(top.querySelector('.v3d-poster')),
                   moreShown: [...document.querySelectorAll('.v3d-more')].some(S), more: document.querySelectorAll('.v3d-more').length,
                   play: S(v.querySelector('.viewer3d-anim > [data-anim="play"]')), range: S(v.querySelector('.viewer3d-anim > input[type="range"]')),
                   views: S(v.querySelector('.viewer3d-views')), bar: S(v.querySelector('.viewer3d-bar:not(.viewer3d-anim)')), chips: S(v.querySelector('.viewer3d-chips')) }; })()"""
                          % (SHOWN, TOP_VIEW, STEP_VIEW))
        check("laptop (1280 px): the 3D views keep every control (timeline, Focus, camera views, the bar); no 'More 3D options' button; the finished drone is a live 3D view",
              lap["topModel"] == "docs/models/final-product.glb" and not lap["topPoster"] and not lap["posterShown"] and not lap["moreShown"] and lap["more"] >= 2
              and lap["play"] and lap["range"] and lap["views"] and lap["bar"] and lap["chips"], lap)
        pg.screenshot(path=os.path.join(SHOTS, "laptop-build.png"))
        lap_hints = pg.evaluate("[...new Set([...document.querySelectorAll('.viewer3d-hint')].map(h => h.textContent.trim()))]")
        nav = pg.evaluate("""(() => { const n = [...document.querySelectorAll('#p-steps .asm-nav')].find(x => x.offsetParent !== null);
          const r = e => e.getBoundingClientRect(), a = r(n.querySelector('[data-asm-prev]')), c = r(n.querySelector('.asm-count')), z = r(n.querySelector('.asm-count').nextElementSibling);
          return { inRow: a.right <= c.left + 1 && c.right <= z.left + 1, sameLine: Math.abs((a.top + a.bottom) / 2 - (c.top + c.bottom) / 2) < 12 }; })()""")
        check("laptop: 'Step 1 of 8 ...' stays between Previous and Next, on one row", nav["inRow"] and nav["sameLine"], nav)
        ga = pg.evaluate("(() => { const s = getComputedStyle(document.getElementById('ga-root')), l = document.querySelector('.ga-launcher'); return { right: s.right, bottom: s.bottom, h: Math.round(l.getBoundingClientRect().height), words: getComputedStyle(document.querySelector('.ga-launcher-label')).display !== 'none' }; })()")
        check("laptop: the chat button stays where it was (18 px from the corner, with its words)", ga["right"] == "18px" and ga["bottom"] == "18px" and ga["words"], ga)
        foot = pg.evaluate("[getComputedStyle(document.querySelector('.sync-server')).display, document.querySelector('.sync-public').hidden, document.querySelector('footer') ? document.querySelector('footer').innerText : '']")
        check("laptop: the footer keeps its sentence about the guide server on the laptop", foot[0] != "none" and foot[1] is True and "guide server on your laptop" in foot[2], foot[:2])
        pg.goto(URL + "#parts"); pg.wait_for_timeout(600)
        chips = pg.evaluate("[...document.querySelectorAll('#stage-chips .stage-chip.is-blocked')].map(c => [getComputedStyle(c).opacity, c.textContent])")
        check("laptop: an out-of-stock stage chip looks as before (greyed, 'Out of stock')",
              len(chips) >= 1 and all(c[0] == "0.55" and "Out of stock" in c[1] for c in chips), chips)
        pg.click("#ticks-copy > summary"); pg.wait_for_timeout(300)
        link = pg.input_value("#ticks-copy-link")
        note = pg.text_content("#ticks-copy-note")
        data, ok_ids = None, False
        try:
            assert link.startswith(PUBLIC + "#ticks=") and "?" not in link
            data = json.loads(unb64url(link[len(PUBLIC + "#ticks="):]))
            ok_ids = (sorted(data) == ["o", "t"] and sorted(data["o"]) == sorted(k for k, v in OWNED.items() if v)
                      and sorted(data["t"]) == sorted(k for k, v in TICKS.items() if v) and all(ID.match(k) for k in data["o"] + data["t"]))
        except Exception as e:
            data = "not readable: %s" % e
        check("laptop: Buy has 'Copy my ticks to my phone'; the link is the public guide with only the ticked ids, after the # (never sent to a server)",
              ok_ids and "3 parts ticked bought and 2 other boxes ticked" in (note or ""), [link[:80], data, note])
        pg.screenshot(path=os.path.join(SHOTS, "laptop-copy-ticks.png"))
        ctx.close()

        # ---------------- the phone (390 px) ----------------
        ctx, pg = page_with(OWNED, TICKS, 390, hash_="#steps")
        pg.wait_for_timeout(1500)
        step_view(pg); pg.wait_for_timeout(2500)                           # time for any other view to start, if one were going to
        ph = pg.evaluate("""(() => { const S = %s, top = %s, btn = top.querySelector('.v3d-poster'), img = btn && btn.querySelector('img');
          const live = [...document.querySelectorAll('.viewer3d')].filter(v => v.querySelector('canvas'));
          return { model: top.getAttribute('data-model'), poster: top.classList.contains('v3d-poster-on'), shown: S(btn), img: !!img && img.complete && img.naturalWidth > 0,
                   topCanvas: !!top.querySelector('canvas'), live: live.length }; })()""" % (SHOWN, TOP_VIEW))
        check("phone (390 px): the finished drone at the top of Build is a picture until tapped, so one 3D view is live",
              ph["model"] is None and ph["poster"] and ph["shown"] and ph["img"] and not ph["topCanvas"] and ph["live"] == 1, ph)
        pg.screenshot(path=os.path.join(SHOTS, "phone-build-top.png"))
        V = "(" + STEP_VIEW + ")"
        state = lambda: pg.evaluate("""(() => { const S = %s, v = %s, m = v.querySelector('.v3d-more');
          return { canvas: S(v.querySelector('canvas')), chips: S(v.querySelector('.viewer3d-chips')) && v.querySelectorAll('.viewer3d-chips button').length > 0,
                   play: S(v.querySelector('.viewer3d-anim > [data-anim="play"]')), range: S(v.querySelector('.viewer3d-anim > input[type="range"]')),
                   time: S(v.querySelector('.viewer3d-anim > .viewer3d-time')), views: S(v.querySelector('.viewer3d-views')), tilt: S(v.querySelector('.viewer3d-tilt')),
                   bar: S(v.querySelector('.viewer3d-bar:not(.viewer3d-anim)')), more: S(m), moreText: m ? m.textContent : '', expanded: m ? m.getAttribute('aria-expanded') : '',
                   closeup: v.getAttribute('data-closeup') }; })()""" % (SHOWN, V))
        s0 = state()
        check("phone: the step's 3D view shows the model, its step chips and one 'More 3D options' button, nothing else",
              s0["canvas"] and s0["chips"] and s0["more"] and s0["moreText"] == "More 3D options"
              and not any(s0[k] for k in ("play", "range", "time", "views", "tilt", "bar")) and s0["closeup"] is None, s0)
        el = pg.evaluate_handle(V)
        el.as_element().scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        el.as_element().screenshot(path=os.path.join(SHOTS, "phone-step-view.png"))
        el.as_element().query_selector(".v3d-more").click(); pg.wait_for_timeout(400)
        s1 = state()
        el.as_element().screenshot(path=os.path.join(SHOTS, "phone-step-view-more.png"))
        nox_more = pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
        el.as_element().query_selector(".v3d-more").click(); pg.wait_for_timeout(300)
        s2 = state()
        check("phone: 'More 3D options' shows the timeline, Focus, the camera views and the bar and asks the viewer for its close-up box; 'Fewer 3D options' folds them away",
              s1["play"] and s1["range"] and s1["views"] and s1["bar"] and s1["chips"] and s1["closeup"] == "on" and s1["moreText"] == "Fewer 3D options" and s1["expanded"] == "true"
              and nox_more and not any(s2[k] for k in ("play", "range", "views", "bar")) and s2["closeup"] is None and s2["moreText"] == "More 3D options", [s1, s2])
        nav = pg.evaluate("""(() => { const n = [...document.querySelectorAll('#p-steps .asm-nav')].find(x => x.offsetParent !== null);
          const r = e => e.getBoundingClientRect(), nr = r(n), a = r(n.querySelector('[data-asm-prev]')), c = r(n.querySelector('.asm-count')), z = r(n.querySelector('.asm-count').nextElementSibling);
          const fit = [...n.querySelectorAll('button')].every(x => x.scrollWidth <= x.clientWidth + 1);
          const lines = x => { const g = document.createRange(); g.selectNodeContents(x); return new Set([...g.getClientRects()].map(q => Math.round(q.top))).size; };
          const one = [...n.querySelectorAll('button')].every(x => lines(x) === 1);   /* the words' line boxes: 1 = no wrap */
          return { above: c.bottom <= Math.min(a.top, z.top) + 1, full: c.width >= nr.width - 40, oneRow: a.top < z.bottom && z.top < a.bottom && a.right <= z.left + 1, fit: fit, oneLine: Math.abs(a.height - z.height) < 1 && one,
                   prev: [Math.round(a.left), Math.round(a.top), Math.round(a.width), Math.round(a.height)], next: [Math.round(z.left), Math.round(z.top), Math.round(z.width), Math.round(z.height)] }; })()""")
        check("phone: 'Step 1 of 8 ...' is on its own full-width line above Previous and Next (the two buttons side by side, each on one line, their words fit)",
              nav["above"] and nav["full"] and nav["oneRow"] and nav["fit"] and nav["oneLine"], nav)
        top_el = pg.evaluate_handle(TOP_VIEW).as_element()
        top_el.scroll_into_view_if_needed(); top_el.query_selector(".v3d-poster").click()
        try:
            pg.wait_for_function(TOP_VIEW + ".classList.contains('is-ready')", timeout=40000)
        except Exception:
            pass
        pg.wait_for_timeout(800)
        t = pg.evaluate("(() => { const top = %s; return { model: top.getAttribute('data-model'), ready: top.classList.contains('is-ready'), canvas: !!top.querySelector('canvas'), poster: top.classList.contains('v3d-poster-on'), btnHidden: top.querySelector('.v3d-poster').hidden }; })()" % TOP_VIEW)
        check("phone: tapping the picture opens the finished drone's 3D view",
              t["model"] == "docs/models/final-product.glb" and t["ready"] and t["canvas"] and not t["poster"] and t["btnHidden"], t)
        top_el.screenshot(path=os.path.join(SHOTS, "phone-top-opened.png"))
        # job 12 (Shad's iPhone shots 11-13): the opened finished drone uses the same fold, and opened it fits 390 px
        fold = pg.evaluate("""(() => { const S = %s, top = %s;
          return { more: S(top.querySelector('.v3d-more')), bar: S(top.querySelector('.viewer3d-bar:not(.viewer3d-anim)')), views: S(top.querySelector('.viewer3d-views')), tilt: S(top.querySelector('.viewer3d-tilt')) }; })()""" % (SHOWN, TOP_VIEW))
        top_el.query_selector(".v3d-more").click(); pg.wait_for_timeout(500)
        fit = pg.evaluate("""(() => { const S = %s, top = %s, W = document.documentElement.clientWidth;
          const shown = [...top.querySelectorAll('button, input, label, .viewer3d-hint')].filter(S);
          const out = shown.filter(e => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > W + 1; }).map(e => (e.textContent || e.type).trim().slice(0, 30));
          return { shown: shown.length, out: out, bar: S(top.querySelector('.viewer3d-bar:not(.viewer3d-anim)')), views: S(top.querySelector('.viewer3d-views')),
                   wide: document.documentElement.scrollWidth > innerWidth, hint: (top.querySelector('.viewer3d-hint') || {}).textContent }; })()""" % (SHOWN, TOP_VIEW))
        top_el.screenshot(path=os.path.join(SHOTS, "phone-top-more.png"))
        check("phone: the opened finished drone folds its controls under 'More 3D options'; opened, they all fit 390 px with no sideways scroll (Shad's shots 11-12)",
              fold["more"] and not fold["bar"] and not fold["views"] and not fold["tilt"] and fit["bar"] and fit["views"] and fit["shown"] >= 5 and not fit["out"] and not fit["wide"], [fold, fit])
        ph_hints = pg.evaluate("[...new Set([...document.querySelectorAll('.viewer3d-hint')].map(h => h.textContent.trim()))]")
        check("touch screens: the 3D hint says 'Drag to rotate · pinch to zoom · two-finger drag to pan'; the laptop keeps its mouse wording (Shad's shot 13)",
              # a playing step shows its action's line in the hint (viewer3d.js), so only the gesture lines are compared
              [h_ for h_ in ph_hints if h_.startswith("Drag to rotate")] == ["Drag to rotate · pinch to zoom · two-finger drag to pan"]
              and not any("scroll to zoom" in h_ or "right-drag" in h_ for h_ in ph_hints)
              and [h_ for h_ in lap_hints if h_.startswith("Drag to rotate")] == ["Drag to rotate · scroll to zoom · right-drag to pan"]
              and fit["hint"] == "Drag to rotate · pinch to zoom · two-finger drag to pan",
              [[h_ for h_ in ph_hints if h_.startswith("Drag")], [h_ for h_ in lap_hints if h_.startswith("Drag")], fit["hint"]])
        ctx.close()

        ctx, pg = page_with(OWNED, TICKS, 390, hash_="#home")
        gp = pg.evaluate("""(() => { const l = document.querySelector('.ga-launcher').getBoundingClientRect(), t = document.getElementById('tabs').getBoundingClientRect();
          return { gap: Math.round(t.top - l.bottom), h: Math.round(l.height), words: getComputedStyle(document.querySelector('.ga-launcher-label')).display !== 'none' }; })()""")
        check("phone: the chat button is smaller than on the laptop and sits above the bottom bar with a gap",
              gp["gap"] >= 6 and gp["h"] < ga["h"] and gp["h"] <= 46 and not gp["words"], [gp, "laptop height %s" % ga["h"]])
        tabs = pg.evaluate("[...document.querySelectorAll('section[role=tabpanel]')].map(s => s.id.replace(/^p-/, ''))")
        wide, ends = [], []
        for tb in tabs:
            pg.evaluate("location.hash = %s" % json.dumps("#" + tb)); pg.wait_for_timeout(500)
            if not pg.evaluate("document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth"):
                wide.append([tb, pg.evaluate("document.documentElement.scrollWidth")])
            pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); pg.wait_for_timeout(300)
            e = pg.evaluate("""(() => { const l = document.querySelector('.ga-launcher').getBoundingClientRect();
              const ps = [...document.querySelectorAll('footer p, footer')].filter(x => x.offsetParent !== null && x.innerText.trim());
              const last = ps.length ? ps[ps.length - 1].getBoundingClientRect() : null;
              return last ? Math.round(l.top - last.bottom) : null; })()""")
            if e is None or e < 0:
                ends.append([tb, e])
        pg.screenshot(path=os.path.join(SHOTS, "phone-page-end.png"))
        check("phone: no sideways scroll on any tab (%d tabs)" % len(tabs), len(tabs) >= 5 and not wide, wide)
        check("phone: at the end of every tab the last words sit clear of the chat button", len(tabs) >= 5 and not ends, ends)
        boxes = pg.evaluate("""[...document.querySelectorAll('input, textarea, select')].filter(e => !['checkbox','radio','range','button','submit','hidden','color','file','image','reset'].includes((e.type || '').toLowerCase()))
          .map(e => [e.id || e.name || e.className || e.tagName, parseFloat(getComputedStyle(e).fontSize)]).filter(x => x[1] < 16)""")
        n_boxes = pg.evaluate("[...document.querySelectorAll('input, textarea, select')].filter(e => !['checkbox','radio','range','button','submit','hidden','color','file','image','reset'].includes((e.type || '').toLowerCase())).length")
        check("phone: every text box, number box and drop-down is 16 px or more, so iOS does not zoom in when one is tapped (%d boxes)" % n_boxes, n_boxes >= 3 and not boxes, boxes[:6])
        z = pg.evaluate("[getComputedStyle(document.body).touchAction, getComputedStyle(document.documentElement).webkitTextSizeAdjust || getComputedStyle(document.documentElement).textSizeAdjust]")
        check("phone: no page zoom by pinch or double-tap (touch-action: pan-x pan-y, job 13) and the phone does not resize the text", z[0] == "pan-x pan-y" and z[1] == "100%", z)
        pg.evaluate("location.hash = '#parts'"); pg.wait_for_timeout(600)
        st = pg.evaluate("""[[...document.querySelectorAll('#stage-chips .stage-chip.is-blocked')].map(c => [getComputedStyle(c).opacity, c.textContent]),
          [...document.querySelectorAll('#p-parts *')].filter(e => e.children.length === 0 && /^Out of stock, checked \\d+ [A-Z][a-z]{2}$/.test(e.textContent.trim())).length,
          getComputedStyle(document.getElementById('ticks-copy')).display]""")
        check("phone: an out-of-stock stage chip is not greyed out and still says 'Out of stock'; the part keeps its dated 'Out of stock, checked 3 Nov' badge",
              len(st[0]) >= 1 and all(c[0] == "1" and "Out of stock" in c[1] for c in st[0]) and st[1] >= 1, st[:2])
        check("phone: 'Copy my ticks to my phone' is not shown on the phone (it is made on the laptop)", st[2] == "none", st[2])
        pg.screenshot(path=os.path.join(SHOTS, "phone-buy.png"))
        ctx.close()

        # ---------------- the phone on the public site: the laptop's link ----------------
        P_OWNED, P_TICKS = {"lipo-bag": True}, {"stg-2-done": True}
        frag = link[len(PUBLIC):] if isinstance(data, dict) else "#ticks="
        ctx, pg = page_with(P_OWNED, P_TICKS, 390, public=True, hash_=frag)
        pg.wait_for_timeout(500)
        f = pg.evaluate("[window.GUIDE_PUBLIC_SITE, document.querySelector('footer').innerText]")
        check("phone, public site: the footer says how to bring the laptop's ticks over and no longer mentions a guide server on the laptop",
              f[0] is True and "Copy my ticks to my phone" in f[1] and "guide server on your laptop" not in f[1], f)
        before = store(pg)
        card = pg.evaluate("(() => { const c = document.querySelector('.ticks-import'); return c && getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().height > 0 ? c.innerText : null; })()")  # fixed: offsetParent is always null
        check("phone: opening the laptop's link asks first ('3 parts ticked bought and 2 other boxes'), and nothing is saved before 'Copy them'",
              card is not None and "3 parts ticked bought and 2 other boxes" in card and before == {"owned": P_OWNED, "ticks": P_TICKS}, [card, before])
        pg.screenshot(path=os.path.join(SHOTS, "phone-import-ask.png"))
        with pg.expect_navigation():
            pg.click(".ticks-import button.primary")
        pg.wait_for_function("document.getElementById('here-step') && !/Loading/.test(document.getElementById('here-step').textContent)", timeout=15000)
        after = store(pg)
        pg.evaluate("location.hash = '#parts'"); pg.wait_for_timeout(700)
        boxes_on = pg.evaluate("['radio', 'radio-cells', 'tools', 'lipo-bag'].map(id => { const c = document.querySelector('input[data-own=\"' + id + '\"]'); return c ? c.checked : null; })")
        hash_after = pg.evaluate("[location.hash, location.href.indexOf('ticks=') < 0, !document.querySelector('.ticks-import')]")
        ow, tk = after.get("owned", {}), after.get("ticks", {})
        check("phone: 'Copy them' adds the laptop's ticks (the phone's own stay), Buy shows the parts bought, and the link leaves the address bar",
              all(ow.get(k) for k in ("radio", "radio-cells", "tools", "lipo-bag")) and all(tk.get(k) for k in ("asm-1", "stg-1-done", "stg-2-done"))
              and not tk.get("stg-3-done") and boxes_on == [True, True, True, True] and hash_after[1] and hash_after[2], [ow, tk, boxes_on, hash_after])
        pg.screenshot(path=os.path.join(SHOTS, "phone-import-done.png"))
        ctx.close()

        ctx, pg = page_with(P_OWNED, P_TICKS, 390, public=True, hash_=frag)
        pg.wait_for_timeout(400)
        pg.click(".ticks-import button:not(.primary)"); pg.wait_for_timeout(300)
        nn = [store(pg), pg.evaluate("[location.href.indexOf('ticks=') < 0, !document.querySelector('.ticks-import')]")]
        check("phone: 'Not now' saves nothing and clears the link", nn[0] == {"owned": P_OWNED, "ticks": P_TICKS} and nn[1] == [True, True], nn)
        bad = "#ticks=" + b64url(json.dumps({"o": ["not-a-part", "<b>x</b>"], "t": ["../../etc", "a b", 7]}))
        pg.goto("about:blank"); pg.goto(URL + bad); pg.wait_for_timeout(500)
        r1 = [pg.evaluate("!document.querySelector('.ticks-import')"), pg.evaluate("location.href.indexOf('ticks=') < 0"), store(pg)]
        pg.goto("about:blank"); pg.goto(URL + "#ticks=%%%***"); pg.wait_for_timeout(500)
        r2 = [pg.evaluate("!document.querySelector('.ticks-import')"), store(pg)]
        check("phone: a made-up or broken ticks link is ignored (no question, nothing saved, no error)",
              r1[0] and r1[1] and r1[2] == {"owned": P_OWNED, "ticks": P_TICKS} and r2[0] and r2[1] == {"owned": P_OWNED, "ticks": P_TICKS}, [r1, r2])
        ctx.close()
        ctx, pg = page_with({}, {}, 390, public=True, hash_="#home")
        pg.wait_for_function("window.GuideAssistant", timeout=15000)
        last = "(() => { const c = [...document.querySelectorAll('#ga-log .ga-msg')].pop(); return { title: (c.querySelector('.ga-title') || {}).textContent || '', text: c.innerText, quote: !!c.querySelector('.ga-quote'), chips: [...c.querySelectorAll('.ga-chip')].map(b => b.textContent), steps: [...c.querySelectorAll('.ga-steps li')].map(li => li.textContent) }; })()"
        here = pg.evaluate("document.getElementById('here-step').textContent.replace(/^Next:\\s*/, '')")
        pg.evaluate("GuideAssistant.ask('I need help')"); pg.wait_for_timeout(500)
        h = pg.evaluate(last)
        pg.screenshot(path=os.path.join(SHOTS, "phone-chat-help.png"))
        check("chat (public site, Shad's shot 9): 'I need help' names where he is (the Home card's words), asks what is wrong and offers 5 buttons; no unrelated passage",
              h["title"] == "Let's find the problem" and ("You are at: " + here) in h["text"] and "What is going wrong?" in h["text"] and not h["quote"] and len(h["chips"]) == 5
              and h["chips"][0] == "Checks for Stage 1", [here, h])
        same = []
        for q_ in ("I'm stuck", "what now?", "help", "Can you help me?"):
            pg.evaluate("GuideAssistant.ask(%s)" % json.dumps(q_)); pg.wait_for_timeout(300); same.append(pg.evaluate(last)["title"])
        pg.evaluate("GuideAssistant.ask('help, my receiver will not bind')"); pg.wait_for_timeout(300)
        specific = pg.evaluate(last)["title"]
        check("chat: other vague asks get the same reply; a specific question still gets its own answer",
              same == ["Let's find the problem"] * 4 and specific not in ("Let's find the problem", "Closest thing in the guide", "That one is outside this guide"), [same, specific])
        page_checks = pg.evaluate("[...document.querySelectorAll('#practice-stage-1 .asm-check li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim())")
        pg.evaluate("GuideAssistant.ask('I need help')"); pg.wait_for_timeout(300)
        pg.evaluate("[...document.querySelectorAll('#ga-log .ga-msg')].pop().querySelector('.ga-chip').click()"); pg.wait_for_timeout(400)
        c1 = pg.evaluate(last)
        check("chat: the 'Checks for Stage 1' button lists the checks written on the page for Stage 1's practice, word for word",
              c1["title"] == "Stage 1 practice: done when" and same_text(c1["steps"], page_checks), [c1["title"], c1["steps"][:2], page_checks[:2]])
        titles = []
        for ch in h["chips"][1:]:
            pg.evaluate("GuideAssistant.ask(%s)" % json.dumps(ch)); pg.wait_for_timeout(300); titles.append(pg.evaluate(last)["title"])
        check("chat: each of the other 4 buttons leads to a written answer (not 'Closest thing in the guide')",
              len(titles) == 4 and all(x_ and x_ not in ("Closest thing in the guide", "That one is outside this guide", "Let's find the problem") for x_ in titles), titles)
        ctx.close()
        # ---------------- job 13 (Shad's iPhone shots of the live c7c7473, 5 Nov 2026) ----------------
        ctx, pg = page_with({}, {}, 390, public=True, hash_="#fly")
        pg.wait_for_function("window.GuideAssistant", timeout=15000); pg.wait_for_timeout(500)
        last13 = "(() => { const c = [...document.querySelectorAll('#ga-log .ga-msg')].pop(); return { title: (c.querySelector('.ga-title') || {}).textContent || '', text: c.innerText }; })()"
        pg.evaluate("GuideAssistant.ask('Where do I fly it, if the drone is in over 550 grams?')"); pg.wait_for_timeout(500)
        w = pg.evaluate(last13)
        check("chat (Shad's shot 1): 'Where do I fly it ...?' answers from Fly safely: where he can fly (private land, the club field) and where he can't (Edmonton parks), not the weight card",
              w["title"] == "Where you can fly it" and "You can: On private land" in w["text"] and "You can: At a model-aircraft club field" in w["text"]
              and "You can't: In Edmonton" in w["text"] and "How much does the drone weigh" not in w["text"], [w["title"], w["text"][:200]])
        pg.evaluate("GuideAssistant.ask('Can I fly it inside my apartment?')"); pg.wait_for_timeout(500)
        ind = pg.evaluate(last13)
        check("chat: 'Can I fly it inside my apartment?' gets the guide's sourced indoors line (Part IX does not apply, the building owner's permission, the simulator)",
              ind["title"] == "Flying it indoors" and "Part IX" in ind["text"] and "building owner" in ind["text"] and "simulator" in ind["text"], [ind["title"], ind["text"][:200]])
        wt = pg.evaluate("""(() => { const W = JSON.parse(document.getElementById('weight-data').textContent);
          const total = W.parts.filter(p => !p.alt).reduce((s, p) => s + Math.round(p.g * 100) * p.qty, 0) / 100;
          return { n: Math.round(total), spans: [...document.querySelectorAll('[data-weight-min]')].map(s => s.textContent), glance: document.getElementById('glance-weight').textContent,
                   about550: /about 55[0-9] g/.test(document.body.innerText) }; })()""")
        check("weight: every figure the page shows comes from the one weight list (%s g): the park and indoor lines, the Home and Fly safely glance" % wt["n"],
              len(wt["spans"]) >= 2 and all(x == "at least %d g" % wt["n"] for x in wt["spans"]) and wt["glance"].startswith("At least %d g" % wt["n"]) and not wt["about550"], wt)
        fl = pg.evaluate("""(() => { const first = document.querySelector('#p-fly details.acc'), c = document.getElementById('where-card');
          const heads = [...c.querySelectorAll('.acc-body > p > strong')].map(s => s.textContent).filter(x => /^Where you|^Before you fly/.test(x));
          const lists = [...c.querySelectorAll('.acc-body > ul')].slice(0, 3);
          const nolink = lists.flatMap(u => [...u.children]).filter(li => !li.querySelector('a[href^="http"]') && !/below explains/.test(li.textContent)).map(li => li.textContent.slice(0, 50));
          const firstP = (c.querySelector('.acc-body > p') || {}).textContent || ''; return { first: first && first.id, open: c.open, leadsWithCan: firstP.trim() === 'Where you can fly:', heads: heads, counts: lists.map(u => u.children.length), nolink: nolink }; })()""")
        check("Fly safely (Shad, item 11) leads with 'Where you can fly', then 'Where you can't fly', then 'Before you fly'; every line has its source link",
              fl["first"] == "where-card" and fl["open"] and fl["leadsWithCan"] and fl["heads"] == ["Where you can fly:", "Where you can't fly:", "Before you fly:"] and fl["counts"][0] >= 4 and fl["counts"][2] >= 5 and not fl["nolink"], fl)
        tt = pg.evaluate("[document.title, document.querySelector('header h1').textContent, /Fire-Detecting/i.test(document.body.innerText + document.title)]")
        check("title (Shad's decision): 'Build a Heat-Spotting Drone' in the header and the page title; 'Fire-Detecting' nowhere on the page",
              tt[0].startswith("Shad's Heat-Spotting Drone") and tt[1] == "Build a Heat-Spotting Drone" and tt[2] is False, tt)
        ctx.close()

        ctx, pg = page_with({}, {}, 390, hash_="#parts")
        buy13 = pg.evaluate("JSON.parse(document.getElementById('buy-data').textContent)")
        ctx.close()
        st1 = {l["id"]: True for l in buy13["lines"] if int(l["stage"]) == 1}
        ctx, pg = page_with(st1, {}, 390, hash_="#parts"); pg.wait_for_timeout(600)
        chip = pg.evaluate("[...document.querySelectorAll('#stage-chips .stage-chip')].map(c => c.textContent).filter(x => /^Stage 1/.test(x))[0] || ''")
        check("Buy (Shad's shot 2): a bought stage shows its price with Bought, not CA$0.00", "· Bought" in chip and "CA$0.00" not in chip and re.search(r"CA\$[1-9]", chip) is not None, chip)
        ctx.close()

        ctx, pg = page_with(OWNED, TICKS, 390, hash_="#steps"); pg.wait_for_timeout(1000)
        step_view(pg); pg.wait_for_timeout(800)
        el13 = pg.evaluate_handle(STEP_VIEW).as_element()
        el13.query_selector(".v3d-more").click(); pg.wait_for_timeout(400)
        bar = pg.evaluate("""(() => { const S = %s, v = %s, bar = v.querySelector('.viewer3d-bar:not(.viewer3d-anim)'), h = bar.querySelector('.viewer3d-hint'), r = bar.querySelector('[data-action="reset"]');
          const resets = [...v.querySelectorAll('button')].filter(b => S(b) && b.textContent.trim() === 'Reset view').length;
          const hb = h.getBoundingClientRect(), bb = bar.getBoundingClientRect(), rb = r.getBoundingClientRect();
          return { resets: resets, full: hb.width >= bb.width - 40, below: rb.top >= hb.bottom - 1 }; })()""" % (SHOWN, STEP_VIEW))
        check("phone, 'More 3D options' open (Shad's shot 6): one Reset view, and the step's line (e.g. the safety line) has its own full-width row", bar["resets"] == 1 and bar["full"] and bar["below"], bar)
        dg = pg.evaluate("""(() => { const pic = [...document.querySelectorAll('#p-steps .asm-picture')].find(p => p.offsetParent !== null), img = pic && pic.querySelector('img');
          return { w: img ? Math.round(img.getBoundingClientRect().width) : 0, scrolls: pic ? pic.scrollWidth > pic.clientWidth : false, wide: document.documentElement.scrollWidth > innerWidth }; })()""")
        check("phone (Shad's shot 7): the step's paper diagram is wide enough to read (760 px) and scrolls sideways in its own box; the page does not",
              dg["w"] >= 700 and dg["scrolls"] and not dg["wide"], dg)
        zm = pg.evaluate("""(() => { const e = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(e);
          const cv = document.querySelector('#p-steps .viewer3d canvas');
          return { html: getComputedStyle(document.documentElement).touchAction, body: getComputedStyle(document.body).touchAction, gesture: e.defaultPrevented, canvas: cv ? getComputedStyle(cv).touchAction : '' }; })()""")
        check("phone (Shad: no zoom at all): the page cannot be pinch- or double-tap-zoomed (touch-action pan-x pan-y, Safari's gesture cancelled); the 3D view keeps its own pinch",
              zm["html"] == "pan-x pan-y" and zm["body"] == "pan-x pan-y" and zm["gesture"] is True and zm["canvas"] == "none", zm)
        ctx.close()

        def overlay_run(browser, label):
            c2 = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=label != "WebKit")
            c2.add_init_script("delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen; delete Element.prototype.webkitRequestFullScreen;"
                               "if (/^http/.test(location.protocol) && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(%s, %s); }"
                               % (json.dumps(STORE), json.dumps(json.dumps({"owned": OWNED, "ticks": TICKS}))))
            p2 = c2.new_page()
            p2.on("pageerror", lambda e: errs.append("%s: %s" % (label, e.message)))
            p2.goto(URL + "#steps"); p2.wait_for_timeout(1500)
            step_view(p2); p2.wait_for_timeout(800)
            v2 = p2.evaluate_handle(STEP_VIEW).as_element()
            v2.query_selector(".v3d-more").click(); p2.wait_for_timeout(300)
            v2.query_selector('[data-action="fullscreen"]').click(); p2.wait_for_timeout(700)
            on = p2.evaluate("""(() => { const v = document.querySelector('.viewer3d.v3d-overlay'); if (!v) return { on: false };
              const r = v.getBoundingClientRect(), cv = v.querySelector('.viewer3d-canvas').getBoundingClientRect(), cl = v.querySelector('.v3d-close');
              return { on: true, fills: r.left <= 1 && r.top <= 1 && r.width >= innerWidth - 2 && r.height >= innerHeight - 2, canvasTall: cv.height >= innerHeight * 0.45,
                       locked: document.documentElement.classList.contains('v3d-locked') && getComputedStyle(document.documentElement).overflow === 'hidden',
                       close: !!cl && cl.getBoundingClientRect().height >= 40,
                       onTop: [[innerWidth / 2, innerHeight - 20], [innerWidth - 30, innerHeight - 90], [innerWidth / 2, innerHeight / 2]].every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('.v3d-overlay'); }) }; })()""")
            p2.screenshot(path=os.path.join(SHOTS, "phone-fullscreen-%s.png" % label))
            p2.evaluate("(document.querySelector('.v3d-close') || { click: function () {} }).click()"); p2.wait_for_timeout(300)
            off = p2.evaluate("[!document.querySelector('.viewer3d.v3d-overlay'), !document.documentElement.classList.contains('v3d-locked')]")
            g = p2.evaluate("(() => { const e = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(e); return [e.defaultPrevented, getComputedStyle(document.documentElement).touchAction]; })()")
            c2.close()
            return on, off, g

        on, off, g = overlay_run(b, "Chromium")
        check("phone, a browser with no element full screen (iPhone Safari): 'Full screen' fills the screen with the 3D view, a big Close button and the page locked; Close puts it back",
              on.get("on") and on.get("fills") and on.get("canvasTall") and on.get("locked") and on.get("close") and on.get("onTop") and off == [True, True], [on, off])
        try:
            wk = p.webkit.launch()
            try:
                on, off, g = overlay_run(wk, "WebKit")
            finally:
                wk.close()
            check("WebKit (Safari's engine) at 390 px: Full screen opens and closes the overlay, and the page's zoom gesture is cancelled",
                  on.get("on") and on.get("fills") and on.get("locked") and on.get("close") and on.get("onTop") and off == [True, True] and g == [True, "pan-x pan-y"], [on, off, g])
        except Exception as e_:
            check("WebKit (Safari's engine) at 390 px: Full screen opens and closes the overlay, and the page's zoom gesture is cancelled", False, "%s: %s" % (type(e_).__name__, str(e_)[:200]))
        # ---------------- job 14 (Shad's iPhone shots 20-25, 5 Nov 2026) ----------------
        def sheet_run(browser, label):
            c3 = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=label != "WebKit")
            c3.add_init_script("if (/^http/.test(location.protocol) && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(%s, %s); }"
                               % (json.dumps(STORE), json.dumps(json.dumps({"owned": OWNED, "ticks": TICKS}))))
            p3 = c3.new_page()
            p3.on("pageerror", lambda e: errs.append("%s sheet: %s" % (label, e.message)))
            p3.goto(URL + "#steps")
            p3.wait_for_function("window.GuideAssistant && document.querySelector('.ga-launcher')", timeout=15000); p3.wait_for_timeout(600)
            p3.evaluate("window.scrollTo(0, 1200)"); p3.wait_for_timeout(200)
            y0 = p3.evaluate("Math.round(window.scrollY)")
            p3.click(".ga-launcher"); p3.wait_for_timeout(500)
            probe = """(() => { const pn = document.querySelector('.ga-panel').getBoundingClientRect(), inp = document.getElementById('ga-input').getBoundingClientRect();
              const pts = [[20, 20], [innerWidth - 20, innerHeight - 20], [innerWidth / 2, innerHeight / 2]];
              return { lock: document.documentElement.classList.contains('ga-lock'), top: Math.round(pn.top), bottom: Math.round(pn.bottom), w: Math.round(pn.width), h: innerHeight,
                       inputIn: inp.top >= 0 && inp.bottom <= innerHeight + 1, covered: pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('#ga-root'); }),
                       pinned: document.documentElement.scrollHeight <= innerHeight + 2 }; })()"""
            r1 = p3.evaluate(probe)
            p3.set_viewport_size({"width": 390, "height": 480}); p3.wait_for_timeout(500)      # the keyboard takes the lower part of the screen
            r2 = p3.evaluate(probe)
            p3.screenshot(path=os.path.join(SHOTS, "phone-chat-keyboard-%s.png" % label))
            p3.set_viewport_size({"width": 390, "height": 844}); p3.wait_for_timeout(300)
            p3.click(".ga-close"); p3.wait_for_timeout(400)
            back = p3.evaluate("[!document.documentElement.classList.contains('ga-lock'), Math.round(window.scrollY)]")
            c3.close()
            ok = (r1["lock"] and r1["top"] <= 1 and r1["bottom"] >= r1["h"] - 1 and r1["w"] >= 389 and r1["covered"] and r1["pinned"] and r1["inputIn"]
                  and r2["top"] >= -1 and r2["bottom"] <= 481 and r2["inputIn"] and r2["covered"] and back[0] and abs(back[1] - y0) <= 2)
            return ok, [r1, r2, back, y0]

        ok14, info14 = sheet_run(b, "Chromium")
        check("phone chat (Shad's shot 22): the open chat is a full sheet, the page behind covered and pinned; with the keyboard up (480 px left) the sheet and its text box fit above it; closing puts the page back where it was",
              ok14, info14)
        try:
            wk2 = p.webkit.launch()
            try:
                ok14w, info14w = sheet_run(wk2, "WebKit")
            finally:
                wk2.close()
            check("WebKit (Safari's engine): the same chat sheet over a simulated keyboard", ok14w, info14w)
        except Exception as e_:
            check("WebKit (Safari's engine): the same chat sheet over a simulated keyboard", False, "%s: %s" % (type(e_).__name__, str(e_)[:200]))

        st13 = {l["id"]: True for l in buy13["lines"] if int(l["stage"]) in (1, 3)}
        ctx, pg = page_with(st13, {}, 390, hash_="#steps"); pg.wait_for_timeout(600)
        pr = pg.evaluate("document.getElementById('practice-now').textContent")
        check("Build, Before Step 1 (Shad's shot 23): the practice line says what he can practise now (Stages 1 and 3 bought) and that Stage 2 waits, out of stock with its latest check date",
              pr.startswith("You can practise now: Stage 1 and Stage 3.") and "Stage 2 waits: part of it is out of stock (checked 5 Nov)." in pr, pr)   # the latest check of its out-of-stock parts (the Pi kit, 5 Nov)
        ctx.close()
        check("no page errors on the laptop or the phone", not errs, errs[:3])
        b.close()
except Exception as e:
    # an error must name itself in the gate's summary, not just leave the count short
    import traceback
    traceback.print_exc()
    check("the browser run finished without an error", False, "%s: %s" % (type(e).__name__, str(e)[:300]))
finally:
    srv.terminate()
print("screenshots in", SHOTS)
print("%d failed" % len(fails))
sys.exit(1 if fails else 0)
