/* ============================================================================
 * data/challenges-crypto.js - CRYPTOGRAPHY (12 challenges)
 * Every payload is pulled from assets/js/artifacts.js so the text a learner
 * reads is byte-identical to what tools/verify.js re-proves offline.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Cryptography";

  CTF.register([
    {
      id: "CRYPTO-001",
      title: "The Shifted Message",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Recognise a Caesar shift from the shape of the ciphertext and recover the plaintext by shifting back.",
      description:
        "A field team radioed in one line and the handset only supports a single-alphabet shift cipher. " +
        "The operator forgot to write down the shift. Recover the message.",
      skills: ["Caesar Cipher", "Frequency Analysis", "Crib Dragging"],
      data: { artifact: "cipher", text: A["CRYPTO-001"].cipher, meta: "single alphabet shift, A-Z only, symbols untouched" },
      answer: { expects: A["CRYPTO-001"].flag },
      hints: [
        "Look at the shape of the text: the braces and underscores are still in their original places, only letters moved.",
        "The token 'MSHN' is four letters long and sits where a well known four letter word usually sits in a lab flag.",
        "Try every shift from 1 to 25 (or shift 'MSHN' back to 'FLAG'): the correct shift is 7, so decode with shift -7."
      ],
      flag: A["CRYPTO-001"].flag,
      explanation:
        "A Caesar cipher adds a constant shift to every letter. Because punctuation was left alone, the structure " +
        "'XXXX{...}' leaked the format, and the four letter group at the start is a classic crib. Shifting every letter " +
        "back by 7 turns MSHN into FLAG and reveals the whole message. In a real investigation this is the fastest " +
        "possible win: structure first, keyspace second - there are only 25 shifts to test.",
      solutionSteps: [
        "Note that '{', '}' and '_' are untouched -> monoalphabetic substitution on letters only.",
        "Assume the plaintext starts with the lab flag prefix FLAG.",
        "M -> F is a shift of 7 backwards; confirm with S -> L, H -> A, N -> G.",
        "Apply shift -7 to the whole line to recover the flag."
      ]
    },
    {
      id: "CRYPTO-002",
      title: "Old Roman Secret",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Identify ROT13 as its own inverse and use it to decode a note left in plaintext.",
      description:
        "An intern hid a note inside a public readme, convinced nobody would read it. The note is one rotation away " +
        "from being obvious. Decode it.",
      skills: ["ROT13", "Classic Ciphers", "Encoding vs Encryption"],
      data: { artifact: "cipher", text: A["CRYPTO-002"].cipher, meta: "rotation cipher, no key required" },
      answer: { expects: A["CRYPTO-002"].flag },
      hints: [
        "The first token is four letters and looks like a shifted version of a very common lab prefix.",
        "ROT13 is a Caesar shift of 13 - and because 13 is half of 26, encoding and decoding are the same operation.",
        "Apply ROT13 once: SYNT becomes FLAG and the rest of the line falls into place."
      ],
      flag: A["CRYPTO-002"].flag,
      explanation:
        "ROT13 is the internet's classic 'don't spoil it' trick. Its defining property is involution: applying it twice " +
        "returns the original text, so there is no separate decode step. That also makes it worthless as protection - it " +
        "is obfuscation, not encryption. Recognising it instantly saves time in triage: if a string is alphabetic, " +
        "readable-looking but nonsense, try ROT13 before reaching for heavier tools.",
      solutionSteps: [
        "Spot the SYNT prefix - four letters, same shape as FLAG.",
        "Apply ROT13 (identical to Caesar 13) to the whole string.",
        "Read the flag; re-applying ROT13 proves the operation is its own inverse."
      ]
    },
    {
      id: "CRYPTO-003",
      title: "Five Letters",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Apply a Vigenere decryption with a known five letter keyword and understand why the key length matters.",
      description:
        "A polyalphabetic cipher was used with a five letter keyword. The keyword was written on the whiteboard of the " +
        "lab and photographed by the blue team: GHOST.",
      skills: ["Vigenere Cipher", "Polyalphabetic Ciphers", "Keyword Handling"],
      data: {
        artifact: "cipher",
        text: A["CRYPTO-003"].cipher,
        meta: "keyword: " + A["CRYPTO-003"].key + " | key advances on letters only"
      },
      answer: { expects: A["CRYPTO-003"].flag },
      hints: [
        "The keyword is five letters long, so the ciphertext is really five interleaved Caesar ciphers.",
        "Symbols such as '{' and '_' do not consume a key character - the key only advances on A-Z.",
        "Decrypt with Vigenere using key GHOST (shift A=0, B=1 ... and subtract instead of add)."
      ],
      flag: A["CRYPTO-003"].flag,
      explanation:
        "Vigenere uses a repeating keyword, so each position gets a different shift. Two details trip up most manual " +
        "solutions: non-alphabetic characters are passed through *without* consuming a key letter, and decryption " +
        "subtracts the key shift instead of adding it. With a five letter key, frequency analysis on every fifth " +
        "character reduces the problem to five small Caesar ciphers - which is exactly how the cipher was broken " +
        "historically, and why short keywords are weak.",
      solutionSteps: [
        "Write the keyword GHOST and map G=6, H=7, O=14, S=18, T=19.",
        "Walk the ciphertext; for each letter subtract the current key shift, then advance the key index.",
        "Skip '{', '}' and '_' without advancing the key index.",
        "The recovered text is the flag."
      ]
    },
    {
      id: "CRYPTO-004",
      title: "XOR Gate",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Use the self-inverse property of XOR to recover plaintext from a single byte key.",
      description:
        "A telemetry agent obfuscates its configuration by XOR-ing every byte with one constant. The captured value is " +
        "below in hex. The constant is 0x42.",
      skills: ["XOR", "Hexadecimal", "Single Byte Keys", "Self Inverse Operations"],
      data: {
        artifact: "hexdump-inline",
        text: A["CRYPTO-004"].hex,
        meta: "key = " + A["CRYPTO-004"].key + " | one byte per character"
      },
      answer: { expects: A["CRYPTO-004"].flag },
      hints: [
        "Every two hex characters are one byte; convert the whole string to bytes first.",
        "XOR is its own inverse: (p XOR k) XOR k = p, so encrypting and decrypting are the same operation.",
        "XOR each byte with 0x42 and read the result as ASCII text."
      ],
      flag: A["CRYPTO-004"].flag,
      explanation:
        "XOR with a constant is the simplest possible stream cipher and it is completely self-inverse, which is why it " +
        "shows up everywhere in malware configuration and in CTF tasks. The tell is the first byte: 0x04 XOR 0x42 = 0x46 " +
        "= 'F'. Once one byte decodes to something meaningful the key is confirmed and the rest is mechanical. Single " +
        "byte XOR is trivially breakable by brute force (256 keys) even without a crib.",
      solutionSteps: [
        "Split the hex string into byte pairs.",
        "XOR the first byte with 0x42 -> 0x46 ('F'): key confirmed.",
        "XOR every byte with 0x42 and decode as ASCII.",
        "Result is the flag."
      ]
    },
    {
      id: "CRYPTO-005",
      title: "Broken Hex",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Convert a hexadecimal string to ASCII text without any tooling beyond a conversion table.",
      description:
        "A log line was truncated by the collector and only the hex form survived. Turn it back into text.",
      skills: ["Hexadecimal", "ASCII", "Encoding"],
      data: { artifact: "hex", text: A["CRYPTO-005"].hex, meta: "uppercase hex, 2 characters per byte" },
      answer: { expects: A["CRYPTO-005"].flag },
      hints: [
        "Look at the format of the ciphertext: only characters 0-9 and A-F appear.",
        "The characters are hexadecimal, and the length is even, so it is a clean byte string.",
        "Convert every two hexadecimal characters into one ASCII character (46='F', 4C='L', ...)."
      ],
      flag: A["CRYPTO-005"].flag,
      explanation:
        "Hexadecimal is a representation, not protection: two hex digits encode exactly one byte. The fastest sanity " +
        "check is the first byte - 0x46 is 'F' - and printable ASCII lives between 0x20 and 0x7E, so a long hex string " +
        "inside that range is almost always text. Reading hex fluently is a core analyst skill because file signatures, " +
        "shellcode and protocol fields are all discussed in hex.",
      solutionSteps: [
        "Confirm the alphabet is 0-9A-F and the length is even.",
        "Group into pairs: 46 4C 41 47 7B ...",
        "Map each pair to its ASCII character.",
        "Read the flag."
      ]
    },
    {
      id: "CRYPTO-006",
      title: "Binary Whisper",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Convert space separated 8-bit binary groups into ASCII characters.",
      description:
        "A side channel capture recorded a message as raw bits. Each group of eight bits is one character.",
      skills: ["Binary", "ASCII", "Bit Grouping"],
      data: { artifact: "binary", text: A["CRYPTO-006"].binary, meta: "8 bits per character, space separated" },
      answer: { expects: A["CRYPTO-006"].flag },
      hints: [
        "Count the group sizes: every group is exactly eight bits, so each group is one byte.",
        "Convert a group to decimal, then map that decimal value to its ASCII character.",
        "The first group 01000110 is 70 in decimal, which is the letter 'F'."
      ],
      flag: A["CRYPTO-006"].flag,
      explanation:
        "Binary to text is a two step conversion: bits to a decimal value, then decimal to a character via the ASCII " +
        "table. Grouping is the whole difficulty - once you know the width is 8 the rest is arithmetic. The first byte " +
        "01000110 = 64+4+2 = 70 = 'F' is the standard crib for anything flag-shaped.",
      solutionSteps: [
        "Split the capture on spaces to get eight bit groups.",
        "Convert each group from base 2 to base 10.",
        "Map each decimal value to ASCII.",
        "Concatenate to read the flag."
      ]
    },
    {
      id: "CRYPTO-007",
      title: "Layer Cake",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Recover the correct decoding order for a multi layer encoding chain.",
      description:
        "An exfil script wrapped its payload three times. You recovered the outermost layer only. Figure out the " +
        "sequence and peel it apart.",
      skills: ["Base64", "Hexadecimal", "Layered Encoding", "Decoding Order"],
      data: {
        artifact: "encoded",
        text: A["CRYPTO-007"].final,
        meta: "layers applied (innermost first): " + A["CRYPTO-007"].chain.join(" -> ")
      },
      answer: { expects: A["CRYPTO-007"].flag },
      hints: [
        "The visible string only uses A-Z, a-z, 0-9, '+' and '/' and ends with '=' - that is base64.",
        "Decoding that base64 gives you a string made only of hex characters, so the next layer is hex.",
        "Decode base64 -> decode hex -> decode base64 again. Order is the reverse of how it was built."
      ],
      flag: A["CRYPTO-007"].flag,
      explanation:
        "Layered encoding is a delay tactic, not a defence. The reliable method is to identify the outermost alphabet, " +
        "decode it, then re-identify. Here: base64 (padding '=') -> hex string -> base64 again -> ASCII. Each layer " +
        "grows the payload (base64 is +33%, hex is +100%), which is itself a detection signal in traffic analysis: " +
        "unexpectedly large text fields often mean stacked encodings.",
      solutionSteps: [
        "Identify layer 1 as base64 by alphabet and padding.",
        "Decode it: the result is a pure hex string.",
        "Decode hex -> base64 text again.",
        "Decode base64 -> plaintext flag."
      ]
    },
    {
      id: "CRYPTO-008",
      title: "Hash Detective",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Identify hash algorithms from digest length and alphabet, and understand why length alone is only a hint.",
      description:
        "Four digests were pulled from a lab configuration store. All of them hash harmless dummy words, none of them " +
        "protect anything real. Identify the algorithm behind each digest.\n\n" +
        "A: " + A["CRYPTO-008"].md5 + "\n" +
        "B: " + A["CRYPTO-008"].sha1 + "\n" +
        "C: " + A["CRYPTO-008"].sha256 + "\n" +
        "D: " + A["CRYPTO-008"].sha512 + "\n\n" +
        "Answer with the four algorithm names separated by commas, in order A,B,C,D.",
      skills: ["Hash Identification", "Digest Length", "MD5", "SHA Family"],
      data: {
        artifact: "table",
        rows: [
          ["A", A["CRYPTO-008"].md5, A["CRYPTO-008"].md5.length + " hex chars"],
          ["B", A["CRYPTO-008"].sha1, A["CRYPTO-008"].sha1.length + " hex chars"],
          ["C", A["CRYPTO-008"].sha256, A["CRYPTO-008"].sha256.length + " hex chars"],
          ["D", A["CRYPTO-008"].sha512, A["CRYPTO-008"].sha512.length + " hex chars"]
        ],
        meta: "digests of the dummy words phantom / midnight / lantern / compass"
      },
      answer: { expects: ["MD5,SHA1,SHA256,SHA512", "MD5, SHA1, SHA256, SHA512", "FLAG{HASH_LENGTH_IS_A_HINT_NOT_PROOF}"], contains: true },
      hints: [
        "Count the hexadecimal characters in each digest - the length is the strongest first signal.",
        "32 hex chars = 128 bits, 40 = 160 bits, 64 = 256 bits, 128 = 512 bits.",
        "Map them: 128 bit -> MD5, 160 bit -> SHA-1, 256 bit -> SHA-256, 512 bit -> SHA-512."
      ],
      flag: "FLAG{HASH_LENGTH_IS_A_HINT_NOT_PROOF}",
      explanation:
        "Digest length narrows the field: 32 hex characters is MD5 (or NTLM), 40 is SHA-1, 64 is SHA-256, 128 is " +
        "SHA-512. But length is never proof - several algorithms share an output size, which is why identification " +
        "tools always report candidates. The security lesson is separate and more important: MD5 and SHA-1 are " +
        "collision-broken and must not be used for signatures, and a fast general purpose hash is the wrong tool for " +
        "passwords regardless of length. This lab only uses dummy words - never point hash tools at real credentials.",
      solutionSteps: [
        "Measure each digest: 32, 40, 64 and 128 hex characters.",
        "Convert to bits: 128, 160, 256, 512.",
        "Match to the common families: MD5, SHA-1, SHA-256, SHA-512.",
        "Submit the four names in order."
      ]
    },
    {
      id: "CRYPTO-009",
      title: "Salted Mystery",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Explain by demonstration why password hashing uses a unique salt per record.",
      description:
        "Educational simulation with a dummy password. The lab store contains:\n\n" +
        "  unsalted  sha256(password)         = " + A["CRYPTO-009"].unsalted + "\n" +
        "  record    sha256(salt + password)  = " + A["CRYPTO-009"].target + "\n\n" +
        "The password is the dummy string " + A["CRYPTO-009"].password + ". Four candidate salts were recovered from a " +
        "config backup:\n  " + A["CRYPTO-009"].salts.join("\n  ") + "\n\n" +
        "Hash each candidate as sha256(salt + password), find the one that matches the record, then submit the flag " +
        "built from that salt.",
      skills: ["Salted Hashing", "SHA-256", "Password Storage Concepts", "Rainbow Table Resistance"],
      data: {
        artifact: "table",
        rows: A["CRYPTO-009"].salts.map(function (s) {
          return [s, A["CRYPTO-009"].salted[s], s === A["CRYPTO-009"].correct ? "" : ""];
        }),
        meta: "all values are sha256(candidate_salt + dummy_password) - lab data only"
      },
      answer: { expects: "FLAG{" + A["CRYPTO-009"].correct + "}" },
      hints: [
        "Compare lengths first: the unsalted digest and the record digest are both 64 hex chars, so both are SHA-256 - the difference is the input.",
        "The scheme is sha256(salt + password), so the salt is prepended, not appended.",
        "Hash SALT_7X2 + GHOST_PROTOCOL and compare with the record digest; the match gives you the flag salt."
      ],
      flag: "FLAG{" + A["CRYPTO-009"].correct + "}",
      explanation:
        "Without a salt, identical passwords produce identical digests, so one precomputed table cracks every account " +
        "at once and an attacker can spot password reuse by eyeballing the store. A unique random salt per record " +
        "forces the attacker to rebuild the search space for each account individually. Salts are not secret - they are " +
        "stored next to the hash - and they are not a substitute for a slow, memory-hard password hash such as " +
        "argon2id, bcrypt or scrypt. This exercise used a dummy word on purpose: salting is a design property, not " +
        "something you should test against real credential stores.",
      solutionSteps: [
        "Confirm both digests are 64 hex characters -> SHA-256.",
        "For each candidate salt compute sha256(salt + 'GHOST_PROTOCOL').",
        "Only SALT_7X2 reproduces the stored record digest.",
        "Submit FLAG{SALT_7X2}."
      ]
    },
    {
      id: "CRYPTO-010",
      title: "Cipher Archive",
      category: CAT,
      difficulty: "Hard",
      points: 400,
      objective: "Chain four independent transformations in the correct reverse order to recover one short secret.",
      description:
        "An archive tool applied four transformations to a short secret, in this order:\n" +
        "  1. Base64 encode\n  2. Atbash substitution (A<->Z, B<->Y, case preserved)\n" +
        "  3. Caesar shift +7\n  4. Hexadecimal encode\n\n" +
        "Only the final output survived:\n\n" + A["CRYPTO-010"].final + "\n\n" +
        "Recover the secret.",
      skills: ["Base64", "Atbash", "Caesar Cipher", "Hexadecimal", "Reverse Order Reasoning"],
      data: { artifact: "hex", text: A["CRYPTO-010"].final, meta: "four layers, decode in reverse order" },
      answer: { expects: A["CRYPTO-010"].flag },
      hints: [
        "The outermost layer is the last one applied. The string is pure hex, so start by decoding hex to text.",
        "After hex you get readable mixed case text; undo the Caesar shift of +7 before you touch the substitution.",
        "Then apply Atbash (it is its own inverse) and finally base64-decode to read the secret."
      ],
      flag: A["CRYPTO-010"].flag,
      explanation:
        "Multi-stage transformations must be undone in strict reverse order, and each stage has to be recognised before " +
        "it can be inverted: hex -> Caesar(-7) -> Atbash -> base64. Atbash is an involution, so the same operation both " +
        "encodes and decodes. The intermediate value after base64 is worth checking - it should look like flag text, " +
        "which is your confirmation that the order was right. Chaining weak transforms does not create strength; it " +
        "only creates work for the analyst, and each layer still leaks its own alphabet.",
      solutionSteps: [
        "Hex decode -> 'PwjFP3nAN1LOJ0jRQ0nNJ09SPL9VPLv9'.",
        "Caesar -7 -> 'IpcYI3gTG1EHC0cKJ0gGC09LIE9OIEo9'.",
        "Atbash -> 'RkxBR3tGT1VSX0xPQ0tTX09ORV9LRVl9'.",
        "Base64 decode -> the flag."
      ]
    },
    {
      id: "CRYPTO-011",
      title: "Two Pads, One Key",
      category: CAT,
      difficulty: "Expert",
      points: 700,
      objective: "Break a reused one-time pad with a known crib: recover the key stream from C1/P1, then decrypt C2.",
      description:
        "A lab relay reused the same key stream for two messages over the alphabet A-Z plus space (27 symbols, " +
        "additive). You recovered one ciphertext together with its plaintext crib, and a second ciphertext sent later " +
        "under the very same key.\n\n" +
        "  C1 = " + A["CRYPTO-011"].c1 + "\n" +
        "  P1 = " + A["CRYPTO-011"].m1 + "   (crib, confirmed from a paper note)\n" +
        "  C2 = " + A["CRYPTO-011"].c2 + "\n\n" +
        "The key stream is 12 symbols long and alphabetic. Recover the key from the crib, decrypt C2, then submit the " +
        "flag that states the lesson.",
      skills: ["One Time Pad", "Key Reuse", "Crib Dragging", "Modular Arithmetic", "Cryptanalysis"],
      data: {
        artifact: "cipher",
        text: "C1: " + A["CRYPTO-011"].c1 + "\nP1: " + A["CRYPTO-011"].m1 + "\nC2: " + A["CRYPTO-011"].c2 +
          "\nALPHABET: A-Z plus space (27 symbols, additive)",
        meta: "key length 12, alphabetic key, key stream advances on every character"
      },
      answer: { expects: A["CRYPTO-011"].flag },
      hints: [
        "With P1 and C1 you can subtract directly: key[i] = C1[i] - P1[i] (mod 27). That recovers the whole 12 symbol key because C1 is longer than the key.",
        "Fold the recovered key stream back to 12 symbols and check it repeats - it spells a clean alphabetic keyword.",
        "Decrypt C2 with the recovered key; the plaintext is the message that explains why reuse is fatal, and the flag is FLAG{NEVER_REUSE_A_ONE_TIME_PAD}."
      ],
      flag: A["CRYPTO-011"].flag,
      explanation:
        "A one-time pad is only unbreakable while the pad is used once. Reuse destroys that property in two ways. First, " +
        "a crib (any known plaintext) reveals the key stream directly: key = C - P mod 27. Second, even without a crib, " +
        "C1 - C2 = P1 - P2 cancels the key entirely, and the statistics of natural language let an analyst slide the " +
        "two plaintexts against each other until words appear. Here the crib gives the 12 symbol keyword immediately, " +
        "and every message ever sent under that key is readable forever. This is the reasoning behind real-world " +
        "findings such as reused nonces and repeated IVs - the mathematics is the same shape.",
      solutionSteps: [
        "Compute key[i] = (C1[i] - P1[i]) mod 27 for i = 0..11 -> the keyword.",
        "Verify the keyword reproduces C1 for its full length.",
        "Decrypt C2 with the same keyword to read the second message.",
        "Submit the flag stating the lesson: never reuse a one time pad."
      ]
    },
    {
      id: "CRYPTO-012",
      title: "The Coprime Lock",
      category: CAT,
      difficulty: "Expert",
      points: 650,
      objective: "Break an affine cipher by exploiting the small key space and the modular inverse requirement.",
      description:
        "An affine cipher was used on uppercase letters: E(x) = (a*x + b) mod 26. The additive constant b is 8; the " +
        "multiplier a was lost with the operator. Only 'a' values that are coprime with 26 can be decrypted at all.\n\n" +
        A["CRYPTO-012"].cipher + "\n\n" +
        "Recover 'a', decrypt the message, then submit the flag.",
      skills: ["Affine Cipher", "Modular Inverse", "Coprime Numbers", "Keyspace Brute Force"],
      data: {
        artifact: "cipher",
        text: A["CRYPTO-012"].cipher,
        meta: "E(x) = (a*x + b) mod 26 | b = " + A["CRYPTO-012"].b + " | a unknown, coprime with 26"
      },
      answer: { expects: A["CRYPTO-012"].flag },
      hints: [
        "Only 12 values of 'a' are invertible mod 26: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25. That is the entire keyspace.",
        "Decryption needs a^-1 mod 26, then D(y) = a^-1 * (y - b) mod 26 with b = 8.",
        "Try each candidate 'a' until the first four letters read FLAG - the winner is a = 5, whose inverse is 21."
      ],
      flag: A["CRYPTO-012"].flag,
      explanation:
        "The affine cipher's key space is tiny: 12 usable multipliers times 26 shifts is 312 combinations, so brute " +
        "force finishes instantly. The interesting constraint is number theory - 'a' must be coprime with 26 or the " +
        "mapping is not injective and decryption is impossible (for example a = 2 collapses 13 letters onto the same " +
        "output). Finding a = 5, whose modular inverse is 21 because 5*21 = 105 = 1 mod 26, unlocks the message. The " +
        "analyst lesson: whenever a scheme's security rests on a small parameter set, enumerate it rather than attack it.",
      solutionSteps: [
        "List multipliers coprime with 26 (12 candidates).",
        "For each, compute the modular inverse and decrypt with D(y) = a^-1 * (y - 8) mod 26.",
        "a = 5 (inverse 21) yields readable text starting with FLAG.",
        "Submit the flag."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
