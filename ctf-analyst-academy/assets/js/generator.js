/* ============================================================================
 * generator.js - procedural PRACTICE challenges (offline, template based)
 * ----------------------------------------------------------------------------
 * Builds new challenges from local templates using a seeded PRNG, so the same
 * seed always produces the same practice item. Practice challenges award XP
 * only: they never change the database points total, and their flags are
 * generated on the spot (never reused from the curated set).
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  /* ------------------------------------------------------------ PRNG utils */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rnd(rand, min, max) { return min + Math.floor(rand() * (max - min + 1)); }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
  function shuffle(rand, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  CTF.mulberry32 = mulberry32;

  var WORDS = [
    "ANALYST", "GHOST", "PACKET", "ARCHIVE", "CIPHER", "BEACON", "TUNNEL", "LEDGER",
    "ORACLE", "VECTOR", "SHARD", "RELAY", "COMPASS", "LANTERN", "MERIDIAN", "SENTINEL",
    "WORKSHOP", "HARBOR", "QUARRY", "THERMOS", "PARCEL", "GARDEN", "MONITOR", "KEYSTONE"
  ];
  var KEYWORDS = ["GHOST", "NULL", "LAB", "TRACE", "SIGNAL", "PROTOCOL", "ANALYST", "ARCHIVE", "KEY"];

  function flagText(rand, words) {
    var n = words || rnd(rand, 2, 3);
    var parts = [];
    while (parts.length < n) {
      var w = pick(rand, WORDS.concat(KEYWORDS));
      if (parts.indexOf(w) < 0) parts.push(w);
    }
    return parts.join("_");
  }

  function difficultyBand(difficulty) {
    switch (difficulty) {
      case "Beginner": return { points: 50, layers: 1, hints: 1 };
      case "Easy": return { points: 100, layers: 1, hints: 2 };
      case "Medium": return { points: 200, layers: 2, hints: 2 };
      case "Hard": return { points: 350, layers: 3, hints: 3 };
      default: return { points: 600, layers: 4, hints: 4 };
    }
  }

  /* ---------------------------------------------------------- templates */
  var TEMPLATES = {};

  TEMPLATES["Cryptography"] = function (rand, band, difficulty) {
    var kind = pick(rand, ["caesar", "vigenere", "xor", "atbash-chain", "affine"]);
    var plain = "FLAG{" + flagText(rand, 2) + "}";
    var concept, artifactText, hints, expects;

    if (kind === "caesar") {
      var shift = rnd(rand, 3, 20);
      concept = "Caesar cipher with a single unknown shift";
      artifactText = CTF.caesar(plain, shift);
      hints = [
        "A Caesar shift preserves letter positions, so the structure FLAG{...} is still visible in the ciphertext.",
        "The first character 'F' maps to '" + artifactText.charAt(0) + "' - the distance between them is the shift.",
        "Apply a shift of -" + shift + " (or +" + (26 - shift) + ") to recover the plaintext."
      ];
      expects = [plain, String(shift), "shift " + shift, "-" + shift];
    } else if (kind === "vigenere") {
      var key = pick(rand, KEYWORDS);
      concept = "Vigenere with a repeated keyword";
      artifactText = CTF.vigenere(plain, key, false);
      hints = [
        "The key repeats, so identical plaintext letters under the same key position give identical ciphertext letters.",
        "You know the plaintext starts with FLAG{ - XOR that knowledge against the ciphertext to recover key letters.",
        "The key is " + key + "; decrypt with it to read the flag."
      ];
      expects = [plain, key];
    } else if (kind === "xor") {
      var keyByte = rnd(rand, 0x21, 0x7e);
      concept = "Single byte XOR";
      artifactText = CTF.toHex(CTF.xorBytes(CTF.utf8Bytes(plain), [keyByte]));
      hints = [
        "Single byte XOR: try every key from 0x00 to 0xff and look for printable output.",
        "'F' is 0x46 and the first ciphertext byte is 0x" + artifactText.slice(0, 2) +
          " - their XOR is the key.",
        "The key is 0x" + keyByte.toString(16) + " (" + keyByte + "). XOR again to recover the text."
      ];
      expects = [plain, "0x" + keyByte.toString(16), String(keyByte)];
    } else if (kind === "atbash-chain") {
      var shift2 = rnd(rand, 2, 12);
      concept = "Atbash followed by a Caesar shift";
      var step1 = CTF.atbash(plain);
      artifactText = CTF.caesar(step1, shift2);
      hints = [
        "Two layers: undo the Caesar shift first (shift -" + shift2 + "), then undo Atbash.",
        "Atbash maps A<->Z, B<->Y and is its own inverse.",
        "Reverse order matters: caesar(-" + shift2 + ") then atbash gives the plaintext."
      ];
      expects = [plain];
    } else {
      var a = pick(rand, [3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]);
      var b = rnd(rand, 2, 15);
      concept = "Affine cipher (a=" + a + ", b=" + b + ")";
      artifactText = CTF.affine(plain, a, b, false);
      hints = [
        "Affine: C = (a*P + b) mod 26. Decryption needs the modular inverse of a.",
        "a = " + a + ", b = " + b + "; find a^-1 mod 26 by testing which value times " + a + " gives 1 mod 26.",
        "Apply P = a^-1 * (C - b) mod 26 to each letter."
      ];
      expects = [plain, String(a) + "," + String(b)];
    }

    return {
      title: "Practice: " + concept,
      category: "Cryptography",
      difficulty: difficulty,
      points: band.points,
      objective: "Identify the cipher from structure, recover the key from a known plaintext prefix, and decode.",
      description:
        "Generated practice item. Recover the flag from this ciphertext.\n\n" + artifactText,
      skills: ["Cipher Identification", "Known Plaintext Attack", "Manual Decryption"],
      data: { artifact: "cipher", text: artifactText, meta: "generated practice artifact (seeded, offline)" },
      hints: hints.slice(0, 3),
      answer: { expects: expects },
      flag: plain,
      explanation: "Concept: " + concept + ". The plaintext is " + plain + ".",
      solutionSteps: ["Identify the cipher family.", "Recover the key.", "Decrypt and verify the FLAG{...} shape."]
    };
  };

  TEMPLATES["Encoding"] = function (rand, band, difficulty) {
    var plain = "FLAG{" + flagText(rand, 2) + "}";
    var steps = shuffle(rand, ["b64", "hex", "binary", "url", "rot13", "reverse"]).slice(0, band.layers);
    var current = plain;
    var chain = [];
    steps.forEach(function (s) {
      if (s === "b64") { current = CTF.b64encode(current); chain.push("base64"); }
      else if (s === "hex") { current = CTF.strToHex(current); chain.push("hex"); }
      else if (s === "binary") { current = CTF.toBinary(current, " "); chain.push("binary (space separated)"); }
      else if (s === "url") { current = CTF.urlEncode(current); chain.push("percent encoding"); }
      else if (s === "rot13") { current = CTF.rot13(current); chain.push("ROT13"); }
      else { current = current.split("").reverse().join(""); chain.push("string reversal"); }
    });
    return {
      title: "Practice: " + chain.length + "-layer encoding chain",
      category: "Encoding",
      difficulty: difficulty,
      points: band.points,
      objective: "Recognise each encoding by its character set, then peel the layers in reverse order.",
      description:
        "Generated practice item. Decode every layer to recover the flag.\n\n" + current,
      skills: ["Encoding Recognition", "Layered Decoding", "Character Set Analysis"],
      data: { artifact: "encoded", text: current, meta: "layers applied: " + chain.join(" -> ") + " (answer required, list shown only as a hint)" },
      hints: [
        "Look at the character set: A-Za-z0-9+/= suggests base64, 0-9A-F suggests hex, 0/1 with spaces suggests binary, %XX suggests percent encoding.",
        "The chain applied here was: " + chain.join(" -> ") + ". Undo it in reverse order.",
        "Decoded result: " + plain
      ],
      answer: { expects: [plain] },
      flag: plain,
      explanation: "Chain: " + chain.join(" -> ") + ". Peeling it back yields " + plain + ".",
      solutionSteps: ["Identify the outermost encoding.", "Decode it.", "Repeat until the FLAG{...} shape appears."]
    };
  };

  TEMPLATES["Steganography"] = function (rand, band, difficulty) {
    var seed = rnd(rand, 1, 99999);
    var w = rnd(rand, 16, 28);
    var h = rnd(rand, 16, 28);
    var channel = pick(rand, ["r", "g", "b"]);
    var payload = "FLAG{" + flagText(rand, 2) + "}";
    var spec = { w: w, h: h, seed: seed, base: [18, 42], data: payload, channel: channel };
    var px = CTF.buildPixels(spec);
    var extracted = CTF.lsbExtract(px, channel, { maxChars: payload.length });
    if (extracted.slice(0, payload.length) !== payload) {
      // fall back to a wider grid so the generated item is always solvable
      spec.w = 32; spec.h = 24;
      var px2 = CTF.buildPixels(spec);
      var again = CTF.lsbExtract(px2, channel, { maxChars: payload.length });
      if (again.slice(0, payload.length) !== payload) return null;
    }
    return {
      title: "Practice: LSB payload in the " + channel.toUpperCase() + " channel",
      category: "Steganography",
      difficulty: difficulty,
      points: band.points,
      objective: "Read the least significant bits of one colour channel row by row and reassemble the hidden text.",
      description:
        "Generated practice item. A " + spec.w + "x" + spec.h + " lab image carries a message in the LSB of the " +
        channel.toUpperCase() + " channel, row major, MSB first inside each byte. Use the pixel inspector below.",
      skills: ["LSB Extraction", "Bit Level Reading", "Image Structure"],
      data: { artifact: "stego-image", spec: spec, channel: channel, meta: "generated practice image (seed " + seed + ")" },
      hints: [
        "Only one channel is modified: read the LSB of " + channel.toUpperCase() + " for every pixel, row by row.",
        "Eight bits make one byte, MSB first. The first byte should be 0x46 ('F').",
        "Extracted payload: " + payload
      ],
      answer: { expects: [payload] },
      flag: payload,
      explanation: "LSB of the " + channel.toUpperCase() + " channel spells " + payload + ".",
      solutionSteps: ["Inspect pixels row by row.", "Collect the LSB of the hinted channel.", "Group into bytes MSB first."]
    };
  };

  TEMPLATES["Digital Forensics"] = function (rand, band, difficulty) {
    var sig = pick(rand, CTF.SIGNATURES.filter(function (s) { return !s.offset; }));
    var offset = rnd(rand, 32, 480);
    var filler = [];
    for (var i = 0; i < offset; i++) filler.push(rnd(rand, 0x20, 0x7e));
    var bytes = filler.concat(sig.magic);
    for (var j = 0; j < 96; j++) bytes.push(rnd(rand, 0x00, 0xff));
    var payload = "FLAG{" + flagText(rand, 2) + "}";
    payload.split("").forEach(function (ch) { bytes.push(ch.charCodeAt(0)); });
    for (var k = 0; k < 64; k++) bytes.push(rnd(rand, 0x00, 0xff));
    var found = CTF.scanSignatures(bytes).filter(function (h) { return h.name === sig.name; })[0];
    var stringsRun = CTF.strings(bytes, 4);
    var payloadIndex = stringsRun.indexOf(payload);
    return {
      title: "Practice: carve " + sig.name + " from a raw blob",
      category: "Digital Forensics",
      difficulty: difficulty,
      points: band.points,
      objective: "Locate a file signature inside unstructured data, report its offset, and carve the embedded text.",
      description:
        "Generated practice item. A raw blob is shown as a hex dump. It contains one recognisable file signature " +
        "buried under random filler, and a printable payload somewhere after it. Report the offset of the signature " +
        "and the payload, comma separated: <offset>,<payload>",
      skills: ["Magic Bytes", "File Carving", "Hex Analysis", "Strings Triage"],
      data: {
        artifact: "hexdump",
        text: CTF.hexdump(bytes, { width: 16 }),
        strings: stringsRun,
        meta: "generated blob, " + bytes.length + " bytes (signature hidden at 0x" + found.offset.toString(16) + ")"
      },
      hints: [
        "Scan the ASCII gutter of the hex dump for the signature bytes of " + sig.name + " (" +
          CTF.toHex(sig.magic) + ").",
        "The printable strings list has " + stringsRun.length + " runs; run index " + payloadIndex + " is the payload.",
        "Answer: " + found.offset + "," + payload
      ],
      answer: { expects: [found.offset + "," + payload, payload, String(found.offset)] },
      flag: payload,
      explanation: "The " + sig.name + " signature starts at offset " + found.offset + " and the carved payload is " + payload + ".",
      solutionSteps: ["Search for known magic bytes.", "Record the offset.", "Run strings on the remainder and carve the payload."]
    };
  };

  TEMPLATES["Networking"] = function (rand, band, difficulty) {
    var kind = pick(rand, ["subnet", "ports", "both"]);
    var oct2 = rnd(rand, 0, 255);
    var oct3 = rnd(rand, 0, 255);
    var oct4 = rnd(rand, 1, 254);
    var ip = "10." + oct2 + "." + oct3 + "." + oct4;
    var cidr = pick(rand, [22, 24, 25, 26, 27, 28]);
    var sn = CTF.subnet(ip, cidr);
    var portRows = [
      { port: 22, service: "SSH" }, { port: 53, service: "DNS" }, { port: 443, service: "HTTPS" },
      { port: 3389, service: "RDP" }, { port: 25, service: "SMTP" }, { port: 8080, service: "HTTP-ALT" },
      { port: 1433, service: "MSSQL" }, { port: 5432, service: "POSTGRES" }
    ];
    var chosen = shuffle(rand, portRows).slice(0, 4);
    var expects, description, hints, skills, title, objective;

    if (kind === "subnet") {
      title = "Practice: subnet maths on " + ip + "/" + cidr;
      objective = "Compute network address, mask, broadcast and usable host count for a CIDR block.";
      description = "Generated practice item. For " + ip + "/" + cidr + " report: network address, mask, broadcast address, usable hosts (comma separated).";
      expects = [
        [sn.network, sn.mask, sn.broadcast, String(sn.usable)].join(","),
        [sn.network, sn.mask, sn.broadcast].join(",")
      ];
      hints = [
        "The mask for /" + cidr + " is " + sn.mask + "; AND it with the address to get the network.",
        "Broadcast is the network OR the inverted mask. Usable hosts are 2^(32-" + cidr + ") - 2 = " + sn.usable + ".",
        "Answer: " + sn.network + "," + sn.mask + "," + sn.broadcast + "," + sn.usable
      ];
      skills = ["CIDR Arithmetic", "Address Planning", "Broadcast Reasoning"];
    } else if (kind === "ports") {
      title = "Practice: port to service mapping";
      objective = "Map observed destination ports to their well known services.";
      description = "Generated practice item. Map these ports to services, comma separated in the order shown: " +
        chosen.map(function (c) { return c.port; }).join(", ");
      expects = [chosen.map(function (c) { return c.service; }).join(",")];
      hints = [
        "Well known ports live in 0-1023; registered ports above that still have conventional services.",
        "Ports shown: " + chosen.map(function (c) { return c.port + " (" + c.service + ")"; }).join(", ") + ".",
        "Answer: " + chosen.map(function (c) { return c.service; }).join(",")
      ];
      skills = ["Port Recognition", "Service Mapping", "Traffic Triage"];
    } else {
      title = "Practice: segment mapping plus service identification";
      objective = "Combine CIDR arithmetic with service identification, as an analyst would in one finding.";
      description = "Generated practice item. Two questions, separated by a pipe: (1) network address and broadcast for " +
        ip + "/" + cidr + ", (2) the services on ports " + chosen.slice(0, 2).map(function (c) { return c.port; }).join(" and ") + ".";
      expects = [
        sn.network + "|" + sn.broadcast + "|" + chosen.slice(0, 2).map(function (c) { return c.service; }).join(","),
        sn.network + "," + sn.broadcast + "," + chosen.slice(0, 2).map(function (c) { return c.service; }).join(",")
      ];
      hints = [
        "Part one is pure CIDR arithmetic: mask " + sn.mask + ".",
        "Part two: " + chosen.slice(0, 2).map(function (c) { return c.port + " is " + c.service; }).join("; ") + ".",
        "Answer: " + sn.network + "|" + sn.broadcast + "|" + chosen.slice(0, 2).map(function (c) { return c.service; }).join(",")
      ];
      skills = ["CIDR Arithmetic", "Service Mapping", "Multi Concept Reasoning"];
    }

    return {
      title: title, category: "Networking", difficulty: difficulty, points: band.points,
      objective: objective, description: description, skills: skills,
      data: {
        artifact: "table",
        headers: ["ITEM", "VALUE"],
        rows: kind === "ports"
          ? chosen.map(function (c) { return [c.port, "?"]; })
          : [["address", ip], ["prefix", "/" + cidr], ["mask", sn.mask], ["network", "?"], ["broadcast", "?"], ["usable hosts", "?"]],
        meta: "generated practice values (documentation range 10.0.0.0/8 style private space)"
      },
      hints: hints.slice(0, 3),
      answer: { expects: expects },
      flag: expects[0],
      explanation: "Computed values: network " + sn.network + ", mask " + sn.mask + ", broadcast " + sn.broadcast + ", usable " + sn.usable + ".",
      solutionSteps: ["Convert the prefix to a mask.", "AND / OR to find network and broadcast.", "Count usable hosts."]
    };
  };

  TEMPLATES["Programming"] = function (rand, band, difficulty) {
    var kind = pick(rand, ["sumEven", "countVowels", "maxRun", "fizzCount"]);
    var name, stub, tests, reference, hintSolution;

    if (kind === "sumEven") {
      name = "sumEven";
      stub = "function sumEven(numbers) {\n  // return the sum of every even number in the array\n  // empty array -> 0\n}\n";
      tests = [
        { call: "sumEven([4, 7, 12, 9, 20])", expect: 36 },
        { call: "sumEven([])", expect: 0 },
        { call: "sumEven([1, 3, 5])", expect: 0 },
        { call: "sumEven([-4, 7, -6])", expect: -10 }
      ];
      reference = "sumEven([4,7,12,9,20]) === 36";
      hintSolution = "numbers.filter(function (n) { return n % 2 === 0; }).reduce(function (a, b) { return a + b; }, 0)";
    } else if (kind === "countVowels") {
      name = "countVowels";
      stub = "function countVowels(text) {\n  // count a, e, i, o, u case insensitively\n  // '' -> 0\n}\n";
      tests = [
        { call: "countVowels('Analyse This')", expect: 4 },
        { call: "countVowels('')", expect: 0 },
        { call: "countVowels('rhythm')", expect: 0 },
        { call: "countVowels('AEIOU')", expect: 5 }
      ];
      reference = "countVowels('Analyse This') === 4";
      hintSolution = "(String(text).toLowerCase().match(/[aeiou]/g) || []).length";
    } else if (kind === "maxRun") {
      name = "maxRun";
      stub = "function maxRun(numbers) {\n  // length of the longest strictly increasing run\n  // [1,2,3,1] -> 3 ; [] -> 0 ; [5] -> 1\n}\n";
      tests = [
        { call: "maxRun([1, 2, 3, 1])", expect: 3 },
        { call: "maxRun([])", expect: 0 },
        { call: "maxRun([5])", expect: 1 },
        { call: "maxRun([9, 8, 7, 8, 9, 10])", expect: 4 }
      ];
      reference = "maxRun([9,8,7,8,9,10]) === 4";
      hintSolution = "var best = 0, cur = 0; numbers.forEach(function (n, i) { cur = (i && n > numbers[i-1]) ? cur + 1 : 1; if (cur > best) best = cur; }); return best;";
    } else {
      name = "fizzCount";
      stub = "function fizzCount(n) {\n  // how many integers in 1..n are divisible by 3 or by 5\n  // fizzCount(15) -> 7\n}\n";
      tests = [
        { call: "fizzCount(15)", expect: 7 },
        { call: "fizzCount(1)", expect: 0 },
        { call: "fizzCount(10)", expect: 5 },
        { call: "fizzCount(30)", expect: 14 }
      ];
      reference = "fizzCount(15) === 7";
      hintSolution = "var c = 0; for (var i = 1; i <= n; i++) if (i % 3 === 0 || i % 5 === 0) c++; return c;";
    }

    return {
      title: "Practice: implement " + name,
      category: "Programming",
      difficulty: difficulty,
      points: band.points,
      objective: "Write a function that satisfies every hidden test, including the empty-input edge case.",
      description:
        "Generated practice item. Implement the function below in the code panel and submit it.\n\n" + stub +
        "\nYour code runs in a sandboxed Function scope inside this page: no DOM access, no network, no globals.",
      skills: ["Implementation", "Edge Cases", "Local Reasoning"],
      data: { artifact: "code", code: stub, reference: reference, meta: "generated practice stub (" + tests.length + " hidden tests)" },
      hints: [
        "Handle the empty or minimal input first: " + tests[1].call + " must return " + tests[1].expect + ".",
        "Watch the sign of the values and the boundaries of the loop - off by one is the usual failure here.",
        "A working body: " + hintSolution
      ],
      answer: { type: "code", tests: tests, entry: name },
      flag: "PRACTICE:" + name.toUpperCase(),
      explanation: "The function " + name + " must satisfy all " + tests.length + " tests, including " + tests[1].call + " === " + tests[1].expect + ".",
      solutionSteps: ["Read the contract.", "Handle empty input.", "Implement the rule.", "Verify against every test."]
    };
  };

  TEMPLATES["Linux"] = function (rand, band, difficulty) {
    var value = rnd(rand, 2, 64);
    var needle = "PRACTICE_" + CTF.toHex([rnd(rand, 0, 255), rnd(rand, 0, 255)]).toUpperCase();
    var conf = [
      "# generated practice configuration (fictional service)",
      "listen_port=" + rnd(rand, 1024, 65535),
      "worker_count=" + rnd(rand, 2, 32),
      "retry_limit=" + value,
      "log_level=info",
      needle + "=confirmed"
    ].join("\n");
    var view = {
      user: "analyst",
      groups: ["analyst"],
      start: "/home/analyst",
      hintPath: "/etc/practice/service.conf",
      sudo: []
    };
    // build a small practice tree that does not touch the curated image
    var practiceTree = {
      dir: true, name: "/", owner: "root", group: "root", mode: "0755",
      children: {
        home: { dir: true, name: "home", owner: "root", group: "root", mode: "0755", children: {
          analyst: { dir: true, name: "analyst", owner: "analyst", group: "analyst", mode: "0750", children: {
            "readme.txt": { name: "readme.txt", owner: "analyst", group: "analyst", mode: "0644", mtime: "2026-03-01",
              content: "Practice lab image. Configuration lives under /etc/practice/service.conf.\n" }
          } }
        } },
        etc: { dir: true, name: "etc", owner: "root", group: "root", mode: "0755", children: {
          practice: { dir: true, name: "practice", owner: "root", group: "root", mode: "0755", children: {
            "service.conf": { name: "service.conf", owner: "root", group: "root", mode: "0644", mtime: "2026-03-02", content: conf }
          } }
        } }
      }
    };
    view.tree = practiceTree;
    return {
      title: "Practice: read a value out of a lab image",
      category: "Linux",
      difficulty: difficulty,
      points: band.points,
      objective: "Navigate a simulated filesystem, open the right configuration file, and report two values.",
      description:
        "Generated practice item. A simulated lab image is mounted in the terminal below (user: analyst). " +
        "Find the practice service configuration and report retry_limit and the value of " + needle +
        ", comma separated: <retry_limit>,<needle-value>",
      skills: ["Navigation", "Configuration Reading", "Simulated Terminal Use"],
      data: { artifact: "vfs", view: view, tree: practiceTree, meta: "generated practice image (in-memory only)" },
      hints: [
        "ls / then cd etc/practice; the file is service.conf.",
        "cat /etc/practice/service.conf shows retry_limit=" + value + " and a line starting " + needle + ".",
        "Answer: " + value + ",confirmed"
      ],
      answer: { expects: [value + ",confirmed", value + "," + needle, String(value)] },
      flag: "PRACTICE:" + needle,
      explanation: "The configuration at /etc/practice/service.conf holds retry_limit=" + value + " and " + needle + "=confirmed.",
      solutionSteps: ["ls / to orient.", "cd etc/practice.", "cat service.conf.", "Report the two values."]
    };
  };

  CTF.GENERATOR_TEMPLATES = TEMPLATES;
  CTF.GENERATOR_CATEGORIES = Object.keys(TEMPLATES);

  /**
   * Build one procedural challenge.
   * opts: { seed, category, difficulty }
   */
  CTF.generateChallenge = function (opts) {
    opts = opts || {};
    var seed = opts.seed !== undefined ? opts.seed : (Date.now() ^ Math.floor(Math.random() * 0xffffffff));
    var rand = mulberry32(CTF.hashString ? CTF.hashString("gen:" + seed) : seed >>> 0);
    var category = opts.category && TEMPLATES[opts.category] ? opts.category : pick(rand, CTF.GENERATOR_CATEGORIES);
    var difficulty = opts.difficulty && CTF.difficulty(opts.difficulty) ? opts.difficulty : pick(rand, ["Beginner", "Easy", "Medium", "Hard", "Expert"]);
    var band = difficultyBand(difficulty);

    var made = null;
    for (var attempt = 0; attempt < 8 && !made; attempt++) {
      try { made = TEMPLATES[category](rand, band, difficulty); } catch (e) { made = null; }
    }
    if (!made) return null;

    made.id = "PRACTICE-" + seed.toString(36).toUpperCase();
    made.generated = true;
    made.seed = seed;
    made.hints = (made.hints || []).slice(0, 3);
    return made;
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
