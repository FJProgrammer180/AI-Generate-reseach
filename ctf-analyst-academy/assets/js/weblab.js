/* ============================================================================
 * weblab.js - simulated web labs (inert by design)
 * ----------------------------------------------------------------------------
 * WEB labs, the SQL shape-evaluator lab, and the XSS sandbox. The rule that
 * drives every function here: user-supplied or dataset-supplied strings are
 * only ever rendered as escaped text. Nothing is assigned to innerHTML, no
 * script tag is created, no request is made, no database is contacted.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});
  var el = CTF.el;

  function pre(text, cls) { return el("pre", { class: "mono " + (cls || "lab-pre"), text: String(text === undefined || text === null ? "" : text) }); }
  function head(t) { return el("div", { class: "sub-head", text: t }); }

  /** What a parsing sink would build from this text, described - never built. */
  function describeMarkup(text) {
    var tagRe = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g;
    var found = [];
    var m;
    while ((m = tagRe.exec(String(text))) !== null) found.push(m[1].toLowerCase());
    if (!found.length) return "no tags recognised - the text would render as plain characters";
    var events = /\son[a-z]+\s*=/i.test(String(text)) ? " and at least one inline event handler attribute (on*=)" : "";
    var js = /<\s*script/i.test(String(text)) ? " including a script element, which would execute on insert" : "";
    return "would create element(s): " + found.join(", ") + events + js;
  }

  /* ---------------------------------------------------------------- WEB lab */
  CTF.renderWebLab = function (host, d) {
    var mode = d.mode || "code";

    if (mode === "safe-vs-unsafe") {
      var unsafeOut = el("div", { class: "lab-result bad" });
      var safeOut = el("div", { class: "lab-result good" });
      var input = el("input", { class: "input mono", type: "text", value: d.sample || "", spellcheck: "false" });
      var btn = el("button", { class: "btn", text: "RENDER IN SIMULATION" });
      function run() {
        var v = input.value;
        unsafeOut.textContent = "";
        unsafeOut.appendChild(el("div", { class: "kv", text: "sink: " + (d.unsafeLine || "innerHTML") }));
        unsafeOut.appendChild(el("div", { class: "kv", text: "rendered text (escaped, inert): " }));
        unsafeOut.appendChild(pre(v));
        unsafeOut.appendChild(el("div", { class: "kv", text: "effect: " + describeMarkup(v) }));
        safeOut.textContent = "";
        safeOut.appendChild(el("div", { class: "kv", text: "sink: " + (d.safeLine || "textContent") }));
        safeOut.appendChild(el("div", { class: "kv", text: "rendered text (as literal characters): " }));
        safeOut.appendChild(pre(v));
        safeOut.appendChild(el("div", { class: "kv", text: "effect: no elements are created, the value stays data" }));
      }
      btn.addEventListener("click", run);
      run();
      host.appendChild(el("div", { class: "artifact" }, [
        el("div", { class: "artifact-head" }, [
          el("span", { class: "artifact-title", text: "TWO RENDERING PATHS" }),
          el("span", { class: "artifact-meta", text: d.meta || "simulation only - no markup is ever inserted" })
        ]),
        el("div", { class: "artifact-body" }, [
          el("div", { class: "lab-row" }, [
            el("div", { class: "lab-card bad" }, [head("WIDGET A (unsafe sink)"), pre(d.unsafeLine)]),
            el("div", { class: "lab-card good" }, [head("WIDGET B (safe sink)"), pre(d.safeLine)])
          ]),
          head("TYPE A VALUE AND COMPARE THE TWO SINKS"),
          el("div", { class: "lab-inputrow" }, [input, btn]),
          el("div", { class: "lab-row" }, [
            el("div", { class: "lab-card bad" }, [head("WIDGET A OUTPUT"), unsafeOut]),
            el("div", { class: "lab-card good" }, [head("WIDGET B OUTPUT"), safeOut])
          ]),
          el("div", { class: "lab-note", text: "Both outputs above are text. This page never assigns your value to innerHTML, so nothing you type can run." })
        ])
      ]));
      return { mode: mode };
    }

    if (mode === "traffic") {
      var rows = (d.exchanges || []).map(function (ex, i) {
        return el("div", { class: "exchange" }, [
          head("EXCHANGE " + (i + 1)),
          pre(ex.request, "req"),
          pre(ex.response, "res")
        ]);
      });
      host.appendChild(el("div", { class: "artifact" }, [
        el("div", { class: "artifact-head" }, [
          el("span", { class: "artifact-title", text: "SIMULATED HTTP EXCHANGES" }),
          el("span", { class: "artifact-meta", text: d.meta || "fictional hosts, no network traffic" })
        ]),
        el("div", { class: "artifact-body" }, rows)
      ]));
      return { mode: mode };
    }

    if (mode === "findings") {
      var tableRows = (d.findings || []).map(function (f) { return [f.id, f.text]; });
      host.appendChild(el("div", { class: "artifact" }, [
        el("div", { class: "artifact-head" }, [
          el("span", { class: "artifact-title", text: "FINDINGS TO TRIAGE" }),
          el("span", { class: "artifact-meta", text: d.meta || "" })
        ]),
        el("div", { class: "artifact-body" }, [
          el("table", { class: "data-table" }, [
            el("thead", {}, [el("tr", {}, [el("th", { text: "ID" }), el("th", { text: "FINDING" })])]),
            el("tbody", {}, tableRows.map(function (r) {
              return el("tr", {}, [el("td", { class: "mono", text: r[0] }), el("td", { text: r[1] })]);
            }))
          ]),
          el("div", { class: "lab-note", text: "Submit the ordering with '>' between labels, for example F1>F2>F3>F4." })
        ])
      ]));
      return { mode: mode };
    }

    if (mode === "token") {
      var decoded = el("div", { class: "token-decoded" });
      var tokenInput = el("input", { class: "input mono", type: "text", placeholder: "paste a three-part token here", spellcheck: "false" });
      var decodeBtn = el("button", { class: "btn", text: "DECODE PARTS (base64url)" });
      function b64urlDecode(seg) {
        var s = String(seg).replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        return CTF.b64decodeSafe(s);
      }
      function doDecode() {
        var parts = String(tokenInput.value || "").split(".");
        decoded.textContent = "";
        decoded.appendChild(el("div", { class: "kv", text: "segment count: " + parts.length }));
        ["header", "payload", "signature"].forEach(function (label, i) {
          if (i >= parts.length) return;
          var raw = parts[i];
          decoded.appendChild(head(label.toUpperCase() + " SEGMENT"));
          decoded.appendChild(pre("raw: " + (raw.length ? raw : "(empty)")));
          if (i < 2 && raw.length) {
            var txt = "(not decodable)";
            try { txt = b64urlDecode(raw); } catch (e) { txt = "(not decodable: " + e.message + ")"; }
            decoded.appendChild(pre("decoded: " + txt));
          } else if (i === 2) {
            decoded.appendChild(pre("signature present: " + (raw.length ? "yes (" + raw.length + " chars)" : "NO - empty segment")));
          }
        });
      }
      decodeBtn.addEventListener("click", doDecode);

      var tokenList = el("div", { class: "token-list" }, (d.tokens || []).map(function (t) {
        var row = el("div", { class: "token-row" }, [
          el("div", { class: "kv", text: t.label }),
          pre(t.value),
          el("button", { class: "btn tiny", text: "load into decoder", onclick: function () { tokenInput.value = t.value; doDecode(); } })
        ]);
        return row;
      }));

      var forgeBox = el("div", { class: "forge-box" });
      if (d.forgeParts) {
        var headerIn = el("input", { class: "input mono", type: "text", value: d.forgeParts.header || "", spellcheck: "false" });
        var payloadIn = el("input", { class: "input mono", type: "text", value: d.forgeParts.payload || "", spellcheck: "false" });
        var forgeOut = pre("");
        var forgeBtn = el("button", { class: "btn", text: "BUILD TOKEN (base64url, no signing)" });
        forgeBtn.addEventListener("click", function () {
          var h = CTF.b64encode(headerIn.value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          var p = CTF.b64encode(payloadIn.value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          forgeOut.textContent = h + "." + p + ".";
        });
        forgeBox.appendChild(head("TOKEN ASSEMBLER - edits text only, nothing is signed or sent"));
        forgeBox.appendChild(el("div", { class: "lab-inputrow" }, [el("label", { text: "header json: " }), headerIn]));
        forgeBox.appendChild(el("div", { class: "lab-inputrow" }, [el("label", { text: "payload json: " }), payloadIn]));
        forgeBox.appendChild(forgeBtn);
        forgeBox.appendChild(forgeOut);
      }

      host.appendChild(el("div", { class: "artifact" }, [
        el("div", { class: "artifact-head" }, [
          el("span", { class: "artifact-title", text: "TOKEN LAB" }),
          el("span", { class: "artifact-meta", text: d.meta || "dummy secret, fictional service" })
        ]),
        el("div", { class: "artifact-body" }, [
          head("SERVER-SIDE VALIDATOR (inert code listing)"),
          pre(d.code, "code-block"),
          head("TOKENS CAPTURED IN THE LAB"),
          tokenList,
          head("DECODER"),
          el("div", { class: "lab-inputrow" }, [tokenInput, decodeBtn]),
          decoded,
          forgeBox
        ])
      ]));
      return { mode: mode };
    }

    /* default: code review mode */
    var extra = [];
    if (d.simulatedFields) {
      extra.push(head("FIELDS AT THE TRUST BOUNDARY"));
      extra.push(el("table", { class: "data-table" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "FIELD" }), el("th", { text: "SAMPLE VALUE" }), el("th", { text: "VALIDATION APPLIED" })])]),
        el("tbody", {}, d.simulatedFields.map(function (f) {
          return el("tr", {}, [el("td", { class: "mono", text: f.name }), el("td", { class: "mono", text: f.sample }), el("td", { text: f.validation })]);
        }))
      ]));
    }
    host.appendChild(el("div", { class: "artifact" }, [
      el("div", { class: "artifact-head" }, [
        el("span", { class: "artifact-title", text: "SIMULATED APPLICATION" }),
        el("span", { class: "artifact-meta", text: d.meta || "inert code listing" })
      ]),
      el("div", { class: "artifact-body" }, [head("CODE UNDER REVIEW"), pre(d.code, "code-block")].concat(extra))
    ]));
    return { mode: "code" };
  };

  /* -------------------------------------------------------------- SQL lab */
  /**
   * A tiny SQL *shape* evaluator. It understands exactly one statement shape
   * against the dummy table and never executes anything else.
   */
  function evaluateSql(table, sql) {
    var m = /^select\s+\*\s+from\s+users\s+where\s+(.+)$/i.exec(String(sql).trim());
    if (!m) return { ok: false, error: "this lab only evaluates: SELECT * FROM users WHERE ...", rows: [] };
    var where = m[1];

    function evalExpr(expr, row) {
      var parts = expr.split(/\s+or\s+/i);
      return parts.some(function (part) {
        return part.split(/\s+and\s+/i).every(function (atom) { return evalAtom(atom.trim(), row); });
      });
    }
    function evalAtom(atom, row) {
      var eq = /^(.*?)\s*(=|!=|<>)\s*(.*)$/.exec(atom);
      if (!eq) return { ok: false, error: "unsupported expression: " + atom };
      var left = stripValue(eq[1].trim(), row);
      var right = stripValue(eq[3].trim(), row);
      if (left.error || right.error) return left.error ? left : right;
      return { ok: true, value: eq[2] === "=" ? left.value === right.value : left.value !== right.value };
    }
    function stripValue(token, row) {
      var t = token.trim();
      var quoted = /^'([\s\S]*)'$/.exec(t);
      if (quoted) return { value: quoted[1] };
      if (/^\d+$/.test(t)) return { value: t };
      var col = Object.keys(row).filter(function (k) { return k.toLowerCase() === t.toLowerCase(); })[0];
      if (col) return { value: String(row[col]) };
      return { error: "unknown identifier: " + t };
    }

    var rows = [];
    var notes = [];
    for (var i = 0; i < table.length; i++) {
      var res = evalExpr(where, table[i]);
      if (res.error) return { ok: false, error: res.error, rows: [], sql: sql };
      if (res.value) rows.push(table[i]);
    }
    if (/#|--|\/\*/.test(where)) notes.push("a comment marker appears in the query text - everything after it is ignored");
    return { ok: true, rows: rows, notes: notes, sql: sql, where: where };
  }

  CTF.renderSqlLab = function (host, d) {
    var table = d.table || [];
    var usernameIn = el("input", { class: "input mono", type: "text", value: "guest", spellcheck: "false" });
    var pinIn = el("input", { class: "input mono", type: "text", value: "1234", spellcheck: "false" });
    var sqlOut = pre("");
    var resultOut = el("div", { class: "lab-result" });
    var statusOut = el("div", { class: "lab-note" });

    function run() {
      var sql = d.builder.replace("<username>", usernameIn.value).replace("<pin>", pinIn.value);
      sqlOut.textContent = sql;
      resultOut.textContent = "";
      var res = evaluateSql(table, sql);
      if (!res.ok) {
        statusOut.textContent = "evaluator: " + res.error;
        statusOut.className = "lab-note bad";
        return;
      }
      statusOut.textContent = res.rows.length
        ? "returned " + res.rows.length + " row(s)" + (res.notes.length ? " - " + res.notes.join("; ") : "")
        : "returned 0 rows (login would fail)";
      statusOut.className = "lab-note " + (res.rows.length ? "bad" : "good");
      if (res.rows.length) {
        resultOut.appendChild(el("table", { class: "data-table" }, [
          el("thead", {}, [el("tr", {}, Object.keys(res.rows[0]).map(function (k) { return el("th", { text: k }); }))]),
          el("tbody", {}, res.rows.map(function (r) {
            return el("tr", {}, Object.keys(r).map(function (k) { return el("td", { class: "mono", text: String(r[k]) }); }));
          }))
        ]));
      }
      resultOut.appendChild(el("div", { class: "kv", text: "first returned username: " + (res.rows.length ? res.rows[0].username : "(none)") }));
    }

    var runBtn = el("button", { class: "btn", text: "RUN (SIMULATED)" });
    runBtn.addEventListener("click", run);
    var safeBtn = el("button", { class: "btn ghost", text: "SHOW PARAMETERISED VERSION" });
    var safeOut = pre("");
    safeBtn.addEventListener("click", function () {
      safeOut.textContent = d.safeBuilder + "\n\n-- the driver sends the statement and the values separately:\n" +
        "--   parameters: [ " + JSON.stringify(usernameIn.value) + ", " + JSON.stringify(pinIn.value) + " ]\n" +
        "-- no input can change the shape of the statement, so no tautology can be injected.";
    });

    host.appendChild(el("div", { class: "artifact" }, [
      el("div", { class: "artifact-head" }, [
        el("span", { class: "artifact-title", text: "SQL SHAPE LAB" }),
        el("span", { class: "artifact-meta", text: d.meta || "dummy in-memory table only" })
      ]),
      el("div", { class: "artifact-body" }, [
        head("DUMMY TABLE (three fictional rows)"),
        el("table", { class: "data-table" }, [
          el("thead", {}, [el("tr", {}, Object.keys(table[0] || { username: "", pin: "", role: "" }).map(function (k) { return el("th", { text: k }); }))]),
          el("tbody", {}, table.map(function (r) {
            return el("tr", {}, Object.keys(r).map(function (k) { return el("td", { class: "mono", text: String(r[k]) }); }));
          }))
        ]),
        head("VULNERABLE BUILDER"),
        pre(d.builder),
        head("INPUTS"),
        el("div", { class: "lab-inputrow" }, [el("label", { text: "username: " }), usernameIn]),
        el("div", { class: "lab-inputrow" }, [el("label", { text: "pin: " }), pinIn]),
        el("div", { class: "lab-inputrow" }, [runBtn, safeBtn]),
        head("GENERATED QUERY TEXT"),
        sqlOut,
        head("RESULT"),
        statusOut,
        resultOut,
        head("PARAMETERISED ALTERNATIVE"),
        safeOut,
        el("div", { class: "lab-note", text: "This lab evaluates one fixed statement shape against the dummy rows above. It is not a database, it cannot be extended, and nothing leaves the page." })
      ])
    ]));
    run();
    return { mode: "sql", run: run, evaluate: function (u, p) {
      return evaluateSql(table, d.builder.replace("<username>", u).replace("<pin>", p));
    } };
  };

  /* ---------------------------------------------------------- XSS sandbox */
  CTF.renderXssSandbox = function (host, d) {
    var input = el("textarea", { class: "input mono", rows: "2", spellcheck: "false" });
    input.value = (d.inertSamples && d.inertSamples[0]) || "";
    var out = el("div", { class: "lab-result" });
    var btn = el("button", { class: "btn", text: "ANALYSE (INERT)" });

    function analyse() {
      var v = input.value;
      out.textContent = "";
      out.appendChild(el("div", { class: "kv", text: "value length: " + v.length + " characters" }));
      out.appendChild(head("HOW THE UNSAFE WIDGET WOULD HANDLE IT"));
      out.appendChild(pre(d.code));
      out.appendChild(el("div", { class: "kv", text: "sink: " + d.sink }));
      out.appendChild(el("div", { class: "kv", text: "the value as literal text (escaped, inert):" }));
      out.appendChild(pre(v));
      out.appendChild(el("div", { class: "kv", text: "what that sink would do with it: " + describeMarkup(v) }));
      out.appendChild(head("WHAT A SAFE SINK DOES INSTEAD"));
      (d.safeAlternatives || []).forEach(function (alt) {
        out.appendChild(el("div", { class: "kv", text: "- " + alt + ": the value stays data, no element or handler is created" }));
      });
      out.appendChild(el("div", { class: "kv", text: "textContent output: " + v }));
      out.appendChild(head("DEFENCE IN DEPTH"));
      out.appendChild(el("div", { class: "kv", text: "- encode for the output context (HTML body, attribute, URL, JS)" }));
      out.appendChild(el("div", { class: "kv", text: "- validate/allowlist at the boundary" }));
      out.appendChild(el("div", { class: "kv", text: "- Content-Security-Policy with no inline scripts limits what a successful injection can do" }));
      out.appendChild(el("div", { class: "kv", text: "- HttpOnly + Secure on session cookies limits what can be read back" }));
    }
    btn.addEventListener("click", analyse);

    var samples = el("div", { class: "lab-inputrow" }, (d.inertSamples || []).map(function (s, i) {
      return el("button", {
        class: "btn tiny ghost", text: "sample " + (i + 1),
        onclick: function () { input.value = s; analyse(); }
      });
    }));

    host.appendChild(el("div", { class: "artifact" }, [
      el("div", { class: "artifact-head" }, [
        el("span", { class: "artifact-title", text: "XSS SANDBOX (NON-EXECUTING)" }),
        el("span", { class: "artifact-meta", text: "your input is analysed as text; this page never executes it" })
      ]),
      el("div", { class: "artifact-body" }, [
        head("WIDGET UNDER REVIEW"),
        pre(d.code, "code-block"),
        head("TYPE OR LOAD A VALUE"),
        samples,
        input,
        btn,
        out
      ])
    ]));
    analyse();
    return { mode: "xss", analyse: analyse };
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
