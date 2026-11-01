/**
 * review.js — the Review page's only script.
 *
 *   node -e "console.log(require('./docs/js/review.js').diffLines('...'))"
 *
 * Read-only by design (R14): this page INSPECTS a proposal — the diff next to a
 * live rendering of it — and can do nothing else. Accept and reject stay CLI
 * commands, so there is no write path here to secure. Everything the server
 * sends is placed with textContent, never innerHTML, so nothing a proposal
 * contains can inject markup into this page.
 */
"use strict";

/**
 * Classify a unified diff into lines the page can color.
 * Pure and synchronous, so the gate can check it directly.
 */
function diffLines(diff) {
  if (!diff) { return []; }
  const lines = String(diff).split(/\r?\n/);
  /* A trailing newline splits into a final empty element; it is an artifact,
     not a diff line. */
  if (lines.length && lines[lines.length - 1] === "") { lines.pop(); }
  const out = [];
  lines.forEach(function (line) {
    if (/^(diff --git|index |new file mode|deleted file mode|similarity |rename )/.test(line)) {
      out.push({ type: "meta", text: line });
    } else if (/^(--- |\+\+\+ )/.test(line)) {
      out.push({ type: "meta", text: line });
    } else if (line.indexOf("@@") === 0) {
      out.push({ type: "hunk", text: line });
    } else if (line.indexOf("+") === 0) {
      out.push({ type: "add", text: line });
    } else if (line.indexOf("-") === 0) {
      out.push({ type: "del", text: line });
    } else {
      out.push({ type: "ctx", text: line });
    }
  });
  return out;
}

/* Everything below is browser-only; node stops at the export. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { diffLines: diffLines };
}

if (typeof document !== "undefined") {
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) { n.className = className; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  function renderDiffInto(container, diff) {
    container.textContent = "";
    diffLines(diff).forEach(function (line) {
      container.appendChild(el("div", "dl dl-" + line.type, line.text));
    });
    if (!diff) { container.appendChild(el("div", "dl dl-meta", "(this proposal changes nothing)")); }
  }

  function showError(node, message) {
    node.textContent = "";
    node.appendChild(el("div", "error", message));
  }

  function boot() {
    const list = document.getElementById("review-list");
    const title = document.getElementById("review-title");
    const stat = document.getElementById("review-stat");
    const diffBox = document.getElementById("review-diff");
    const frame = document.getElementById("review-preview");

    function select(name, subject, shortstat) {
      title.textContent = name + (subject ? "  —  " + subject : "");
      stat.textContent = shortstat || "";
      frame.src = "/proposals/" + encodeURIComponent(name) + "/preview";
      fetch("/api/proposals/" + encodeURIComponent(name) + "/diff")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.ok) { showError(diffBox, data.error || "could not read the diff"); return; }
          renderDiffInto(diffBox, data.diff);
        })
        .catch(function () { showError(diffBox, "could not reach the server"); });
    }

    fetch("/api/proposals")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        const details = (data && data.details) || [];
        if (!details.length) {
          list.appendChild(el("div", "empty", "No open proposals. The chat makes one when you ask for a change."));
          title.textContent = "nothing to review";
          diffBox.textContent = "";
          frame.removeAttribute("src");
          return;
        }
        details.forEach(function (d, i) {
          const btn = el("button", "proposal-item");
          btn.appendChild(el("div", "pi-name", d.name));
          btn.appendChild(el("div", "pi-subject", d.subject || ""));
          btn.appendChild(el("div", "pi-stat", d.shortstat || ""));
          btn.addEventListener("click", function () { select(d.name, d.subject, d.shortstat); });
          list.appendChild(btn);
          if (i === 0) { select(d.name, d.subject, d.shortstat); }
        });
      })
      .catch(function () { showError(list, "could not reach the server"); });
  }

  document.addEventListener("DOMContentLoaded", boot);
}