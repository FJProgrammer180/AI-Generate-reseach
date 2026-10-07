/* ============================================================================
 * artifacts.js - renders challenge evidence into the page
 * ----------------------------------------------------------------------------
 * One renderer per artifact type: cipher text, hex dumps, generated stego
 * images, simulated packet logs, virtual filesystems, web labs, code editors.
 *
 * Nothing is ever fetched, and nothing supplied by the dataset or typed by the
 * learner is inserted as live HTML or executed as script.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") throw new Error("html injection is not allowed in artifacts.js");
      else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  CTF.el = el;

  function panel(title, meta, bodyNodes) {
    return el("div", { class: "artifact" }, [
      el("div", { class: "artifact-head" }, [
        el("span", { class: "artifact-title", text: title }),
        meta ? el("span", { class: "artifact-meta", text: meta }) : null
      ]),
      el("div", { class: "artifact-body" }, bodyNodes)
    ]);
  }

  function pre(text, cls) {
    return el("pre", { class: "mono " + (cls || "artifact-pre"), text: String(text) });
  }

  function table(headers, rows, cls) {
    var head = el("tr", {}, (headers || []).map(function (h) { return el("th", { text: String(h) }); }));
    var body = (rows || []).map(function (r) {
      return el("tr", {}, r.map(function (cell) { return el("td", { text: String(cell === undefined || cell === null ? "" : cell) }); }));
    });
    return el("table", { class: "data-table " + (cls || "") }, [
      headers && headers.length ? el("thead", {}, [head]) : null,
      el("tbody", {}, body)
    ]);
  }

  /* ------------------------------------------------------- stego rendering */
  function stegoImage(spec, alpha) {
    var px = CTF.buildPixels(spec);
    var alphaMatrix = alpha ? CTF.buildAlpha(spec) : null;
    var scale = Math.max(4, Math.min(14, Math.floor(560 / Math.max(spec.w, spec.h))));
    var canvas = el("canvas", {
      width: spec.w * scale, height: spec.h * scale, class: "stego-canvas",
      title: spec.w + "x" + spec.h + " generated lab image"
    });
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(spec.w, spec.h);
    for (var y = 0; y < spec.h; y++) {
      for (var x = 0; x < spec.w; x++) {
        var i = (y * spec.w + x) * 4;
        img.data[i] = px[y][x][0];
        img.data[i + 1] = px[y][x][1];
        img.data[i + 2] = px[y][x][2];
        img.data[i + 3] = alphaMatrix ? alphaMatrix[y][x] : 255;
      }
    }
    // draw at 1:1 into an offscreen canvas, then scale up with smoothing off
    var tmp = document.createElement("canvas");
    tmp.width = spec.w; tmp.height = spec.h;
    tmp.getContext("2d").putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, spec.w * scale, spec.h * scale);

    var info = el("div", { class: "stego-info" }, [
      el("div", { class: "kv", text: "dimensions: " + spec.w + " x " + spec.h }),
      el("div", { class: "kv", text: "channels: " + (alphaMatrix ? "RGBA" : "RGB") }),
      el("div", { class: "kv", text: "generator seed: " + spec.seed + " (deterministic, offline)" })
    ]);
    return el("div", { class: "stego-wrap" }, [canvas, info]);
  }

  function pixelInspector(spec, channel, alpha) {
    var px = CTF.buildPixels(spec);
    var alphaMatrix = alpha ? CTF.buildAlpha(spec) : null;
    var chIndex = { r: 0, g: 1, b: 2 }[channel || "r"];
    var out = el("div", { class: "pixel-inspector" });
    var readout = el("div", { class: "mono pixel-readout", text: "hover or tap a pixel to inspect it" });
    var rowsBox = el("div", { class: "pixel-rows" });

    var rowSelect = el("select", { class: "input" });
    for (var r = 0; r < spec.h; r++) rowSelect.appendChild(el("option", { value: String(r), text: "row " + r }));
    rowSelect.addEventListener("change", function () { renderRow(parseInt(rowSelect.value, 10)); });

    function renderRow(rowIdx) {
      rowsBox.textContent = "";
      var cells = [];
      for (var x = 0; x < spec.w; x++) {
        (function (x) {
          var p = px[rowIdx][x];
          var a = alphaMatrix ? alphaMatrix[rowIdx][x] : 255;
          var cell = el("button", {
            class: "pixel-cell",
            title: "x=" + x + " y=" + rowIdx + " rgb(" + p.join(",") + ") a=" + a,
            onclick: function () {
              readout.textContent =
                "x=" + x + " y=" + rowIdx +
                "  R=" + p[0] + " G=" + p[1] + " B=" + p[2] + " A=" + a +
                "  |  LSB r=" + (p[0] & 1) + " g=" + (p[1] & 1) + " b=" + (p[2] & 1) + " a=" + (a & 1);
            }
          });
          cell.style.background = "rgb(" + p[0] + "," + p[1] + "," + p[2] + ")";
          cells.push(cell);
        })(x);
      }
      rowsBox.appendChild(el("div", { class: "pixel-row" }, cells));
      var lsbBits = px[rowIdx].map(function (p) { return String(p[chIndex] & 1); }).join("");
      var alphaBits = alphaMatrix ? alphaMatrix[rowIdx].map(function (v) { return String(v & 1); }).join("") : "";
      rowsBox.appendChild(el("div", { class: "mono lsb-line", text: "LSB(" + (channel || "r") + ") row " + rowIdx + ": " + lsbBits }));
      if (alphaBits) rowsBox.appendChild(el("div", { class: "mono lsb-line", text: "LSB(a)      row " + rowIdx + ": " + alphaBits }));
    }
    renderRow(0);
    out.appendChild(el("div", { class: "row-picker" }, [el("label", { text: "inspect row: " }), rowSelect]));
    out.appendChild(rowsBox);
    out.appendChild(readout);
    return out;
  }

  /* -------------------------------------------------------- workbench tools */
  function workbench(initialText) {
    var input = el("textarea", { class: "input mono workbench-input", rows: "3", spellcheck: "false" });
    input.value = initialText || "";
    var output = el("pre", { class: "mono workbench-output", text: "" });
    var status = el("div", { class: "workbench-status", text: "" });

    function run(label, fn) {
      return function () {
        try {
          var value = fn(input.value);
          if (value === null || value === undefined) throw new Error("no result");
          output.textContent = String(value);
          status.textContent = label + " ok (" + String(value).length + " chars)";
          status.className = "workbench-status ok";
        } catch (e) {
          output.textContent = "";
          status.textContent = label + " failed: " + (e && e.message ? e.message : e);
          status.className = "workbench-status bad";
        }
      };
    }
    function caesarRun() {
      var shift = parseInt(prompt("Caesar shift to apply (use a negative number to decode, e.g. -7):", "0") || "0", 10);
      if (isNaN(shift)) return;
      output.textContent = CTF.caesar(input.value, shift);
      status.textContent = "caesar " + shift + " ok";
      status.className = "workbench-status ok";
    }
    function vigenereRun() {
      var key = prompt("Vigenere keyword:", "GHOST") || "";
      var dec = confirm("OK = decrypt, Cancel = encrypt");
      output.textContent = CTF.vigenere(input.value, key, dec);
      status.textContent = "vigenere " + (dec ? "decrypt" : "encrypt") + " with '" + key + "' ok";
      status.className = "workbench-status ok";
    }

    var buttons = el("div", { class: "workbench-buttons" }, [
      el("button", { class: "btn tiny", text: "base64 decode", onclick: run("base64 decode", CTF.b64decodeSafe) }),
      el("button", { class: "btn tiny", text: "base64 encode", onclick: run("base64 encode", CTF.b64encode) }),
      el("button", { class: "btn tiny", text: "hex decode", onclick: run("hex decode", function (v) { return CTF.hexToStr(v); }) }),
      el("button", { class: "btn tiny", text: "hex encode", onclick: run("hex encode", function (v) { return CTF.strToHex(v); }) }),
      el("button", { class: "btn tiny", text: "binary decode", onclick: run("binary decode", CTF.fromBinary) }),
      el("button", { class: "btn tiny", text: "binary encode", onclick: run("binary encode", CTF.toBinary) }),
      el("button", { class: "btn tiny", text: "ascii decode", onclick: run("ascii decode", CTF.fromAsciiList) }),
      el("button", { class: "btn tiny", text: "url decode", onclick: run("url decode", CTF.urlDecode) }),
      el("button", { class: "btn tiny", text: "url encode", onclick: run("url encode", CTF.urlEncode) }),
      el("button", { class: "btn tiny", text: "ROT13", onclick: run("rot13", CTF.rot13) }),
      el("button", { class: "btn tiny", text: "Atbash", onclick: run("atbash", CTF.atbash) }),
      el("button", { class: "btn tiny", text: "Caesar...", onclick: caesarRun }),
      el("button", { class: "btn tiny", text: "Vigenere...", onclick: vigenereRun }),
      el("button", { class: "btn tiny", text: "reverse", onclick: run("reverse", function (v) { return v.split("").reverse().join(""); }) }),
      el("button", { class: "btn tiny", text: "XOR hex key", onclick: run("xor", function (v) {
        var key = prompt("XOR key as text (repeating):", "K9") || "";
        return CTF.toHex(CTF.xorBytes(CTF.utf8Bytes(v), CTF.utf8Bytes(key)));
      }) })
    ]);

    return el("div", { class: "workbench" }, [
      el("div", { class: "workbench-head", text: "ANALYST WORKBENCH - offline helpers, nothing is sent anywhere" }),
      input, buttons, output, status
    ]);
  }
  CTF.workbench = workbench;

  /* --------------------------------------------------------- blob artifacts */
  function blobView(hexString, opts) {
    opts = opts || {};
    var bytes = CTF.fromHex(hexString);
    var dump = CTF.hexdump(bytes, { length: opts.dumpBytes || bytes.length });
    var runs = CTF.strings(bytes, 4);
    var sigs = CTF.scanSignatures(bytes);
    var body = [
      el("div", { class: "kv-row" }, [
        el("span", { class: "kv", text: "size: " + bytes.length + " bytes" }),
        el("span", { class: "kv", text: "leading signature: " + (CTF.sniffSignature(bytes) || "none") })
      ]),
      sigs.length ? el("div", { class: "kv", text: "signature scan: " + sigs.map(function (s) {
        return s.name + "@0x" + s.offset.toString(16);
      }).join(", ") }) : null,
      el("div", { class: "sub-head", text: "HEX DUMP" }),
      pre(dump),
      el("div", { class: "sub-head", text: "PRINTABLE STRINGS (min length 4) - " + runs.length + " runs" }),
      pre(runs.map(function (s, i) { return "[" + i + "] " + s; }).join("\n") || "(none)")
    ];
    return panel("BINARY ARTIFACT", opts.meta || "", body);
  }

  /* ------------------------------------------------------------ main render */
  /**
   * Renders the evidence for a challenge into `host`.
   * Returns an object with optional helpers the UI can wire to (terminal, etc).
   */
  CTF.renderArtifact = function (host, challenge) {
    host.textContent = "";
    var d = challenge.data || {};
    var handles = {};

    switch (d.artifact) {
      case "cipher":
      case "encoded":
      case "hex":
      case "hexdump-inline":
      case "binary":
      case "numbers":
        host.appendChild(panel("EVIDENCE", d.meta || "", [pre(d.text)]));
        break;

      case "hexdump":
        host.appendChild(panel("HEX DUMP", d.meta || "", [
          d.text ? pre(d.text) : null,
          d.strings ? el("div", {}, [
            el("div", { class: "sub-head", text: "PRINTABLE STRINGS" }),
            pre(d.strings.map(function (s, i) { return "[" + i + "] " + s; }).join("\n"))
          ]) : null
        ]));
        break;

      case "blob":
        host.appendChild(blobView(d.hex, d));
        break;

      case "stego-image":
        host.appendChild(panel("GENERATED LAB IMAGE", d.meta || "", [
          stegoImage(d.spec, !!d.alpha),
          pixelInspector(d.spec, d.channel || "r", !!d.alpha),
          d.dumpTitle ? el("div", { class: "sub-head", text: d.dumpTitle.toUpperCase() }) : null,
          d.dump ? pre(d.dump) : null,
          d.lsbDump ? el("div", {}, [
            el("div", { class: "sub-head", text: "LSB OF ROW 0" }),
            pre(d.lsbDump)
          ]) : null
        ]));
        handles.imageDataURL = function () {
          var px = CTF.buildPixels(d.spec);
          return CTF.pixelsToDataURL(px, d.alpha ? CTF.buildAlpha(d.spec) : null);
        };
        break;

      case "metadata":
        host.appendChild(panel("METADATA RECORD", d.meta || "", [
          pre(JSON.stringify(d.meta2, null, 2))
        ]));
        break;

      case "table":
        host.appendChild(panel("DATASET", d.meta || "", [table(d.headers, d.rows)]));
        break;

      case "timeline":
        host.appendChild(panel("EVENT TIMELINE (arrival order)", d.meta || "", [
          table(["#", "TIMESTAMP", "EVENT"], (d.events || []).map(function (e) { return [e.id, e.ts, e.text]; }))
        ]));
        break;

      case "packet-log":
        host.appendChild(panel("SIMULATED PACKET CAPTURE", d.meta || "", [
          pre((d.packets || []).map(function (p) {
            return "#" + p.no + "  " + p.src + ":" + p.sport + " -> " + p.dst + ":" + p.dport +
              "  " + p.proto + "  [" + p.flags + "]  len=" + p.len + (p.info ? "  " + p.info : "");
          }).join("\n"))
        ]));
        break;

      case "case-file":
        host.appendChild(panel("CASE FILE", d.meta || "", (d.sections || []).map(function (sec) {
          return el("div", { class: "case-section" }, [
            el("div", { class: "sub-head", text: sec.title }),
            pre(sec.lines.join("\n"))
          ]);
        })));
        break;

      case "grid":
        host.appendChild(panel("LETTER GRID", d.meta || "", [
          pre((d.grid || []).map(function (r, i) { return "row " + i + ":  " + r.split("").join(" "); }).join("\n")),
          el("div", { class: "sub-head", text: "MOVES (start at row 0, column 0 - include that first letter)" }),
          pre((d.moves || []).map(function (m, i) { return (i + 1) + ". " + m; }).join("\n"))
        ]));
        break;

      case "vfs":
        host.appendChild(panel("VIRTUAL LAB FILESYSTEM", d.meta || "", [
          el("div", { class: "vfs-note", text: "Simulated image. Commands run against an in-memory tree; your machine is never touched." })
        ]));
        var term = CTF.createTerminal(d.view || {}, host);
        handles.terminal = term;
        break;

      case "web-lab":
        handles.webLab = CTF.renderWebLab(host, d);
        break;

      case "sql-lab":
        handles.sqlLab = CTF.renderSqlLab(host, d);
        break;

      case "xss-sandbox":
        handles.xss = CTF.renderXssSandbox(host, d);
        break;

      case "code":
        host.appendChild(panel("SOURCE", d.meta || "", [
          pre(d.code, "code-block"),
          d.reference ? el("div", { class: "kv", text: "expected behaviour: " + d.reference }) : null
        ]));
        break;

      default:
        host.appendChild(panel("EVIDENCE", d.meta || "", [pre(d.text || JSON.stringify(d, null, 2))]));
    }

    if (d.substitution) {
      host.appendChild(panel("SUBSTITUTION TABLE", "plain -> cipher", [
        table(["PLAIN", d.substitution.alphabet.split("")], [["CIPHER", d.substitution.key.split("")]])
      ]));
    }

    host.appendChild(workbench(d.text || ""));
    return handles;
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
