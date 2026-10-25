/* ============================================================================
 * app.js - UI controller: navigation, challenge flow, hints, writeups, HUD
 * ----------------------------------------------------------------------------
 * Plain DOM, no framework, no build step, no network. Works from file:// as
 * well as from a static server.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var el = CTF.el;

  function $(sel) { return document.querySelector(sel); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ------------------------------------------------------------ UI session */
  var ui = {
    view: "dashboard",
    param: null,
    filters: { category: "ALL", difficulty: "ALL", status: "ALL", pointsMin: null, pointsMax: null, query: "" },
    sort: "default",
    challenge: null,          // challenge object currently open (curated or generated)
    generated: false,
    hintsUsed: 0,
    revealed: [false, false, false],
    attempts: 0,
    handles: null,            // artifact handles (terminal / labs)
    lastResult: null,
    toastTimer: null
  };
  CTF.ui = ui;

  /* ------------------------------------------------------------------ toast */
  function toast(lines, kind) {
    var box = $("#toast-zone");
    if (!box) return;
    var node = el("div", { class: "toast " + (kind || "info") }, (Array.isArray(lines) ? lines : [lines]).map(function (l) {
      return el("div", { text: String(l) });
    }));
    box.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 6000);
  }
  CTF.toast = toast;

  function announceBadges(badges) {
    if (!badges || !badges.length) return;
    toast(["BADGE UNLOCKED"].concat(badges.map(function (b) { return b.icon + "  " + b.name + " - " + b.desc; })), "badge");
  }

  /* -------------------------------------------------------------------- HUD */
  function renderHud() {
    var st = CTF.getState();
    var lvl = CTF.levelFromXp(st.xp);
    var pct = Math.min(100, Math.round((lvl.into / lvl.needed) * 100));
    var set = function (sel, text) { var n = $(sel); if (n) n.textContent = text; };
    set("#hud-level", "LEVEL " + lvl.level);
    set("#hud-xp", st.xp + " XP");
    set("#hud-points", st.points + " PTS");
    set("#hud-solved", CTF.solvedIds().length + "/" + CTF.DB.length);
    set("#hud-badges", Object.keys(st.badges).length + "/" + CTF.BADGES.length);
    var bar = $("#hud-xp-bar");
    if (bar) bar.style.width = pct + "%";
    var rank = $("#hud-rank");
    if (rank) rank.textContent = "next level in " + (lvl.needed - lvl.into) + " XP";
    set("#footer-counts", CTF.DB.length + " challenges - " + CTF.CATEGORIES.length + " categories - " +
      CTF.DIFFICULTIES.length + " difficulty tiers - " + (CTF.CAMPAIGN_META || []).length + " campaigns - " +
      CTF.BADGES.length + " badges - " + CTF.stats().points.toLocaleString("en-US") + " points");
  }

  /* ------------------------------------------------------------- navigation */
  function go(view, param) {
    ui.view = view;
    ui.param = param === undefined ? null : param;
    if (view !== "challenge") { ui.challenge = null; ui.generated = false; }
    render();
    var main = $("#main");
    if (main && main.scrollIntoView) { try { root.scrollTo(0, 0); } catch (e) { } }
  }
  CTF.go = go;

  function openChallenge(challenge, generated) {
    ui.challenge = challenge;
    ui.generated = !!generated;
    ui.hintsUsed = 0;
    ui.revealed = [false, false, false];
    ui.attempts = 0;
    ui.lastResult = null;
    ui.view = "challenge";
    ui.param = challenge.id;
    render();
  }
  CTF.openChallenge = openChallenge;

  /* --------------------------------------------------------- shared widgets */
  function chip(text, cls) { return el("span", { class: "chip " + (cls || ""), text: text }); }

  function difficultyChip(d) {
    var info = CTF.difficulty(d);
    return el("span", { class: "chip diff", text: info.label, style: "border-color:" + info.color + ";color:" + info.color });
  }

  function challengeCard(c, opts) {
    opts = opts || {};
    var cat = CTF.categoryById(c.category) || { icon: "", short: c.category };
    var solved = CTF.isSolved(c.id);
    var card = el("div", {
      class: "card challenge-card" + (solved ? " solved" : "") + (c.difficulty === "Expert" ? " expert" : ""),
      tabindex: "0", role: "button",
      onclick: function () { openChallenge(c, !!c.generated); },
      onkeydown: function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openChallenge(c, !!c.generated); } }
    }, [
      el("div", { class: "card-top" }, [
        el("span", { class: "card-id mono", text: c.id }),
        solved ? el("span", { class: "card-solved", text: "SOLVED" }) : null,
        c.generated ? el("span", { class: "card-gen", text: "PRACTICE" }) : null
      ]),
      el("div", { class: "card-title", text: c.title }),
      el("div", { class: "card-meta" }, [
        el("span", { class: "chip cat", text: cat.icon + " " + cat.short }),
        difficultyChip(c.difficulty),
        el("span", { class: "chip pts", text: c.points + " pts" })
      ]),
      el("div", { class: "card-objective", text: c.objective || "" }),
      opts.showCampaign && c.campaign
        ? el("div", { class: "card-campaign mono", text: c.campaign + " - stage " + c.stage + " of 5" })
        : null
    ]);
    return card;
  }

  function statCard(label, value, sub) {
    return el("div", { class: "stat-card" }, [
      el("div", { class: "stat-value", text: String(value) }),
      el("div", { class: "stat-label", text: label }),
      sub ? el("div", { class: "stat-sub", text: sub }) : null
    ]);
  }

  /* ================================================================ VIEWS */

  /* ------------------------------------------------------------- dashboard */
  function viewDashboard(host) {
    var st = CTF.getState();
    var lvl = CTF.levelFromXp(st.xp);
    var daily = CTF.dailyChallenge();
    var dailyDone = CTF.dailyIsDone();
    var next = CTF.nextChallenge(ui.challenge ? ui.challenge.id : null);
    var solvedList = CTF.solvedIds();
    var recent = solvedList.slice(-6).reverse().map(function (id) { return CTF.byId(id); }).filter(Boolean);

    host.appendChild(el("section", { class: "panel hero" }, [
      el("div", { class: "hero-left" }, [
        el("h1", { text: "CTF ANALYST ACADEMY" }),
        el("p", { class: "lede", text: CTF.DB.length + " offline challenges across " + CTF.CATEGORIES.length + " categories, " +
          (CTF.CAMPAIGN_META || []).length + " multi-stage mystery campaigns, " + CTF.BADGES.length + " badges and a procedural practice generator." }),
        el("div", { class: "hero-stats" }, [
          statCard("LEVEL", lvl.level, lvl.into + " / " + lvl.needed + " XP"),
          statCard("POINTS", st.points, "database points earned"),
          statCard("SOLVED", solvedList.length + " / " + CTF.DB.length, CTF.noHintSolves() + " without a hint"),
          statCard("BADGES", Object.keys(st.badges).length + " / " + CTF.BADGES.length, CTF.perfectSolves() + " perfect investigations")
        ]),
        el("div", { class: "hero-actions" }, [
          el("button", { class: "btn primary", text: "DAILY CHALLENGE", onclick: function () { openChallenge(CTF.dailyChallenge(), false); } }),
          el("button", { class: "btn", text: "RANDOM UNSOLVED", onclick: function () {
            var c = CTF.randomChallenge(ui.filters);
            if (c) openChallenge(c, false); else toast("Nothing left in that filter - well played.");
          } }),
          next ? el("button", { class: "btn", text: "CONTINUE: " + next.id, onclick: function () { openChallenge(next, false); } }) : null,
          el("button", { class: "btn ghost", text: "PRACTICE GENERATOR", onclick: function () { go("practice"); } })
        ])
      ]),
      el("div", { class: "hero-right" }, [
        el("div", { class: "daily-card" }, [
          el("div", { class: "daily-head", text: dailyDone ? "DAILY COMPLETE" : "TODAY'S DAILY" }),
          el("div", { class: "mono daily-date", text: CTF.todayKey() }),
          el("div", { class: "daily-title", text: daily.title }),
          el("div", { class: "card-meta" }, [
            el("span", { class: "chip cat", text: daily.category }),
            difficultyChip(daily.difficulty),
            el("span", { class: "chip pts", text: daily.points + " pts" })
          ]),
          el("div", { class: "daily-note", text: "Chosen deterministically from the local database - the same challenge for everyone on this date, no network involved." }),
          el("button", { class: "btn primary", text: dailyDone ? "REVIEW" : "START DAILY", onclick: function () { openChallenge(daily, false); } })
        ])
      ])
    ]));

    /* campaigns */
    var campWrap = el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("h2", { text: "MYSTERY ARCHIVE" }),
        el("button", { class: "btn tiny ghost", text: "ALL CAMPAIGNS", onclick: function () { go("campaigns"); } })
      ])
    ]);
    var grid = el("div", { class: "grid campaigns" });
    (CTF.CAMPAIGN_META || []).forEach(function (meta) {
      var p = CTF.campaignProgress(meta.id);
      grid.appendChild(el("div", {
        class: "card campaign-card" + (p.complete ? " complete" : ""), tabindex: "0", role: "button",
        onclick: function () { go("campaign", meta.id); },
        onkeydown: function (ev) { if (ev.key === "Enter") go("campaign", meta.id); }
      }, [
        el("div", { class: "card-top" }, [
          el("span", { class: "card-id mono", text: meta.id }),
          el("span", { class: "chip pts", text: meta.points + " pts" })
        ]),
        el("div", { class: "card-title", text: meta.title }),
        el("div", { class: "card-objective", text: meta.summary }),
        el("div", { class: "progress" }, [el("div", { class: "progress-bar", style: "width:" + Math.round((p.done / p.total) * 100) + "%" })]),
        el("div", { class: "progress-label mono", text: p.done + " / " + p.total + " stages  -  " + p.earned + " / " + p.points + " pts" })
      ]));
    });
    campWrap.appendChild(grid);
    host.appendChild(campWrap);

    /* categories */
    var catWrap = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "CATEGORIES" })])]);
    var catGrid = el("div", { class: "grid cats" });
    CTF.CATEGORIES.forEach(function (cat) {
      var all = CTF.DB.filter(function (c) { return c.category === cat.id; });
      var done = CTF.solvedInCategory(cat.id);
      catGrid.appendChild(el("div", {
        class: "card cat-card", tabindex: "0", role: "button",
        onclick: function () { ui.filters.category = cat.id; go("challenges"); },
        onkeydown: function (ev) { if (ev.key === "Enter") { ui.filters.category = cat.id; go("challenges"); } }
      }, [
        el("div", { class: "cat-icon", text: cat.icon }),
        el("div", { class: "cat-name", text: cat.id }),
        el("div", { class: "cat-blurb", text: cat.blurb }),
        el("div", { class: "progress" }, [el("div", { class: "progress-bar", style: "width:" + (all.length ? Math.round((done / all.length) * 100) : 0) + "%" })]),
        el("div", { class: "progress-label mono", text: done + " / " + all.length + " solved" })
      ]));
    });
    catWrap.appendChild(catGrid);
    host.appendChild(catWrap);

    /* recent */
    if (recent.length) {
      var recWrap = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "RECENTLY SOLVED" })])]);
      var list = el("div", { class: "list" });
      recent.forEach(function (c) {
        var rec = st.solved[c.id];
        list.appendChild(el("div", { class: "list-row" }, [
          el("span", { class: "mono row-id", text: c.id }),
          el("span", { class: "row-title", text: c.title }),
          el("span", { class: "row-award mono", text: "+" + rec.xp + " XP  +" + rec.points + " PTS" + (rec.perfect ? "  PERFECT" : "") })
        ]));
      });
      recWrap.appendChild(list);
      host.appendChild(recWrap);
    }
  }

  /* ------------------------------------------------------------ challenges */
  function viewChallenges(host) {
    var f = ui.filters;
    var toolbar = el("div", { class: "toolbar" });

    var search = el("input", {
      class: "input search", type: "search", placeholder: "search id, title, skill, objective...",
      value: f.query, "aria-label": "search challenges"
    });
    search.addEventListener("input", function () { f.query = search.value; refresh(); });

    function select(label, value, options, onPick) {
      var sel = el("select", { class: "input", "aria-label": label });
      options.forEach(function (o) {
        var opt = el("option", { value: o.value, text: o.label });
        if (o.value === value) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () { onPick(sel.value); refresh(); });
      return el("label", { class: "field" }, [el("span", { class: "field-label", text: label }), sel]);
    }

    toolbar.appendChild(search);
    toolbar.appendChild(select("category", f.category, [{ value: "ALL", label: "all categories" }].concat(
      CTF.CATEGORIES.map(function (c) { return { value: c.id, label: c.icon + " " + c.id }; })),
    function (v) { f.category = v; }));
    toolbar.appendChild(select("difficulty", f.difficulty, [{ value: "ALL", label: "all difficulties" }].concat(
      CTF.DIFFICULTIES.map(function (d) { return { value: d.id, label: d.label + " (" + d.min + "-" + d.max + " pts)" }; })),
    function (v) { f.difficulty = v; }));
    toolbar.appendChild(select("status", f.status, [
      { value: "ALL", label: "solved + unsolved" }, { value: "UNSOLVED", label: "unsolved only" }, { value: "SOLVED", label: "solved only" }
    ], function (v) { f.status = v; }));
    toolbar.appendChild(select("points", (f.pointsMin || "") + "-" + (f.pointsMax || ""), [
      { value: "-", label: "any points" },
      { value: "50-150", label: "50 - 150 (beginner/easy)" },
      { value: "200-300", label: "200 - 300 (medium)" },
      { value: "350-500", label: "350 - 500 (hard)" },
      { value: "600-1000", label: "600 - 1000 (expert)" }
    ], function (v) {
      if (v === "-") { f.pointsMin = null; f.pointsMax = null; }
      else { var p = v.split("-"); f.pointsMin = +p[0]; f.pointsMax = +p[1]; }
    }));
    toolbar.appendChild(select("sort", ui.sort, [
      { value: "default", label: "recommended order" },
      { value: "difficulty", label: "difficulty" },
      { value: "points-asc", label: "points (low to high)" },
      { value: "points-desc", label: "points (high to low)" },
      { value: "category", label: "category" },
      { value: "id", label: "id" }
    ], function (v) { ui.sort = v; }));
    toolbar.appendChild(el("button", { class: "btn ghost tiny", text: "RESET FILTERS", onclick: function () {
      ui.filters = { category: "ALL", difficulty: "ALL", status: "ALL", pointsMin: null, pointsMax: null, query: "" };
      ui.sort = "default"; render();
    } }));

    var count = el("div", { class: "result-count mono" });
    var grid = el("div", { class: "grid challenges" });

    function refresh() {
      var list = CTF.sortChallenges(CTF.filterChallenges(f), ui.sort);
      clear(grid);
      count.textContent = list.length + " challenge" + (list.length === 1 ? "" : "s") +
        "  |  " + list.filter(function (c) { return CTF.isSolved(c.id); }).length + " solved";
      list.forEach(function (c) { grid.appendChild(challengeCard(c, { showCampaign: true })); });
      if (!list.length) grid.appendChild(el("div", { class: "empty", text: "No challenge matches those filters." }));
    }

    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "CHALLENGE DATABASE" }), count]),
      toolbar, grid
    ]));
    refresh();
  }

  /* ------------------------------------------------------------- challenge */
  function asciiSolvedBox(award, challenge) {
    var skills = (challenge.skills || []).join(", ");
    var lines = [
      "CHALLENGE SOLVED",
      "",
      "FLAG ACCEPTED",
      "+" + award.xp + " XP",
      "+" + award.points + " POINTS",
      "SKILLS: " + (skills || "-")
    ];
    if (award.bonuses && award.bonuses.length) {
      lines.push("");
      award.bonuses.forEach(function (b) { lines.push("BONUS: " + b.label + " (+" + b.xp + " XP)"); });
    }
    var width = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    width = Math.max(width, 34);
    var rule = "+" + new Array(width + 3).join("-") + "+";
    var out = [rule];
    lines.forEach(function (l, i) {
      var pad = new Array(Math.max(0, width - l.length + 1)).join(" ");
      out.push("| " + (i === 0 ? new Array(Math.floor((width - l.length) / 2 + 1)).join(" ") + l + pad : l + pad) + " |");
    });
    out.push(rule);
    return out.join("\n");
  }

  function viewChallenge(host, challenge) {
    if (!challenge) {
      host.appendChild(el("div", { class: "panel empty", text: "That challenge is not in the database." }));
      return;
    }
    var st = CTF.getState();
    var record = st.solved[challenge.id];
    var cat = CTF.categoryById(challenge.category) || { icon: "", short: challenge.category };

    /* header */
    host.appendChild(el("section", { class: "panel challenge-head" }, [
      el("div", { class: "crumbs" }, [
        el("button", { class: "btn tiny ghost", text: "<- BACK TO CTF", onclick: function () { go("challenges"); } }),
        challenge.campaign
          ? el("button", { class: "btn tiny ghost", text: challenge.campaign + " STAGE " + challenge.stage, onclick: function () { go("campaign", challenge.campaign); } })
          : null
      ]),
      el("div", { class: "challenge-title-row" }, [
        el("h1", { text: challenge.title }),
        record ? el("span", { class: "solved-tag", text: "SOLVED" }) : null,
        challenge.generated ? el("span", { class: "solved-tag gen", text: "PRACTICE (XP ONLY)" }) : null
      ]),
      el("div", { class: "card-meta" }, [
        el("span", { class: "chip cat", text: cat.icon + " " + challenge.category }),
        difficultyChip(challenge.difficulty),
        el("span", { class: "chip pts", text: challenge.points + " pts" }),
        el("span", { class: "chip mono", text: challenge.id }),
        el("span", { class: "chip xp", text: CTF.xpFor(challenge.difficulty) + " xp base" })
      ]),
      el("div", { class: "objective" }, [
        el("span", { class: "objective-label", text: "LEARNING OBJECTIVE" }),
        el("span", { class: "objective-text", text: challenge.objective || "" })
      ]),
      el("div", { class: "skills-row" }, (challenge.skills || []).map(function (s) { return chip(s, "skill"); })),
      challenge.generated ? el("div", { class: "gen-note mono", text: "procedurally generated - seed " + challenge.seed + " - regenerate for a fresh item" }) : null
    ]));

    /* briefing */
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "BRIEFING" })]),
      el("pre", { class: "mono briefing", text: challenge.description })
    ]));

    /* evidence */
    var artifactHost = el("div", { class: "artifact-host" });
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "EVIDENCE / LAB" })]),
      artifactHost
    ]));
    try {
      ui.handles = CTF.renderArtifact(artifactHost, challenge);
    } catch (e) {
      artifactHost.appendChild(el("div", { class: "error mono", text: "artifact renderer error: " + (e && e.message ? e.message : e) }));
    }

    /* answer */
    var answerPanel = el("section", { class: "panel answer-panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "SUBMIT YOUR ANSWER" })])
    ]);
    var feedback = el("div", { class: "feedback" });
    var solvedBox = el("div", { class: "solved-zone" });

    var isCode = challenge.answer && challenge.answer.type === "code";
    var input;
    if (isCode) {
      input = el("textarea", {
        class: "input mono code-input", rows: "12", spellcheck: "false",
        "aria-label": "your code solution",
        placeholder: "// write your function here and run the tests"
      });
      input.value = (challenge.data && challenge.data.code) || "";
    } else {
      input = el("textarea", {
        class: "input mono answer-input", rows: "2", spellcheck: "false",
        "aria-label": "your answer",
        placeholder: "FLAG{...} or the exact value the briefing asks for"
      });
    }

    var testOut = el("div", { class: "test-output" });
    function runTests() {
      var tests = (challenge.answer && challenge.answer.tests) || [];
      clear(testOut);
      var allPass = true;
      tests.forEach(function (t) {
        var res = CTF.runCode(input.value + "\n__result = (" + t.call + ");");
        var pass = !res.error && String(res.result) === String(t.expect);
        if (!pass) allPass = false;
        testOut.appendChild(el("div", { class: "test-row " + (pass ? "pass" : "fail") }, [
          el("span", { class: "mono", text: (pass ? "PASS  " : "FAIL  ") + t.call }),
          el("span", { class: "mono", text: pass ? "= " + res.result : (res.error ? "error: " + res.error : "got " + res.result + ", want " + t.expect) })
        ]));
      });
      return allPass;
    }

    function submit() {
      var value = input.value;
      var correct;
      if (isCode) {
        var allPass = runTests();
        correct = allPass && CTF.checkAnswer(challenge, value);
      } else {
        correct = CTF.checkAnswer(challenge, value);
      }
      ui.attempts++;
      if (correct) {
        var award = CTF.recordSolve(challenge, {
          hintsUsed: ui.hintsUsed, attempts: ui.attempts,
          daily: !challenge.generated && CTF.dailyChallenge().id === challenge.id,
          generated: !!challenge.generated
        });
        ui.lastResult = award;
        renderHud();
        if (award.repeat) {
          clear(feedback);
          feedback.appendChild(el("div", { class: "ok-line", text: "Already solved on " + new Date(award.previous.at).toLocaleString() + " - no duplicate award." }));
          return;
        }
        clear(feedback);
        feedback.appendChild(el("div", { class: "ok-line", text: "CORRECT on attempt " + ui.attempts + "." }));
        clear(solvedBox);
        solvedBox.appendChild(el("pre", { class: "mono ascii-box", text: asciiSolvedBox(award, challenge) }));
        solvedBox.appendChild(el("div", { class: "solved-actions" }, [
          el("button", { class: "btn primary", text: "VIEW WRITEUP", onclick: function () { showWriteup(true); } }),
          el("button", { class: "btn", text: "NEXT CHALLENGE", onclick: function () {
            var nx = challenge.campaign
              ? (CTF.DB.filter(function (c) { return c.campaign === challenge.campaign && c.stage === challenge.stage + 1; })[0] || CTF.nextChallenge(challenge.id))
              : CTF.nextChallenge(challenge.id);
            if (nx) openChallenge(nx, false);
            else if (challenge.generated) go("practice");
            else toast("That was the last unsolved challenge in this order.");
          } }),
          el("button", { class: "btn ghost", text: "BACK TO CTF", onclick: function () { go(challenge.campaign ? "campaigns" : "challenges"); } })
        ]));
        announceBadges(award.newBadges);
        CTF.evaluateBadges();
      } else {
        clear(feedback);
        feedback.appendChild(el("div", { class: "bad-line", text: "Not accepted yet (attempt " + ui.attempts + "). Re-read the briefing: the answer format is part of the task." }));
        if (ui.attempts >= 2 && ui.hintsUsed === 0) {
          feedback.appendChild(el("div", { class: "hint-nudge", text: "Two attempts in - a hint is available, but hint 2 costs 10% of the points and hint 3 costs 25%." }));
        }
      }
    }

    var submitBtn = el("button", { class: "btn primary big", text: isCode ? "RUN TESTS + SUBMIT" : "SUBMIT ANSWER", onclick: submit });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); submit(); }
    });

    answerPanel.appendChild(el("div", { class: "answer-row" }, [input, submitBtn]));
    answerPanel.appendChild(el("div", { class: "answer-help mono", text: isCode
      ? "Ctrl/Cmd + Enter submits. Code runs in a sandboxed Function scope: no DOM, no network, no globals."
      : "Ctrl/Cmd + Enter submits. Comparison ignores case, spaces, underscores and quotes." }));
    answerPanel.appendChild(testOut);
    answerPanel.appendChild(feedback);
    answerPanel.appendChild(solvedBox);
    host.appendChild(answerPanel);

    /* hints */
    var hintPanel = el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "HINTS" }), el("span", { class: "mono hint-state", text: "" })])
    ]);
    var hintState = hintPanel.querySelector(".hint-state");
    var penalties = ["free", "-10% of points", "-25% of points"];
    function refreshHintState() {
      var awarded = CTF.awardedPoints(challenge, ui.hintsUsed);
      hintState.textContent = ui.hintsUsed + " of 3 used  |  points if solved now: " + awarded + " / " + challenge.points;
    }
    (challenge.hints || []).forEach(function (h, i) {
      var body = el("div", { class: "hint-body mono", text: h });
      body.style.display = "none";
      var btn = el("button", {
        class: "btn tiny", text: "HINT " + (i + 1) + " (" + penalties[i] + ")",
        onclick: function () {
          if (ui.revealed[i]) { body.style.display = body.style.display === "none" ? "block" : "none"; return; }
          var msg = "Reveal hint " + (i + 1) + " of 3?\n\nCost: " + penalties[i] + ".\n" +
            (i === 0 ? "The first hint is free." : "Points on solve drop from " + CTF.awardedPoints(challenge, ui.hintsUsed) + " to " + CTF.awardedPoints(challenge, ui.hintsUsed + 1) + ".");
          var yes = true;
          try { yes = root.confirm(msg); } catch (e) { yes = true; }
          if (!yes) return;
          ui.revealed[i] = true;
          ui.hintsUsed = Math.max(ui.hintsUsed, i + 1);
          body.style.display = "block";
          btn.textContent = "HINT " + (i + 1) + " (shown)";
          refreshHintState();
        }
      });
      hintPanel.appendChild(el("div", { class: "hint-row" + (ui.revealed[i] ? " revealed" : "") }, [btn, body]));
      if (ui.revealed[i]) body.style.display = "block";
    });
    refreshHintState();
    host.appendChild(hintPanel);

    /* writeup */
    var writeupPanel = el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "WRITEUP" })])
    ]);
    var writeupBody = el("div", { class: "writeup-body" });
    writeupPanel.appendChild(writeupBody);
    host.appendChild(writeupPanel);

    function showWriteup(force) {
      clear(writeupBody);
      if (!record && !force && !CTF.isSolved(challenge.id)) {
        writeupBody.appendChild(el("div", { class: "locked", text: "The reference writeup unlocks when you solve this challenge. Your own notes below are always available." }));
      } else {
        writeupBody.appendChild(el("div", { class: "sub-head", text: "REFERENCE WRITEUP" }));
        writeupBody.appendChild(el("div", { class: "writeup-text", text: challenge.explanation || "" }));
        if (challenge.solutionSteps && challenge.solutionSteps.length) {
          writeupBody.appendChild(el("div", { class: "sub-head", text: "SOLUTION PATH" }));
          writeupBody.appendChild(el("ol", { class: "steps" }, challenge.solutionSteps.map(function (s) { return el("li", { text: s }); })));
        }
        writeupBody.appendChild(el("div", { class: "sub-head", text: "FLAG" }));
        writeupBody.appendChild(el("div", { class: "mono flag-line", text: challenge.flag || "" }));
      }
      writeupBody.appendChild(el("div", { class: "sub-head", text: "YOUR NOTES" }));
      var notes = el("textarea", {
        class: "input mono notes", rows: "8", spellcheck: "false",
        placeholder: "What did you try first? Which artifact mattered? What would you write in a report?",
        "aria-label": "your writeup notes"
      });
      notes.value = CTF.getWriteup(challenge.id) || "";
      notes.addEventListener("input", function () { CTF.setWriteup(challenge.id, notes.value); });
      writeupBody.appendChild(notes);
      writeupBody.appendChild(el("div", { class: "writeup-actions" }, [
        el("button", { class: "btn tiny ghost", text: "COPY AS MARKDOWN", onclick: function () {
          var md = "# " + challenge.id + " - " + challenge.title + "\n\n" +
            "- category: " + challenge.category + "\n- difficulty: " + challenge.difficulty + "\n- points: " + challenge.points + "\n" +
            "- solved: " + (record ? new Date(record.at).toISOString() : "not yet") + "\n\n" +
            "## Objective\n" + (challenge.objective || "") + "\n\n## My notes\n" + (notes.value || "") + "\n";
          if (record) md += "\n## Reference\n" + (challenge.explanation || "") + "\n";
          copyText(md);
          toast("Writeup markdown copied to the clipboard.");
        } })
      ]));
    }

    function copyText(text) {
      try {
        if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
          root.navigator.clipboard.writeText(text);
          return;
        }
      } catch (e) { /* fall through */ }
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { }
      document.body.removeChild(ta);
    }

    showWriteup(false);
    if (record) {
      // show the award box again for an already solved challenge
      var pseudo = { xp: record.xp, points: record.points, bonuses: [], attempts: record.attempts };
      solvedBox.appendChild(el("pre", { class: "mono ascii-box", text: asciiSolvedBox(pseudo, challenge) }));
      solvedBox.appendChild(el("div", { class: "solved-again mono", text: "solved " + new Date(record.at).toLocaleString() +
        "  |  hints used: " + record.hintsUsed + "  |  attempts: " + record.attempts + (record.perfect ? "  |  PERFECT INVESTIGATION" : "") }));
      solvedBox.appendChild(el("div", { class: "solved-actions" }, [
        el("button", { class: "btn primary", text: "VIEW WRITEUP", onclick: function () { showWriteup(true); } }),
        el("button", { class: "btn", text: "NEXT CHALLENGE", onclick: function () {
          var nx = CTF.nextChallenge(challenge.id);
          if (nx) openChallenge(nx, false);
        } }),
        el("button", { class: "btn ghost", text: "BACK TO CTF", onclick: function () { go("challenges"); } })
      ]));
    }
  }

  /* ------------------------------------------------------------- campaigns */
  function viewCampaigns(host) {
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "MYSTERY ARCHIVE - 5 CAMPAIGNS" })]),
      el("p", { class: "lede", text: "Each campaign is one investigation told in five stages. Stages must be worked in order: every stage hands you a value the next one needs, and closing a campaign means writing the convergence summary, not just collecting five flags." })
    ]));
    (CTF.CAMPAIGN_META || []).forEach(function (meta) {
      var p = CTF.campaignProgress(meta.id);
      var panel = el("section", { class: "panel campaign-panel" + (p.complete ? " complete" : "") }, [
        el("div", { class: "panel-head" }, [
          el("h2", { text: meta.id + " - " + meta.title }),
          el("span", { class: "mono", text: p.done + "/5 stages  -  " + p.earned + "/" + meta.points + " pts" })
        ]),
        el("p", { class: "lede", text: meta.summary }),
        el("div", { class: "campaign-arc mono", text: (meta.arc || []).join("  ->  ") }),
        el("div", { class: "progress" }, [el("div", { class: "progress-bar", style: "width:" + Math.round((p.done / p.total) * 100) + "%" })])
      ]);
      var list = el("div", { class: "stage-list" });
      p.stages.forEach(function (s, i) {
        var solved = CTF.isSolved(s.id);
        var locked = i > 0 && !CTF.isSolved(p.stages[i - 1].id);
        list.appendChild(el("div", { class: "stage-row" + (solved ? " solved" : "") + (locked ? " locked" : "") }, [
          el("span", { class: "stage-no mono", text: "S" + s.stage }),
          el("span", { class: "stage-title", text: s.title.split(": ")[1] || s.title }),
          difficultyChip(s.difficulty),
          el("span", { class: "chip pts", text: s.points + " pts" }),
          el("span", { class: "stage-state mono", text: solved ? "SOLVED" : (locked ? "LOCKED (finish the previous stage)" : "READY") }),
          el("button", {
            class: "btn tiny" + (locked ? " ghost" : " primary"), text: solved ? "REVIEW" : (locked ? "LOCKED" : "OPEN"),
            onclick: function () { if (!locked) openChallenge(s, false); else toast("Finish stage " + s.stage + " first - each stage hands the next one a value."); }
          })
        ]));
      });
      panel.appendChild(list);
      host.appendChild(panel);
    });
  }

  /* ---------------------------------------------------------------- badges */
  function viewBadges(host) {
    var st = CTF.getState();
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [
        el("h2", { text: "BADGES" }),
        el("span", { class: "mono", text: Object.keys(st.badges).length + " / " + CTF.BADGES.length + " earned" })
      ])
    ]));
    var grid = el("div", { class: "grid badges" });
    CTF.BADGES.forEach(function (b) {
      var earned = !!st.badges[b.id];
      var prog = CTF.badgeProgress(b.id);
      grid.appendChild(el("div", { class: "card badge-card" + (earned ? " earned" : "") }, [
        el("div", { class: "badge-icon", text: b.icon }),
        el("div", { class: "badge-name", text: b.name }),
        el("div", { class: "badge-desc", text: b.desc }),
        el("div", { class: "progress" }, [el("div", { class: "progress-bar", style: "width:" + Math.round((prog.have / prog.need) * 100) + "%" })]),
        el("div", { class: "progress-label mono", text: earned
          ? "earned " + new Date(st.badges[b.id].at).toLocaleDateString()
          : prog.have + " / " + prog.need })
      ]));
    });
    host.appendChild(grid);
  }

  /* -------------------------------------------------------------- progress */
  function viewProgress(host) {
    var st = CTF.getState();
    var stats = CTF.stats();
    var lvl = CTF.levelFromXp(st.xp);

    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "ANALYST PROGRESS" })]),
      el("div", { class: "hero-stats" }, [
        statCard("LEVEL", lvl.level, lvl.into + " / " + lvl.needed + " XP to next"),
        statCard("TOTAL XP", st.xp, "including bonuses"),
        statCard("POINTS", st.points + " / " + stats.points, Math.round((st.points / stats.points) * 100) + "% of the database"),
        statCard("SOLVED", CTF.solvedIds().length + " / " + stats.total, CTF.noHintSolves() + " with no hint"),
        statCard("PERFECT", CTF.perfectSolves(), "first try, no hint"),
        statCard("PRACTICE", st.generatorSolved || 0, "generated items solved")
      ])
    ]));

    /* per category */
    var catPanel = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "BY CATEGORY" })])]);
    CTF.CATEGORIES.forEach(function (cat) {
      var all = CTF.DB.filter(function (c) { return c.category === cat.id; });
      if (!all.length) return;
      var done = CTF.solvedInCategory(cat.id);
      catPanel.appendChild(el("div", { class: "bar-row" }, [
        el("span", { class: "bar-label", text: cat.icon + " " + cat.id }),
        el("div", { class: "progress wide" }, [el("div", { class: "progress-bar", style: "width:" + Math.round((done / all.length) * 100) + "%" })]),
        el("span", { class: "mono bar-value", text: done + "/" + all.length })
      ]));
    });
    host.appendChild(catPanel);

    /* per difficulty */
    var diffPanel = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "BY DIFFICULTY" })])]);
    CTF.DIFFICULTIES.forEach(function (d) {
      var all = CTF.DB.filter(function (c) { return c.difficulty === d.id; });
      var done = all.filter(function (c) { return CTF.isSolved(c.id); }).length;
      diffPanel.appendChild(el("div", { class: "bar-row" }, [
        el("span", { class: "bar-label", text: d.label + " (" + d.xp + " xp)" }),
        el("div", { class: "progress wide" }, [el("div", { class: "progress-bar", style: "width:" + (all.length ? Math.round((done / all.length) * 100) : 0) + "%;background:" + d.color })]),
        el("span", { class: "mono bar-value", text: done + "/" + all.length })
      ]));
    });
    host.appendChild(diffPanel);

    /* skills */
    var skills = {};
    CTF.solvedIds().forEach(function (id) {
      var c = CTF.byId(id);
      if (!c) return;
      (c.skills || []).forEach(function (s) { skills[s] = (skills[s] || 0) + 1; });
    });
    var skillList = Object.keys(skills).sort(function (a, b) { return skills[b] - skills[a]; });
    var skillPanel = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "SKILLS PRACTISED" })])]);
    skillPanel.appendChild(skillList.length
      ? el("div", { class: "skills-cloud" }, skillList.slice(0, 40).map(function (s) { return chip(s + " x" + skills[s], "skill"); }))
      : el("div", { class: "empty", text: "Solve a challenge to start building your skill profile." }));
    host.appendChild(skillPanel);

    /* solved log */
    var logPanel = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "SOLVE LOG" })])]);
    var rows = CTF.solvedIds().map(function (id) {
      var r = st.solved[id];
      var c = CTF.byId(id);
      return [id, c ? c.title : "(generated)", r.difficulty || "", "+" + r.xp, "+" + r.points, String(r.hintsUsed), String(r.attempts), new Date(r.at).toLocaleString()];
    }).reverse();
    logPanel.appendChild(rows.length
      ? el("table", { class: "data-table" }, [
        el("thead", {}, [el("tr", {}, ["ID", "TITLE", "DIFFICULTY", "XP", "PTS", "HINTS", "TRIES", "WHEN"].map(function (h) { return el("th", { text: h }); }))]),
        el("tbody", {}, rows.map(function (r) { return el("tr", {}, r.map(function (cell) { return el("td", { text: cell }); })); }))
      ])
      : el("div", { class: "empty", text: "Nothing solved yet." }));
    host.appendChild(logPanel);

    /* data controls */
    var dataPanel = el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "YOUR DATA (LOCAL ONLY)" })])]);
    dataPanel.appendChild(el("p", { class: "lede", text: "Progress lives in this browser's localStorage (" + CTF.storageBackend + "). Nothing is uploaded, and no challenge needs a network connection. Export a JSON backup any time." }));
    var fileInput = el("input", { type: "file", accept: "application/json", class: "input" });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          CTF.importState(String(reader.result));
          toast("Progress imported.");
          render();
        } catch (e) {
          toast("Import failed: " + (e && e.message ? e.message : e), "bad");
        }
      };
      reader.readAsText(file);
    });
    dataPanel.appendChild(el("div", { class: "hero-actions" }, [
      el("button", { class: "btn", text: "EXPORT PROGRESS (JSON)", onclick: function () {
        var blob = new Blob([CTF.exportState()], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = el("a", { href: url, download: "ctf-analyst-academy-progress.json" });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        toast("Progress exported.");
      } }),
      el("button", { class: "btn ghost", text: "IMPORT PROGRESS", onclick: function () { fileInput.click(); } }),
      el("button", { class: "btn danger", text: "RESET ALL PROGRESS", onclick: function () {
        var yes = true;
        try { yes = root.confirm("Erase all progress, badges, writeups and practice counts? This cannot be undone."); } catch (e) { yes = true; }
        if (!yes) return;
        CTF.resetState();
        toast("Progress reset.");
        render();
      } }),
      fileInput
    ]));
    host.appendChild(dataPanel);
  }

  /* --------------------------------------------------------------- practice */
  function viewPractice(host) {
    var category = ui.practiceCategory || "Cryptography";
    var difficulty = ui.practiceDifficulty || "Medium";
    var seed = ui.practiceSeed === undefined ? Math.floor(Math.random() * 1e9) : ui.practiceSeed;

    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "PRACTICE GENERATOR" })]),
      el("p", { class: "lede", text: "Procedural items built from local templates with a seeded random generator - no network, no external question bank. Practice awards XP only; it never changes your database point total. Every flag is generated on the spot and is unique to that seed." }),
      el("div", { class: "mono gen-note", text: "categories: " + CTF.GENERATOR_CATEGORIES.join(", ") })
    ]));

    var controls = el("div", { class: "toolbar" });
    var catSel = el("select", { class: "input", "aria-label": "practice category" });
    CTF.GENERATOR_CATEGORIES.forEach(function (c) {
      var o = el("option", { value: c, text: c });
      if (c === category) o.selected = true;
      catSel.appendChild(o);
    });
    var diffSel = el("select", { class: "input", "aria-label": "practice difficulty" });
    CTF.DIFFICULTIES.forEach(function (d) {
      var o = el("option", { value: d.id, text: d.label });
      if (d.id === difficulty) o.selected = true;
      diffSel.appendChild(o);
    });
    var seedInput = el("input", { class: "input mono seed", type: "text", value: String(seed), "aria-label": "seed" });
    controls.appendChild(el("label", { class: "field" }, [el("span", { class: "field-label", text: "category" }), catSel]));
    controls.appendChild(el("label", { class: "field" }, [el("span", { class: "field-label", text: "difficulty" }), diffSel]));
    controls.appendChild(el("label", { class: "field" }, [el("span", { class: "field-label", text: "seed" }), seedInput]));
    controls.appendChild(el("button", { class: "btn primary", text: "GENERATE", onclick: function () {
      ui.practiceCategory = catSel.value;
      ui.practiceDifficulty = diffSel.value;
      ui.practiceSeed = parseInt(seedInput.value, 10);
      if (isNaN(ui.practiceSeed)) ui.practiceSeed = CTF.hashString(seedInput.value || "seed");
      var c = CTF.generateChallenge({ category: ui.practiceCategory, difficulty: ui.practiceDifficulty, seed: ui.practiceSeed });
      if (!c) { toast("That combination failed to generate - try another category.", "bad"); return; }
      openChallenge(c, true);
    } }));
    controls.appendChild(el("button", { class: "btn", text: "SURPRISE ME", onclick: function () {
      var c = CTF.generateChallenge({});
      if (!c) return;
      ui.practiceSeed = c.seed;
      openChallenge(c, true);
    } }));
    host.appendChild(controls);

    var solvedCount = CTF.getState().generatorSolved || 0;
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "HOW PRACTICE SCORING WORKS" })]),
      el("ul", { class: "bullets" }, [
        el("li", { text: "XP is awarded exactly as in the main database: " + CTF.DIFFICULTIES.map(function (d) { return d.label + " " + d.xp; }).join(", ") + "." }),
        el("li", { text: "Bonuses still apply: first solve of a session chain +50, no hint +25, perfect investigation (first try, no hint) +100." }),
        el("li", { text: "Points are NOT awarded - the curated database total stays honest. Practice solves count toward the Generator Adept badge (" + solvedCount + "/10 so far)." }),
        el("li", { text: "The same seed always produces the same item, so you can share a seed with a study partner without sharing a flag." })
      ])
    ]));
  }

  /* ----------------------------------------------------------------- about */
  function viewAbout(host) {
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "panel-head" }, [el("h2", { text: "ABOUT THIS LAB" })]),
      el("ul", { class: "bullets" }, [
        el("li", { text: "Fully offline: no CDN, no API, no external target. Open index.html from disk and it works." }),
        el("li", { text: CTF.DB.length + " challenges, " + CTF.CATEGORIES.length + " categories, 5 difficulty tiers, " + (CTF.CAMPAIGN_META || []).length + " campaigns (" +
          (CTF.CAMPAIGN_META || []).reduce(function (a, m) { return a + m.stages; }, 0) + " stages), " + CTF.BADGES.length + " badges." }),
        el("li", { text: "Scoring: hint 1 free, hint 2 costs 10% of the points, hint 3 costs 25%. XP per difficulty " +
          CTF.DIFFICULTIES.map(function (d) { return d.label + "=" + d.xp; }).join(", ") + ". Level n needs n x 250 XP." }),
        el("li", { text: "Everything is fictional: reserved .invalid hostnames, documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), dummy secrets and invented identities." }),
        el("li", { text: "The Linux terminal, the web labs, the SQL lab and the XSS sandbox are simulations. sudo only works inside the in-memory image; no learner-supplied string is ever inserted as live HTML or executed as a script." }),
        el("li", { text: "Purpose: learn to think like an analyst - classify, correlate, verify, document. Not to attack real systems." })
      ])
    ]));
  }

  /* ----------------------------------------------------------------- render */
  function render() {
    var host = clear($("#view"));
    if (!host) return;
    renderHud();
    document.body.setAttribute("data-view", ui.view);
    Array.prototype.forEach.call(document.querySelectorAll(".nav-btn"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === ui.view);
    });
    switch (ui.view) {
      case "challenges": viewChallenges(host); break;
      case "challenge":
        viewChallenge(host, ui.challenge || CTF.byId(ui.param));
        break;
      case "campaigns": viewCampaigns(host); break;
      case "campaign":
        var meta = (CTF.CAMPAIGN_META || []).filter(function (m) { return m.id === ui.param; })[0];
        if (meta) { var p = CTF.campaignProgress(meta.id); viewSingleCampaign(host, meta, p); }
        else viewCampaigns(host);
        break;
      case "badges": viewBadges(host); break;
      case "progress": viewProgress(host); break;
      case "practice": viewPractice(host); break;
      case "about": viewAbout(host); break;
      default: viewDashboard(host);
    }
  }
  CTF.render = render;

  function viewSingleCampaign(host, meta, p) {
    host.appendChild(el("section", { class: "panel" }, [
      el("div", { class: "crumbs" }, [el("button", { class: "btn tiny ghost", text: "<- ALL CAMPAIGNS", onclick: function () { go("campaigns"); } })]),
      el("h1", { text: meta.id + " - " + meta.title }),
      el("p", { class: "lede", text: meta.summary }),
      el("div", { class: "campaign-arc mono", text: (meta.arc || []).join("  ->  ") }),
      el("div", { class: "hero-stats" }, [
        statCard("STAGES", p.done + " / " + p.total, p.complete ? "campaign closed" : "in progress"),
        statCard("POINTS", p.earned + " / " + meta.points, Math.round((p.earned / meta.points) * 100) + "%"),
        statCard("CATEGORY", "Mystery Archive", "multi-stage investigation")
      ])
    ]));
    var list = el("div", { class: "stage-list" });
    p.stages.forEach(function (s, i) {
      var solved = CTF.isSolved(s.id);
      var locked = i > 0 && !CTF.isSolved(p.stages[i - 1].id);
      list.appendChild(el("div", { class: "stage-row" + (solved ? " solved" : "") + (locked ? " locked" : "") }, [
        el("span", { class: "stage-no mono", text: "S" + s.stage }),
        el("span", { class: "stage-title", text: s.title.split(": ")[1] || s.title }),
        difficultyChip(s.difficulty),
        el("span", { class: "chip pts", text: s.points + " pts" }),
        el("span", { class: "stage-state mono", text: solved ? "SOLVED" : (locked ? "LOCKED" : "READY") }),
        el("button", { class: "btn tiny" + (locked ? " ghost" : " primary"), text: solved ? "REVIEW" : "OPEN", onclick: function () { if (!locked) openChallenge(s, false); } })
      ]));
    });
    host.appendChild(el("section", { class: "panel" }, [el("div", { class: "panel-head" }, [el("h2", { text: "STAGES" })]), list]));
    if (p.complete) {
      host.appendChild(el("section", { class: "panel closed" }, [
        el("div", { class: "panel-head" }, [el("h2", { text: "CASE CLOSED" })]),
        el("pre", { class: "mono ascii-box", text: asciiSolvedBox({ xp: CTF.xpFor("Expert"), points: 0, bonuses: [] }, { skills: ["Multi Artifact Correlation", "Case Documentation", "Attribution"] }) }),
        el("p", { class: "lede", text: "All five stages of " + meta.id + " are complete. Write the convergence summary in your notes: which artifacts agreed, which value each one produced, and what you can now assert rather than suggest." })
      ]));
    }
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".nav-btn"), function (b) {
      b.addEventListener("click", function () { go(b.getAttribute("data-view")); });
    });
    var dailyBtn = $("#nav-daily");
    if (dailyBtn) dailyBtn.addEventListener("click", function () { openChallenge(CTF.dailyChallenge(), false); });
    var randomBtn = $("#nav-random");
    if (randomBtn) randomBtn.addEventListener("click", function () {
      var c = CTF.randomChallenge(ui.filters);
      if (c) openChallenge(c, false); else toast("Nothing matches that filter.");
    });
    var globalSearch = $("#global-search");
    if (globalSearch) {
      globalSearch.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ui.filters.query = globalSearch.value;
          go("challenges");
        }
      });
    }
    CTF.evaluateBadges();
    render();
  }
  CTF.boot = boot;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof globalThis !== "undefined" ? globalThis : window);
