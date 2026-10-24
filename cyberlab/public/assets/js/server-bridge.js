/* ============================================================================
 * server-bridge.js - CyberLab V4 database bridge for the existing UI
 * ----------------------------------------------------------------------------
 * Loaded LAST on the protected workstation page (public/index.php). It does
 * not fork app.js/state.js; it wraps three seams and lets the original code
 * keep owning rendering, the terminal, labs and animations:
 *
 *   CTF.checkAnswer  - remembers the raw answer; a locally-wrong attempt is
 *                      also recorded server-side (authoritative attempt count)
 *   CTF.recordSolve  - after the original optimistic award, the answer is
 *                      posted to api/submit.php; the SERVER's award replaces
 *                      the local numbers, and any server refusal rolls the
 *                      optimistic award back with an honest toast
 *   CTF.render       - dashboard gets an account banner (welcome, member
 *                      stats from the database, sync status, import offer)
 *
 * Hydration: on boot, api/progress.php is fetched and the local state is
 * rebuilt from database rows (xp/points/solved/badges/daily). Two things
 * intentionally stay device-local and are labelled as such in the UI:
 * writeup notes, and procedural PRACTICE xp (generated flags exist only on
 * this device). Pre-V4 local solves that the database does not know yet are
 * OFFERED for import (api/migrate.php) - never silently merged, and the
 * original localStorage snapshot is backed up, not deleted.
 * ==========================================================================*/
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var CL = root.CYBERLAB || {};
  if (!CTF || !CL.account || !CL.api) return;

  var LS_KEY = "ctf-analyst-academy.progress.v1";
  var LS_BACKUP = LS_KEY + ".backup-cyberlab-v4";
  var LS_PENDING = "cyberlab.pending-migration.v1." + CL.account.username;

  var server = { state: null, synced: false, error: null };
  var lastAnswer = Object.create(null);
  var pendingImport = [];
  var postChain = Promise.resolve();

  /* ------------------------------------------------------------- utilities */
  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs, children) { return CTF.el(tag, attrs, children); }
  function toast(lines, kind) { if (CTF.toast) CTF.toast(lines, kind); }
  function iso(dbDateTime) {
    if (!dbDateTime) return new Date().toISOString();
    var d = new Date(String(dbDateTime).replace(" ", "T"));
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  function localGet(key) { try { return root.localStorage.getItem(key); } catch (e) { return null; } }
  function localSet(key, val) { try { root.localStorage.setItem(key, val); } catch (e) { /* mirror only */ } }

  function apiPost(url, payload) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": CL.csrf },
      body: JSON.stringify(payload || {})
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        data.__status = res.status;
        if (res.status === 401) root.location.href = "login.php";
        return data;
      });
    });
  }
  /* Sequence every write so a fast double-submit can't race itself. */
  function queuePost(url, payload) {
    var p = postChain.then(function () { return apiPost(url, payload); });
    postChain = p.catch(function () { return null; });
    return p;
  }

  function setSyncNote(text, cls) {
    var note = $("#cl-sync-note");
    if (note) { note.textContent = text; note.className = "mono " + (cls || ""); }
  }

  function generatedXp(state) {
    return Object.keys(state.solved || {}).reduce(function (sum, id) {
      var r = state.solved[id];
      return sum + (r && r.generated ? (r.xp || 0) : 0);
    }, 0);
  }

  function refreshHudFromState() {
    var st = CTF.getState();
    var lvl = CTF.levelFromXp(st.xp);
    var set = function (sel, text) { var n = $(sel); if (n) n.textContent = text; };
    set("#hud-level", "LEVEL " + lvl.level);
    set("#hud-xp", st.xp + " XP");
    set("#hud-points", st.points + " PTS");
    set("#hud-solved", CTF.solvedIds().length + "/" + CTF.DB.length);
    set("#hud-badges", Object.keys(st.badges).length + "/" + CTF.BADGES.length);
    var bar = $("#hud-xp-bar");
    if (bar) bar.style.width = Math.min(100, Math.round((lvl.into / lvl.needed) * 100)) + "%";
    var rank = $("#hud-rank");
    if (rank) rank.textContent = "next level in " + (lvl.needed - lvl.into) + " XP";
  }

  /* --------------------------------------------------------------- hydrate */
  function snapshotLocal() {
    var st = CTF.getState();
    var items = [];
    Object.keys(st.solved || {}).forEach(function (id) {
      var r = st.solved[id];
      if (!r || r.generated || !CTF.byId(id)) return;
      items.push({ challengeId: id, hintsUsed: r.hintsUsed || 0, attempts: r.attempts || 1, solvedAt: r.at });
    });
    return items;
  }

  function applyServerState(payload, localSnapshot) {
    var st = CTF.getState();
    var solvedRows = (payload.submissions || []).filter(function (r) { return r.status === "solved"; });

    // Work out what local history the account does not have yet -> offer it.
    var serverIds = Object.create(null);
    solvedRows.forEach(function (r) { serverIds[r.challengeId] = true; });
    var storedPending = [];
    try { storedPending = JSON.parse(localGet(LS_PENDING) || "[]"); } catch (e) { storedPending = []; }
    var pendingById = Object.create(null);
    (localSnapshot || []).concat(storedPending).forEach(function (it) {
      if (it && it.challengeId && !serverIds[it.challengeId] && CTF.byId(it.challengeId)) pendingById[it.challengeId] = it;
    });
    pendingImport = Object.keys(pendingById).map(function (k) { return pendingById[k]; });
    if (pendingImport.length) {
      localSet(LS_PENDING, JSON.stringify(pendingImport));
      var raw = localGet(LS_KEY);
      if (raw && !localGet(LS_BACKUP)) localSet(LS_BACKUP, raw); // recoverable copy, never deleted here
    } else {
      try { root.localStorage.removeItem(LS_PENDING); } catch (e) { /* ok */ }
    }

    // Rebuild the local state from the database (the authority).
    var solved = {};
    var earliest = null;
    solvedRows.forEach(function (r) {
      if (!earliest || String(r.solvedAt) < String(earliest.solvedAt)) earliest = r;
    });
    solvedRows.forEach(function (r) {
      var c = CTF.byId(r.challengeId);
      solved[r.challengeId] = {
        at: iso(r.solvedAt), points: r.pointsAwarded, xp: r.xpAwarded,
        hintsUsed: r.hintsUsed, attempts: Math.max(1, r.attemptCount),
        perfect: !!r.perfect, firstSolve: earliest === r, daily: !!r.isDaily, generated: false,
        difficulty: r.difficulty || (c && c.difficulty), category: r.category || (c && c.category),
        skills: c ? (c.skills || []).slice(0) : []
      };
    });
    // Procedural practice records stay (device-local XP, labelled in the UI).
    Object.keys(st.solved || {}).forEach(function (id) {
      if (st.solved[id] && st.solved[id].generated) solved[id] = st.solved[id];
    });

    var badges = {};
    (payload.achievements || []).forEach(function (a) { badges[a.code] = { at: iso(a.earnedAt) }; });
    var dailyDone = {};
    (payload.dailyDoneDates || []).forEach(function (d) { dailyDone[d] = true; });

    st.solved = solved;
    st.badges = badges;
    st.dailyDone = dailyDone;
    st.points = payload.progress.totalPoints;
    st.xp = payload.progress.totalXp + generatedXp(st);
    // trailing no-hint streak, replayed in solve order
    st.noHintStreak = 0;
    Object.keys(solved).sort(function (a, b) { return solved[a].at < solved[b].at ? -1 : 1; }).forEach(function (id) {
      st.noHintStreak = solved[id].hintsUsed === 0 ? (st.noHintStreak || 0) + 1 : 0;
    });
    server.state = payload;
    server.synced = true;
    server.error = null;

    CTF.evaluateBadges(); // adds device-local GENERATOR_ADEPT when earned
    CTF.saveState();      // localStorage becomes a mirror, DB stays authority
    setSyncNote("terhubung ke akun @" + CL.account.username + " - progres dari database", "synced");
    CTF.render();
  }

  function hydrate(localSnapshot) {
    return fetch(CL.api.progress, { credentials: "same-origin", headers: { "Accept": "application/json" } })
      .then(function (res) {
        if (res.status === 401) { root.location.href = "login.php"; throw new Error("unauthenticated"); }
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) throw new Error(data.message || "progress load failed");
        CL.account = data.account;
        if (data.settings) {
          document.body.classList.toggle("reduced-motion", !!data.settings.reducedMotion);
        }
        applyServerState(data.state, localSnapshot);
      })
      .catch(function (err) {
        server.error = String((err && err.message) || err);
        setSyncNote("GAGAL memuat progres akun (" + server.error + ") - menampilkan salinan lokal, solve tidak akan tersimpan ke server sampai koneksi pulih", "error");
        toast(["Koneksi akun gagal: " + server.error, "Progres sesi ini hanya lokal sampai Anda memuat ulang halaman."], "bad");
      });
  }

  /* -------------------------------------------- answer capture & attempts */
  var origCheckAnswer = CTF.checkAnswer;
  CTF.checkAnswer = function (challenge, rawAnswer) {
    var verdict = origCheckAnswer(challenge, rawAnswer);
    if (challenge && !challenge.generated && CTF.byId(challenge.id)) {
      lastAnswer[challenge.id] = String(rawAnswer === undefined || rawAnswer === null ? "" : rawAnswer);
      if (!verdict && server.synced) {
        // Server keeps the authoritative wrong-attempt count (it decides the
        // "perfect investigation" bonus). hintsUsed travels with the record.
        queuePost(CL.api.submit, {
          challengeId: challenge.id, answer: lastAnswer[challenge.id],
          hintsUsed: CTF.ui ? CTF.ui.hintsUsed : 0
        }).catch(function () { /* wrong-attempt logging is best-effort */ });
      }
    }
    return verdict;
  };

  /* ------------------------------------------------------------ solve sync */
  var origRecordSolve = CTF.recordSolve;
  CTF.recordSolve = function (challenge, opts) {
    opts = opts || {};
    if (opts.generated || (challenge && challenge.generated) || !CTF.byId(challenge.id)) {
      return origRecordSolve(challenge, opts); // practice: device-local XP
    }
    var st = CTF.getState();
    var before = {
      xp: st.xp, points: st.points, noHintStreak: st.noHintStreak,
      solved: Object.assign({}, st.solved), badges: Object.assign({}, st.badges),
      dailyDone: Object.assign({}, st.dailyDone), daily: Object.assign({}, st.daily)
    };
    var award = origRecordSolve(challenge, opts);
    var answer = lastAnswer[challenge.id];
    if (answer === undefined) return award; // solved outside the answer box; migration covers history

    queuePost(CL.api.submit, {
      challengeId: challenge.id, answer: answer, hintsUsed: opts.hintsUsed || 0
    }).then(function (res) {
      var state = CTF.getState();
      if (res && res.ok && res.status === "solved") {
        var rec = state.solved[challenge.id];
        if (rec) {
          if (rec.xp !== res.award.xp || rec.points !== res.award.points) {
            toast("Server memverifikasi solve ini: +" + res.award.xp + " XP, +" + res.award.points + " PTS (angka server yang berlaku).", "info");
          }
          rec.xp = res.award.xp; rec.points = res.award.points;
          rec.perfect = !!res.award.perfect; rec.daily = !!res.award.daily;
          rec.firstSolve = !!res.award.firstSolve;
        }
        state.points = res.progress.totalPoints;
        state.xp = res.progress.totalXp + generatedXp(state);
        (res.newAchievements || []).forEach(function (code) {
          if (!state.badges[code]) state.badges[code] = { at: new Date().toISOString() };
        });
        if (server.state) server.state.progress = res.progress;
        CTF.saveState();
        refreshHudFromState();
        setSyncNote("tersimpan di database - " + new Date().toLocaleTimeString(), "synced");
      } else if (res && res.ok && res.status === "already_solved") {
        hydrate([]);
        toast("Challenge ini sudah tercatat solved di akun Anda - tidak ada award ganda.", "info");
      } else {
        // Server refused (wrong per server rules, code runner unavailable,
        // or the request failed): roll the optimistic award back honestly.
        state.xp = before.xp; state.points = before.points;
        state.noHintStreak = before.noHintStreak;
        state.solved = before.solved; state.badges = before.badges;
        state.dailyDone = before.dailyDone; state.daily = before.daily;
        CTF.saveState();
        var msg = (res && res.message) || "Server tidak dapat memverifikasi jawaban ini.";
        toast(["BELUM TERSIMPAN DI SERVER", msg, "Award lokal dibatalkan - silakan submit ulang."], "bad");
        setSyncNote("submit terakhir ditolak server", "error");
        CTF.render();
      }
    }).catch(function () {
      var state = CTF.getState();
      state.xp = before.xp; state.points = before.points;
      state.noHintStreak = before.noHintStreak;
      state.solved = before.solved; state.badges = before.badges;
      state.dailyDone = before.dailyDone; state.daily = before.daily;
      CTF.saveState();
      toast(["BELUM TERSIMPAN DI SERVER", "Koneksi ke server gagal. Award lokal dibatalkan - silakan submit ulang."], "bad");
      CTF.render();
    });
    return award;
  };

  /* ---------------------------------------------------------- account banner */
  function accountBanner() {
    var p = server.state ? server.state.progress : null;
    var children = [
      el("div", { class: "cl-account-row" }, [
        el("div", {}, [
          el("div", { class: "sub-head", text: "WORKSTATION - " + (server.synced ? "DATABASE" : "MENGHUBUNGKAN...") }),
          el("div", { text: "Selamat datang, " + CL.account.displayName + " (@" + CL.account.username + ")" }),
          el("div", { class: "mono", style: "color:var(--text-faint);font-size:0.75rem",
            text: "member sejak " + String(CL.account.createdAt || "").slice(0, 10) +
              (p ? "  |  LEVEL " + p.currentLevel + "  |  " + p.totalXp + " XP  |  " + p.totalPoints + " PTS  |  " + p.challengesSolved + " solved (server)" : "") })
        ]),
        el("div", { class: "hero-actions" }, [
          el("a", { class: "btn tiny", href: "profile.php", text: "PROFIL & STATISTIK" }),
          CL.account.role === "admin" ? el("a", { class: "btn tiny ghost", href: "admin.php", text: "ADMIN" }) : null
        ].filter(Boolean))
      ]),
      el("div", { class: "cl-sync mono", text: server.synced
        ? "semua solve divalidasi & disimpan server - catatan writeup + XP practice tersimpan di perangkat ini"
        : "memuat progres akun dari database..." })
    ];

    var dismissed = false;
    try { dismissed = root.sessionStorage.getItem("cl-migrate-dismissed") === "1"; } catch (e) { dismissed = false; }
    if (pendingImport.length && !dismissed) {
      children.push(el("div", { class: "cl-migrate" }, [
        el("strong", { text: "Ditemukan progres lama (localStorage) di browser ini: " + pendingImport.length + " challenge" }),
        el("p", { class: "lede", text: "Impor ke akun @" + CL.account.username + "? Server akan memvalidasi id challenge dan menghitung ulang XP/poin dari aturan resmi - total dari browser tidak dipercaya. Salinan asli progres lokal tetap disimpan sebagai cadangan." }),
        el("div", { class: "hero-actions" }, [
          el("button", { class: "btn primary", text: "IMPOR " + pendingImport.length + " SOLVE", onclick: runMigration }),
          el("button", { class: "btn ghost", text: "NANTI SAJA", onclick: function () {
            try { root.sessionStorage.setItem("cl-migrate-dismissed", "1"); } catch (e) { /* ok */ }
            CTF.render();
          } })
        ])
      ]));
    }
    return el("section", { class: "panel cl-account" }, children);
  }

  function runMigration() {
    var items = pendingImport.slice(0);
    if (!items.length) return;
    queuePost(CL.api.migrate, { items: items }).then(function (res) {
      if (res && res.ok) {
        var imported = (res.imported || []).length;
        toast(["IMPOR SELESAI", imported + " solve masuk ke database akun. Total server: " +
          res.progress.totalXp + " XP, " + res.progress.totalPoints + " PTS."], "badge");
        pendingImport = [];
        try { root.localStorage.removeItem(LS_PENDING); } catch (e) { /* ok */ }
        hydrate([]);
      } else {
        toast(["IMPOR GAGAL", (res && res.message) || "Server menolak impor. Progres lokal Anda tidak diubah."], "bad");
      }
    }).catch(function () {
      toast(["IMPOR GAGAL", "Koneksi gagal. Progres lokal Anda tidak diubah - coba lagi nanti."], "bad");
    });
  }

  var origRender = CTF.render;
  CTF.render = function () {
    origRender();
    if (CTF.ui && CTF.ui.view === "dashboard") {
      var host = $("#view");
      if (host && host.firstChild && !host.querySelector(".cl-account")) {
        host.insertBefore(accountBanner(), host.firstChild);
      }
    }
  };

  /* ---------------------------------------------------------------------- boot */
  var bootSnapshot = snapshotLocal();
  hydrate(bootSnapshot);
})(typeof globalThis !== "undefined" ? globalThis : window);
