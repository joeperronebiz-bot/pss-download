(function () {
  "use strict";
  var STORE = "pss-3q-live-v1";
  var canSave = true;
  var data = {};
  var fields = Array.prototype.slice.call(document.querySelectorAll("[data-key]"));
  var state = document.getElementById("savestate");

  try {
    var t = "__pss_test";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    data = JSON.parse(window.localStorage.getItem(STORE) || "{}") || {};
  } catch (e) {
    canSave = false;
    data = {};
  }
  // Name and date are now asked once (q1 keys). Older saves asked on each system.
  ["name", "date"].forEach(function (f) {
    var k = "q1-f-" + f;
    if (typeof data[k] === "string" && data[k].trim()) return;
    var old = ["q2-f-" + f, "q3-f-" + f].map(function (o) { return data[o]; })
      .filter(function (v) { return typeof v === "string" && v.trim(); })[0];
    if (old) data[k] = old;
  });

  if (!canSave && state) {
    state.textContent = "Saving is turned off in this browser, so your answers will not stay if you leave this page. Use Copy my answers before you go, or open this page in your phone's regular web browser.";
    state.className = "savestate warn";
  }

  function save() {
    if (!canSave) return;
    try { window.localStorage.setItem(STORE, JSON.stringify(data)); }
    catch (e) {
      canSave = false;
      if (state) {
        state.textContent = "Saving stopped working in this browser. Use Copy my answers before you leave this page.";
        state.className = "savestate warn";
      }
    }
  }

  function grow(el) {
    if (el.tagName !== "TEXTAREA") return;
    el.style.height = "auto";
    el.style.height = (el.scrollHeight + 4) + "px";
  }

  function markState(el) {
    var p = el.closest(".mark");
    if (p) p.classList.toggle("on", el.checked);
  }

  // Step 3 auto-fill from Systems 1 and 2. A filled-in Step 3 box keeps
  // updating only while it holds our own text; once the person edits it, it is theirs.
  function val(k) { return typeof data[k] === "string" ? data[k].trim() : ""; }
  function part(k, lead) {
    var v = val(k).replace(lead, "").replace(/[.\s]+$/, "").trim();
    return v || "______";
  }
  var sources = {
    q1: function () {
      if (!val("q1-f-i-help") && !val("q1-f-with") && !val("q1-f-so-they-can")) return "";
      return "I help " + part("q1-f-i-help", /^i help\s+/i) + " with " + part("q1-f-with", /^with\s+/i) +
        " so they can " + part("q1-f-so-they-can", /^so they can\s+/i) + ".";
    },
    q2: function () {
      return ["q2-f-keep-1", "q2-f-keep-2", "q2-f-keep-3"].map(val).filter(Boolean).join("\n");
    }
  };
  var autoTargets = Array.prototype.slice.call(document.querySelectorAll("[data-autofill]"));
  function autofill(skip) {
    var changed = false;
    autoTargets.forEach(function (el) {
      if (el === skip) return;
      var k = el.getAttribute("data-key"), flag = k + "--auto";
      var mine = data[flag] === true;
      if (el.value.trim() && !mine) return;
      var v = sources[el.getAttribute("data-autofill")]();
      if (el.value !== v) {
        el.value = v;
        data[k] = v;
        grow(el);
        changed = true;
      }
      if (v) { if (!mine) { data[flag] = true; changed = true; } }
      else if (mine) { delete data[flag]; changed = true; }
    });
    return changed;
  }

  fields.forEach(function (el) {
    var k = el.getAttribute("data-key");
    el.id = el.id || k;
    if (el.type === "checkbox") {
      el.checked = data[k] === true;
      markState(el);
      el.addEventListener("change", function () {
        data[k] = el.checked;
        markState(el);
        save();
      });
    } else {
      if (typeof data[k] === "string") el.value = data[k];
      grow(el);
      el.addEventListener("input", function () {
        data[k] = el.value;
        if (el.hasAttribute("data-autofill")) delete data[k + "--auto"];
        grow(el);
        autofill(el);
        save();
      });
    }
  });
  if (autofill()) save();
  window.addEventListener("load", function () { fields.forEach(grow); });

  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      ta.style.fontSize = "16px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else {
      fallback();
    }
  }

  function allAnswers() {
    var out = ["The 3 Questions. Perrone Strategic Systems.", ""];
    Array.prototype.forEach.call(document.querySelectorAll("#who [data-key]"), function (el) {
      var v = el.value.trim();
      out.push(el.getAttribute("data-label") + ":" + (v ? " " + v : ""));
    });
    if (out.length > 2) out.push("");
    Array.prototype.forEach.call(document.querySelectorAll("section.sys"), function (sec) {
      out.push(sec.getAttribute("data-title"));
      Array.prototype.forEach.call(sec.querySelectorAll("[data-key]"), function (el) {
        if (el.closest(".fav") && el.type === "checkbox") return;
        if (el.type === "checkbox") {
          out.push((el.checked ? "[x] " : "[ ] ") + el.parentNode.textContent.trim());
          return;
        }
        var v = el.value.trim();
        var line = el.getAttribute("data-label") + ":" + (v ? " " + v : "");
        if (el.closest(".fav")) {
          var marks = Array.prototype.filter.call(el.closest(".fav").querySelectorAll("input[type=checkbox]"), function (c) { return c.checked; })
            .map(function (c) { return c.getAttribute("data-label"); });
          if (marks.length) line += " (" + marks.join(", ") + ")";
        }
        out.push(line);
      });
      out.push("");
    });
    return out.join("\n").trim() + "\n";
  }

  function flash(btn, msg) {
    var box = btn.parentNode.querySelector(".js-copied");
    var old = btn.getAttribute("data-text") || btn.textContent;
    btn.setAttribute("data-text", old);
    btn.textContent = msg;
    if (box) box.textContent = msg === "Copied" ? "Copied. Paste it into a note, a text, or an email to yourself." : msg;
    setTimeout(function () { btn.textContent = old; if (box) box.textContent = ""; }, 4000);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".js-copy-all"), function (btn) {
    btn.addEventListener("click", function () {
      copyText(allAnswers(), function (ok) {
        flash(btn, ok ? "Copied" : (inApp ? "Could not copy here. " + printNote : "Could not copy here. Try Print or Save as PDF."));
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".js-copy-prompt"), function (btn) {
    btn.addEventListener("click", function () {
      var pre = btn.previousElementSibling;
      var text = pre.textContent;
      if (pre.hasAttribute("data-fill-prompt")) {
        var s1 = document.querySelector("[data-key='q3-f-q1-sentence']").value.trim();
        var s2 = document.querySelector("[data-key='q3-f-q2-phrases']").value.trim();
        if (s1) text = text.replace("[paste your System 1 sentence]", s1);
        if (s2) text = text.replace("[paste your System 2 phrases]", s2.replace(/\s*\n\s*/g, "; "));
      }
      copyText(text, function (ok) {
        flash(btn, ok ? "Copied" : "Could not copy. Press and hold the prompt to copy it.");
      });
    });
  });

  var inApp = /FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent || "");
  var printNote = "To print or save as PDF, open this page in your phone's regular web browser.";
  if (inApp) {
    Array.prototype.forEach.call(document.querySelectorAll(".js-print"), function (btn) {
      var p = document.createElement("p");
      p.className = "hint print-note";
      p.textContent = printNote;
      btn.parentNode.replaceChild(p, btn);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".js-keep-hint"), function (el) {
      el.textContent = "To keep a copy of your answers, use Copy my answers and paste them into a note or a text to yourself.";
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".js-print"), function (btn) {
    btn.addEventListener("click", function () {
      fields.forEach(grow);
      try { window.print(); } catch (e) {}
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll(".js-clear"), function (btn) {
    btn.addEventListener("click", function () {
      if (!window.confirm("Clear all your answers on this phone? This cannot be undone.")) return;
      data = {};
      try { window.localStorage.removeItem(STORE); } catch (e) {}
      fields.forEach(function (el) {
        if (el.type === "checkbox") { el.checked = false; markState(el); }
        else { el.value = ""; grow(el); }
      });
    });
  });
})();
