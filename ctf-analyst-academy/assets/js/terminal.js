/* ============================================================================
 * vfs.js - the simulated Linux terminal used by the Linux and CASE-003 labs
 * ----------------------------------------------------------------------------
 * A read-only, in-memory filesystem image with a small set of classic commands.
 * `sudo` works inside the simulation only: it never touches the real machine and
 * never asks for a real password.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  function isDir(n) { return !!n && !!n.dir; }
  function modeString(n) {
    var mode = normMode(n.mode, isDir(n) ? "-rwxr-xr-x" : "-rw-r--r--");
    if (isDir(n)) return "d" + mode.slice(1);
    return mode;
  }

  /* ------------------------------------------------------- tree normalising
   * Two shapes exist in this project and both are accepted:
   *   curated (data/vfs.js)  dir -> { "/": { perm, owner, group, mtime }, <child>: {...} }
   *                          file -> { "$": "text", perm, owner, group, mtime }
   *   canonical (generator)  dir -> { dir:true, name, owner, group, mode:"0755", children:{} }
   *                          file -> { name, owner, group, mode:"0644", content:"text" }
   * Everything is folded into the canonical shape with a symbolic mode string,
   * because `readable()` and `longLine()` reason about rwx triples.
   */
  function octalToSymbolic(digits) {
    var d = String(digits).replace(/^0+/, "") || "0";
    while (d.length < 3) d = "0" + d;
    d = d.slice(-3);
    var out = "";
    for (var i = 0; i < 3; i++) {
      var n = parseInt(d.charAt(i), 8) || 0;
      out += (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-");
    }
    return "-" + out;
  }

  function normMode(value, fallback) {
    var m = value === undefined || value === null ? "" : String(value).trim();
    if (!m) return fallback || "-rw-r--r--";
    if (/^0?[0-7]{3,4}$/.test(m)) return octalToSymbolic(m);
    return m;
  }

  function normalizeTree(raw, name) {
    if (!raw || typeof raw !== "object") return null;
    var meta = raw["/"] && typeof raw["/"] === "object" ? raw["/"] : {};
    if (raw["$"] !== undefined || (raw.content !== undefined && !raw.children)) {
      var content = raw["$"] !== undefined ? raw["$"] : raw.content;
      return {
        name: name || raw.name || "file",
        owner: raw.owner || meta.owner || "root",
        group: raw.group || meta.group || "root",
        mode: normMode(raw.mode || raw.perm || meta.mode || meta.perm, "-rw-r--r--"),
        mtime: raw.mtime || meta.mtime || "",
        fileType: raw.fileType || "",
        content: content === undefined || content === null ? "" : String(content)
      };
    }
    var source = raw.children && typeof raw.children === "object" ? raw.children : raw;
    var children = {};
    Object.keys(source).forEach(function (key) {
      if (key === "/" || key === "children") return;
      var child = normalizeTree(source[key], key);
      if (child) children[key] = child;
    });
    return {
      dir: true,
      name: name === undefined || name === "" ? "/" : name,
      owner: raw.owner || meta.owner || "root",
      group: raw.group || meta.group || "root",
      mode: normMode(raw.mode || raw.perm || meta.mode || meta.perm, "-rwxr-xr-x"),
      mtime: raw.mtime || meta.mtime || "",
      children: children
    };
  }

  function makeEnv(view) {
    view = view || {};
    // a view may carry its own tree (procedural practice labs) instead of the curated image
    var rawTree = view.tree || CTF.VFS || {};
    // the curated image is wrapped: CTF.VFS === { "/": <root node> }
    while (rawTree && !rawTree.dir && rawTree["$"] === undefined &&
           Object.keys(rawTree).length === 1 && rawTree["/"]) {
      rawTree = rawTree["/"];
    }
    var tree = normalizeTree(rawTree, "/") ||
      { dir: true, name: "/", owner: "root", group: "root", mode: "-rwxr-xr-x", children: {} };
    var user = view.user || "analyst";
    var env = {
      tree: tree,
      cwd: "/",
      user: user,
      groups: (view.groups || [user]).slice(),
      // `sudo: true` (curated views) or `sudo: ["analyst"]` (generated views)
      sudoers: Array.isArray(view.sudo) ? view.sudo.slice() : (view.sudo ? [user] : []),
      hintPath: view.hintPath || null,
      pattern: view.pattern || null,
      history: [],
      lastPath: null,
      lastPattern: null,
      lastCommand: null,
      commandsRun: 0,
      sudoUsed: 0,
      hiddenShown: false,
      startedAt: new Date().toISOString()
    };
    var start = resolvePath(env, view.start || view.cwd || "/");
    env.cwd = lookup(env, start) ? start : "/";
    return env;
  }

  function resolvePath(env, input) {
    if (!input) return env.cwd;
    var parts;
    var expanded = String(input).replace(/^~/, "/home/" + env.user);
    if (expanded.charAt(0) === "/") parts = expanded.split("/");
    else parts = (env.cwd + "/" + expanded).split("/");
    var stack = [];
    parts.forEach(function (p) {
      if (!p || p === ".") return;
      if (p === "..") { stack.pop(); return; }
      stack.push(p);
    });
    return "/" + stack.join("/");
  }

  function lookup(env, path) {
    var parts = path.split("/").filter(Boolean);
    var node = env.tree;
    for (var i = 0; i < parts.length; i++) {
      if (!isDir(node)) return null;
      node = node.children[parts[i]];
      if (!node) return null;
    }
    return node;
  }

  function readable(env, node, sudo) {
    if (sudo) return true;
    var m = String(node.mode).slice(1);
    var pos = -1;
    if (node.owner === env.user) pos = 0;
    else if ((env.groups || []).indexOf(node.group) >= 0) pos = 3;
    else pos = 6;
    return m.charAt(pos) === "r";
  }

  function walk(node, path, out) {
    out.push({ path: path, node: node });
    if (isDir(node)) Object.keys(node.children).forEach(function (name) {
      walk(node.children[name], path === "/" ? "/" + name : path + "/" + name, out);
    });
    return out;
  }

  function allNodes(env) { return walk(env.tree, "", []).filter(function (e) { return e.path; }); }

  /* ------------------------------------------------------------- commands */
  function cmdHelp(env) {
    return [
      "available commands (all simulated, offline):",
      "  help                      this list",
      "  pwd                       print working directory",
      "  whoami                    current lab user",
      "  id                        user and group membership",
      "  ls [-a] [-l] [path]       list directory contents",
      "  cd <path>                 change directory (.. and ~ supported)",
      "  cat <file>                print a file",
      "  head|tail [-n N] <file>   first / last lines of a file",
      "  grep [-i] <pattern> <path>   recursive search, prints path:line:text",
      "  find <name-pattern>       search the tree (* wildcard supported)",
      "  stat <path>               owner, group, mode, size",
      "  file <path>               guess the type from magic bytes",
      "  xxd <file>                hex dump of a file",
      "  strings <file>            printable runs of 4+ characters",
      "  echo <text>               print text (with $VAR expansion)",
      "  history                   commands you have run",
      "  sudo <command>            run a command with elevated rights (simulated)",
      "  clear                     clear the screen",
      "",
      "hint path for this lab: " + (env.hintPath || "(none)")
    ].join("\n");
  }

  function cmdLs(env, args) {
    var showAll = args.indexOf("-a") >= 0 || args.indexOf("-la") >= 0 || args.indexOf("-al") >= 0;
    var long = args.indexOf("-l") >= 0 || args.indexOf("-la") >= 0 || args.indexOf("-al") >= 0;
    var target = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    var path = resolvePath(env, target);
    var node = lookup(env, path);
    if (!node) return "ls: cannot access '" + target + "': No such file or directory";
    if (!isDir(node)) return long ? [longLine(env, path, node)].join("\n") : node.name || path.split("/").pop();
    var names = Object.keys(node.children).sort();
    if (!showAll) names = names.filter(function (n) { return n.charAt(0) !== "."; });
    if (long) {
      var lines = ["total " + names.length];
      names.forEach(function (n) { lines.push(longLine(env, path === "/" ? "/" + n : path + "/" + n, node.children[n])); });
      return lines.join("\n");
    }
    return names.join("  ") || "(empty)";
  }

  function longLine(env, path, node) {
    var size = isDir(node) ? 4096 : String(node.content || "").length;
    var name = node.name || path.split("/").pop();
    return [modeString(node), node.owner, node.group, String(size).padStart(6), node.mtime || "-", name].join(" ");
  }

  function cmdCat(env, args, sudo) {
    var target = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    if (!target) return "cat: missing file operand";
    var path = resolvePath(env, target);
    var node = lookup(env, path);
    if (!node) return "cat: " + target + ": No such file or directory";
    if (isDir(node)) return "cat: " + target + ": Is a directory";
    if (!readable(env, node, sudo)) {
      return "cat: " + target + ": Permission denied  (mode " + node.mode +
        ", owner " + node.owner + ", group " + node.group + "; you are '" + env.user + "'" +
        (env.sudoers.indexOf(env.user) >= 0 ? " - sudo is available for you" : "") + ")";
    }
    env.lastPath = path;
    return node.content || "(empty file)";
  }

  function cmdHeadTail(env, args, which) {
    var n = 10;
    var nIdx = args.indexOf("-n");
    if (nIdx >= 0 && args[nIdx + 1]) { n = parseInt(args[nIdx + 1], 10) || 10; args = args.filter(function (_, i) { return i !== nIdx + 1; }); }
    var target = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
    var node = lookup(env, resolvePath(env, target || ""));
    if (!node || isDir(node)) return which + ": cannot read '" + target + "'";
    var lines = String(node.content || "").split("\n");
    return which === "head" ? lines.slice(0, n).join("\n") : lines.slice(-n).join("\n");
  }

  function cmdGrep(env, args, sudo) {
    var insensitive = args.indexOf("-i") >= 0;
    var positional = args.filter(function (a) { return a.charAt(0) !== "-"; });
    var pattern = positional[0];
    var target = positional[1];
    if (!pattern) return "grep: missing pattern";
    env.lastPattern = pattern;
    var start = lookup(env, resolvePath(env, target || env.cwd));
    if (!start) return "grep: " + target + ": No such file or directory";
    var startPath = resolvePath(env, target || env.cwd);
    var nodes = isDir(start)
      ? walk(start, startPath, []).filter(function (e) { return !isDir(e.node); })
      : [{ path: startPath, node: start }];
    var rx;
    try { rx = new RegExp(pattern, insensitive ? "i" : ""); }
    catch (e) { return "grep: invalid pattern"; }
    var out = [];
    nodes.forEach(function (entry) {
      if (!readable(env, entry.node, sudo)) {
        out.push("grep: " + entry.path + ": Permission denied");
        return;
      }
      String(entry.node.content || "").split("\n").forEach(function (line, i) {
        if (rx.test(line)) {
          out.push(entry.path + ":" + (i + 1) + ":" + line);
          env.lastPath = entry.path;
        }
      });
    });
    return out.length ? out.join("\n") : "(no matches)";
  }

  function cmdFind(env, args) {
    var pattern = args.filter(function (a) { return a.charAt(0) !== "-"; })[0] || "*";
    var rx = new RegExp("^" + pattern.split("*").map(function (p) {
      return p.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }).join(".*") + "$");
    var out = allNodes(env).map(function (e) { return e.path; }).filter(function (p) {
      return rx.test(p.split("/").pop()) || rx.test(p);
    });
    return out.length ? out.join("\n") : "(no matches)";
  }

  function cmdStat(env, args) {
    var target = args[0];
    var node = lookup(env, resolvePath(env, target || ""));
    if (!node) return "stat: cannot stat '" + target + "'";
    return [
      "  File: " + (target || "/"),
      "  Size: " + (isDir(node) ? 4096 : String(node.content || "").length) + "   Type: " + (isDir(node) ? "directory" : "regular file"),
      "  Mode: " + node.mode + "   Owner: " + node.owner + "   Group: " + node.group,
      "  Modified: " + (node.mtime || "-")
    ].join("\n");
  }

  function cmdFile(env, args) {
    var node = lookup(env, resolvePath(env, args[0] || ""));
    if (!node) return "file: cannot open '" + args[0] + "'";
    if (isDir(node)) return args[0] + ": directory";
    return args[0] + ": " + (node.fileType || "ASCII text");
  }

  function cmdXxd(env, args, sudo) {
    var node = lookup(env, resolvePath(env, args[0] || ""));
    if (!node) return "xxd: cannot open '" + args[0] + "'";
    if (!readable(env, node, sudo)) return "xxd: " + args[0] + ": Permission denied";
    return CTF.hexdump(CTF.utf8Bytes(String(node.content || "")), { width: 16, max: 480 });
  }

  function cmdStrings(env, args, sudo) {
    var node = lookup(env, resolvePath(env, args[0] || ""));
    if (!node) return "strings: cannot open '" + args[0] + "'";
    if (!readable(env, node, sudo)) return "strings: " + args[0] + ": Permission denied";
    var runs = CTF.strings(CTF.utf8Bytes(String(node.content || "")), 4);
    return runs.length ? runs.join("\n") : "(no printable runs)";
  }

  function cmdEcho(env, args) {
    return args.join(" ").replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function (_, name) {
      if (name === "USER") return env.user;
      if (name === "HOME") return "/home/" + env.user;
      if (name === "PWD") return env.cwd;
      if (name === "HOSTNAME") return "lab-nullpoint-03";
      return "";
    });
  }

  var COMMANDS = {
    help: cmdHelp, pwd: function (env) { return env.cwd; },
    whoami: function (env) { return env.user; },
    id: function (env) { return "uid=1000(" + env.user + ") gid=1000(" + env.user + ") groups=" + env.groups.join(","); },
    ls: cmdLs, dir: cmdLs,
    cd: function (env, args) {
      var path = resolvePath(env, args[0] || "/home/" + env.user);
      var node = lookup(env, path);
      if (!node) return "cd: " + args[0] + ": No such file or directory";
      if (!isDir(node)) return "cd: " + args[0] + ": Not a directory";
      env.cwd = path;
      return null;
    },
    cat: cmdCat, head: function (e, a, s) { return cmdHeadTail(e, a, "head"); },
    tail: function (e, a, s) { return cmdHeadTail(e, a, "tail"); },
    grep: cmdGrep, egrep: cmdGrep, find: cmdFind, stat: cmdStat, file: cmdFile,
    xxd: cmdXxd, hexdump: cmdXxd, strings: cmdStrings, echo: cmdEcho,
    history: function (env) {
      return env.history.map(function (c, i) { return "  " + (i + 1) + "  " + c; }).join("\n") || "(no history yet)";
    },
    date: function () { return new Date().toUTCString(); },
    uname: function () { return "lab-nullpoint-03 (simulated training image)"; },
    hostname: function () { return "lab-nullpoint-03"; },
    env: function (env) {
      return ["USER=" + env.user, "HOME=/home/" + env.user, "PWD=" + env.cwd,
        "HOSTNAME=lab-nullpoint-03", "LAB_MODE=simulation"].join("\n");
    },
    man: function (env, args) { return "man: no manual entry for '" + (args[0] || "") + "' - try `help`"; }
  };

  function tokenize(line) {
    var out = [];
    var cur = "";
    var quote = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (quote) {
        if (ch === quote) quote = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ""; } }
      else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }

  /** executes one line and returns the text to print (null = no output) */
  CTF.execLine = function (env, rawLine) {
    var line = String(rawLine || "").trim();
    if (!line) return null;
    env.commandsRun++;
    if (env.history[env.history.length - 1] !== line) env.history.push(line);
    if (env.history.length > 200) env.history.shift();

    var sudo = false;
    var tokens = tokenize(line);
    if (tokens[0] === "sudo") {
      if (env.sudoers.indexOf(env.user) < 0) {
        return "sudo: " + env.user + " is not allowed to run sudo on lab-nullpoint-03";
      }
      sudo = true;
      env.sudoUsed++;
      tokens = tokens.slice(1);
      line = "sudo " + line;
    }
    if (tokens[0] === "clear") return "__CLEAR__";

    var cmd = tokens[0];
    if (!cmd) return null;
    if (!COMMANDS[cmd]) return cmd + ": command not found  (type `help` for the available commands)";
    try {
      return COMMANDS[cmd](env, tokens.slice(1), sudo);
    } catch (e) {
      return cmd + ": error - " + (e && e.message ? e.message : e);
    }
  };

  CTF.makeEnv = makeEnv;

  /* ------------------------------------------------------------- terminal UI */
  CTF.createTerminal = function (view, mountInto) {
    var env = makeEnv(view);
    var box = CTF.el("div", { class: "terminal" });
    var output = CTF.el("div", { class: "terminal-output mono" });
    var promptRow = CTF.el("div", { class: "terminal-inputrow" });
    var promptLabel = CTF.el("span", { class: "terminal-prompt mono" });
    var input = CTF.el("input", {
      class: "terminal-input mono", type: "text", autocomplete: "off", spellcheck: "false",
      "aria-label": "simulated terminal input"
    });
    promptRow.appendChild(promptLabel);
    promptRow.appendChild(input);
    box.appendChild(output);
    box.appendChild(promptRow);

    var historyIdx = 0;
    var historyList = [];

    function setPrompt() {
      promptLabel.textContent = env.user + "@lab-nullpoint-03:" + env.cwd + "$ ";
    }
    function print(text, cls) {
      var line = CTF.el("div", { class: "terminal-line " + (cls || ""), text: text === null || text === undefined ? "" : String(text) });
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
    function banner() {
      print("Nullpoint Lab Terminal - simulated image, no real system access", "dim");
      print("logged in as " + env.user + " | groups: " + env.groups.join(", ") +
        (env.sudoers.length ? " | sudo allowed for: " + env.sudoers.join(", ") : ""), "dim");
      print("type `help` for the command list", "dim");
      print("");
    }

    setPrompt();
    banner();

    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        var line = input.value;
        input.value = "";
        historyList.push(line);
        historyIdx = historyList.length;
        print(promptLabel.textContent + line, "cmd");
        var result = CTF.execLine(env, line);
        if (result === "__CLEAR__") output.textContent = "";
        else if (result) String(result).split("\n").forEach(function (l) { print(l); });
        setPrompt();
        if (env.hintPath && result && String(result).indexOf(env.hintPath) >= 0) {
          print("-- you opened the hinted path: " + env.hintPath, "dim");
        }
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        if (historyIdx > 0) { historyIdx--; input.value = historyList[historyIdx]; }
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (historyIdx < historyList.length - 1) { historyIdx++; input.value = historyList[historyIdx]; }
        else { historyIdx = historyList.length; input.value = ""; }
      } else if (ev.key === "Tab") {
        ev.preventDefault();
        var tokens = tokenize(input.value);
        var last = tokens[tokens.length - 1] || "";
        var dirPath = last.indexOf("/") >= 0 ? resolvePath(env, last.slice(0, last.lastIndexOf("/")) || "/") : env.cwd;
        var prefix = last.indexOf("/") >= 0 ? last.slice(last.lastIndexOf("/") + 1) : last;
        var node = lookup(env, dirPath);
        if (node && isDir(node)) {
          var matches = Object.keys(node.children).filter(function (n) { return n.indexOf(prefix) === 0; });
          if (matches.length === 1) {
            tokens[tokens.length - 1] = (last.indexOf("/") >= 0 ? last.slice(0, last.lastIndexOf("/") + 1) : "") + matches[0];
            input.value = tokens.join(" ");
          } else if (matches.length > 1) {
            print(matches.join("  "), "dim");
          }
        }
      } else if (ev.key === "l" && ev.ctrlKey) {
        ev.preventDefault();
        output.textContent = "";
      }
    });

    box.addEventListener("click", function (ev) { if (ev.target === box || ev.target === output) input.focus(); });
    if (mountInto) mountInto.appendChild(box);
    setTimeout(function () { try { input.focus(); } catch (e) { } }, 0);

    return {
      env: env,
      element: box,
      focus: function () { input.focus(); },
      /** true once the learner has seen the hinted file with cat/grep */
      foundHint: function () {
        var path = env.hintPath;
        if (!path) return env.commandsRun > 2;
        return env.history.some(function (line) {
          return /^(sudo )?(cat|grep|head|tail|xxd|strings)\b/.test(line.trim()) && line.indexOf(path.split("/").pop()) >= 0;
        });
      },
      stats: function () {
        return {
          commandsRun: env.commandsRun, sudoUsed: env.sudoUsed,
          lastPath: env.lastPath, hintFound: CTF.createTerminal && env.history.length > 0
        };
      }
    };
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
