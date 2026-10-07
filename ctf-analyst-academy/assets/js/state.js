/* ============================================================================
 * state.js - progress, XP, points, hints, badges, daily/random selection
 * ----------------------------------------------------------------------------
 * Everything persists to localStorage (with a safe in-memory fallback when
 * storage is unavailable, e.g. some file:// setups) and can be exported to /
 * imported from a JSON file. Nothing is ever sent anywhere.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});
  var KEY = "ctf-analyst-academy.progress.v1";

  var memoryStore = {};
  var storage = (function () {
    try {
      var probe = "__ctf_probe__";
      root.localStorage.setItem(probe, "1");
      root.localStorage.removeItem(probe);
      return root.localStorage;
    } catch (e) {
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(memoryStore, k) ? memoryStore[k] : null; },
        setItem: function (k, v) { memoryStore[k] = String(v); },
        removeItem: function (k) { delete memoryStore[k]; }
      };
    }
  })();
  CTF.storageBackend = storage === root.localStorage ? "localStorage" : "in-memory (storage blocked)";

  function freshState() {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      xp: 0,
      points: 0,
      solved: {},            // id -> { at, points, xp, hintsUsed, attempts, perfect, firstSolve, daily, generated }
      badges: {},            // id -> { at }
      daily: {},             // "YYYY-MM-DD" -> challenge id
      dailyDone: {},         // "YYYY-MM-DD" -> true
      writeups: {},          // id -> learner notes (markdown-ish plain text)
      noHintStreak: 0,
      sessions: 0,
      lastPlayed: null,
      generatorSolved: 0
    };
  }

  var state = freshState();

  CTF.loadState = function () {
    var raw = storage.getItem(KEY);
    if (!raw) { state = freshState(); return state; }
    try {
      var parsed = JSON.parse(raw);
      state = Object.assign(freshState(), parsed);
      state.solved = parsed.solved || {};
      state.badges = parsed.badges || {};
      state.daily = parsed.daily || {};
      state.dailyDone = parsed.dailyDone || {};
      state.writeups = parsed.writeups || {};
    } catch (e) {
      state = freshState();
    }
    state.sessions = (state.sessions || 0) + 1;
    state.lastPlayed = new Date().toISOString();
    CTF.saveState();
    return state;
  };

  CTF.saveState = function () {
    try { storage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  };

  CTF.getState = function () { return state; };

  CTF.resetState = function () {
    state = freshState();
    CTF.saveState();
    return state;
  };

  CTF.exportState = function () { return JSON.stringify(state, null, 2); };

  CTF.importState = function (text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("not a progress file");
    state = Object.assign(freshState(), parsed);
    CTF.saveState();
    return state;
  };

  /* ------------------------------------------------------------- lookups */
  CTF.isSolved = function (id) { return !!state.solved[id]; };

  /* ---------------------------------------------------------- learner notes */
  CTF.getWriteup = function (id) { return (state.writeups || {})[id] || ""; };
  CTF.setWriteup = function (id, text) {
    state.writeups = state.writeups || {};
    state.writeups[id] = String(text === undefined || text === null ? "" : text);
    CTF.saveState();
    return state.writeups[id];
  };
  CTF.writeupIds = function () {
    return Object.keys(state.writeups || {}).filter(function (id) { return String(state.writeups[id]).trim().length > 0; });
  };
  CTF.solvedIds = function () { return Object.keys(state.solved); };
  CTF.solvedCount = function (category) {
    return CTF.solvedIds().filter(function (id) {
      var c = CTF.byId(id);
      return c && (!category || c.category === category);
    }).length;
  };
  CTF.solvedInCategory = function (category) {
    return CTF.solvedIds().filter(function (id) {
      var c = CTF.byId(id);
      return c && c.category === category;
    }).length;
  };
  CTF.noHintSolves = function () {
    return Object.keys(state.solved).filter(function (id) { return !state.solved[id].hintsUsed; }).length;
  };
  CTF.perfectSolves = function () {
    return Object.keys(state.solved).filter(function (id) { return state.solved[id].perfect; }).length;
  };
  CTF.totalPoints = function () { return state.points; };
  CTF.totalXp = function () { return state.xp; };

  CTF.campaignProgress = function (campaignId) {
    var stages = CTF.DB.filter(function (c) { return c.campaign === campaignId; })
      .sort(function (a, b) { return a.stage - b.stage; });
    var done = stages.filter(function (s) { return CTF.isSolved(s.id); }).length;
    var points = stages.reduce(function (a, s) { return a + s.points; }, 0);
    var earned = stages.filter(function (s) { return CTF.isSolved(s.id); })
      .reduce(function (a, s) { return a + (state.solved[s.id].points || 0); }, 0);
    return { id: campaignId, stages: stages, done: done, total: stages.length, points: points, earned: earned,
      complete: done === stages.length };
  };

  /* ------------------------------------------------------- scoring a solve */
  /**
   * Records a solve and returns the award breakdown.
   * opts: { hintsUsed, attempts, daily, generated }
   */
  CTF.recordSolve = function (challenge, opts) {
    opts = opts || {};
    var hintsUsed = Math.min(3, opts.hintsUsed || 0);
    var attempts = Math.max(1, opts.attempts || 1);
    var already = state.solved[challenge.id];
    if (already) return { repeat: true, previous: already };

    var firstSolve = Object.keys(state.solved).length === 0;
    var perfect = attempts === 1 && hintsUsed === 0;
    var points = CTF.awardedPoints(challenge, hintsUsed);
    var xp = CTF.xpFor(challenge.difficulty);
    var bonuses = [];

    if (firstSolve) { xp += CTF.BONUS_XP.firstSolve; bonuses.push({ label: "FIRST SOLVE", xp: CTF.BONUS_XP.firstSolve }); }
    if (hintsUsed === 0) { xp += CTF.BONUS_XP.noHint; bonuses.push({ label: "NO HINT", xp: CTF.BONUS_XP.noHint }); }
    if (perfect) { xp += CTF.BONUS_XP.perfectInvestigation; bonuses.push({ label: "PERFECT INVESTIGATION", xp: CTF.BONUS_XP.perfectInvestigation }); }

    if (opts.generated) {
      // procedural practice: XP only, database points stay untouched
      points = 0;
      state.generatorSolved = (state.generatorSolved || 0) + 1;
    } else {
      state.points += points;
    }
    state.xp += xp;
    if (hintsUsed === 0) state.noHintStreak = (state.noHintStreak || 0) + 1;
    else state.noHintStreak = 0;

    state.solved[challenge.id] = {
      at: new Date().toISOString(),
      points: points,
      xp: xp,
      hintsUsed: hintsUsed,
      attempts: attempts,
      perfect: perfect,
      firstSolve: firstSolve,
      daily: !!opts.daily,
      generated: !!opts.generated,
      difficulty: challenge.difficulty,
      category: challenge.category,
      skills: (challenge.skills || []).slice(0)
    };

    if (opts.daily) {
      var d = CTF.todayKey();
      state.dailyDone[d] = true;
      state.daily[d] = challenge.id;
    }

    var newBadges = CTF.evaluateBadges();
    CTF.saveState();
    return {
      repeat: false, points: points, xp: xp, bonuses: bonuses,
      hintsUsed: hintsUsed, attempts: attempts, perfect: perfect, firstSolve: firstSolve,
      newBadges: newBadges, level: CTF.levelFromXp(state.xp)
    };
  };

  /* ---------------------------------------------------------------- badges */
  CTF.BADGE_RULES = {
    FIRST_BLOOD: function () { return CTF.solvedIds().length >= 1; },
    CRYPTO_KID: function () { return CTF.solvedInCategory("Cryptography") >= 5; },
    NETWORK_SCOUT: function () { return CTF.solvedInCategory("Networking") >= 5; },
    FORENSIC_DETECTIVE: function () { return CTF.solvedInCategory("Digital Forensics") >= 5; },
    LINUX_RANGER: function () { return CTF.solvedInCategory("Linux") >= 5; },
    WEB_ANALYST: function () { return CTF.solvedInCategory("Web Security") >= 5; },
    STEGO_HUNTER: function () { return CTF.solvedInCategory("Steganography") >= 5; },
    CODE_SMITH: function () { return CTF.solvedInCategory("Programming") >= 5; },
    REVERSE_ADEPT: function () { return CTF.solvedInCategory("Reverse Engineering") >= 5; },
    OSINT_TRACKER: function () { return CTF.solvedInCategory("OSINT") >= 5; },
    DECODER_RING: function () { return CTF.solvedInCategory("Encoding") >= 5; },
    CASE_FILE_CLOSER: function () {
      return (CTF.CAMPAIGN_META || []).some(function (m) { return CTF.campaignProgress(m.id).complete; });
    },
    ARCHIVIST: function () {
      var metas = CTF.CAMPAIGN_META || [];
      return metas.length > 0 && metas.every(function (m) { return CTF.campaignProgress(m.id).complete; });
    },
    CTF_VETERAN: function () { return CTF.solvedIds().length >= 25; },
    MASTER_ANALYST: function () { return CTF.solvedIds().length >= 50; },
    NO_HINT: function () { return CTF.noHintSolves() >= 10; },
    PERFECTIONIST: function () { return CTF.perfectSolves() >= 5; },
    EXPERT_TRACK: function () {
      return CTF.solvedIds().filter(function (id) {
        var c = CTF.byId(id);
        return c && c.difficulty === "Expert";
      }).length >= 3;
    },
    POLYGLOT: function () {
      var cats = {};
      CTF.solvedIds().forEach(function (id) { var c = CTF.byId(id); if (c) cats[c.category] = true; });
      return Object.keys(cats).length >= 8;
    },
    DAILY_ANALYST: function () { return Object.keys(state.dailyDone || {}).length >= 3; },
    NIGHT_OWL: function () {
      return CTF.solvedIds().filter(function (id) {
        var h = new Date(state.solved[id].at).getHours();
        return h >= 0 && h < 5;
      }).length >= 5;
    },
    GENERATOR_ADEPT: function () { return (state.generatorSolved || 0) >= 10; }
  };

  CTF.badgeProgress = function (badgeId) {
    var n = CTF.solvedIds().length;
    var cat = function (name) { return CTF.solvedInCategory(name); };
    switch (badgeId) {
      case "FIRST_BLOOD": return { have: Math.min(n, 1), need: 1 };
      case "CRYPTO_KID": return { have: Math.min(cat("Cryptography"), 5), need: 5 };
      case "NETWORK_SCOUT": return { have: Math.min(cat("Networking"), 5), need: 5 };
      case "FORENSIC_DETECTIVE": return { have: Math.min(cat("Digital Forensics"), 5), need: 5 };
      case "LINUX_RANGER": return { have: Math.min(cat("Linux"), 5), need: 5 };
      case "WEB_ANALYST": return { have: Math.min(cat("Web Security"), 5), need: 5 };
      case "STEGO_HUNTER": return { have: Math.min(cat("Steganography"), 5), need: 5 };
      case "CODE_SMITH": return { have: Math.min(cat("Programming"), 5), need: 5 };
      case "REVERSE_ADEPT": return { have: Math.min(cat("Reverse Engineering"), 5), need: 5 };
      case "OSINT_TRACKER": return { have: Math.min(cat("OSINT"), 5), need: 5 };
      case "DECODER_RING": return { have: Math.min(cat("Encoding"), 5), need: 5 };
      case "CTF_VETERAN": return { have: Math.min(n, 25), need: 25 };
      case "MASTER_ANALYST": return { have: Math.min(n, 50), need: 50 };
      case "NO_HINT": return { have: Math.min(CTF.noHintSolves(), 10), need: 10 };
      case "PERFECTIONIST": return { have: Math.min(CTF.perfectSolves(), 5), need: 5 };
      case "DAILY_ANALYST": return { have: Math.min(Object.keys(state.dailyDone || {}).length, 3), need: 3 };
      case "EXPERT_TRACK": return {
        have: Math.min(CTF.solvedIds().filter(function (id) { var c = CTF.byId(id); return c && c.difficulty === "Expert"; }).length, 3), need: 3
      };
      case "POLYGLOT": return {
        have: Math.min((function () {
          var cats = {};
          CTF.solvedIds().forEach(function (id) { var c = CTF.byId(id); if (c) cats[c.category] = true; });
          return Object.keys(cats).length;
        })(), 8), need: 8
      };
      case "NIGHT_OWL": return {
        have: Math.min(CTF.solvedIds().filter(function (id) {
          var h = new Date(state.solved[id].at).getHours(); return h >= 0 && h < 5;
        }).length, 5), need: 5
      };
      case "GENERATOR_ADEPT": return { have: Math.min(state.generatorSolved || 0, 10), need: 10 };
      case "CASE_FILE_CLOSER": return {
        have: Math.min((CTF.CAMPAIGN_META || []).filter(function (m) { return CTF.campaignProgress(m.id).complete; }).length, 1), need: 1
      };
      case "ARCHIVIST": return {
        have: Math.min((CTF.CAMPAIGN_META || []).filter(function (m) { return CTF.campaignProgress(m.id).complete; }).length, 5), need: 5
      };
      default: return { have: 0, need: 1 };
    }
  };

  /** awards any newly satisfied badge; returns the list of newly earned ones */
  CTF.evaluateBadges = function () {
    var earned = [];
    CTF.BADGES.forEach(function (badge) {
      if (state.badges[badge.id]) return;
      var rule = CTF.BADGE_RULES[badge.id];
      if (!rule) return;
      var got = false;
      try { got = !!rule(); } catch (e) { got = false; }
      if (got) {
        state.badges[badge.id] = { at: new Date().toISOString() };
        earned.push(badge);
      }
    });
    if (earned.length) CTF.saveState();
    return earned;
  };

  /* ---------------------------------------------------- random and daily */
  CTF.todayKey = function (d) {
    var now = d || new Date();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + m + "-" + day;
  };

  /** deterministic 32-bit string hash (used for the daily pick and generator seeds) */
  CTF.hashString = function (str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  /** unsolved challenges, optionally filtered */
  CTF.unsolved = function (filter) {
    return CTF.DB.filter(function (c) {
      if (CTF.isSolved(c.id)) return false;
      if (filter && filter.category && filter.category !== "ALL" && c.category !== filter.category) return false;
      if (filter && filter.difficulty && filter.difficulty !== "ALL" && c.difficulty !== filter.difficulty) return false;
      return true;
    });
  };

  CTF.randomChallenge = function (filter) {
    var pool = CTF.unsolved(filter);
    if (!pool.length) pool = CTF.DB.filter(function (c) {
      return !filter || !filter.category || filter.category === "ALL" || c.category === filter.category;
    });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  /**
   * One challenge per local day, chosen deterministically from the local
   * database (no network, no external "word of the day" service).
   */
  CTF.dailyChallenge = function (dateKey) {
    var key = dateKey || CTF.todayKey();
    if (state.daily[key] && CTF.byId(state.daily[key])) return CTF.byId(state.daily[key]);
    var seed = CTF.hashString("daily:" + key);
    var pool = CTF.DB.slice();
    // prefer something not yet solved, but always return a challenge
    var unsolvedPool = pool.filter(function (c) { return !CTF.isSolved(c.id); });
    var pick = (unsolvedPool.length ? unsolvedPool : pool)[seed % (unsolvedPool.length || pool.length)];
    state.daily[key] = pick.id;
    CTF.saveState();
    return pick;
  };

  CTF.dailyIsDone = function (dateKey) { return !!(state.dailyDone[dateKey || CTF.todayKey()]); };

  /* --------------------------------------------------------------- filters */
  CTF.filterChallenges = function (f) {
    f = f || {};
    var q = (f.query || "").trim().toLowerCase();
    return CTF.DB.filter(function (c) {
      if (f.category && f.category !== "ALL" && c.category !== f.category) return false;
      if (f.difficulty && f.difficulty !== "ALL" && c.difficulty !== f.difficulty) return false;
      if (f.status === "SOLVED" && !CTF.isSolved(c.id)) return false;
      if (f.status === "UNSOLVED" && CTF.isSolved(c.id)) return false;
      if (f.pointsMin !== undefined && f.pointsMin !== null && c.points < f.pointsMin) return false;
      if (f.pointsMax !== undefined && f.pointsMax !== null && c.points > f.pointsMax) return false;
      if (f.campaignOnly && !c.campaign) return false;
      if (q) {
        var hay = [c.id, c.title, c.category, c.difficulty, (c.objective || ""), (c.skills || []).join(" ")]
          .join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  };

  CTF.sortChallenges = function (list, mode) {
    var out = list.slice();
    var order = { Beginner: 0, Easy: 1, Medium: 2, Hard: 3, Expert: 4 };
    switch (mode) {
      case "points-desc": out.sort(function (a, b) { return b.points - a.points; }); break;
      case "points-asc": out.sort(function (a, b) { return a.points - b.points; }); break;
      case "difficulty": out.sort(function (a, b) { return order[a.difficulty] - order[b.difficulty]; }); break;
      case "category": out.sort(function (a, b) { return a.category.localeCompare(b.category) || a.id.localeCompare(b.id); }); break;
      case "id": out.sort(function (a, b) { return a.id.localeCompare(b.id); }); break;
      default: out.sort(function (a, b) {
        var sa = CTF.isSolved(a.id) ? 1 : 0, sb = CTF.isSolved(b.id) ? 1 : 0;
        return sa - sb || order[a.difficulty] - order[b.difficulty] || a.id.localeCompare(b.id);
      });
    }
    return out;
  };

  /** the next unsolved challenge in a sensible learning order */
  CTF.nextChallenge = function (fromId) {
    var ordered = CTF.sortChallenges(CTF.DB, "default");
    var idx = fromId ? ordered.findIndex(function (c) { return c.id === fromId; }) : -1;
    for (var i = idx + 1; i < ordered.length; i++) if (!CTF.isSolved(ordered[i].id)) return ordered[i];
    for (var j = 0; j < ordered.length; j++) if (!CTF.isSolved(ordered[j].id)) return ordered[j];
    return null;
  };

  CTF.loadState();
})(typeof globalThis !== "undefined" ? globalThis : window);
