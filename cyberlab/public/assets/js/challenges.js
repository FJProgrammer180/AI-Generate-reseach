/* ============================================================================
 * challenges.js - core engine of the CTF Analyst Academy
 * ----------------------------------------------------------------------------
 * Everything in here is pure/offline:
 *   - difficulty, XP, category and badge rule tables
 *   - crypto + encoding primitives (Caesar, Vigenere, Atbash, affine, XOR, ...)
 *   - a deterministic image builder (mulberry32) that mirrors the offline
 *     Python generator used to produce assets/js/artifacts.js
 *   - LSB stego embed/extract, hexdump, `strings`, file-signature sniffing
 *   - a sandboxed code runner for the PROGRAMMING / REVERSE categories
 *   - answer normalisation + validation
 *
 * No network access, no external API, no real-world targets.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  /* ---------------------------------------------------------------- levels */
  CTF.DIFFICULTIES = [
    { id: "Beginner", label: "BEGINNER", xp: 50, min: 50, max: 100, color: "#5ad1a5" },
    { id: "Easy", label: "EASY", xp: 100, min: 100, max: 150, color: "#63b3ed" },
    { id: "Medium", label: "MEDIUM", xp: 200, min: 200, max: 300, color: "#f6c453" },
    { id: "Hard", label: "HARD", xp: 350, min: 350, max: 500, color: "#f08c4b" },
    { id: "Expert", label: "EXPERT", xp: 600, min: 600, max: 1000, color: "#e05c7a" }
  ];

  CTF.BONUS_XP = { firstSolve: 50, noHint: 25, perfectInvestigation: 100 };
  CTF.HINT_PENALTY = [0, 0, 0.1, 0.25]; // index = number of hints used

  function difficulty(id) {
    for (var i = 0; i < CTF.DIFFICULTIES.length; i++) {
      if (CTF.DIFFICULTIES[i].id === id) return CTF.DIFFICULTIES[i];
    }
    return CTF.DIFFICULTIES[1];
  }
  CTF.difficulty = difficulty;

  CTF.xpFor = function (id) { return difficulty(id).xp; };

  /** points actually awarded after hint penalty */
  CTF.awardedPoints = function (challenge, hintsUsed) {
    var pen = CTF.HINT_PENALTY[Math.min(hintsUsed || 0, 3)];
    return Math.round(challenge.points * (1 - pen));
  };

  /** level curve: level n needs n*250 XP on top of the previous one */
  CTF.levelFromXp = function (xp) {
    var level = 1, need = 250, rest = xp;
    while (rest >= need) { rest -= need; level += 1; need = level * 250; }
    return { level: level, into: rest, needed: need };
  };

  /* -------------------------------------------------------------- categories */
  CTF.CATEGORIES = [
    { id: "Cryptography", short: "CRYPTO", icon: "\u{1F510}", blurb: "Classic and modern cipher reasoning" },
    { id: "Encoding", short: "ENCODE", icon: "\u{1F9EC}", blurb: "Representation vs. protection" },
    { id: "Steganography", short: "STEGO", icon: "\u{1F5BC}", blurb: "Data hidden inside generated lab images" },
    { id: "Digital Forensics", short: "FORENSICS", icon: "\u{1F575}", blurb: "Artifacts, metadata, hex, timelines" },
    { id: "Networking", short: "NETWORK", icon: "\u{1F310}", blurb: "IP math, DNS, ports, simulated packets" },
    { id: "Linux", short: "LINUX", icon: "\u{1F427}", blurb: "Virtual filesystem + shell reasoning" },
    { id: "Web Security", short: "WEB", icon: "\u{1F6E1}", blurb: "Sandboxed vulnerable-app analysis" },
    { id: "Programming", short: "CODE", icon: "\u{1F4BB}", blurb: "Read, fix and reason about code" },
    { id: "Reverse Engineering", short: "REVERSE", icon: "\u{2699}", blurb: "Trace logic, never run binaries" },
    { id: "OSINT", short: "OSINT", icon: "\u{1F50E}", blurb: "100% fictional identities and companies" },
    { id: "Mystery Archive", short: "MYSTERY", icon: "\u{1F5C3}", blurb: "Five multi-stage investigation campaigns" }
  ];

  CTF.categoryById = function (id) {
    for (var i = 0; i < CTF.CATEGORIES.length; i++) if (CTF.CATEGORIES[i].id === id) return CTF.CATEGORIES[i];
    return null;
  };

  /* ------------------------------------------------------------------ badges */
  CTF.BADGES = [
    { id: "FIRST_BLOOD", name: "First Blood", icon: "\u{1FA78}", desc: "Solve your very first challenge." },
    { id: "CRYPTO_KID", name: "Crypto Kid", icon: "\u{1F510}", desc: "Solve 5 cryptography challenges." },
    { id: "NETWORK_SCOUT", name: "Network Scout", icon: "\u{1F310}", desc: "Solve 5 networking challenges." },
    { id: "FORENSIC_DETECTIVE", name: "Forensic Detective", icon: "\u{1F575}", desc: "Solve 5 digital forensics challenges." },
    { id: "LINUX_RANGER", name: "Linux Ranger", icon: "\u{1F427}", desc: "Solve 5 Linux challenges." },
    { id: "WEB_ANALYST", name: "Web Analyst", icon: "\u{1F6E1}", desc: "Solve 5 web security labs." },
    { id: "STEGO_HUNTER", name: "Stego Hunter", icon: "\u{1F5BC}", desc: "Solve 5 steganography challenges." },
    { id: "CODE_SMITH", name: "Code Smith", icon: "\u{1F4BB}", desc: "Solve 5 programming challenges." },
    { id: "REVERSE_ADEPT", name: "Reverse Adept", icon: "\u{2699}", desc: "Solve 5 reverse-engineering challenges." },
    { id: "OSINT_TRACKER", name: "OSINT Tracker", icon: "\u{1F50E}", desc: "Solve 5 OSINT investigations (fictional data)." },
    { id: "DECODER_RING", name: "Decoder Ring", icon: "\u{1F9EC}", desc: "Solve 5 encoding challenges." },
    { id: "CASE_FILE_CLOSER", name: "Case File Closer", icon: "\u{1F5C3}", desc: "Finish your first Mystery Archive campaign." },
    { id: "ARCHIVIST", name: "Archivist", icon: "\u{1F3DB}", desc: "Finish all 5 Mystery Archive campaigns." },
    { id: "CTF_VETERAN", name: "CTF Veteran", icon: "\u{1F396}", desc: "Solve 25 challenges." },
    { id: "MASTER_ANALYST", name: "Master Analyst", icon: "\u{1F451}", desc: "Solve 50 challenges." },
    { id: "NO_HINT", name: "No Hint Club", icon: "\u{1F910}", desc: "Solve 10 challenges without using a hint." },
    { id: "PERFECTIONIST", name: "Perfectionist", icon: "\u{2728}", desc: "Land 5 perfect investigations (first try, no hint)." },
    { id: "EXPERT_TRACK", name: "Expert Track", icon: "\u{1F525}", desc: "Solve 3 EXPERT challenges." },
    { id: "POLYGLOT", name: "Polyglot", icon: "\u{1F308}", desc: "Solve at least one challenge in 8 different categories." },
    { id: "DAILY_ANALYST", name: "Daily Analyst", icon: "\u{2600}", desc: "Complete 3 daily challenges." },
    { id: "NIGHT_OWL", name: "Night Owl", icon: "\u{1F319}", desc: "Solve 5 challenges between 00:00 and 05:00 local time." },
    { id: "GENERATOR_ADEPT", name: "Generator Adept", icon: "\u{1F3B2}", desc: "Solve 10 procedurally generated practice challenges." }
  ];

  /* ------------------------------------------------------------ text helpers */
  var UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var LO = "abcdefghijklmnopqrstuvwxyz";

  function shiftChar(ch, amount, alpha) {
    var i = alpha.indexOf(ch);
    if (i < 0) return ch;
    return alpha[((i + amount) % 26 + 26) % 26];
  }

  CTF.caesar = function (text, shift) {
    return String(text).split("").map(function (c) {
      if (UP.indexOf(c) >= 0) return shiftChar(c, shift, UP);
      if (LO.indexOf(c) >= 0) return shiftChar(c, shift, LO);
      return c;
    }).join("");
  };
  CTF.rot13 = function (t) { return CTF.caesar(t, 13); };
  CTF.atbash = function (text) {
    return String(text).split("").map(function (c) {
      var i = UP.indexOf(c);
      if (i >= 0) return UP[25 - i];
      i = LO.indexOf(c);
      if (i >= 0) return LO[25 - i];
      return c;
    }).join("");
  };

  /**
   * Vigenere. The key stream advances ONLY on alphabetic characters, which is
   * the classic textbook behaviour (and what the dataset was generated with).
   */
  CTF.vigenere = function (text, key, decrypt) {
    key = String(key).toUpperCase();
    var out = "", ki = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      var alpha = UP.indexOf(c) >= 0 ? UP : (LO.indexOf(c) >= 0 ? LO : null);
      if (!alpha) { out += c; continue; }
      var s = UP.indexOf(key[ki % key.length]);
      out += shiftChar(c, decrypt ? -s : s, alpha);
      ki += 1;
    }
    return out;
  };

  CTF.affine = function (text, a, b, decrypt) {
    var inv = null;
    if (decrypt) {
      for (var k = 0; k < 26; k++) if ((a * k) % 26 === 1) { inv = k; break; }
      if (inv === null) throw new Error("affine: a is not coprime with 26");
    }
    return String(text).split("").map(function (c) {
      var i = UP.indexOf(c);
      if (i < 0) return c;
      return UP[decrypt ? ((inv * (i - b)) % 26 + 26) % 26 : (a * i + b) % 26];
    }).join("");
  };

  CTF.substitution = function (text, map) {
    return String(text).split("").map(function (c) {
      return Object.prototype.hasOwnProperty.call(map, c) ? map[c] : c;
    }).join("");
  };

  /** one-time-pad style add over "A-Z " (27 symbols) - lab simulation only */
  CTF.otp = function (text, key, decrypt) {
    var ALPH = UP + " ";
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var a = ALPH.indexOf(text[i]), b = ALPH.indexOf(key[i % key.length]);
      if (a < 0 || b < 0) { out += text[i]; continue; }
      out += ALPH[((decrypt ? a - b : a + b) % 27 + 27) % 27];
    }
    return out;
  };

  /* ------------------------------------------------------- encoding helpers */
  function bytesToB64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return root.btoa(bin);
  }
  function b64ToBytes(s) {
    var bin = root.atob(String(s).replace(/\s+/g, ""));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  CTF.b64encode = function (s) { return bytesToB64(utf8Bytes(s)); };
  CTF.b64decode = function (s) { return utf8String(b64ToBytes(s)); };
  CTF.b64decodeSafe = function (s) {
    try { return utf8String(b64ToBytes(s)); } catch (e) { return null; }
  };

  function utf8Bytes(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }
  function utf8String(bytes) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
  CTF.utf8Bytes = utf8Bytes;
  CTF.utf8String = utf8String;

  CTF.toHex = function (bytes, upper) {
    var out = "";
    for (var i = 0; i < bytes.length; i++) {
      var h = (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
      out += upper ? h.toUpperCase() : h;
    }
    return out;
  };
  CTF.fromHex = function (hex) {
    var clean = String(hex).replace(/[^0-9a-fA-F]/g, "");
    var out = new Uint8Array(clean.length >> 1);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
  CTF.strToHex = function (s, upper) { return CTF.toHex(utf8Bytes(s), upper); };
  CTF.hexToStr = function (h) { return utf8String(CTF.fromHex(h)); };

  CTF.toBinary = function (s, sep) {
    var b = utf8Bytes(s), out = [];
    for (var i = 0; i < b.length; i++) out.push(("00000000" + b[i].toString(2)).slice(-8));
    return out.join(sep === undefined ? " " : sep);
  };
  CTF.fromBinary = function (s) {
    var groups = String(s).match(/[01]{8}/g) || [];
    var bytes = new Uint8Array(groups.length);
    for (var i = 0; i < groups.length; i++) bytes[i] = parseInt(groups[i], 2);
    return utf8String(bytes);
  };

  CTF.toAsciiList = function (s) {
    var b = utf8Bytes(s), out = [];
    for (var i = 0; i < b.length; i++) out.push(b[i]);
    return out.join(" ");
  };
  CTF.fromAsciiList = function (s) {
    var nums = String(s).match(/\d+/g) || [];
    var bytes = new Uint8Array(nums.length);
    for (var i = 0; i < nums.length; i++) bytes[i] = parseInt(nums[i], 10) & 0xff;
    return utf8String(bytes);
  };

  CTF.urlEncode = function (s) {
    return encodeURIComponent(String(s)).replace(/[!'()*]/g, function (c) {
      return "%" + c.charCodeAt(0).toString(16).toUpperCase();
    });
  };
  CTF.urlDecode = function (s) { try { return decodeURIComponent(String(s)); } catch (e) { return null; } };

  CTF.xorBytes = function (bytes, keyBytes) {
    var out = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    return out;
  };
  CTF.xorString = function (text, key) {
    return utf8String(CTF.xorBytes(utf8Bytes(text), utf8Bytes(key)));
  };
  CTF.xorHex = function (text, key) { return CTF.toHex(CTF.xorBytes(utf8Bytes(text), utf8Bytes(key))); };

  /* ------------------------------------------------------------ mulberry32 */
  CTF.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* --------------------------------------------------------- image / stego */
  /**
   * Builds a deterministic RGB(A) pixel matrix from a spec.
   * spec: { w, h, seed, base:[lo,hi], channel:"r|g|b", data:"...", deviants:[{x,y,rgb}] }
   * The exact same routine (seeded identically) produced the reference values in
   * artifacts.js, so the app never needs an external image file.
   */
  CTF.buildPixels = function (spec) {
    var rnd = CTF.mulberry32(spec.seed);
    var lo = spec.base[0], hi = spec.base[1];
    var px = [];
    for (var y = 0; y < spec.h; y++) {
      var row = [];
      for (var x = 0; x < spec.w; x++) {
        row.push([
          lo + Math.floor(rnd() * (hi - lo + 1)),
          lo + Math.floor(rnd() * (hi - lo + 1)),
          lo + Math.floor(rnd() * (hi - lo + 1))
        ]);
      }
      px.push(row);
    }
    if (spec.deviants) {
      spec.deviants.forEach(function (d) { px[d.y][d.x] = [d.rgb[0], d.rgb[1], d.rgb[2]]; });
    }
    if (spec.channel && spec.data) {
      var ch = { r: 0, g: 1, b: 2 }[spec.channel];
      var bytes = utf8Bytes(spec.data);
      var bits = [];
      for (var bi = 0; bi < bytes.length; bi++) {
        for (var k = 7; k >= 0; k--) bits.push((bytes[bi] >> k) & 1);
      }
      var i = 0;
      var startRow = spec.startRow || 0;
      for (var yy = startRow; yy < spec.h && i < bits.length; yy++) {
        for (var xx = 0; xx < spec.w && i < bits.length; xx++) {
          px[yy][xx][ch] = (px[yy][xx][ch] & 0xfe) | bits[i];
          i++;
        }
      }
    }
    return px;
  };

  /**
   * Builds the alpha matrix for a spec: 255 everywhere, with `spec.alphaData`
   * packed LSB-first (MSB-first inside each byte) starting at `spec.alphaRow`.
   * Keeping this next to buildPixels means image + alpha can never drift apart.
   */
  CTF.buildAlpha = function (spec) {
    var alpha = [];
    for (var y = 0; y < spec.h; y++) {
      var row = [];
      for (var x = 0; x < spec.w; x++) row.push(255);
      alpha.push(row);
    }
    if (spec.alphaData) {
      var bytes = utf8Bytes(spec.alphaData);
      var bits = [];
      for (var i = 0; i < bytes.length; i++) {
        for (var k = 7; k >= 0; k--) bits.push((bytes[i] >> k) & 1);
      }
      var startRow = spec.alphaRow || 0, n = 0;
      for (var yy = startRow; yy < spec.h && n < bits.length; yy++) {
        for (var xx = 0; xx < spec.w && n < bits.length; xx++) {
          alpha[yy][xx] = (alpha[yy][xx] & 0xfe) | bits[n];
          n++;
        }
      }
    }
    return alpha;
  };

  /** LSB extract: 1 bit per pixel, MSB-first inside each byte, row-major. */
  CTF.lsbExtract = function (px, channel, opts) {
    opts = opts || {};
    var ch = { r: 0, g: 1, b: 2 }[channel];
    var startRow = opts.startRow || 0;
    var endRow = opts.endRow === undefined ? px.length - 1 : opts.endRow;
    var startCol = opts.startCol || 0;
    var endCol = opts.endCol === undefined ? px[0].length - 1 : opts.endCol;
    var bits = [], out = "";
    for (var y = startRow; y <= endRow && y < px.length; y++) {
      for (var x = startCol; x <= endCol && x < px[y].length; x++) {
        bits.push(px[y][x][ch] & 1);
        if (bits.length === 8) {
          var code = parseInt(bits.join(""), 2);
          bits = [];
          if (opts.printableOnly && (code < 32 || code > 126)) return out;
          out += String.fromCharCode(code);
          if (opts.maxChars && out.length >= opts.maxChars) return out;
        }
      }
    }
    return out;
  };

  /** Pack text MSB-first into a byte array (used for the alpha-channel layer). */
  CTF.packBytes = function (text) { return utf8Bytes(text); };
  CTF.unpackBytes = function (bytes, count) {
    var out = "";
    for (var i = 0; i < (count === undefined ? bytes.length : count); i++) out += String.fromCharCode(bytes[i]);
    return out;
  };

  /** Pixels that fall outside the expected background range. */
  CTF.deviantPixels = function (px, base) {
    var lo = base[0], hi = base[1], found = [];
    for (var y = 0; y < px.length; y++) {
      for (var x = 0; x < px[y].length; x++) {
        var p = px[y][x];
        var out = p.some(function (v) { return v < lo || v > hi; });
        if (out) found.push({ x: x, y: y, rgb: p });
      }
    }
    return found;
  };

  /* ------------------------------------------------------------- PNG writer */
  var CRC_TABLE = (function () {
    var t = new Int32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = -1;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }
  function adler32(bytes) {
    var a = 1, b = 0;
    for (var i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }
  function be32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }

  /** Encode RGBA/RGB pixels to PNG bytes using *stored* deflate blocks. */
  CTF.encodePNG = function (px, w, h, alpha) {
    var channels = alpha ? 4 : 3;
    var raw = new Uint8Array(h * (1 + w * channels));
    var o = 0;
    for (var y = 0; y < h; y++) {
      raw[o++] = 0;
      for (var x = 0; x < w; x++) {
        raw[o++] = px[y][x][0]; raw[o++] = px[y][x][1]; raw[o++] = px[y][x][2];
        if (alpha) raw[o++] = alpha[y][x];
      }
    }
    var blocks = [], total = 5 + raw.length + Math.ceil(raw.length / 65535) * 5;
    blocks.push(0x78, 0x01);
    for (var i = 0; i < raw.length; i += 65535) {
      var chunk = raw.subarray(i, Math.min(i + 65535, raw.length));
      var last = i + 65535 >= raw.length;
      blocks.push(last ? 1 : 0, chunk.length & 255, (chunk.length >> 8) & 255,
        (~chunk.length) & 255, ((~chunk.length) >> 8) & 255);
      for (var j = 0; j < chunk.length; j++) blocks.push(chunk[j]);
    }
    blocks.push((adler32(raw) >>> 24) & 255, (adler32(raw) >>> 16) & 255,
      (adler32(raw) >>> 8) & 255, adler32(raw) & 255);
    if (blocks.length !== total) total = blocks.length; // safety, never expected

    var ihdr = be32(w).concat(be32(h), [8, alpha ? 6 : 2, 0, 0, 0]);
    var out = [137, 80, 78, 71, 13, 10, 26, 10];
    function pushChunk(tag, data) {
      out = out.concat(be32(data.length));
      var tagBytes = utf8Bytes(tag);
      out = out.concat(Array.prototype.slice.call(tagBytes));
      out = out.concat(data);
      var crcInput = new Uint8Array(tagBytes.length + data.length);
      crcInput.set(tagBytes, 0);
      crcInput.set(new Uint8Array(data), tagBytes.length);
      out = out.concat(be32(crc32(crcInput)));
    }
    pushChunk("IHDR", ihdr);
    pushChunk("IDAT", blocks);
    pushChunk("IEND", []);
    return new Uint8Array(out);
  };

  CTF.pixelsToDataURL = function (px, alpha) {
    var h = px.length, w = px[0].length;
    var bytes = CTF.encodePNG(px, w, h, alpha);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return "data:image/png;base64," + root.btoa(bin);
  };

  /* ------------------------------------------------------ forensic helpers */
  CTF.hexdump = function (bytes, opts) {
    opts = opts || {};
    var width = opts.width || 16, start = opts.start || 0;
    var end = opts.length ? Math.min(bytes.length, start + opts.length) : bytes.length;
    var lines = [];
    for (var off = start; off < end; off += width) {
      var part = [], asc = "";
      for (var i = 0; i < width; i++) {
        if (off + i < end) {
          var b = bytes[off + i];
          part.push(("0" + b.toString(16)).slice(-2));
          asc += b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
        } else { part.push("  "); asc += " "; }
      }
      var hexStr = part.slice(0, 8).join(" ") + "  " + part.slice(8).join(" ");
      lines.push(("00000000" + off.toString(16)).slice(-8) + "  " + hexStr + "  |" + asc + "|");
    }
    return lines.join("\n");
  };

  CTF.strings = function (bytes, minLen) {
    minLen = minLen || 4;
    var out = [], cur = "";
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b >= 32 && b < 127) cur += String.fromCharCode(b);
      else { if (cur.length >= minLen) out.push(cur); cur = ""; }
    }
    if (cur.length >= minLen) out.push(cur);
    return out;
  };

  CTF.SIGNATURES = [
    { name: "PNG", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { name: "JPEG", magic: [0xff, 0xd8, 0xff] },
    { name: "GIF87a", magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { name: "GIF89a", magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
    { name: "PDF", magic: [0x25, 0x50, 0x44, 0x46] },
    { name: "ZIP", magic: [0x50, 0x4b, 0x03, 0x04] },
    { name: "GZIP", magic: [0x1f, 0x8b] },
    { name: "ELF", magic: [0x7f, 0x45, 0x4c, 0x46] },
    { name: "BMP", magic: [0x42, 0x4d] },
    { name: "RAR", magic: [0x52, 0x61, 0x72, 0x21] },
    { name: "7Z", magic: [0x37, 0x7a, 0xbc, 0xaf] },
    { name: "TAR (ustar)", magic: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257 }
  ];

  CTF.sniffSignature = function (bytes) {
    for (var i = 0; i < CTF.SIGNATURES.length; i++) {
      var sig = CTF.SIGNATURES[i], off = sig.offset || 0, ok = true;
      for (var j = 0; j < sig.magic.length; j++) {
        if (bytes[off + j] !== sig.magic[j]) { ok = false; break; }
      }
      if (ok) return sig.name;
    }
    return null;
  };

  /** every signature found anywhere in the blob, with offsets */
  CTF.scanSignatures = function (bytes) {
    var hits = [];
    CTF.SIGNATURES.forEach(function (sig) {
      for (var i = 0; i + sig.magic.length <= bytes.length; i++) {
        var ok = true;
        for (var j = 0; j < sig.magic.length; j++) if (bytes[i + j] !== sig.magic[j]) { ok = false; break; }
        if (ok) hits.push({ name: sig.name, offset: i });
      }
    });
    return hits.sort(function (a, b) { return a.offset - b.offset; });
  };

  /* -------------------------------------------------------------- IP maths */
  CTF.ipToInt = function (ip) {
    return ip.split(".").reduce(function (acc, oct) { return (acc * 256) + (parseInt(oct, 10) & 255); }, 0) >>> 0;
  };
  CTF.intToIp = function (n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  };
  CTF.subnet = function (ip, cidr) {
    cidr = parseInt(cidr, 10);
    var mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
    var net = (CTF.ipToInt(ip) & mask) >>> 0;
    var bcast = (net | (~mask >>> 0)) >>> 0;
    var total = bcast - net + 1;
    var usable = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.max(total - 2, 0);
    return {
      ip: ip, cidr: cidr, mask: CTF.intToIp(mask), wildcard: CTF.intToIp((~mask) >>> 0),
      network: CTF.intToIp(net), broadcast: CTF.intToIp(bcast), total: total, usable: usable,
      firstHost: CTF.intToIp(cidr < 31 ? net + 1 : net),
      lastHost: CTF.intToIp(cidr < 31 ? bcast - 1 : bcast),
      classOf: CTF.ipClass(ip), kind: CTF.ipKind(ip)
    };
  };
  CTF.ipClass = function (ip) {
    var a = parseInt(ip.split(".")[0], 10);
    if (a < 128) return "A";
    if (a < 192) return "B";
    if (a < 224) return "C";
    if (a < 240) return "D";
    return "E";
  };
  /**
   * Coarse address classification used by the NETWORKING labs.
   * Directed-broadcast detection (last octet .255 / .0) assumes the common
   * classful-style /8, /16 or /24 view the lab dataset is written against.
   */
  CTF.ipKind = function (ip) {
    var o = ip.split(".").map(function (v) { return parseInt(v, 10); });
    var n = CTF.ipToInt(ip);
    if (n === 0xffffffff) return "BROADCAST";
    if (o[0] === 127) return "LOOPBACK";
    if (o[0] === 0) return "THIS-NETWORK";
    if (o[0] >= 224 && o[0] <= 239) return "MULTICAST";
    if (o[0] >= 240) return "RESERVED";
    if (o[0] === 169 && o[1] === 254) return "LINK-LOCAL";
    var isPrivate = o[0] === 10 ||
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||
      (o[0] === 192 && o[1] === 168);
    if (o[3] === 255) return "BROADCAST";
    if (isPrivate) return "PRIVATE";
    if (o[3] === 0) return "NETWORK";
    return "PUBLIC";
  };

  /* --------------------------------------------------------- code sandbox */
  /**
   * Runs learner-submitted JavaScript in a frozen, capability-free scope.
   * Used by PROGRAMMING / REVERSE labs only. No DOM, no network, no timers.
   */
  CTF.runCode = function (code, opts) {
    opts = opts || {};
    var logs = [];
    var sandboxConsole = {
      log: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); },
      info: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); },
      warn: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); },
      error: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); }
    };
    function fmt(v) {
      try { return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v); }
      catch (e) { return String(v); }
    }
    var result, error = null;
    try {
      // The outer function is deliberately sloppy so it may shadow `eval` and
      // `arguments`; the learner's code then runs inside a strict inner scope.
      // Nothing here is a security boundary - it is a training sandbox that
      // blocks the obvious globals so a mistake cannot touch the page.
      var factory = new Function(
        "console", "window", "document", "globalThis", "self", "fetch", "require", "process",
        "XMLHttpRequest", "localStorage", "setTimeout", "setInterval", "importScripts", "eval", "arguments",
        "return (function () {\"use strict\";\nvar __result;\n" + code +
        "\n;return typeof __result !== 'undefined' ? __result : undefined;\n})();"
      );
      var blocked = undefined;
      result = factory(sandboxConsole, blocked, blocked, blocked, blocked, blocked, blocked,
        blocked, blocked, blocked, blocked, blocked, blocked, blocked, blocked);
    } catch (e) {
      error = e && e.message ? String(e.message) : String(e);
    }
    return { logs: logs, result: result, error: error, output: fmt(result) };
  };

  /* ------------------------------------------------------- answer matching */
  CTF.normalize = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/\u200b/g, "")
      .replace(/[\s_\-]+/g, "")
      .replace(/[`'"]/g, "")
      .toUpperCase();
  };

  CTF.checkAnswer = function (challenge, rawAnswer) {
    var rule = challenge.answer || {};
    var given = String(rawAnswer === undefined ? "" : rawAnswer);
    if (rule.type === "code") return checkCode(challenge, given);

    var expected = rule.expects;
    if (typeof expected === "function") expected = expected(challenge);
    var hit = Array.isArray(expected)
      ? expected.some(function (alt) { return matches(rule, alt, given); })
      : matches(rule, expected, given);
    if (hit) return true;
    // Some artifacts ask for an intermediate value (a plaintext sentence, an
    // ordered evidence list, an offset...). The challenge flag is always an
    // acceptable answer too, so a learner who jumped straight to the flag is
    // still credited.
    if (!rule.regex && challenge.flag && matches(rule, challenge.flag, given)) return true;
    return false;
  };

  function matches(rule, expected, given) {
    if (expected === undefined || expected === null) return false;
    var expStr = String(expected);
    if (rule.regex) return new RegExp(rule.regex, rule.regexFlags || "i").test(given.trim());
    if (rule.caseSensitive) return given.trim() === expStr.trim();
    if (rule.strict) return CTF.normalize(given) === CTF.normalize(expStr);
    // default: forgiving comparison + optional containment of the flag token
    var a = CTF.normalize(given), b = CTF.normalize(expStr);
    if (a === b) return true;
    if (rule.contains && b.length >= 4 && a.indexOf(b) >= 0) return true;
    return false;
  }

  function checkCode(challenge, code) {
    var rule = challenge.answer || {};
    var tests = rule.tests || [];
    if (!tests.length) return false;
    for (var i = 0; i < tests.length; i++) {
      var res = CTF.runCode(code + "\n__result = (" + tests[i].call + ");");
      if (res.error) return false;
      var got = typeof res.result === "object" ? JSON.stringify(res.result) : String(res.result);
      if (got !== String(tests[i].expect)) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------- registry */
  CTF.DB = [];
  CTF.register = function (list) {
    (Array.isArray(list) ? list : [list]).forEach(function (c) {
      c.hints = c.hints || [];
      c.skills = c.skills || [];
      c.data = c.data || {};
      CTF.DB.push(c);
    });
  };
  CTF.byId = function (id) {
    for (var i = 0; i < CTF.DB.length; i++) if (CTF.DB[i].id === id) return CTF.DB[i];
    return null;
  };

  CTF.stats = function () {
    var byCat = {}, byDiff = {}, points = 0;
    CTF.DB.forEach(function (c) {
      byCat[c.category] = (byCat[c.category] || 0) + 1;
      byDiff[c.difficulty] = (byDiff[c.difficulty] || 0) + 1;
      points += c.points;
    });
    return { total: CTF.DB.length, byCategory: byCat, byDifficulty: byDiff, points: points };
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
