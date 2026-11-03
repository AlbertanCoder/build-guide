"""
page_text.py - read the text of every element that carries data-action-id in the guide page, INCLUDING nested lists.

A step line can hold its own numbered list (<li data-action-id="S6.0"> ... <ol><li>...</li></ol></li>); a plain
regex stops at the first inner </li> and drops the rest, so this follows the nesting with html.parser.

    from page_text import action_lines
    lines = action_lines(open(path, encoding="utf-8").read())   # {"S6.0": "Get the Pi ready: 1. On your laptop ...", ...}
"""

import html
import re
from html.parser import HTMLParser

VOID = {"br", "img", "hr", "input", "meta", "link", "wbr", "source", "area", "col", "embed", "param", "track"}


class _Lines(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = {}
        self.stack = []          # open action elements: [id, tag, depth, parts]
        self.depth = 0
        self.skip = 0            # inside <script> or <style>

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
            return
        if tag in VOID:
            for s in self.stack:
                s[3].append(" ")
            return
        self.depth += 1
        a = dict(attrs)
        if "data-action-id" in a:
            self.stack.append([a["data-action-id"], tag, self.depth, []])
        elif tag in ("li", "p", "div", "td", "tr") and self.stack:
            for s in self.stack:
                s[3].append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
            return
        if tag in VOID:
            return
        if self.stack and self.stack[-1][1] == tag and self.stack[-1][2] == self.depth:
            aid, _t, _d, parts = self.stack.pop()
            self.out[aid] = re.sub(r"\s+", " ", "".join(parts)).strip()
            for s in self.stack:
                s[3].append(" " + self.out[aid] + " ")
        self.depth -= 1

    def handle_data(self, data):
        if self.skip:
            return
        for s in self.stack[-1:]:
            s[3].append(data)


def action_lines(page_html):
    p = _Lines()
    p.feed(page_html)
    p.close()
    return {k: html.unescape(v) for k, v in p.out.items()}


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    L = action_lines(open(sys.argv[1], encoding="utf-8").read())
    for k in sys.argv[2:] or sorted(L):
        print(k, ":", L.get(k))
