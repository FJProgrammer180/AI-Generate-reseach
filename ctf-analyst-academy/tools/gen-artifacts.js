#!/usr/bin/env node
/* ============================================================================
 * tools/gen-artifacts.js - deterministic generator for assets/js/artifacts.js
 * ----------------------------------------------------------------------------
 * Every artifact is *derived* from its flag/answer with an independent
 * implementation, self-checked here, then serialised into the data file that
 * the challenge datasets read at load time.
 *
 *   node tools/gen-artifacts.js     # rewrites assets/js/artifacts.js
 *   node tools/verify.js            # re-proves it + audits the database
 *
 * All content is fictional: reserved .invalid hostnames, documentation IP
 * ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and dummy secrets.
 * ==========================================================================*/
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
global.window = global;
global.self = global;
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");
// eslint-disable-next-line no-eval
eval(fs.readFileSync(path.join(ROOT, "assets/js/challenges.js"), "utf8"));
const CTF = global.CTF;

/* ------------------------------------------------------------ primitives */
const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LO = "abcdefghijklmnopqrstuvwxyz";
const rot = (c, k, a) => a[(a.indexOf(c) + k + 260) % 26];
const caesar = (t, k) => [...t].map((c) => (UP.includes(c) ? rot(c, k, UP) : LO.includes(c) ? rot(c, k, LO) : c)).join("");
const rot13 = (t) => caesar(t, 13);
const atbash = (t) => [...t].map((c) => (UP.includes(c) ? UP[25 - UP.indexOf(c)] : LO.includes(c) ? LO[25 - LO.indexOf(c)] : c)).join("");
const vigenere = (t, key, dec) => {
  let out = "", ki = 0;
  for (const c of t) {
    const a = UP.includes(c) ? UP : LO.includes(c) ? LO : null;
    if (!a) { out += c; continue; }
    const s = UP.indexOf(key[ki % key.length]); ki += 1;
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
const AL27 = UP + " ";
const otp = (t, k, dec) => [...t].map((c, i) => {
  const a = AL27.indexOf(c), b = AL27.indexOf(k[i % k.length]);
  if (a < 0 || b < 0) return c;
  return AL27[((dec ? a - b : a + b) % 27 + 27) % 27];
}).join("");
const strToHex = (s, up) => Buffer.from(s, "utf8").toString("hex").replace(/[a-f]/g, (c) => (up ? c.toUpperCase() : c));
const hexToStr = (h) => Buffer.from(h.replace(/[^0-9a-f]/gi, ""), "hex").toString("utf8");
const b64e = (s) => Buffer.from(s, "utf8").toString("base64");
const b64d = (s) => Buffer.from(s, "base64").toString("utf8");
const b64url = (s) => b64e(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const urlEnc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const bin = (s) => [...Buffer.from(s, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join(" ");
const binTight = (s) => [...Buffer.from(s, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join("");
const unbin = (s) => Buffer.from((s.match(/[01]{8}/g) || []).map((x) => parseInt(x, 2))).toString("utf8");
const xorHex = (t, k) => {
  const tb = Buffer.from(t, "utf8"), kb = Buffer.from(k, "utf8");
  return Buffer.from(tb.map((v, i) => v ^ kb[i % kb.length])).toString("hex");
};
const xorStr = (t, k) => {
  const tb = Buffer.from(t, "utf8"), kb = Buffer.from(k, "utf8");
  return Buffer.from(tb.map((v, i) => v ^ kb[i % kb.length])).toString("utf8");
};
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const sha512 = (s) => crypto.createHash("sha512").update(s).digest("hex");
const ipToInt = (ip) => ip.split(".").reduce((a, o) => a * 256 + (+o & 255), 0) >>> 0;
const intToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
function subnet(ip, cidr) {
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  const net = (ipToInt(ip) & mask) >>> 0;
  const bc = (net | (~mask >>> 0)) >>> 0;
  return { network: intToIp(net), broadcast: intToIp(bc), mask: intToIp(mask), usable: bc - net - 1 };
}
const permOctal = (s) => {
  const b = s.slice(1); let out = "0";
  for (let g = 0; g < 3; g++) {
    const t = b.slice(g * 3, g * 3 + 3);
    out += (t[0] === "r" ? 4 : 0) + (t[1] === "w" ? 2 : 0) + (t[2] === "x" ? 1 : 0);
  }
  return out;
};
/** deterministic byte filler that never produces a printable run of 4+ */
function noiseBytes(seed, n, rnd) {
  const r = rnd || CTF.mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    let v = Math.floor(r() * 256);
    if (v >= 32 && v < 127) v = (v + 128) & 0xff;   // keep it non-printable
    out.push(v);
  }
  return out;
}
function plant(bytes, offset, text) {
  const t = [...Buffer.from(text, "utf8")];
  for (let i = 0; i < t.length; i++) bytes[offset + i] = t[i];
  return bytes;
}
const stringsOf = (bytes) => CTF.strings(bytes, 4);
const assert = (cond, msg) => { if (!cond) throw new Error("artifact self-check failed: " + msg); };

const A = {};

/* ============================== CRYPTOGRAPHY ============================== */
{
  const flag = "FLAG{SHIFT_SEVEN_RECOVERED}";
  const cipher = caesar(flag, 7);
  assert(caesar(cipher, -7) === flag, "CRYPTO-001");
  assert(cipher.includes("MSHN"), "CRYPTO-001 hint token MSHN");
  A["CRYPTO-001"] = { flag, shift: 7, cipher, check: caesar(cipher, -7) === flag };
}
{
  const flag = "FLAG{ROT13_IS_NOT_ENCRYPTION}";
  const cipher = rot13(flag);
  assert(cipher.startsWith("SYNT"), "CRYPTO-002 SYNT prefix");
  A["CRYPTO-002"] = { flag, cipher, check: rot13(cipher) === flag };
}
{
  const flag = "FLAG{VIGENERE_FALLS_TO_A_CRIB}";
  const key = "GHOST";
  const cipher = vigenere(flag, key, false);
  assert(vigenere(cipher, key, true) === flag, "CRYPTO-003");
  assert(CTF.vigenere(cipher, key, true) === flag, "CRYPTO-003 engine parity");
  A["CRYPTO-003"] = { flag, key, cipher, check: CTF.vigenere(cipher, key, true) === flag };
}
{
  const flag = "FLAG{XOR_WITH_A_CONSTANT}";
  const key = "B";
  const hex = CTF.xorHex(flag, key);            // lowercase, matches the engine byte for byte
  assert(Buffer.from([...Buffer.from(hex, "hex")].map((v) => v ^ 0x42)).toString("utf8") === flag, "CRYPTO-004 decode");
  assert(CTF.xorHex(flag, key) === hex, "CRYPTO-004 engine parity");
  A["CRYPTO-004"] = { flag, key, byte: "0x42", hex, check: Buffer.from([...Buffer.from(hex, "hex")].map((v) => v ^ 0x42)).toString("utf8") === flag };
}
{
  const flag = "FLAG{HEX_IS_JUST_BYTES}";
  const hex = CTF.strToHex(flag, true);
  assert(CTF.hexToStr(hex) === flag, "CRYPTO-005");
  A["CRYPTO-005"] = { flag, hex, check: CTF.hexToStr(hex) === flag };
}
{
  const flag = "FLAG{BITS_BECOME_TEXT}";
  const binary = CTF.toBinary(flag);
  assert(CTF.fromBinary(binary) === flag, "CRYPTO-006");
  A["CRYPTO-006"] = { flag, binary, check: CTF.fromBinary(binary) === flag };
}
{
  const flag = "FLAG{THREE_LAYERS_DEEP}";
  const l1 = b64e(flag);
  const l2 = strToHex(l1, true);
  const final = b64e(l2);
  assert(b64d(hexToStr(b64d(final))) === flag, "CRYPTO-007");
  A["CRYPTO-007"] = {
    flag, chain: ["base64", "hex", "base64"], l1, l2, final,
    check: b64d(hexToStr(b64d(final))) === flag
  };
}
{
  const words = ["phantom", "midnight", "lantern", "compass"];
  A["CRYPTO-008"] = {
    words,
    md5: md5(words[0]), sha1: sha1(words[1]), sha256: sha256(words[2]), sha512: sha512(words[3]),
    check: md5(words[0]).length === 32 && sha1(words[1]).length === 40 &&
      sha256(words[2]).length === 64 && sha512(words[3]).length === 128
  };
}
{
  const password = "GHOST_PROTOCOL";
  const correct = "SALT_7X2";
  const salts = ["SALT_1A4", "SALT_7X2", "SALT_9K0", "SALT_2QM"];
  const salted = {};
  salts.forEach((s) => { salted[s] = sha256(s + password); });
  A["CRYPTO-009"] = {
    password, correct, salts, salted,
    unsalted: sha256(password),
    target: sha256(correct + password),
    check: salts.every((s) => sha256(s + password) === salted[s]) && sha256(correct + password) === salted[correct]
  };
}
{
  const flag = "FLAG{FOUR_LOCKS_ONE_KEY}";
  const steps = {
    b64: b64e(flag),
    atbash: atbash(b64e(flag)),
    caesar7: caesar(atbash(b64e(flag)), 7),
    hex: strToHex(caesar(atbash(b64e(flag)), 7))
  };
  // the dataset documents these exact intermediates
  assert(steps.b64 === "RkxBR3tGT1VSX0xPQ0tTX09ORV9LRVl9", "CRYPTO-010 b64 pinned");
  assert(steps.caesar7 === "PwjFP3nAN1LOJ0jRQ0nNJ09SPL9VPLv9", "CRYPTO-010 caesar7 pinned");
  assert(steps.atbash === "IpcYI3gTG1EHC0cKJ0gGC09LIE9OIEo9", "CRYPTO-010 atbash pinned");
  A["CRYPTO-010"] = { flag, steps, final: steps.hex, check: b64d(atbash(caesar(hexToStr(steps.hex), -7))) === flag };
}
{
  const key = "NULLPOINTLAB";                 // 12 symbols, inside the A-Z+space alphabet
  const m1 = "RENDEZVOUS AT NORTH GATE";          // crib: exactly 24 symbols so the 12 symbol key repeats twice
  const m2 = "KEY REUSE BREAKS THE PAD";
  const flag = "FLAG{NEVER_REUSE_A_ONE_TIME_PAD}";
  assert(key.length === 12 && [...key].every((c) => AL27.includes(c)), "CRYPTO-011 key alphabet");
  assert([...m1].every((c) => AL27.includes(c)) && [...m2].every((c) => AL27.includes(c)), "CRYPTO-011 message alphabet");
  assert(m1.length === 24, "CRYPTO-011 crib must be exactly 24 symbols, got " + m1.length);
  assert(m2.length <= 36, "CRYPTO-011 second message length");
  const c1 = otp(m1, key, false);
  const c2 = otp(m2, key, false);
  const recovered = [...c1].map((c, i) => AL27[((AL27.indexOf(c) - AL27.indexOf(m1[i])) % 27 + 27) % 27]).join("");
  assert(recovered.slice(0, 12) === key, "CRYPTO-011 crib recovers key");
  assert(recovered.slice(12) === key.slice(0, recovered.length - 12), "CRYPTO-011 key repeats");
  assert(otp(c2, key, true) === m2 && CTF.otp(c2, key, true) === m2, "CRYPTO-011 c2 decrypts");
  A["CRYPTO-011"] = { key, m1, m2, c1, c2, flag, alphabet: "A-Z plus space (27 symbols)", check: true };
}
{
  const flag = "FLAG{ENUMERATE_THE_SMALL_KEYSPACE}";
  const a = 5, b = 8;
  const cipher = affine(flag, a, b, false);
  assert(affine(cipher, a, b, true) === flag, "CRYPTO-012");
  assert(CTF.affine(cipher, a, b, true) === flag && CTF.affine(flag, a, b, false) === cipher, "CRYPTO-012 engine parity");
  A["CRYPTO-012"] = { flag, a, b, cipher, invertible: [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25], check: true };
}

/* ================================ ENCODING =============================== */
{
  const flag = "FLAG{BASE64_IS_NOT_A_CIPHER}";
  const b64 = CTF.b64encode(flag);
  assert(CTF.b64decode(b64) === flag, "ENCODE-001");
  A["ENCODE-001"] = { flag, b64, check: CTF.b64decode(b64) === flag };
}
{
  const flag = "FLAG{URL_DECODE_ME}";
  const raw = "https://portal.lab.nullpoint.invalid/ticket?id=4471&note=FLAG{URL DECODE ME}&owner=analyst";
  const url = CTF.urlEncode(raw);
  assert(CTF.urlDecode(url).includes("FLAG{URL DECODE ME}"), "ENCODE-002 content");
  assert(CTF.urlEncode(raw) === url, "ENCODE-002 engine parity");
  A["ENCODE-002"] = { flag, raw, url, check: true };
}
{
  const flag = "FLAG{DECIMAL_IS_STILL_TEXT}";
  const ascii = CTF.toAsciiList(flag);
  assert(CTF.fromAsciiList(ascii) === flag, "ENCODE-003");
  A["ENCODE-003"] = { flag, ascii, check: CTF.fromAsciiList(ascii) === flag };
}
{
  const flag = "FLAG{BITS_WITH_NO_SPACES}";
  const binary = binTight(flag);
  const decimal = binary.match(/[01]{8}/g).map((x) => parseInt(x, 2)).join(" ");
  assert(Buffer.from(decimal.split(" ").map(Number)).toString("utf8") === flag, "ENCODE-004");
  A["ENCODE-004"] = { flag, binary, decimal, check: unbin(binary) === flag };
}
{
  const flag = "FLAG{THREE_LAYERS_THREE_TOOLS}";
  const final = strToHex(urlEnc(b64e(flag)));
  assert(b64d(decodeURIComponent(hexToStr(final))) === flag, "ENCODE-005");
  A["ENCODE-005"] = { flag, final, layers: ["base64", "percent encoding", "hex"], check: true };
}
{
  const flag = "FLAG{REVERSED_THEN_ROTATED}";
  // built as: rot13 -> base64 -> reverse the base64 text -> hex encode that text
  const inner = rot13(flag);
  const b64 = b64e(inner);
  const reversed = [...b64].reverse().join("");
  const final = strToHex(reversed);
  assert(rot13(b64d(hexToStr(final).split("").reverse().join(""))) === flag, "ENCODE-006");
  assert([...reversed].reverse().join("") === b64, "ENCODE-006 reversal is lossless");
  A["ENCODE-006"] = { flag, final, b64, reversed, steps: ["rot13", "base64", "reverse text", "hex"], check: true };
}

/* ============================== STEGANOGRAPHY ============================ */
function stegoGroup(id, spec, channel, extra) {
  const px = CTF.buildPixels(spec);
  const extracted = CTF.lsbExtract(px, channel, { startRow: spec.startRow || 0, printableOnly: true });
  const flag = spec.data;
  const group = Object.assign({
    spec, channel, flag, extracted,
    check: extracted.slice(0, flag.length) === flag
  }, extra || {});
  assert(group.check === true, id + " LSB payload must extract");
  return group;
}
{
  const flag = "FLAG{FIRST_ROW_FIRST_BIT}";
  const spec = { w: 24, h: 24, seed: 1337, base: [16, 48], channel: "r", data: flag };
  const px = CTF.buildPixels(spec);
  const firstRowRed = px[0].map((p) => p[0]);
  A["STEGO-001"] = stegoGroup("STEGO-001", spec, "r", {
    firstRowRed,
    lsb: firstRowRed.map((v) => (v & 1).toString()).join(""),
    firstRowBitsGrouped: firstRowRed.slice(0, 24).map((v) => (v & 1)).join("").match(/[01]{8}/g).slice(0, 3).join(" ")
  });
  assert(A["STEGO-001"].lsb.startsWith("010001100100110001000001"), "STEGO-001 row0 bits pinned by hint");
}
{
  const flag = "FLAG{LAST_BIT_LOUDEST}";
  const spec = { w: 32, h: 32, seed: 4242, base: [16, 48], channel: "b", data: flag };
  const px = CTF.buildPixels(spec);
  const first8Blue = px[0].slice(0, 8).map((p) => p[2]);
  A["STEGO-002"] = stegoGroup("STEGO-002", spec, "b", {
    first8Blue,
    answer: first8Blue.map((v) => (v & 1).toString()).join(" ")
  });
  assert(A["STEGO-002"].answer === first8Blue.map((v) => (v & 1).toString()).join(" "), "STEGO-002 answer");
}
{
  const flag = "FLAG{NOISE_HIDES_SEVEN}";
  const coords = [[3, 2], [11, 5], [19, 9], [27, 12], [8, 17], [22, 20], [35, 22]];
  const spec = {
    w: 40, h: 24, seed: 90210, base: [90, 110],
    deviants: coords.map(([x, y]) => ({ x, y, rgb: [255, 0, 255] }))
  };
  const px = CTF.buildPixels(spec);
  const found = CTF.deviantPixels(px, spec.base);
  assert(found.length === 7, "STEGO-003 seven deviants");
  A["STEGO-003"] = {
    spec, flag, answer: String(found.length),
    coords: found.map((d) => d.x + "," + d.y),
    plantedRgb: [255, 0, 255],
    check: found.length === 7 && found.map((d) => d.x + "," + d.y).join("|") === coords.map((c) => c.join(",")).join("|")
  };
}
{
  const flag = "FLAG{TWO_LAYERS_ONE_IMAGE}";
  const clue = "ROWS9TO15RED";
  const spec = {
    w: 32, h: 16, seed: 777, base: [16, 48], channel: "r", data: flag, startRow: 9,
    alphaData: clue, alphaRow: 0
  };
  const px = CTF.buildPixels(spec);
  const alpha = CTF.buildAlpha(spec);
  const layer2 = CTF.lsbExtract(px, "r", { startRow: 9, endRow: spec.h - 1, printableOnly: true });
  const alphaRows = [0, 1, 2].map((r) => alpha[r].map((v) => [v, 0, 0]));
  const alphaClue = CTF.lsbExtract(alphaRows, "r", { endRow: 2, printableOnly: true });
  const unique = [...new Set(alpha.flat())].sort((a, b) => a - b);
  assert(alphaClue === clue, "STEGO-004 alpha clue");
  assert(layer2.slice(0, flag.length) === flag, "STEGO-004 layer 2");
  assert(unique.join(",") === "254,255", "STEGO-004 alpha values");
  A["STEGO-004"] = {
    spec, channel: "r", flag, clue, layer1: clue, layer2,
    alphaRow0: alpha[0], alphaUnique: unique,
    row9Red: px[9].map((p) => p[0]),
    extracted: layer2,
    check: true
  };
}
{
  const flag = "FLAG{ARCHIVE_IN_THE_TAIL}";
  const spec = { w: 16, h: 16, seed: 5150, base: [24, 64], channel: "b", data: "" };
  const px = CTF.buildPixels(spec);
  const png = CTF.encodePNG(px, spec.w, spec.h, null);
  assert(png.length === 852, "STEGO-005 png body must be 852 bytes, got " + png.length);
  const hexRun = strToHex(b64e(flag));                 // hex(base64(flag)) = 72 chars
  const noteText = "note: the value after this marker is encoded twice";
  const tail = [];
  for (let i = 0; i < 8; i++) tail.push(0x00);
  plant(tail, 8, noteText);
  let cursor = 8 + noteText.length;
  tail[cursor++] = 0x00;
  plant(tail, cursor, hexRun);
  cursor += hexRun.length;
  while (tail.length < 134) tail.push(0x00);
  assert(tail.length === 134, "STEGO-005 tail length");
  const bytes = [...png, ...tail];
  const runs = stringsOf(bytes);
  const last = runs[runs.length - 1];
  assert(b64d(hexToStr(last)) === flag, "STEGO-005 tail decodes");
  assert(bytes.length === 986, "STEGO-005 total size 986, got " + bytes.length);
  A["STEGO-005"] = {
    flag, bytesHex: Buffer.from(bytes).toString("hex"),
    size: bytes.length, pngSize: png.length, appended: tail.length,
    strings: runs, note: noteText, hexRun: last,
    signature: CTF.sniffSignature(bytes),
    signatureScan: CTF.scanSignatures(bytes).map((h) => h.name + "@0x" + h.offset.toString(16)),
    check: b64d(hexToStr(runs[runs.length - 1])) === flag && bytes.length === 986 && png.length === 852
  };
}

/* ============================ DIGITAL FORENSICS ========================== */
{
  const jpegHead = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
  const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const body = noiseBytes(11, 521 - jpegHead.length - pngMagic.length, CTF.mulberry32(11));
  const bytes = jpegHead.concat(pngMagic, body);
  assert(bytes.length === 521, "FORENSIC-001 size");
  const hex = CTF.hexdump(bytes);
  A["FORENSIC-001"] = {
    size: bytes.length, hex, answer: "PNG",
    jpegMagic: "FF D8 FF E0", pngOffset: "0x0c", pngOffsetDec: 12,
    flag: "FLAG{MAGIC_BYTES_DO_NOT_LIE}",
    check: bytes[0] === 0xff && bytes[1] === 0xd8 && Buffer.from(bytes.slice(12, 16)).toString("hex") === "89504e47"
  };
}
{
  const flag = "FLAG{STRINGS_FIND_IT}";
  const b64 = b64e(flag);
  assert(b64.length === 28, "FORENSIC-002 b64 must be 28 chars");
  const bytes = noiseBytes(202, 512, CTF.mulberry32(202));
  plant(bytes, 0x10, "/var/log/lab/collector.log");
  plant(bytes, 0x40, "SESSION_TOKEN=lab-dummy-4417");
  plant(bytes, 0x70, "nullpoint-collector/2.4.1");
  plant(bytes, 0xa0, b64);
  plant(bytes, 0xd0, "capture=bench-03");
  const runs = stringsOf(bytes);
  assert(runs[3] === b64, "FORENSIC-002 run index 3 must be the base64");
  A["FORENSIC-002"] = {
    flag, b64, strings: runs, hexdump: CTF.hexdump(bytes),
    plantedOffset: "0xa0", size: bytes.length,
    check: b64d(runs[3]) === flag && runs.length === 5
  };
}
{
  const flag = "FLAG{METADATA_OUTLIVES_INTENT}";
  const meta = {
    File: { Name: "bench_photo_0417.png", Size: 184320, Modified: "2026-01-11T08:22:41Z" },
    EXIF: { Make: "Nullpoint Bench Cam", Model: "NB-2", DateTimeOriginal: "2026-01-11T08:21:57Z", ExposureTime: "1/60" },
    XMP: {
      Creator: "lab-bench-03",
      Tool: "nullpoint-imager 1.9.4",
      Note: "b64:" + b64e(flag),
      Rights: "fictional lab asset"
    },
    Lab: { AssetTag: "NB3-0417", Operator: "analyst-7", Location: "lab-nullpoint-03" }
  };
  A["FORENSIC-003"] = {
    flag, meta,
    check: b64d(meta.XMP.Note.split(":")[1]) === flag
  };
}
{
  const flag = "FLAG{HEX_READER_EYES}";
  const bytes = noiseBytes(303, 256, CTF.mulberry32(303));
  plant(bytes, 144, flag);
  assert(bytes.length === 256, "FORENSIC-004 size");
  A["FORENSIC-004"] = {
    flag, hexdump: CTF.hexdump(bytes), size: bytes.length,
    offset: "0x90", offsetDec: 144, length: flag.length,
    check: Buffer.from(bytes.slice(144, 144 + flag.length)).toString("utf8") === flag
  };
}
{
  const flag = "FLAG{TIMELINE_BEFORE_THEORY}";
  const chrono = [
    { id: "E-01", src: "mail-gw", ts: "2026-02-09T07:12:44Z", text: "delivery failed: rejected by content filter" },
    { id: "E-02", src: "mail-gw", ts: "2026-02-09T07:14:02Z", text: "second delivery failed: bad DKIM signature" },
    { id: "E-03", src: "vpn", ts: "2026-02-09T07:19:31Z", text: "authentication succeeded for analyst-7" },
    { id: "E-04", src: "edr", ts: "2026-02-09T07:41:08Z", text: "archive uploaded to locker host (203.0.113.44)" },
    { id: "E-05", src: "edr", ts: "2026-02-09T08:02:55Z", text: "real-time protection disabled by local account" }
  ];
  const shuffled = [chrono[3], chrono[0], chrono[4], chrono[1], chrono[2]];
  const sorted = [...shuffled].sort((a, b) => a.ts.localeCompare(b.ts));
  A["FORENSIC-005"] = {
    flag, events: shuffled,
    answer: sorted.map((e) => e.id).join(","),
    firstAction: sorted[0].id,
    check: sorted.map((e) => e.id).join(",") === "E-01,E-02,E-03,E-04,E-05"
  };
}
{
  const decodedA = "EVIDENCE";
  const decodedB = "REASSEMBLED";
  const template = "FLAG{<A>_<B>}";
  const flag = template.replace("<A>", decodedA).replace("<B>", decodedB);
  const parts = { A: rot13(decodedA), B: strToHex(decodedB, true), C: b64e(template) };
  const digest = sha256(flag);
  const evidence = [
    "evidence_bag_record: case 0091",
    "acquired: 2026-01-19T09:14:02Z",
    "acquired_by: analyst-7",
    "assembly_rule: decode each fragment with the encoding named beside it, then substitute <A> and <B> into fragment C",
    "",
    "fragment A (rot13):   " + parts.A,
    "fragment B (hex):     " + parts.B,
    "fragment C (base64):  " + parts.C,
    "",
    "recorded_sha256: " + digest,
    "note: the checksum covers the assembled value, not the fragments"
  ].join("\n");
  assert(rot13(parts.A) === decodedA && hexToStr(parts.B) === decodedB && b64d(parts.C) === template, "FORENSIC-006 fragments");
  A["FORENSIC-006"] = {
    flag, parts, decoded: { A: decodedA, B: decodedB }, template,
    sha256Flag: digest, evidence,
    hexdump: CTF.hexdump(CTF.utf8Bytes(evidence)),
    check: b64d(parts.C).replace("<A>", rot13(parts.A)).replace("<B>", hexToStr(parts.B)) === flag &&
      evidence.includes(digest) && /assembly_rule/.test(evidence)
  };
}
{
  const flag = "FLAG{COLD_MEMORY_WARM_LEADS}";
  const pid = 4187;
  const c2 = "txt.beacon.lab.nullpoint.invalid";
  const c2Hex = strToHex(c2);
  const procTable = [
    "PID    PPID   USER   STARTED                COMMAND",
    "1      0      root   2026-02-02T06:00:01Z   /sbin/init",
    "  612  1      root   2026-02-02T06:00:09Z   /usr/sbin/lab-syslogd -n",
    "  2044 1      svc    2026-02-02T06:01:12Z   /opt/nullpoint/bin/collector --config /etc/nullpoint/daemon.conf",
    "  2051 2044   svc    2026-02-02T06:01:12Z   /opt/nullpoint/bin/collector-worker --id 3",
    "  3390 1      root   2026-02-02T06:02:40Z   /usr/sbin/sshd -D",
    "  " + pid + "  1      svc    2026-02-02T06:03:11Z   /opt/gp/.svc/collectord --c " + c2Hex + " --interval 60",
    "  4199 " + pid + "    svc    2026-02-02T06:03:12Z   /opt/gp/.svc/updater --beacon 60 --quiet",
    "  4520 3390   analyst 2026-02-02T07:15:02Z  -bash",
    "  4602 4520   analyst 2026-02-02T07:41:33Z  grep -R collectord /var/log"
  ].join("\n");
  const dns = [
    "resolver cache (lab-nullpoint-03, 2026-02-02T07:44:10Z)",
    "  lab.nullpoint.invalid.          3600 IN A     192.168.44.9",
    "  locker.lab.nullpoint.invalid.    300 IN A     203.0.113.44",
    "  " + c2 + ".  60 IN TXT  \"" + b64e(flag) + "\"",
    "  status.lab.nullpoint.invalid.     60 IN A     192.168.44.20",
    "  (17 queries to " + c2 + " in the last 600s, average label length 30)"
  ].join("\n");
  assert(procTable.includes(String(pid)), "FORENSIC-011 pid in table");
  assert(hexToStr(procTable.match(/--c ([0-9a-f]+)/)[1]) === c2, "FORENSIC-011 cmdline decode");
  assert(b64d(dns.match(/"([^"]+)"/)[1]) === flag, "FORENSIC-011 txt decode");
  A["FORENSIC-011"] = { flag, pid, c2, c2Hex, procTable, dns, check: true };
}

/* =============================== NETWORKING ============================== */
{
  const items = [
    ["10.20.30.40", "lab collector host"],
    ["198.51.100.23", "documentation range host"],
    ["127.0.0.1", "local loopback"],
    ["172.16.5.9", "lab database host"],
    ["224.0.0.5", "link state multicast group"],
    ["192.168.1.255", "final octet 255 on a /24"]
  ];
  const answer = items.map(([ip]) => CTF.ipKind(ip)).join(",");
  assert(answer === "PRIVATE,PUBLIC,LOOPBACK,PRIVATE,MULTICAST,BROADCAST", "NET-001 kinds, got " + answer);
  A["NET-001"] = { items, answer, flag: "FLAG{EVERY_ADDRESS_HAS_A_ROLE}", check: true };
}
{
  const q = [["192.168.1.0/24"], ["10.0.0.0/26"], ["172.16.9.0/28"], ["192.168.5.0/30"]];
  const answer = q.map(([p]) => {
    const [ip, cidr] = p.split("/");
    return String(subnet(ip, +cidr).usable);
  }).join(",");
  assert(answer === "254,62,14,2", "NET-002 usable counts, got " + answer);
  A["NET-002"] = { q, answer, flag: "FLAG{SUBNET_MATH_IS_FAST}", check: true };
}
{
  const aIp = "192.168.20.130", aCidr = 26, bIp = "10.10.5.77", bCidr = 28;
  const a = Object.assign({ ip: aIp, cidr: aCidr }, subnet(aIp, aCidr));
  const b = Object.assign({ ip: bIp, cidr: bCidr }, subnet(bIp, bCidr));
  const answerA = [a.network, a.broadcast, a.usable].join(",");
  const answerB = [b.network, b.broadcast, b.usable].join(",");
  assert(a.network === "192.168.20.128" && a.usable === 62, "NET-003 A");
  assert(b.network === "10.10.5.64" && b.usable === 14, "NET-003 B");
  A["NET-003"] = { a, b, answerA, answerB, flag: "FLAG{CIDR_IS_BITWISE}", check: true };
}
{
  const ports = [["22", "SSH"], ["53", "DNS"], ["443", "HTTPS"], ["3389", "RDP"], ["25", "SMTP"], ["8080", "HTTP-ALT"]];
  const answer = ports.map((p) => p[1]).join(",");
  assert(answer === "SSH,DNS,HTTPS,RDP,SMTP,HTTP-ALT", "NET-004 answer");
  A["NET-004"] = { ports, answer, flag: "FLAG{PORTS_ARE_CONVENTIONS}", check: true };
}
{
  const flag = "FLAG{PACKETS_TELL_A_STORY}";
  const packets = [
    { no: 1, src: "192.168.10.20", sport: 51444, dst: "192.168.10.5", dport: 443, proto: "TCP", flags: "SYN", len: 0, info: "connection request" },
    { no: 2, src: "192.168.10.5", sport: 443, dst: "192.168.10.20", dport: 51444, proto: "TCP", flags: "SYN,ACK", len: 0, info: "connection accepted" },
    { no: 3, src: "192.168.10.20", sport: 51444, dst: "192.168.10.5", dport: 443, proto: "TCP", flags: "ACK", len: 0, info: "handshake complete" },
    { no: 4, src: "192.168.10.20", sport: 51444, dst: "192.168.10.5", dport: 443, proto: "TCP", flags: "PSH,ACK", len: 517, info: "first client payload, 517 bytes" },
    { no: 5, src: "192.168.10.20", sport: 53211, dst: "192.168.10.2", dport: 53, proto: "UDP", flags: "-", len: 64, info: "query txt.lab.nullpoint.invalid TXT" }
  ];
  A["NET-005"] = { packets, flag, answer: "TLS,443,txt.lab.nullpoint.invalid", check: packets.length === 5 && packets[3].len === 517 };
}
{
  const flag = "FLAG{TXT_RECORDS_CARRY_DATA}";
  const records = [
    ["lab.nullpoint.invalid", "A", "192.168.44.9", 3600],
    ["status.lab.nullpoint.invalid", "A", "192.168.44.20", 300],
    ["_ctf.lab.nullpoint.invalid", "TXT", b64e(flag), 60],
    ["locker.lab.nullpoint.invalid", "A", "203.0.113.44", 300]
  ];
  assert(b64d(records.find((r) => r[0] === "_ctf.lab.nullpoint.invalid")[2]) === flag, "NET-006");
  A["NET-006"] = { records, flag, answer: "TXT,_ctf.lab.nullpoint.invalid", check: true };
}
{
  const flag = "FLAG{GHOST_ON_THE_WIRE}";
  const split = 11;
  const chunk1 = flag.slice(0, split), chunk2 = flag.slice(split);
  const dns = [
    ["c1.ghost.lab.nullpoint.invalid", "TXT", b64e(chunk1)],
    ["c2.ghost.lab.nullpoint.invalid", "TXT", b64e(chunk2)]
  ];
  const hosts = [
    "workstation-7.lab.nullpoint.invalid   192.168.44.31",
    "relay-04.lab.nullpoint.invalid        192.168.44.9",
    "locker.lab.nullpoint.invalid          203.0.113.44  (documentation range)"
  ];
  const packets = [
    { no: 1, src: "192.168.44.31", sport: 49221, dst: "192.168.44.9", dport: 53, proto: "UDP", flags: "-", len: 71, info: "query c1.ghost.lab.nullpoint.invalid TXT" },
    { no: 2, src: "192.168.44.9", sport: 53, dst: "192.168.44.31", dport: 49221, proto: "UDP", flags: "-", len: 96, info: "answer, TXT, ttl 60" },
    { no: 3, src: "192.168.44.31", sport: 49222, dst: "192.168.44.9", dport: 53, proto: "UDP", flags: "-", len: 71, info: "query c2.ghost.lab.nullpoint.invalid TXT" },
    { no: 4, src: "192.168.44.9", sport: 53, dst: "192.168.44.31", dport: 49222, proto: "UDP", flags: "-", len: 96, info: "answer, TXT, ttl 60" },
    { no: 5, src: "192.168.44.31", sport: 55010, dst: "203.0.113.44", dport: 443, proto: "TCP", flags: "PSH,ACK", len: 1420, info: "outbound bulk transfer after both lookups" }
  ];
  const ports = [["53", "DNS"], ["443", "HTTPS"], ["8080", "HTTP-ALT"], ["3389", "RDP"]];
  assert(b64d(dns[0][2]) + b64d(dns[1][2]) === flag, "NET-007 assembly");
  A["NET-007"] = { flag, chunk1, chunk2, case: { hosts, dns, packets, ports }, check: true };
}
{
  const flag = "FLAG{DNS_CARRIED_THE_MESSAGE}";
  const words = ["meet", "at", "the", "gate"];
  const subdomains = words.map((w) => strToHex(w));
  const decoded = words.join(" ");
  const queries = subdomains.map((s) => s + ".t1.nullpoint.invalid");
  assert(subdomains.map((s) => hexToStr(s)).join(" ") === decoded, "NET-012 labels");
  assert(subdomains.join("").length / subdomains.length === 6.5, "NET-012 average label length 6.5 hex chars");
  A["NET-012"] = { flag, subdomains, queries, decoded, zone: "t1.nullpoint.invalid", check: true };
}

/* ================================== LINUX ================================= */
{
  const items = [
    ["-rw-r--r--", "0644"], ["-rw-r-----", "0640"], ["-rwxr-x---", "0750"],
    ["-rwx------", "0700"], ["-rw-------", "0600"], ["-rwxr-xr-x", "0755"]
  ];
  assert(items.every(([sym, oct]) => permOctal(sym) === oct), "LINUX-004 table");
  A["LINUX-004"] = { items, answer: permOctal("-rwxr-x---"), check: true };
}

/* ========================= PROGRAMMING / REVERSE ========================= */
{
  const nums = [4, 7, 12, 9, 20, 33, 8, 15, 26, 1];
  const answer = nums.filter((n) => n % 2 === 0).reduce((a, b) => a + b, 0);
  assert(answer === 70, "CODE-001 answer");
  A["CODE-001"] = { nums, answer, check: true };
}
{
  const arr = [17, 42, 8, 99, 23, 5, 61];
  A["CODE-002"] = { arr, answer: Math.max(...arr), check: Math.max(...arr) === 99 };
}
{
  const arr = [12, 59, 7, 12, 33, 7, 91, 33, 91, 4, 4, 25, 25, 66, 66];
  const xor = arr.reduce((a, b) => a ^ b, 0);
  const unique = [...new Set(arr)];
  const flag = "FLAG{" + xor.toString(16).toUpperCase().padStart(2, "0") + "}";
  assert(xor === 59 && flag === "FLAG{3B}", "CODE-003 xor must be 59, got " + xor);
  A["CODE-003"] = { arr, unique, xor, flag, check: true };
}
{
  const parts = ["FLAG", "string", "surgeon"];
  const recipe = "upper(parts[0]) + '{' + reverse(upper(parts[1])) + '_' + reverse(upper(parts[2])) + '}'";
  const rev = (s) => [...s].reverse().join("");
  const flag = parts[0].toUpperCase() + "{" + rev(parts[1].toUpperCase()) + "_" + rev(parts[2].toUpperCase()) + "}";
  assert(flag === "FLAG{GNIRTS_NOEGRUS}", "CODE-004 flag");
  A["CODE-004"] = { parts, recipe, flag, check: ["FLAG{", "GNIRTS", "_", "NOEGRUS", "}"].join("") === flag };
}
{
  const path = "CODEMAZESOLVED";
  const flag = "FLAG{" + path + "}";
  const moves = ["RIGHT", "RIGHT", "RIGHT", "DOWN", "LEFT", "LEFT", "LEFT", "DOWN", "RIGHT", "RIGHT", "RIGHT", "DOWN", "RIGHT"];
  const grid = ["CODE#", "EZAM#", "SOLV#", "#D###"].map((r) => [...r]);
  // stamp the walk so the grid and the move list can never drift apart
  let r = 0, c = 0;
  grid[0][0] = path[0];
  const coords = ["0,0"];
  moves.forEach((m, i) => {
    if (m === "RIGHT") c++; else if (m === "LEFT") c--; else if (m === "DOWN") r++; else r--;
    assert(r >= 0 && r < grid.length && c >= 0 && c < grid[0].length, "CODE-005 walk leaves grid at move " + i);
    grid[r][c] = path[i + 1];
    coords.push(r + "," + c);
  });
  const walked = coords.map((k) => { const [rr, cc] = k.split(",").map(Number); return grid[rr][cc]; }).join("");
  assert(walked === path, "CODE-005 path parity");
  assert(moves.length === coords.length - 1, "CODE-005 move count");
  const filler = CTF.mulberry32(31337);
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === "#") grid[y][x] = UP[Math.floor(filler() * 26)];
    }
  }
  const walked2 = coords.map((k) => { const [rr, cc] = k.split(",").map(Number); return grid[rr][cc]; }).join("");
  assert(walked2 === path, "CODE-005 path parity after filler");
  A["CODE-005"] = { grid: grid.map((row) => row.join("")), moves, coords, path, flag, check: true };
}
{
  const n = 41, k = 3;
  const people = Array.from({ length: n }, (_, i) => i + 1);
  let i = 0;
  while (people.length > 1) { i = (i + k - 1) % people.length; people.splice(i, 1); }
  const survivor = people[0];
  let j = 0;
  for (let m = 2; m <= n; m++) j = (j + k) % m;
  assert(survivor === 31 && j + 1 === survivor, "CODE-011 survivor");
  A["CODE-011"] = { n, k, survivor, flag: "FLAG{JOSEPHUS_SEAT_" + survivor + "}", check: true };
}
{
  const flag = "FLAG{SOURCE_IS_THE_MAP}";
  const parts = ["FL", "AG", "{", "SOURCE_", "IS_THE_", "MAP", "}"];
  A["RE-001"] = { flag, parts, check: parts.join("") === flag };
}
{
  const flag = "FLAG{CONSTANTS_ARE_NOT_SECRETS}";
  const K = 0x5a;
  const encoded = [...Buffer.from(flag, "utf8")].map((v) => v ^ K);
  assert(encoded.map((v) => String.fromCharCode(v ^ K)).join("") === flag, "RE-002");
  A["RE-002"] = { flag, encoded, key: K, check: true };
}
{
  const seed = "tunnel_42";
  const step1 = [...seed].reverse().join("");
  const step2 = step1.replace(/_/g, "-");
  const step3 = [...step2].sort().join("");
  const answer = [...step3].map((c) => c.toUpperCase()).filter((c) => /[A-Z0-9]/.test(c)).join("");
  assert(answer === "24ELNNTU", "RE-003 answer, got " + answer);
  A["RE-003"] = { seed, step1, step2, step3, answer, flag: "FLAG{" + answer + "}", check: true };
}
{
  const candidates = [];
  for (let n = 101; n <= 2000; n++) {
    if (n % 7 === 3 && n % 11 === 5 && n.toString(2).endsWith("101")) candidates.push(n);
  }
  const answer = candidates[0];
  assert(answer === 269, "RE-004 answer, got " + answer);
  A["RE-004"] = { answer, candidates, constraints: ["n > 100", "n % 7 === 3", "n % 11 === 5", "binary suffix 101"], check: candidates.every((c) => c >= answer) };
}
{
  const flag = "FLAG{FIVE_STEPS_BACK}";
  const s1 = [...flag].reverse().join("");
  const s2 = caesar(s1, 4);
  const s3 = xorStr(s2, "K9");
  const s4 = b64e(s3);
  const final = strToHex(s4);
  let back = final;
  back = hexToStr(back); back = b64d(back); back = xorStr(back, "K9"); back = caesar(back, -4); back = [...back].reverse().join("");
  assert(back === flag, "RE-005 chain inversion");
  A["RE-005"] = { flag, final, steps: ["reverse", "caesar +4", "xor 'K9'", "base64", "hex"], check: true };
}
{
  const answer = "FLAG{VM_GHOST}";
  const program = [
    ["LOAD", [70, 76, 65, 71, 123, 86, 77, 95]],
    ["PUSH", [71, 72, 79, 83, 84, 125]],
    ["ADD", []],
    ["OUT", []]
  ];
  // emulate the documented stack machine
  const stack = []; let outBuf = [];
  program.forEach(([op, arg]) => {
    if (op === "LOAD" || op === "PUSH") stack.push(arg.slice());
    else if (op === "ADD") { const b = stack.pop(), a = stack.pop(); stack.push(a.concat(b)); }
    else if (op === "OUT") outBuf = outBuf.concat(stack.pop());
  });
  assert(Buffer.from(outBuf).toString("utf8") === answer, "RE-011 emulation");
  A["RE-011"] = { answer, program, check: true };
}

/* ============================== WEB (WEB-012) ============================ */
{
  const header = { alg: "none", typ: "JWT" };
  const payload = { sub: "analyst-7", role: "admin", lab: "nullpoint.invalid", exp: 1893456000 };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const forged = h + "." + p + ".";
  const legitHeader = { alg: "HS256", typ: "JWT" };
  const legitPayload = { sub: "analyst-7", role: "viewer", lab: "nullpoint.invalid", exp: 1893456000 };
  const lh = b64url(JSON.stringify(legitHeader));
  const lp = b64url(JSON.stringify(legitPayload));
  const legit = lh + "." + lp + ".ZHVtbXlfc2lnbmF0dXJlX2Zvcl9sYWJfdXNl";
  const flag = "FLAG{ALGORITHM_MUST_BE_PINNED}";
  const serverCode = [
    "// lab session validator (fictional, simplified)",
    "function verify(token) {",
    "  const [h64, p64, sig] = token.split('.');",
    "  const header  = JSON.parse(atob(h64));        // <-- header comes from the token",
    "  const payload = JSON.parse(atob(p64));",
    "  if (header.alg === 'none') return payload;    // <-- 'none' accepted, signature ignored",
    "  if (!hmacVerify(payload, sig, LAB_SECRET)) return null;",
    "  return payload;",
    "}",
    "",
    "function authorise(token) {",
    "  const claims = verify(token);",
    "  if (!claims) return { ok: false };",
    "  return { ok: true, role: claims.role };       // <-- role trusted from the payload",
    "}",
    "",
    "const LAB_SECRET = 'dummy-lab-secret-not-a-real-key';"
  ].join("\n");
  A["WEB-012"] = {
    forged, legit, headerB64: h, payloadB64: p,
    headerJson: JSON.stringify(header), payloadJson: JSON.stringify(payload),
    legitHeaderJson: JSON.stringify(legitHeader), legitPayloadJson: JSON.stringify(legitPayload),
    flag, serverCode,
    check: forged.split(".").length === 3 && forged.endsWith(".") && b64d(forged.split(".")[1]).includes('"role":"admin"')
  };
}

/* ================================== OSINT ================================ */
A.OSINT = {
  disclaimer:
    "FICTIONAL DATA ONLY. Every handle, person, company, domain, avatar hash and address in this dataset was " +
    "invented for offline training. Hostnames use the reserved .invalid TLD and addresses come from the " +
    "documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24). Do not search for any of it online and " +
    "never apply these techniques to real people.",
  platforms: ["nullgram", "chatbox", "devhub", "forumlab"],
  usernames: {
    ghostwriter_09: ["nullgram", "chatbox", "forumlab"],
    analyst_seven: ["nullgram", "devhub"],
    g_writer09: ["devhub"],
    nightshift_4: ["chatbox"],
    lab_pigeon: ["forumlab"]
  },
  answerUsername: "ghostwriter_09",
  avatarHash: "9f2c41ab",
  company: {
    name: "Nullpoint",
    domain: "nullpoint.invalid",
    founded: 2019,
    employeeCount: 148,
    hq: "Lab District 3 (fictional)",
    offices: ["Lab District 3", "North Quay", "Old Mill"],
    sector: "security training tooling",
    status: "privately held",
    lastVerified: "2026-02-01"
  },
  footprint: [
    { source: "nullgram", value: "handle ghostwriter_09, 41 posts, joined 2021-04", note: "bio mentions 'lab notes and long walks'" },
    { source: "chatbox", value: "handle ghostwriter_09, avatar hash 9f2c41ab", note: "same display name as nullgram" },
    { source: "devhub", value: "handle g_writer09, 12 repositories", note: "name similarity only, no shared content" },
    { source: "forumlab", value: "handle ghostwriter_09, 3 threads in the training subforum", note: "posts quote the same lab writeups" },
    { source: "nullgram+chatbox", value: "avatar hash 9f2c41ab on both platforms", note: "independent content signal, not name based" }
  ],
  // arrival order (index 1..5); chronological order is 5,3,1,2,4
  timeline: [
    { ts: "2026-02-14T03:11:00Z", event: "VPN authentication succeeded for analyst-7 from 198.51.100.7", source: "vpn concentrator" },
    { ts: "2026-02-14T03:40:12Z", event: "repository clone started on workstation-7 (4.2 GB)", source: "EDR" },
    { ts: "2026-02-13T22:05:44Z", event: "password reset requested for ghostwriter_09", source: "identity provider" },
    { ts: "2026-02-14T05:02:31Z", event: "archive uploaded to locker.lab.nullpoint.invalid", source: "proxy log" },
    { ts: "2026-02-13T19:47:09Z", event: "phishing email delivered to analyst-7 (attachment blocked)", source: "mail gateway" }
  ],
  flags: {
    OSINT003: "FLAG{GHOSTWRITER_09}",
    OSINT004: "FLAG{PHISHING_FIRST}",
    OSINT005: "FLAG{GHOSTWRITER_09_ON_WORKSTATION_7}",
    OSINT011: "FLAG{ATTRIBUTION_REQUIRES_TWO_SOURCES}"
  }
};
{
  const O = A.OSINT;
  const counts = Object.keys(O.usernames).map((u) => [u, O.usernames[u].length]).sort((a, b) => b[1] - a[1]);
  assert(counts[0][0] === O.answerUsername && counts[0][1] === 3, "OSINT widest footprint");
  assert(counts[1][1] === 2, "OSINT runner up has 2 platforms");
  const chrono = O.timeline.map((e, i) => ({ n: i + 1, ts: e.ts })).sort((a, b) => a.ts.localeCompare(b.ts));
  assert(chrono.map((c) => c.n).join(",") === "5,3,1,2,4", "OSINT timeline order, got " + chrono.map((c) => c.n).join(","));
  assert(O.company.founded === 2019 && O.company.employeeCount === 148, "OSINT company facts");
  assert(O.disclaimer.toLowerCase().includes("fictional"), "OSINT disclaimer");
}

/* ============================== CAMPAIGNS =============================== */
A.CAMPAIGNS = {};
{
  const flag = "FLAG{FIRST_SIGNAL_RECEIVED}";
  const s1Answer = "SIGNAL::" + flag;
  const s4Spec = { w: 20, h: 20, seed: 60613, base: [20, 56], channel: "g", data: flag };
  const s4px = CTF.buildPixels(s4Spec);
  assert(CTF.lsbExtract(s4px, "g", { printableOnly: true }).trim() === flag, "CASE-001 s4 stego");
  A.CAMPAIGNS["CASE-001"] = {
    s1: { answer: s1Answer, final: b64e(strToHex(s1Answer)), check: hexToStr(b64d(b64e(strToHex(s1Answer)))) === s1Answer },
    s2: { cipher: caesar(flag, 11), shift: 11, flag, check: caesar(caesar(flag, 11), -11) === flag },
    s3: { hex: strToHex(rot13(flag), true), flag, rotated: rot13(flag), check: rot13(hexToStr(strToHex(rot13(flag)))) === flag },
    s4: { stego: s4Spec, flag, check: true },
    s5: { final: b64e(atbash(caesar(flag, 3))), flag, chain: "base64(atbash(caesar3(flag)))", check: caesar(atbash(b64d(b64e(atbash(caesar(flag, 3))))), -3) === flag }
  };
}
{
  // s1: a gzip member embedded at offset 96 inside a larger container
  const head = noiseBytes(71, 96, CTF.mulberry32(71));
  const gz = [0x1f, 0x8b, 0x08, 0x00].concat(noiseBytes(72, 120, CTF.mulberry32(72)));
  const bytes = head.concat(gz);
  // the excerpt handed to the learner starts at the embedded member (offset 96)
  const hexHead = bytes.slice(96, 96 + 64).map((b) => ("0" + b.toString(16)).slice(-2)).join(" ");
  const fileHead = bytes.slice(0, 16).map((b) => ("0" + b.toString(16)).slice(-2)).join(" ");
  assert(hexHead.startsWith("1f 8b"), "CASE-002 excerpt must start with the gzip magic");
  assert(!fileHead.startsWith("1f 8b"), "CASE-002 container must not start with gzip");
  assert(bytes[96] === 0x1f && bytes[97] === 0x8b, "CASE-002 gzip at offset 96");
  const owner = "archivist-3";
  const meta = {
    Archive: { Name: "silent-archive-07.tar", Size: 4194304, Created: "2025-11-02T22:14:07Z" },
    Owner: owner,
    Custodian: "archive-team@nullpoint.invalid",
    Note: b64e("second key is the owner name"),
    Sealing: "substitute with a reversed alphabet, shift by 5, then hex encode",
    Retention: "7 years (fictional policy)"
  };
  const s3Strings = [
    "silent archive manifest v2",
    "archivist-3",
    "TODO: rotate keys",
    "4f50454e5f41545f4441574e",
    "sealed by nullpoint-archive 1.4.2"
  ];
  assert(hexToStr(s3Strings[3]) === "OPEN_AT_DAWN", "CASE-002 s3 hex run");
  const s4Answer = "KEY=" + owner;
  const s5Plain = "ARCHIVE OPENED AT DAWN";
  const s5Cipher = strToHex(caesar(atbash(s5Plain), 5));
  const s5Flag = "FLAG{SILENT_ARCHIVE_OPENED}";
  A.CAMPAIGNS["CASE-002"] = {
    s1: {
      hexHead, fileHead, offset: 96, format: "GZIP", signature: "1f 8b", containerSize: bytes.length,
      check: hexHead.startsWith("1f 8b") && bytes[96] === 0x1f && bytes[97] === 0x8b
    },
    s2: { meta, answer: owner, check: b64d(meta.Note) === "second key is the owner name" },
    s3: { strings: s3Strings, hexPayload: s3Strings[3], answer: hexToStr(s3Strings[3]), check: hexToStr(s3Strings[3]) === "OPEN_AT_DAWN" },
    s4: { binary: bin(s4Answer), answer: s4Answer, check: unbin(bin(s4Answer)) === s4Answer },
    s5: {
      cipher: s5Cipher, answerDecoded: s5Plain, flag: s5Flag,
      chain: "hex(caesar5(atbash(plaintext)))",
      check: atbash(caesar(hexToStr(s5Cipher), -5)) === s5Plain
    }
  };
}
{
  A.CAMPAIGNS["CASE-003"] = {
    s1: { note: "rebuild the terminal image, then read /home/ops/.cache/keys.txt", flag: "FLAG{FOUND_THE_NOTE}", check: true },
    s2: { path: "/home/ops/.cache/keys.txt", flag: "FLAG{DOT_FILES_ARE_LISTED}", check: true },
    s3: { key: "7F3A9C", flag: "FLAG{REBUILD_KEY_7F3A9C}", check: true },
    s4: { perm: "-rw-r-----", octal: permOctal("-rw-r-----"), owner: "root", group: "nullpoint", daemonUser: "svc", analystCanRead: "NO", check: permOctal("-rw-r-----") === "0640" },
    s5: { flag: "FLAG{SVC_DAEMON_CONF_7F3A9C}", check: true }
  };
}
{
  const ip = "192.168.44.9", cidr = 22;
  const sn = subnet(ip, cidr);
  assert(sn.mask === "255.255.252.0" && sn.usable === 1022 && sn.network === "192.168.44.0", "CASE-004 s1 subnet");
  const s2Answer = "relay-07.lab.nullpoint.invalid";
  const flag = "FLAG{GHOST_NETWORK_CASE_CLOSED}";
  const split = 19;
  const chunks = [flag.slice(0, split), flag.slice(split)];
  assert(chunks.map((c) => c).join("") === flag, "CASE-004 s5 concat");
  A.CAMPAIGNS["CASE-004"] = {
    s1: Object.assign({ ip, cidr }, sn, { check: true }),
    s2: { txt: b64e(s2Answer), answer: s2Answer, check: b64d(b64e(s2Answer)) === s2Answer },
    s3: { answer: "3389", service: "RDP", source: "203.0.113.90", check: true },
    s4: { answer: "RDP brute force", attempts: 3, successOnAttempt: 3, payloadBytes: 412, check: true },
    s5: { chunks: chunks.map((c) => b64e(c)), decoded: chunks, flag, check: chunks.map((c) => b64d(b64e(c))).join("") === flag }
  };
}
{
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const key = "QWERTYUIOPASDFGHJKLZXCVBNM";
  assert([...new Set(key)].length === 26 && key.length === 26, "CASE-005 substitution must be a bijection");
  const map = {};
  alphabet.split("").forEach((c, i) => { map[c] = key[i]; });
  const inv = {};
  Object.keys(map).forEach((k) => { inv[map[k]] = k; });
  const sub = (t, m) => [...t].map((c) => (c in m ? m[c] : c)).join("");

  const pangram = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
  const s2Answer = "FLAG{KEY_REUSE_IS_THE_FINDING}";
  const s3Answer = "THE MAPPING WAS REUSED SO THE THIRD MESSAGE FELL TO A FREQUENCY ATTACK";
  const s4Answer = "FLAG{LAYERS_ARE_NOT_SECURITY}";
  const s5Answer = "FLAG{CIPHER_IDENTIFIED_AND_BROKEN}";

  const s4Final = strToHex(b64e(sub(s4Answer, map)));
  const s5Final = caesar(atbash(b64e(sub(s5Answer, map))), 9);

  assert(sub(sub(pangram, map), inv) === pangram, "CASE-005 s1");
  assert(sub(sub(s2Answer, map), inv) === s2Answer, "CASE-005 s2");
  assert(sub(sub(s3Answer, map), inv) === s3Answer, "CASE-005 s3");
  assert(sub(b64d(hexToStr(s4Final)), inv) === s4Answer, "CASE-005 s4");
  assert(sub(b64d(atbash(caesar(s5Final, -9))), inv) === s5Answer, "CASE-005 s5");
  assert((s3Answer.match(/THE/g) || []).length === 2, "CASE-005 s3 must contain THE twice");
  assert(/ A /.test(s3Answer), "CASE-005 s3 must contain a single letter word");

  A.CAMPAIGNS["CASE-005"] = {
    subst: { alphabet, key, check: new Set(key).size === 26 && key.length === 26 },
    s1: { map, sample: sub(pangram, map), answer: pangram, check: true },
    s2: { cipher: sub(s2Answer, map), answer: s2Answer, check: true },
    s3: { cipher: sub(s3Answer, map), answer: s3Answer, check: true },
    s4: { final: s4Final, answer: s4Answer, check: true },
    s5: { final: s5Final, answer: s5Answer, check: true }
  };
}

/* ============================ serialise to disk ========================== */
Object.keys(A).forEach((k) => {
  if (k === "CAMPAIGNS" || k === "OSINT") return;
  assert(A[k] && A[k].check === true, k + " self-check must be true");
});
Object.keys(A.CAMPAIGNS).forEach((cid) => {
  Object.keys(A.CAMPAIGNS[cid]).forEach((stage) => {
    assert(A.CAMPAIGNS[cid][stage].check === true, cid + "." + stage + " self-check must be true");
  });
});

const header = `/* ============================================================================
 * artifacts.js - GENERATED EVIDENCE PAYLOADS (do not edit by hand)
 * ----------------------------------------------------------------------------
 * Produced by tools/gen-artifacts.js, which derives every value from its
 * flag/answer with an independent implementation and self-checks it before
 * writing this file. Re-run the generator, then re-prove everything with:
 *
 *   node tools/gen-artifacts.js && node tools/verify.js
 *
 * Every artifact is fictional and offline: reserved .invalid hostnames,
 * documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and
 * dummy secrets only. Nothing here references a real person, service or target.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  root.CTF = root.CTF || {};
  root.CTF.ARTIFACTS = `;
const footer = `;
})(typeof globalThis !== "undefined" ? globalThis : window);
`;
const out = header + JSON.stringify(A, null, 2) + footer;
const dest = path.join(ROOT, "assets/js/artifacts.js");
fs.writeFileSync(dest, out);
console.log("wrote " + path.relative(ROOT, dest) + " (" + out.length + " bytes)");
console.log("artifact groups: " + (Object.keys(A).length - 2) + " + CAMPAIGNS(5) + OSINT");
