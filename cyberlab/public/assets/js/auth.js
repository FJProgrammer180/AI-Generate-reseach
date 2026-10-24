/* ============================================================================
 * auth.js - small UX helpers for the server-rendered account pages.
 * Progressive enhancement only: every rule it hints at (password policy,
 * match check) is re-validated on the server. No credentials are stored.
 * ==========================================================================*/
(function () {
  "use strict";

  /* show / hide password toggles: <button data-toggle-password="#id"> */
  document.querySelectorAll("[data-toggle-password]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = document.querySelector(btn.getAttribute("data-toggle-password"));
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "SEMBUNYIKAN" : "LIHAT";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
    });
  });

  /* password strength meter ( mirrors Validator::password policy ) */
  var pw = document.querySelector("[data-strength-for]");
  if (pw) {
    var fill = document.querySelector(pw.getAttribute("data-strength-for"));
    var note = document.querySelector("[data-strength-note]");
    var score = function (v) {
      var s = 0;
      if (v.length >= 10) s += 1;
      if (v.length >= 14) s += 1;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s += 1;
      if (/\d/.test(v)) s += 1;
      if (/[^A-Za-z0-9]/.test(v)) s += 1;
      return s; // 0..5
    };
    var labels = ["sangat lemah", "lemah", "cukup", "baik", "kuat", "sangat kuat"];
    var colors = ["#e05c7a", "#e05c7a", "#f6c453", "#f6c453", "#5ad1a5", "#5ad1a5"];
    var update = function () {
      var s = score(pw.value);
      if (fill) { fill.style.width = (s * 20) + "%"; fill.style.background = colors[s]; }
      if (note) note.textContent = pw.value ? "kekuatan: " + labels[s] : "";
    };
    pw.addEventListener("input", update);
    update();
  }

  /* confirm-password live match indicator */
  var confirm = document.querySelector("[data-match-with]");
  if (confirm && pw) {
    var hint = document.querySelector("[data-match-note]");
    var check = function () {
      if (!hint) return;
      if (!confirm.value) { hint.textContent = ""; return; }
      var ok = confirm.value === pw.value;
      hint.textContent = ok ? "konfirmasi cocok" : "konfirmasi belum cocok";
      hint.style.color = ok ? "#5ad1a5" : "#e05c7a";
    };
    confirm.addEventListener("input", check);
    pw.addEventListener("input", check);
  }

  /* double-submit guard: first click wins, button shows progress */
  document.querySelectorAll("form[data-single-submit]").forEach(function (form) {
    form.addEventListener("submit", function () {
      var btn = form.querySelector("button[type='submit']");
      if (btn) { btn.disabled = true; btn.textContent = "MEMPROSES..."; }
    });
  });
})();
