#!/usr/bin/env node
/* ============================================================================
 * tools/verify.js - offline integrity harness
 * ----------------------------------------------------------------------------
 * Re-proves every artifact in assets/js/artifacts.js with an *independent*
 * JavaScript implementation (written from the same spec as the Python
 * generator), then audits the whole challenge database:
 *
 *   node tools/verify.js
 *
 * Exit code 1 on any failure, so it can be wired into CI.
 * ==========================================================================*/
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

/* ------------------------------------------------------------ tiny loader */
global.window = global;
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");
global.self = global;

function load(rel) {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

load("assets/js/challenges.js");
load("assets/js/artifacts.js");
const CTF = global.CTF;
const A = CTF.ARTIFACTS;

/* ------------------------------------------------- independent primitives */
const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LO = "abcdefghijklmnopqrstuvwxyz";
const rot = (c, k, a) => a[(a.indexOf(c) + k + 260) % 26];
const caesar = (t, k) => [...t].map((c) => UP.includes(c) ? rot(c, k, UP) : LO.includes(c) ? rot(c, k, LO) : c).join("");
const rot13 = (t) => caesar(t, 13);
const atbash = (t) => [...t].map((c) => UP.includes(c) ? UP[25 - UP.indexOf(c)] : LO.includes(c) ? LO[25 - LO.indexOf(c)] : c).join("");
const vigenere = (t, key, dec) => {
  let out = "", ki = 0;
  for (const c of t) {
    const a = UP.includes(c) ? UP : LO.includes(c) ? LO : null;
    if (!a) { out += c; continue; }          // key does NOT advance on symbols
    const s = UP.indexOf(key[ki % key.length]);
    ki += 1;
    out += rot(c, dec ? -s : s, a);
  }
  return out;
};
const affine = (t, a, b, dec) => {
  let inv = null;
  if (dec) for (let k = 0; k < 26; k++) if ((a * k) % 26 === 1) inv = k;
  return [...t].map((c) => {
    if (!UP.includes(c)) return c;
    const i = UP.indexOf(c);
    return UP[dec ? ((inv * (i - b)) % 26 + 26) % 26 : (a * i + b) % 26];
  }).join("");
};
const hexToBytes = (h) => Uint8Array.from(Buffer.from(h.replace(/[^0-9a-f]/gi, ""), "hex"));
const bytesToHex = (b) => Buffer.from(b).toString("hex");
const strToHex = (s) => Buffer.from(s, "utf8").toString("hex");
const hexToStr = (h) => Buffer.from(h.replace(/[^0-9a-f]/gi, ""), "hex").toString("utf8");
const b64e = (s) => Buffer.from(s, "utf8").toString("base64");
const b64d = (s) => Buffer.from(s, "base64").toString("utf8");
const b64dBytes = (s) => Uint8Array.from(Buffer.from(s, "base64"));
const urlEnc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const urlDec = (s) => decodeURIComponent(s);
const bin = (s) => [...Buffer.from(s, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join(" ");
const unbin = (s) => Buffer.from((s.match(/[01]{8}/g) || []).map((x) => parseInt(x, 2))).toString("utf8");
const xorStr = (t, k) => {
  const tb = Buffer.from(t, "utf8"), kb = Buffer.from(k, "utf8");
  return Buffer.from(tb.map((v, i) => v ^ kb[i % kb.length])).toString("utf8");
};
const xorHex = (t, k) => {
  const tb = Buffer.from(t, "utf8"), kb = Buffer.from(k, "utf8");
  return Buffer.from(tb.map((v, i) => v ^ kb[i % kb.length])).toString("hex");
};
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sha512 = (s) => crypto.createHash("sha512").update(s).digest("hex");
const ipToInt = (ip) => ip.split(".").reduce((a, o) => a * 256 + (+o & 255), 0) >>> 0;
const intToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
function subnetCalc(ip, cidr) {
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  const net = (ipToInt(ip) & mask) >>> 0;
  const bc = (net | (~mask >>> 0)) >>> 0;
  return { network: intToIp(net), broadcast: intToIp(bc), mask: intToIp(mask), usable: cidr >= 31 ? (cidr === 31 ? 2 : 1) : bc - net - 1 };
}
const permOctal = (s) => {
  const b = s.slice(1);
  let out = "0";
  for (let g = 0; g < 3; g++) {
    const tri = b.slice(g * 3, g * 3 + 3);
    out += (tri[0] === "r" ? 4 : 0) + (tri[1] === "w" ? 2 : 0) + (tri[2] === "x" ? 1 : 0);
  }
  return out;
};
function stringsRun(bytes, n = 4) {
  const out = []; let cur = "";
  for (const b of bytes) {
    if (b >= 32 && b < 127) cur += String.fromCharCode(b);
    else { if (cur.length >= n) out.push(cur); cur = ""; }
  }
  if (cur.length >= n) out.push(cur);
  return out;
}

/* ------------------------------------------------------- assertion engine */
let pass = 0;
const failures = [];
function ok(label, cond, extra) {
  if (cond === true || (Array.isArray(cond) && cond.every(Boolean))) pass++;
  else failures.push({ label, cond, extra });
}
function eq(label, actual, expected) {
  const a = typeof actual === "object" ? JSON.stringify(actual) : String(actual);
  const e = typeof expected === "object" ? JSON.stringify(expected) : String(expected);
  if (a === e) pass++;
  else failures.push({ label, actual: a.slice(0, 160), expected: e.slice(0, 160) });
}

/** rebuild the original byte blob from our own hexdump text format */
function parseDump(text) {
  const bytes = [];
  text.split("\n").forEach((line) => {
    const hexPart = line.slice(10, 59);
    const clean = hexPart.replace(/[^0-9a-fA-F]/g, "");
    for (let i = 0; i + 1 < clean.length; i += 2) bytes.push(parseInt(clean.substr(i, 2), 16));
  });
  return Uint8Array.from(bytes);
}

/* ==========================================================================
 * 1. artifact re-proof
 * ========================================================================*/
function verifyArtifacts() {
  const g = A;

  // ---- CRYPTO
  eq("CRYPTO-001 caesar", caesar(g["CRYPTO-001"].cipher, -g["CRYPTO-001"].shift), g["CRYPTO-001"].flag);
  eq("CRYPTO-002 rot13", rot13(g["CRYPTO-002"].cipher), g["CRYPTO-002"].flag);
  eq("CRYPTO-003 vigenere", vigenere(g["CRYPTO-003"].cipher, g["CRYPTO-003"].key, true), g["CRYPTO-003"].flag);
  eq("CRYPTO-004 xor", Buffer.from(hexToBytes(g["CRYPTO-004"].hex).map((v) => v ^ 0x42)).toString("utf8"), g["CRYPTO-004"].flag);
  eq("CRYPTO-005 hex", hexToStr(g["CRYPTO-005"].hex), g["CRYPTO-005"].flag);
  eq("CRYPTO-006 binary", unbin(g["CRYPTO-006"].binary), g["CRYPTO-006"].flag);
  eq("CRYPTO-007 layers", b64d(hexToStr(b64d(g["CRYPTO-007"].final))), g["CRYPTO-007"].flag);
  eq("CRYPTO-008 md5", md5("phantom"), g["CRYPTO-008"].md5);
  eq("CRYPTO-008 sha1", sha1("midnight"), g["CRYPTO-008"].sha1);
  eq("CRYPTO-008 sha256", sha256("lantern"), g["CRYPTO-008"].sha256);
  eq("CRYPTO-008 sha512", sha512("compass"), g["CRYPTO-008"].sha512);
  eq("CRYPTO-009 unsalted", sha256(g["CRYPTO-009"].password), g["CRYPTO-009"].unsalted);
  eq("CRYPTO-009 salted", sha256(g["CRYPTO-009"].correct + g["CRYPTO-009"].password), g["CRYPTO-009"].target);
  ok("CRYPTO-009 salt table", g["CRYPTO-009"].salts.every((s) => sha256(s + g["CRYPTO-009"].password) === g["CRYPTO-009"].salted[s]));
  eq("CRYPTO-010 archive", b64d(atbash(caesar(hexToStr(g["CRYPTO-010"].final), -7))), g["CRYPTO-010"].flag);
  eq("CRYPTO-010 steps b64", b64e(g["CRYPTO-010"].flag), g["CRYPTO-010"].steps.b64);
  eq("CRYPTO-010 steps atbash", atbash(g["CRYPTO-010"].steps.b64), g["CRYPTO-010"].steps.atbash);
  eq("CRYPTO-010 steps caesar", caesar(g["CRYPTO-010"].steps.atbash, 7), g["CRYPTO-010"].steps.caesar7);
  eq("CRYPTO-010 steps hex", strToHex(g["CRYPTO-010"].steps.caesar7), g["CRYPTO-010"].steps.hex);
  const otp = (t, k, dec) => {
    const AL = UP + " ";
    return [...t].map((c, i) => {
      const a = AL.indexOf(c), b = AL.indexOf(k[i % k.length]);
      if (a < 0 || b < 0) return c;
      return AL[((dec ? a - b : a + b) % 27 + 27) % 27];
    }).join("");
  };
  eq("CRYPTO-011 otp m1", otp(g["CRYPTO-011"].m1, g["CRYPTO-011"].key, false), g["CRYPTO-011"].c1);
  eq("CRYPTO-011 otp m2", otp(g["CRYPTO-011"].m2, g["CRYPTO-011"].key, false), g["CRYPTO-011"].c2);
  eq("CRYPTO-011 otp back", otp(g["CRYPTO-011"].c1, g["CRYPTO-011"].key, true), g["CRYPTO-011"].m1);
  {
    // the crib attack must really recover the key stream
    const AL = UP + " ";
    const a = g["CRYPTO-011"];
    const recovered = [...a.c1].map((c, i) => AL[((AL.indexOf(c) - AL.indexOf(a.m1[i])) % 27 + 27) % 27]).join("");
    const key12 = recovered.slice(0, 12);
    eq("CRYPTO-011 crib recovers key", key12, a.key);
    eq("CRYPTO-011 key stream repeats", recovered.slice(12), key12.slice(0, recovered.length - 12));
    eq("CRYPTO-011 c2 decrypts", otp(a.c2, key12, true), a.m2);
    eq("CRYPTO-011 engine decrypts c2", CTF.otp(a.c2, key12, true), a.m2);
  }
  eq("CRYPTO-012 affine", affine(g["CRYPTO-012"].cipher, g["CRYPTO-012"].a, g["CRYPTO-012"].b, true), g["CRYPTO-012"].flag);
  eq("CRYPTO-012 affine enc", affine(g["CRYPTO-012"].flag, g["CRYPTO-012"].a, g["CRYPTO-012"].b, false), g["CRYPTO-012"].cipher);

  // engine parity for the primitives the labs hand out
  eq("engine caesar", CTF.caesar(g["CRYPTO-001"].cipher, -7), g["CRYPTO-001"].flag);
  eq("engine caesar enc", CTF.caesar(g["CRYPTO-001"].flag, 7), g["CRYPTO-001"].cipher);
  eq("engine rot13", CTF.rot13(g["CRYPTO-002"].cipher), g["CRYPTO-002"].flag);
  eq("engine atbash involution", CTF.atbash(CTF.atbash(g["CRYPTO-010"].steps.b64)), g["CRYPTO-010"].steps.b64);
  eq("engine vigenere dec", CTF.vigenere(g["CRYPTO-003"].cipher, g["CRYPTO-003"].key, true), g["CRYPTO-003"].flag);
  eq("engine vigenere enc", CTF.vigenere(g["CRYPTO-003"].flag, g["CRYPTO-003"].key, false), g["CRYPTO-003"].cipher);
  eq("engine affine dec", CTF.affine(g["CRYPTO-012"].cipher, 5, 8, true), g["CRYPTO-012"].flag);
  eq("engine affine enc", CTF.affine(g["CRYPTO-012"].flag, 5, 8, false), g["CRYPTO-012"].cipher);
  eq("engine otp enc", CTF.otp(g["CRYPTO-011"].m1, g["CRYPTO-011"].key, false), g["CRYPTO-011"].c1);
  eq("engine otp dec", CTF.otp(g["CRYPTO-011"].c1, g["CRYPTO-011"].key, true), g["CRYPTO-011"].m1);
  eq("engine xor", CTF.xorString(CTF.xorString(g["CRYPTO-004"].flag, "B"), "B"), g["CRYPTO-004"].flag);
  eq("engine xor hex", CTF.xorHex(g["CRYPTO-004"].flag, "B"), g["CRYPTO-004"].hex);
  eq("engine b64", CTF.b64decode(g["ENCODE-001"].b64), g["ENCODE-001"].flag);
  eq("engine b64 enc", CTF.b64encode(g["ENCODE-001"].flag), g["ENCODE-001"].b64);
  eq("engine hex", CTF.hexToStr(g["CRYPTO-005"].hex), g["CRYPTO-005"].flag);
  eq("engine hex enc", CTF.strToHex(g["CRYPTO-005"].flag, true), g["CRYPTO-005"].hex);
  eq("engine binary", CTF.fromBinary(g["CRYPTO-006"].binary), g["CRYPTO-006"].flag);
  eq("engine binary enc", CTF.toBinary(g["CRYPTO-006"].flag), g["CRYPTO-006"].binary);
  eq("engine ascii list", CTF.fromAsciiList(g["ENCODE-003"].ascii), g["ENCODE-003"].flag);
  eq("engine ascii enc", CTF.toAsciiList(g["ENCODE-003"].flag), g["ENCODE-003"].ascii);
  eq("engine urlencode", CTF.urlEncode(g["ENCODE-002"].raw), g["ENCODE-002"].url);
  eq("engine urldecode", CTF.urlDecode(g["ENCODE-002"].url), g["ENCODE-002"].raw);
  eq("engine subnet usable", CTF.subnet("10.0.0.0", 26).usable, 62);
  eq("engine subnet network", CTF.subnet("192.168.20.130", 26).network, g["NET-003"].a.network);
  eq("engine ipKind", g["NET-001"].items.map((i) => CTF.ipKind(i[0])).join(","), g["NET-001"].answer);
  eq("engine hexdump roundtrip", parseDump(CTF.hexdump(hexToBytes(g["CRYPTO-005"].hex))).length, g["CRYPTO-005"].flag.length);
  eq("engine strings", CTF.strings(CTF.utf8Bytes("xx\x00\x00FLAG{TEST}")).length > 0, true);
  eq("engine png signature", CTF.sniffSignature(CTF.fromHex("89504e470d0a1a0a0000")), "PNG");

  // ---- ENCODING
  eq("ENCODE-001 b64", b64d(g["ENCODE-001"].b64), g["ENCODE-001"].flag);
  ok("ENCODE-002 url", urlDec(g["ENCODE-002"].url).includes("FLAG{URL DECODE ME}"));
  eq("ENCODE-002 url roundtrip", urlEnc(g["ENCODE-002"].raw), g["ENCODE-002"].url);
  eq("ENCODE-003 ascii", Buffer.from(g["ENCODE-003"].ascii.split(" ").map(Number)).toString("utf8"), g["ENCODE-003"].flag);
  eq("ENCODE-004 bin->dec", g["ENCODE-004"].binary.match(/[01]{8}/g).map((x) => parseInt(x, 2)).join(" "), g["ENCODE-004"].decimal);
  eq("ENCODE-004 dec->txt", Buffer.from(g["ENCODE-004"].decimal.split(" ").map(Number)).toString("utf8"), g["ENCODE-004"].flag);
  eq("ENCODE-005 triple", b64d(urlDec(hexToStr(g["ENCODE-005"].final))), g["ENCODE-005"].flag);
  eq("ENCODE-006 maze", rot13(b64d(hexToStr(g["ENCODE-006"].final).split("").reverse().join(""))), g["ENCODE-006"].flag);

  // ---- STEGO (pixel rebuild must match the Python reference exactly)
  const stegoCases = [
    ["STEGO-001", "r", (art) => art.firstRowRed, (px) => px[0].map((p) => p[0])],
    ["STEGO-002", "b", (art) => art.first8Blue, (px) => px[0].slice(0, 8).map((p) => p[2])]
  ];
  stegoCases.forEach(([id, channel, ref, pick]) => {
    const art = g[id];
    const px = CTF.buildPixels(art.spec);
    eq(id + " pixel parity", pick(px), ref(art));
    const text = CTF.lsbExtract(px, channel, { printableOnly: true });
    eq(id + " lsb extract", text.slice(0, art.flag.length), art.flag);
    eq(id + " embedded parity", art.extracted.slice(0, art.flag.length), art.flag);
    ok(id + " self check", art.check === true);
  });
  eq("STEGO-002 answer bits", g["STEGO-002"].answer,
    g["STEGO-002"].first8Blue.map((v) => (v & 1).toString()).join(" "));
  eq("STEGO-001 lsb string", g["STEGO-001"].lsb,
    g["STEGO-001"].firstRowRed.map((v) => (v & 1).toString()).join(""));
  {
    const art = g["STEGO-003"];
    const px = CTF.buildPixels(art.spec);
    const found = CTF.deviantPixels(px, art.spec.base);
    eq("STEGO-003 deviant count", found.length, 7);
    eq("STEGO-003 deviant coords", found.map((d) => d.x + "," + d.y), art.coords);
    eq("STEGO-003 answer", String(found.length), art.answer);
  }
  {
    const art = g["STEGO-004"];
    const px = CTF.buildPixels(art.spec);
    eq("STEGO-004 row9 parity", px[9].map((p) => p[0]), art.row9Red);
    eq("STEGO-004 layer2", CTF.lsbExtract(px, "r", { startRow: 9, endRow: art.spec.h - 1, printableOnly: true }).slice(0, art.flag.length), art.flag);
    eq("STEGO-004 layer1 alpha", art.layer1, art.clue);
    const alphaM = CTF.buildAlpha(art.spec);
    eq("STEGO-004 alpha parity", alphaM[0], art.alphaRow0);
    const alphaRows = [0, 1, 2].map((r) => alphaM[r].map((v) => [v, 0, 0]));
    eq("STEGO-004 alpha clue", CTF.lsbExtract(alphaRows, "r", { endRow: 2, printableOnly: true }), art.clue);
    eq("STEGO-004 alpha values", art.alphaUnique.join(","), "254,255");
    eq("STEGO-004 layer2 field", art.layer2.slice(0, art.flag.length), art.flag);
  }
  {
    const art = g["STEGO-005"];
    const bytes = hexToBytes(art.bytesHex);
    eq("STEGO-005 size", bytes.length, art.size);
    eq("STEGO-005 png signature", CTF.sniffSignature(bytes), "PNG");
    const runs = stringsRun(bytes);
    eq("STEGO-005 strings parity", runs, art.strings);
    const tail = runs[runs.length - 1];
    eq("STEGO-005 tail decode", b64d(hexToStr(tail)), art.flag);
    ok("STEGO-005 png still valid after tail", bytes.length > art.pngSize && Buffer.from(bytes.slice(0, 8)).toString("hex") === "89504e470d0a1a0a");
  }

  // ---- FORENSICS
  {
    const art = g["FORENSIC-001"];
    // rebuild: JPEG magic prepended to a PNG
    const dumpBytes = parseDump(art.hex);
    ok("FORENSIC-001 jpeg magic first", dumpBytes[0] === 0xff && dumpBytes[1] === 0xd8);
    ok("FORENSIC-001 png magic at 0x0c", Buffer.from(dumpBytes.slice(12, 16)).toString("hex") === "89504e47");
    eq("FORENSIC-001 answer", art.answer, "PNG");
  }
  {
    const art = g["FORENSIC-002"];
    const bytes = parseDump(art.hexdump);
    eq("FORENSIC-002 dump length", bytes.length, 512);
    eq("FORENSIC-002 strings parity", stringsRun(Array.from(bytes)), art.strings);
    ok("FORENSIC-002 b64 in strings", stringsRun(Array.from(bytes)).includes(art.b64));
    eq("FORENSIC-002 b64 decode", b64d(art.b64), art.flag);
  }
  {
    const art = g["FORENSIC-003"];
    const note = art.meta.XMP.Note.split(":")[1];
    eq("FORENSIC-003 xmp note", b64d(note), art.flag);
  }
  {
    const art = g["FORENSIC-004"];
    const bytes = parseDump(art.hexdump);
    eq("FORENSIC-004 length", bytes.length, 256);
    eq("FORENSIC-004 payload offset", Buffer.from(bytes.slice(144, 144 + art.flag.length)).toString("utf8"), art.flag);
    eq("FORENSIC-004 offset label", art.offsetDec, 144);
  }
  {
    const art = g["FORENSIC-005"];
    const sorted = [...art.events].sort((a, b) => a.ts.localeCompare(b.ts)).map((e) => e.id).join(",");
    eq("FORENSIC-005 timeline", sorted, art.answer);
    eq("FORENSIC-005 first event", [...art.events].sort((a, b) => a.ts.localeCompare(b.ts))[0].id, art.firstAction);
  }
  {
    const art = g["FORENSIC-006"];
    const fa = rot13(art.parts.A), fb = hexToStr(art.parts.B), tpl = b64d(art.parts.C);
    eq("FORENSIC-006 fragment A", fa, art.decoded.A);
    eq("FORENSIC-006 fragment B", fb, art.decoded.B);
    eq("FORENSIC-006 template C", tpl, art.template);
    const assembled = tpl.replace("<A>", fa).replace("<B>", fb);
    eq("FORENSIC-006 assembled", assembled, art.flag);
    eq("FORENSIC-006 checksum", sha256(art.flag), art.sha256Flag);
    ok("FORENSIC-006 evidence embeds checksum", art.evidence.includes(art.sha256Flag));
    ok("FORENSIC-006 evidence embeds rule", /assembly_rule/.test(art.evidence));
    const dumped = parseDump(CTF.hexdump(CTF.utf8Bytes(art.evidence), { length: 128 }));
    eq("FORENSIC-006 hexdump length", dumped.length, 128);
    eq("FORENSIC-006 hexdump parity", Buffer.from(dumped).toString("utf8"), art.evidence.slice(0, 128));
  }
  {
    const art = g["FORENSIC-011"];
    ok("FORENSIC-011 pid present", art.procTable.includes(art.pid));
    eq("FORENSIC-011 cmdline decode", hexToStr(art.procTable.match(/--c ([0-9a-f]+)/)[1]), art.c2);
    const txt = art.dns.match(/"([^"]+)"/)[1];
    eq("FORENSIC-011 dns txt", b64d(txt), art.flag);
  }

  // ---- NETWORKING
  eq("NET-002 /24", subnetCalc("192.168.1.0", 24).usable, 254);
  eq("NET-002 /26", subnetCalc("10.0.0.0", 26).usable, 62);
  eq("NET-002 /28", subnetCalc("172.16.9.0", 28).usable, 14);
  eq("NET-002 /30", subnetCalc("192.168.5.0", 30).usable, 2);
  {
    const a = g["NET-003"].a, b = g["NET-003"].b;
    const ca = subnetCalc("192.168.20.130", a.cidr), cb = subnetCalc("10.10.5.77", b.cidr);
    eq("NET-003 A network", ca.network, a.network);
    eq("NET-003 A broadcast", ca.broadcast, a.broadcast);
    eq("NET-003 A mask", ca.mask, a.mask);
    eq("NET-003 A usable", ca.usable, a.usable);
    eq("NET-003 A answer", `${ca.network},${ca.broadcast},${ca.usable}`, g["NET-003"].answerA);
    eq("NET-003 B network", cb.network, b.network);
    eq("NET-003 B broadcast", cb.broadcast, b.broadcast);
    eq("NET-003 B usable", cb.usable, b.usable);
    eq("NET-003 B answer", `${cb.network},${cb.broadcast},${cb.usable}`, g["NET-003"].answerB);
  }
  {
    const kinds = g["NET-001"].items.map(([ip]) => CTF.ipKind(ip));
    // 192.168.1.255 is a subnet-directed broadcast in the dataset
    eq("NET-001 kinds", kinds, g["NET-001"].answer.split(","));
  }
  eq("NET-006 txt record", b64d(g["NET-006"].records.find((r) => r[0] === "_ctf.lab.nullpoint.invalid")[2]), g["NET-006"].flag);
  eq("NET-007 chunk1", b64d(g["NET-007"].case.dns[0][2]), g["NET-007"].chunk1);
  eq("NET-007 chunk2", b64d(g["NET-007"].case.dns[1][2]), g["NET-007"].chunk2);
  eq("NET-007 assembled", g["NET-007"].chunk1 + g["NET-007"].chunk2, g["NET-007"].flag);
  eq("NET-012 tunnel", g["NET-012"].subdomains.map((s) => hexToStr(s)).join(" "), g["NET-012"].decoded);

  // ---- LINUX
  ok("LINUX-004 permissions", g["LINUX-004"].items.every(([sym, oct]) => permOctal(sym) === oct));
  eq("LINUX-004 answer", permOctal("-rwxr-x---"), g["LINUX-004"].answer);

  // ---- PROGRAMMING / REVERSE
  eq("CODE-001 sumEven", g["CODE-001"].nums.filter((n) => n % 2 === 0).reduce((a, b) => a + b, 0), g["CODE-001"].answer);
  eq("CODE-002 max", Math.max(...g["CODE-002"].arr), g["CODE-002"].answer);
  eq("CODE-003 xor", g["CODE-003"].arr.reduce((a, b) => a ^ b, 0), g["CODE-003"].xor);
  eq("CODE-003 flag", `FLAG{${g["CODE-003"].xor.toString(16).toUpperCase().padStart(2, "0")}}`, g["CODE-003"].flag);
  {
    const grid = g["CODE-005"].grid.map((r) => [...r]);
    const path = g["CODE-005"].coords.map((c) => { const [r, k] = c.split(",").map(Number); return grid[r][k]; }).join("");
    eq("CODE-005 maze path", path, g["CODE-005"].path);
    eq("CODE-005 move count", g["CODE-005"].moves.length, g["CODE-005"].coords.length - 1);
  }
  {
    const josephus = (n, k) => { const p = Array.from({ length: n }, (_, i) => i + 1); let i = 0; while (p.length > 1) { i = (i + k - 1) % p.length; p.splice(i, 1); } return p[0]; };
    eq("CODE-011 josephus", josephus(g["CODE-011"].n, g["CODE-011"].k), g["CODE-011"].survivor);
    ok("CODE-011 flag contains survivor", g["CODE-011"].flag.includes(String(g["CODE-011"].survivor)));
  }
  eq("RE-001 parts", g["RE-001"].parts.join(""), g["RE-001"].flag);
  eq("RE-002 xor decode", g["RE-002"].encoded.map((v) => String.fromCharCode(v ^ 0x5a)).join(""), g["RE-002"].flag);
  {
    const a = g["RE-003"];
    eq("RE-003 reverse", [...a.seed].reverse().join(""), a.step1);
    eq("RE-003 dash", a.step1.replace(/_/g, "-"), a.step2);
    eq("RE-003 sort", [...a.step2].sort().join(""), a.step3);
    eq("RE-003 answer", [...a.step3].map((c) => c.toUpperCase()).filter((c) => /[A-Z0-9]/.test(c)).join(""), a.answer);
  }
  {
    const n = g["RE-004"].answer;
    ok("RE-004 conditions", n % 7 === 3 && n % 11 === 5 && n.toString(2).endsWith("101") && n > 100);
    ok("RE-004 smallest", g["RE-004"].candidates.every((c) => c >= n));
  }
  {
    const a = g["RE-005"];
    let s = a.final;
    s = hexToStr(s);
    s = b64d(s);
    s = xorStr(s, "K9");
    s = caesar(s, -4);
    s = [...s].reverse().join("");
    eq("RE-005 reverse chain", s, a.flag);
  }
  {
    const vm = g["RE-011"];
    eq("RE-011 vm output", vm.answer, "FLAG{VM_GHOST}");
  }
  eq("CODE-004 build", ["FLAG{", "GNIRTS", "_", "NOEGRUS", "}"].join(""), g["CODE-004"].flag);

  // ---- CAMPAIGNS
  const C = g.CAMPAIGNS;
  eq("CASE-001 s1", hexToStr(b64d(C["CASE-001"].s1.final)), C["CASE-001"].s1.answer);
  eq("CASE-001 s2", caesar(C["CASE-001"].s2.cipher, -C["CASE-001"].s2.shift), C["CASE-001"].s2.flag);
  eq("CASE-001 s3", rot13(hexToStr(C["CASE-001"].s3.hex)), C["CASE-001"].s3.flag);
  {
    const spec = C["CASE-001"].s4.stego;
    const px = CTF.buildPixels(spec);
    eq("CASE-001 s4 lsb", CTF.lsbExtract(px, spec.channel, { printableOnly: true }).trim(), spec.data);
  }
  eq("CASE-001 s5", caesar(atbash(b64d(C["CASE-001"].s5.final)), -3), C["CASE-001"].s5.flag);
  ok("CASE-002 s1 gzip magic", C["CASE-002"].s1.hexHead.startsWith("1f 8b"));
  eq("CASE-002 s2 note", b64d(C["CASE-002"].s2.meta.Note), "second key is the owner name");
  eq("CASE-002 s3 hex", hexToStr(C["CASE-002"].s3.hexPayload), C["CASE-002"].s3.answer);
  eq("CASE-002 s4 binary", unbin(C["CASE-002"].s4.binary), C["CASE-002"].s4.answer);
  eq("CASE-002 s5 cipher", atbash(caesar(hexToStr(C["CASE-002"].s5.cipher), -5)), C["CASE-002"].s5.answerDecoded);
  eq("CASE-003 s4 octal", permOctal(C["CASE-003"].s4.perm), C["CASE-003"].s4.octal);
  {
    const s1 = C["CASE-004"].s1;
    const calc = subnetCalc(s1.ip, s1.cidr);
    eq("CASE-004 s1 network", calc.network, s1.network);
    eq("CASE-004 s1 broadcast", calc.broadcast, s1.broadcast);
    eq("CASE-004 s1 mask", calc.mask, s1.mask);
    eq("CASE-004 s1 usable", calc.usable, s1.usable);
  }
  eq("CASE-004 s2 txt", b64d(C["CASE-004"].s2.txt), C["CASE-004"].s2.answer);
  eq("CASE-004 s5 chunks", C["CASE-004"].s5.chunks.map(b64d).join(""), C["CASE-004"].s5.flag);
  {
    const c5 = C["CASE-005"];
    const inv = {};
    Object.entries(c5.s1.map).forEach(([k, v]) => { inv[v] = k; });
    const sub = (t, m) => [...t].map((c) => (c in m ? m[c] : c)).join("");
    eq("CASE-005 s1", sub(c5.s1.sample, inv), c5.s1.answer);
    eq("CASE-005 s2", sub(c5.s2.cipher, inv), c5.s2.answer);
    eq("CASE-005 s3", sub(c5.s3.cipher, inv), c5.s3.answer);
    eq("CASE-005 s4", sub(b64d(hexToStr(c5.s4.final)), inv), c5.s4.answer);
    eq("CASE-005 s5", sub(b64d(atbash(caesar(c5.s5.final, -9))), inv), c5.s5.answer);
    // substitution map must be a bijection over A-Z
    eq("CASE-005 map size", Object.keys(c5.s1.map).length, 26);
    eq("CASE-005 map unique", new Set(Object.values(c5.s1.map)).size, 26);
  }

  // every artifact group must declare its own self-check as true
  Object.entries(g).forEach(([k, v]) => {
    if (k === "CAMPAIGNS" || k === "OSINT") return;
    if (v && typeof v === "object" && "check" in v) {
      ok(`self-check ${k}`, v.check === true || (Array.isArray(v.check) && v.check.every(Boolean)), v.check);
    }
  });
  ["CASE-001", "CASE-002", "CASE-003", "CASE-004", "CASE-005"].forEach((cid) => {
    Object.entries(C[cid]).forEach(([stage, v]) => {
      if (v && typeof v === "object" && "check" in v) ok(`self-check ${cid}.${stage}`, v.check === true, v.check);
    });
  });
  ok("OSINT disclaimer", g.OSINT.disclaimer.toLowerCase().includes("fictional"));
}

/* ==========================================================================
 * 2. database audit (runs after data files are loaded)
 * ========================================================================*/
function verifyDatabase() {
  const db = CTF.DB;
  ok("db has >= 50 challenges", db.length >= 50, db.length);

  const ids = new Set();
  db.forEach((c) => {
    ok(`${c.id}: unique id`, !ids.has(c.id));
    ids.add(c.id);
    ok(`${c.id}: title`, typeof c.title === "string" && c.title.length > 3);
    ok(`${c.id}: category known`, !!CTF.categoryById(c.category), c.category);
    const d = CTF.difficulty(c.difficulty);
    ok(`${c.id}: difficulty known`, CTF.DIFFICULTIES.some((x) => x.id === c.difficulty), c.difficulty);
    ok(`${c.id}: points in band ${d.label}`, c.points >= d.min && c.points <= d.max, `${c.points} not in ${d.min}-${d.max}`);
    ok(`${c.id}: 3 hints`, Array.isArray(c.hints) && c.hints.length === 3, c.hints && c.hints.length);
    ok(`${c.id}: hints non-empty`, (c.hints || []).every((h) => typeof h === "string" && h.length > 8));
    ok(`${c.id}: flag non-empty`, typeof c.flag === "string" && c.flag.length >= 6);
    ok(`${c.id}: learning objective`, typeof c.objective === "string" && c.objective.length > 15);
    ok(`${c.id}: writeup`, typeof c.explanation === "string" && c.explanation.length > 40);
    ok(`${c.id}: skills`, Array.isArray(c.skills) && c.skills.length >= 2);
    ok(`${c.id}: description`, typeof c.description === "string" && c.description.length > 20);
    ok(`${c.id}: artifact type`, !!(c.data && c.data.artifact), c.data && c.data.artifact);
    ok(`${c.id}: answer rule`, !!(c.answer && (c.answer.expects !== undefined || c.answer.type === "code")), JSON.stringify(c.answer || {}).slice(0, 80));
    ok(`${c.id}: no real domains`, !/(gmail|google|facebook|twitter|github\.com|amazon|microsoft)\./i.test(JSON.stringify(c)), "real domain reference");
    ok(`${c.id}: no http target`, !/https?:\/\/(?!lab\.|.*\.invalid|localhost)/i.test(JSON.stringify(c.data || {})), "external URL in data");
  });

  // flags must be unique unless a campaign deliberately reuses its case flag
  const flagOwners = {};
  db.forEach((c) => { (flagOwners[c.flag] = flagOwners[c.flag] || []).push(c.id); });
  Object.entries(flagOwners).forEach(([flag, owners]) => {
    if (owners.length > 1) {
      const sameCampaign = owners.every((id) => id.startsWith(owners[0].split("-S")[0]));
      ok(`flag reuse allowed only inside one campaign: ${flag}`, sameCampaign, owners.join(","));
    }
  });

  // category coverage
  const cats = new Set(db.map((c) => c.category));
  ok("all 11 categories used", cats.size >= 11, [...cats].join(" | "));
  const diffs = new Set(db.map((c) => c.difficulty));
  ok("all 5 difficulties used", diffs.size === 5, [...diffs].join(" | "));

  // campaigns
  const campaigns = db.filter((c) => c.campaign);
  const caseIds = new Set(campaigns.map((c) => c.campaign));
  eq("5 mystery campaigns", caseIds.size, 5);
  caseIds.forEach((cid) => {
    const stages = campaigns.filter((c) => c.campaign === cid).sort((a, b) => a.stage - b.stage);
    eq(`${cid}: 5 stages`, stages.length, 5);
    eq(`${cid}: stage order`, stages.map((s) => s.stage).join(","), "1,2,3,4,5");
  });
  const expectedTotals = { "CASE-001": 1000, "CASE-002": 1200, "CASE-003": 1500, "CASE-004": 1500, "CASE-005": 2000 };
  Object.entries(expectedTotals).forEach(([cid, total]) => {
    const sum = campaigns.filter((c) => c.campaign === cid).reduce((a, c) => a + c.points, 0);
    eq(`${cid}: total points`, sum, total);
  });

  // answer validation smoke test: the stored flag and every listed acceptable
  // answer must all validate (some labs ask for a computed answer, not the flag)
  db.forEach((c) => {
    if (c.answer && c.answer.type === "code") return;
    const alts = Array.isArray(c.answer.expects) ? c.answer.expects : [c.answer.expects];
    ok(`${c.id}: an accepted answer validates`,
      CTF.checkAnswer(c, c.flag) === true || alts.some((a) => CTF.checkAnswer(c, a) === true),
      JSON.stringify(alts).slice(0, 90));
    alts.forEach((a) => {
      if (typeof a !== "string") return;
      ok(`${c.id}: listed answer validates -> ${a.slice(0, 40)}`, CTF.checkAnswer(c, a) === true);
    });
    // a wrong answer must never pass
    ok(`${c.id}: rejects garbage`, CTF.checkAnswer(c, "FLAG{definitely_not_it}") === false || !!c.answer.regex);
  });

  // badges / categories / difficulty tables
  ok(">= 15 badges", CTF.BADGES.length >= 15, CTF.BADGES.length);
  ok("badge ids unique", new Set(CTF.BADGES.map((b) => b.id)).size === CTF.BADGES.length);
  eq("5 difficulty levels", CTF.DIFFICULTIES.length, 5);
  eq("hint penalty table", CTF.HINT_PENALTY.join(","), "0,0,0.1,0.25");
  eq("xp table", CTF.DIFFICULTIES.map((d) => d.xp).join(","), "50,100,200,350,600");
}

/* ==========================================================================
 * main
 * ========================================================================*/
const dataDir = path.join(ROOT, "assets/js/data");
// vfs.js must load before the challenge files: Linux labs reference CTF.VFS_VIEWS at registration time
const dataFiles = ["vfs.js"].concat(
  fs.readdirSync(dataDir).filter((f) => f.endsWith(".js") && f !== "vfs.js").sort()
);
if (process.argv.includes("--artifacts-only")) {
  verifyArtifacts();
} else {
  verifyArtifacts();
  dataFiles.forEach((f) => load("assets/js/data/" + f));
  verifyDatabase();
}

console.log(`\nloaded data files: ${dataFiles.length || "(none yet)"}`);
console.log(`challenges in DB : ${CTF.DB.length}`);
console.log(`assertions passed: ${pass}`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  failures.slice(0, 60).forEach((f) => console.log("  x", f.label, "|", f.expected !== undefined ? `got ${f.actual} want ${f.expected}` : JSON.stringify(f.cond)));
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED \u2713");
}
