/* ============================================================================
 * data/challenges-campaigns.js - MYSTERY ARCHIVE (5 campaigns x 5 stages)
 * ----------------------------------------------------------------------------
 * CASE-001 The First Signal      1000 pts  encoding -> caesar -> hex -> stego -> final
 * CASE-002 The Silent Archive    1200 pts  file analysis -> metadata -> strings -> binary -> cipher
 * CASE-003 The Broken Terminal   1500 pts  filesystem -> hidden files -> grep -> permissions -> case
 * CASE-004 Network Ghost         1500 pts  IP -> DNS -> ports -> packets -> case
 * CASE-005 The Unknown Cipher    2000 pts  patterns -> substitution -> frequency -> layers -> final
 *
 * Stages unlock in order. Each stage is a normal challenge, so hints, XP,
 * points, badges and progress persistence all apply unchanged.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAM = A.CAMPAIGNS;
  var CAT = "Mystery Archive";
  var SUB = CAM["CASE-005"].subst;

  function subMap(cipherToPlain) {
    var m = {};
    for (var i = 0; i < SUB.alphabet.length; i++) {
      if (cipherToPlain) m[SUB.key[i]] = SUB.alphabet[i];
      else m[SUB.alphabet[i]] = SUB.key[i];
    }
    return m;
  }

  CTF.CAMPAIGN_META = [
    {
      id: "CASE-001", title: "The First Signal", points: 1000, stages: 5,
      summary: "A relayed signal was wrapped five times. Peel it in the right order.",
      arc: ["Encoding", "Caesar", "Hex", "Steganography", "Final flag"]
    },
    {
      id: "CASE-002", title: "The Silent Archive", points: 1200, stages: 5,
      summary: "An archived evidence bundle whose manifest does not match its contents.",
      arc: ["File analysis", "Metadata", "Strings", "Binary", "Cipher"]
    },
    {
      id: "CASE-003", title: "The Broken Terminal", points: 1500, stages: 5,
      summary: "A lab host was rebuilt by hand. Prove what changed and who changed it.",
      arc: ["Filesystem", "Hidden files", "grep", "Permissions", "Final investigation"]
    },
    {
      id: "CASE-004", title: "Network Ghost", points: 1500, stages: 5,
      summary: "Something on the lab segment is answering queries it should not know about.",
      arc: ["IP analysis", "DNS", "Ports", "Packet simulation", "Final case"]
    },
    {
      id: "CASE-005", title: "The Unknown Cipher", points: 2000, stages: 5,
      summary: "An unknown monoalphabetic system, recovered from pattern to plaintext.",
      arc: ["Pattern recognition", "Substitution", "Frequency analysis", "Multi-layer encoding", "Final cipher"]
    }
  ];

  CTF.register([
    /* ------------------------------------------------------------ CASE-001 */
    {
      id: "CASE-001-S1",
      campaign: "CASE-001", stage: 1,
      title: "The First Signal - Stage 1: Encoding",
      category: CAT, difficulty: "Beginner", points: 100,
      objective: "Identify two stacked encodings on a relay capture and recover the tagged message.",
      description:
        "A lab relay logged one outbound value. The capture preamble says the payload was hex-encoded and then " +
        "base64-encoded, and that the message carries a 'SIGNAL::' tag.\n\n" + CAM["CASE-001"].s1.final + "\n\n" +
        "Submit the full decoded message including the tag.",
      skills: ["Base64", "Hexadecimal", "Decode Ordering"],
      data: { artifact: "encoded", text: CAM["CASE-001"].s1.final, meta: "built as base64(hex(message))" },
      answer: { expects: CAM["CASE-001"].s1.answer },
      hints: [
        "The outer layer is base64 (mixed case with '=' padding). Decode it first.",
        "That yields a pure hex string - decode hex next.",
        "The result is the tagged message: " + CAM["CASE-001"].s1.answer
      ],
      flag: "FLAG{FIRST_SIGNAL_RECEIVED}",
      explanation:
        "Stage one establishes the campaign's core discipline: identify the outer alphabet before choosing a tool. The " +
        "capture is base64 on the outside and hex inside, so decoding in the wrong order produces garbage that looks " +
        "plausible - which is the real danger. The 'SIGNAL::' tag is your confirmation marker: when it appears, the " +
        "order was right. Keep that tag; later stages of this campaign reference the same signal.",
      solutionSteps: [
        "Base64 decode the capture -> hex string.",
        "Hex decode -> 'SIGNAL::FLAG{FIRST_SIGNAL_RECEIVED}'.",
        "Confirm the tag prefix is intact.",
        "Carry the flag into stage 2."
      ]
    },
    {
      id: "CASE-001-S2",
      campaign: "CASE-001", stage: 2,
      title: "The First Signal - Stage 2: Caesar",
      category: CAT, difficulty: "Medium", points: 200,
      objective: "Recover a known-format message from a Caesar shift without being told the shift.",
      description:
        "The relay's second transmission used a single alphabet shift. The shift was not logged.\n\n" +
        CAM["CASE-001"].s2.cipher + "\n\n" +
        "You know from stage 1 what the message should say. Recover it and submit the flag.",
      skills: ["Caesar Cipher", "Known Plaintext", "Shift Recovery"],
      data: { artifact: "cipher", text: CAM["CASE-001"].s2.cipher, meta: "single shift, symbols untouched" },
      answer: { expects: CAM["CASE-001"].s2.flag },
      hints: [
        "You already know the plaintext from stage 1, so this is a known-plaintext attack: compare the first letters.",
        "Q should be F, which is a backward shift of 11 (or forward 15).",
        "Apply shift -11 across the line to get " + CAM["CASE-001"].s2.flag
      ],
      flag: CAM["CASE-001"].s2.flag,
      explanation:
        "Having the plaintext from the previous stage turns this from a 25-key search into a single comparison: Q " +
        "versus F gives shift 11 immediately. That is the value of sequencing in an investigation - each solved step " +
        "converts the next unknown into a known-plaintext problem. Note that the shift could equally be described as " +
        "+15 forward; only the relative offset matters, which is why reporting 'shift 11 backwards' and 'shift 15 " +
        "forwards' are the same finding.",
      solutionSteps: [
        "Compare the first ciphertext letter Q with the expected plaintext letter F.",
        "Derive the shift: 11 backwards.",
        "Apply it to the whole line.",
        "Confirm the result matches the stage 1 flag."
      ]
    },
    {
      id: "CASE-001-S3",
      campaign: "CASE-001", stage: 3,
      title: "The First Signal - Stage 3: Hex",
      category: CAT, difficulty: "Medium", points: 200,
      objective: "Chain a hex decode into a rotation cipher and recognise when output is still not plaintext.",
      description:
        "The third capture is a hex blob. Decoding it once does not give readable text - it gives text that has been " +
        "rotated.\n\n" + CAM["CASE-001"].s3.hex + "\n\n" +
        "Recover the flag.",
      skills: ["Hexadecimal", "ROT13", "Two Stage Decoding"],
      data: { artifact: "hex", text: CAM["CASE-001"].s3.hex, meta: "hex(rot13(flag))" },
      answer: { expects: CAM["CASE-001"].s3.flag },
      hints: [
        "Hex decode first: the result is alphabetic with braces in odd places - readable shape, wrong letters.",
        "That pattern is a rotation cipher. Half-alphabet rotation means ROT13.",
        "Apply ROT13 to the hex-decoded text to get " + CAM["CASE-001"].s3.flag
      ],
      flag: CAM["CASE-001"].s3.flag,
      explanation:
        "The recognition signal here is subtle and worth internalising: after hex decoding you get text with correct " +
        "punctuation in wrong positions ('SYNT{...}'). Structure preserved plus letters wrong is the fingerprint of a " +
        "monoalphabetic substitution, and a half-alphabet rotation is ROT13. Chaining a representation change (hex) " +
        "with a substitution (ROT13) is a very common obfuscation pair because each layer defeats a different naive " +
        "tool: a hex decoder gives you text, and an analyst who stops there reports 'nothing found'.",
      solutionSteps: [
        "Hex decode -> '" + CAM["CASE-001"].s3.rotated + "'.",
        "Recognise preserved structure with rotated letters.",
        "Apply ROT13 -> the stage flag.",
        "Confirm it matches the campaign flag."
      ]
    },
    {
      id: "CASE-001-S4",
      campaign: "CASE-001", stage: 4,
      title: "The First Signal - Stage 4: Steganography",
      category: CAT, difficulty: "Medium", points: 200,
      objective: "Extract an LSB payload from the green channel of a generated lab image.",
      description:
        "The relay's fourth transmission was not text at all: it was a 20x20 image rendered by the lab. The payload " +
        "sits in the least significant bit of the GREEN channel, row-major from the top left.\n\n" +
        "Extract it and confirm it matches the campaign flag.",
      skills: ["LSB Steganography", "Channel Selection", "Image Analysis"],
      data: {
        artifact: "stego-image",
        spec: CAM["CASE-001"].s4.stego,
        channel: "g",
        dumpTitle: "Row 0 - green channel values",
        meta: "20 x 20 generated image, payload in the green channel LSB"
      },
      answer: { expects: CAM["CASE-001"].s4.flag },
      hints: [
        "You are told the channel, so the only question is bit order: one bit per pixel, most significant bit of each byte first.",
        "Take green AND 1 for each pixel, row by row, group into eights and map through ASCII.",
        "The payload is the campaign flag: " + CAM["CASE-001"].s4.flag
      ],
      flag: CAM["CASE-001"].s4.flag,
      explanation:
        "This stage removes the search problem (the channel is given) so you can focus on the extraction model: one " +
        "bit per pixel, row-major, most significant bit of each character first. Getting the model right matters more " +
        "than getting the tool right - the same payload read column-major or LSB-first inside each byte yields " +
        "nonsense. The image is generated by the lab from a fixed seed, which means anyone reproducing the extraction " +
        "gets identical pixels: reproducibility is a feature of evidence, not a detail.",
      solutionSteps: [
        "Read the green channel of each pixel in row-major order.",
        "Reduce each value mod 2 to obtain the bit stream.",
        "Group into 8-bit bytes and decode as ASCII.",
        "Confirm the result matches the campaign flag."
      ]
    },
    {
      id: "CASE-001-S5",
      campaign: "CASE-001", stage: 5,
      title: "The First Signal - Stage 5: Final Flag",
      category: CAT, difficulty: "Medium", points: 300,
      objective: "Close the campaign by inverting a three stage transform and stating the full decode path.",
      description:
        "The final capture from the relay:\n\n" + CAM["CASE-001"].s5.final + "\n\n" +
        "The relay's manifest says: shift +3, then substitution by half alphabet (atbash), then base64. Invert it, " +
        "submit the campaign flag, and write the full decode path for all five stages in the writeup step.",
      skills: ["ROT13", "Caesar Cipher", "Base64", "Case Documentation"],
      data: { artifact: "encoded", text: CAM["CASE-001"].s5.final, meta: "base64(caesar3(atbash(flag)))" },
      answer: { expects: CAM["CASE-001"].s5.flag },
      hints: [
        "Invert the manifest in reverse order: base64 decode, then undo the substitution, then undo the shift.",
        "Undo shift +3 with shift -3, and undo atbash with atbash (it is its own inverse).",
        "The result is " + CAM["CASE-001"].s5.flag + " - the same flag you have been confirming since stage 1."
      ],
      flag: CAM["CASE-001"].s5.flag,
      explanation:
        "The final stage is deliberately short because the real deliverable is the documented path: base64 decode -> " +
        "atbash -> caesar -3 -> flag. Across the campaign you used five different techniques on five captures of the " +
        "same message, and the value of the case is the write-up that lists, per stage, the observed representation, " +
        "the transformation applied and the confirmation marker. That is the artifact another analyst can re-run - and " +
        "re-running is what makes a finding credible.",
      solutionSteps: [
        "Base64 decode -> atbash text.",
        "Apply atbash -> caesar text.",
        "Apply caesar -3 -> the campaign flag.",
        "Document all five stages: encoding, caesar, hex, stego, final transform."
      ]
    },

    /* ------------------------------------------------------------ CASE-002 */
    {
      id: "CASE-002-S1",
      campaign: "CASE-002", stage: 1,
      title: "The Silent Archive - Stage 1: File Analysis",
      category: CAT, difficulty: "Easy", points: 150,
      objective: "Identify a container format from magic bytes embedded at a non-zero offset.",
      description:
        "Evidence item: silent_archive_02 (fictional). The intake form says 'unknown binary'. A signature scan found " +
        "these bytes at offset 96:\n\n" + CAM["CASE-002"].s1.hexHead + "\n\n" +
        "Identify the container format. Answer with the format name.",
      skills: ["File Signatures", "Magic Bytes", "Offset Awareness", "Container Identification"],
      data: {
        artifact: "hexdump-inline",
        text: CAM["CASE-002"].s1.hexHead,
        meta: "signature found at offset 96, not at offset 0"
      },
      answer: { expects: ["GZIP", "gzip", "FLAG{MAGIC_AT_OFFSET_96}"] },
      hints: [
        "Read the first two bytes: 1f 8b. That pair is the gzip magic number.",
        "The third byte 08 names the compression method (deflate), which confirms gzip rather than a coincidence.",
        "The format is GZIP - and note it starts at offset 96, so this archive is a gzip member embedded in a larger file."
      ],
      flag: "FLAG{MAGIC_AT_OFFSET_96}",
      explanation:
        "1F 8B is gzip, and the following 08 is the deflate method byte - two bytes of magic plus a method field is a " +
        "strong identification. The important detail is the offset: finding a container signature at 96 rather than 0 " +
        "means the file is either a concatenation, an archive member, or a payload appended to something else. That " +
        "changes your next action from 'decompress it' to 'find the boundaries first'. Signature scanning across the " +
        "whole file rather than only reading the first bytes is the habit this stage installs.",
      solutionSteps: [
        "Read the magic bytes: 1f 8b -> gzip.",
        "Confirm with the method byte 08 (deflate).",
        "Record the offset (96) as evidence of an embedded member.",
        "Plan the next step: locate the member's end before extracting."
      ]
    },
    {
      id: "CASE-002-S2",
      campaign: "CASE-002", stage: 2,
      title: "The Silent Archive - Stage 2: Metadata",
      category: CAT, difficulty: "Medium", points: 200,
      objective: "Read archive metadata, decode an embedded note, and use it to obtain the next key.",
      description:
        "Archive metadata record (fictional):\n\n" + JSON.stringify(CAM["CASE-002"].s2.meta, null, 2) + "\n\n" +
        "The Note field is encoded. Decode it, follow its instruction, and submit the value it points to.",
      skills: ["Metadata Analysis", "Base64", "Instruction Following"],
      data: {
        artifact: "metadata",
        meta2: CAM["CASE-002"].s2.meta,
        meta: "fictional archive manifest, no real owner or system"
      },
      answer: { expects: [CAM["CASE-002"].s2.answer, "FLAG{ARCHIVIST_THREE}"] },
      hints: [
        "Base64 decode the Note field: it reads 'second key is the owner name'.",
        "The Owner field of the same record holds the value you need.",
        "The owner is " + CAM["CASE-002"].s2.answer + " - that is the second key for stage 4."
      ],
      flag: "FLAG{ARCHIVIST_THREE}",
      explanation:
        "Metadata is instructions left behind by tooling, and manifests often contain fields nobody reads. Here the " +
        "note is base64 - a representation choice, not protection - and it points at another field in the same record. " +
        "The transferable lesson is that a manifest gives you both facts (owner, creation time) and pointers (what " +
        "matters, where to look next); collect both. Also note the creation timestamp: 2025-11-02 predates the " +
        "campaign's other events, which is how you would begin to build a chronology in a real case.",
      solutionSteps: [
        "Enumerate all metadata fields including Note.",
        "Base64 decode Note -> 'second key is the owner name'.",
        "Read Owner -> " + CAM["CASE-002"].s2.answer + ".",
        "Keep the value for stage 4 and record the creation timestamp for the timeline."
      ]
    },
    {
      id: "CASE-002-S3",
      campaign: "CASE-002", stage: 3,
      title: "The Silent Archive - Stage 3: Strings",
      category: CAT, difficulty: "Medium", points: 250,
      objective: "Filter a strings output for signal, spot an encoded run, and decode it.",
      description:
        "A printable-strings pass over the archive produced five runs:\n\n" +
        CAM["CASE-002"].s3.strings.map(function (s, i) { return "  [" + i + "] " + s; }).join("\n") + "\n\n" +
        "One run is hex-encoded and is the value the next stage needs. Decode it and submit the decoded text.",
      skills: ["strings", "Filtering", "Hexadecimal", "Alphabet Recognition"],
      data: {
        artifact: "table",
        headers: ["#", "RUN", "ALPHABET"],
        rows: CAM["CASE-002"].s3.strings.map(function (s, i) {
          var alpha = /^[0-9a-fA-F]+$/.test(s) ? "hex only" : (s.indexOf(" ") >= 0 ? "words" : "mixed");
          return [String(i), s, alpha];
        }),
        meta: "five runs; exactly one has a pure hexadecimal alphabet and an even length"
      },
      answer: { expects: [CAM["CASE-002"].s3.answer, "FLAG{OPEN_AT_DAWN}"] },
      hints: [
        "Classify each run by its alphabet: three are words, one is an identifier, one is pure hex.",
        "Run [3] is 24 hex characters (12 bytes) - decode it.",
        "It decodes to " + CAM["CASE-002"].s3.answer + ", a time-of-day instruction for the case narrative."
      ],
      flag: "FLAG{OPEN_AT_DAWN}",
      explanation:
        "A strings pass produces mostly noise, and the skill is the filter. Classifying each run by alphabet - words " +
        "with spaces, identifiers with dashes, pure hex with even length - isolates run 3 in seconds. Decoding it gives " +
        "OPEN_AT_DAWN. Note the discipline of not over-reading: run [2] ('TODO: rotate keys') is a genuinely " +
        "interesting lead in a real case but it is not the answer here, and reporting it as a finding rather than " +
        "chasing it is the correct move. Encoded runs inside otherwise plaintext output are one of the highest-value " +
        "signals in binary triage.",
      solutionSteps: [
        "Classify each run by alphabet and length.",
        "Isolate the pure-hex even-length run: 4f50454e5f41545f4441574e.",
        "Hex decode -> OPEN_AT_DAWN.",
        "Note 'TODO: rotate keys' as a secondary lead for the report."
      ]
    },
    {
      id: "CASE-002-S4",
      campaign: "CASE-002", stage: 4,
      title: "The Silent Archive - Stage 4: Binary",
      category: CAT, difficulty: "Medium", points: 250,
      objective: "Convert a bit string to text and combine it with a value recovered from metadata.",
      description:
        "The archive's trailer holds a bit string:\n\n" + CAM["CASE-002"].s4.binary + "\n\n" +
        "Decode it. It should confirm the second key you recovered in stage 2.",
      skills: ["Binary", "ASCII", "Cross Stage Verification"],
      data: { artifact: "binary", text: CAM["CASE-002"].s4.binary, meta: "8 bits per character, space separated" },
      answer: { expects: [CAM["CASE-002"].s4.answer, "FLAG{KEY_MATCHES_OWNER}"] },
      hints: [
        "Group into 8-bit chunks and convert each to decimal, then to ASCII.",
        "The result is 'KEY=' followed by a name.",
        "It reads " + CAM["CASE-002"].s4.answer + " - matching the owner value from stage 2, which is your confirmation."
      ],
      flag: "FLAG{KEY_MATCHES_OWNER}",
      explanation:
        "Two independent artifacts agreeing is what turns a lead into a finding. Stage 2's metadata named the owner, " +
        "and this trailer bit string names the same value as a key. The conversion itself is elementary - eight bits to " +
        "a decimal value to a character - but the point of the stage is the cross-check: if the two values had " +
        "disagreed, one of your earlier steps would have been wrong and you would need to re-examine it. Build that " +
        "reflex deliberately: every time you recover a value, look for a second place it should appear.",
      solutionSteps: [
        "Split the bit string into 8-bit groups.",
        "Convert each group to decimal, then to ASCII.",
        "Read KEY=" + CAM["CASE-002"].s2.answer + ".",
        "Compare with the stage 2 metadata owner and record the agreement."
      ]
    },
    {
      id: "CASE-002-S5",
      campaign: "CASE-002", stage: 5,
      title: "The Silent Archive - Stage 5: Cipher",
      category: CAT, difficulty: "Hard", points: 350,
      objective: "Invert a hex-wrapped double substitution and close the archive case with a full evidence chain.",
      description:
        "The sealed content of the archive is one hex blob:\n\n" + CAM["CASE-002"].s5.cipher + "\n\n" +
        "The archive manifest states the sealing procedure: substitute with a reversed alphabet, shift by 5, then hex " +
        "encode. Invert it and submit the decoded sentence, then the campaign flag.\n\n" +
        "Expected decoded sentence: " + CAM["CASE-002"].s5.answerDecoded,
      skills: ["Atbash", "Caesar Cipher", "Hexadecimal", "Manifest Reading", "Case Closure"],
      data: { artifact: "hex", text: CAM["CASE-002"].s5.cipher, meta: "hex(caesar5(atbash(plaintext)))" },
      answer: {
        expects: [CAM["CASE-002"].s5.answerDecoded, CAM["CASE-002"].s5.flag, "FLAG{SILENT_ARCHIVE_OPENED}"]
      },
      hints: [
        "Hex decode first - the manifest lists hex as the last applied step, so it is the first you undo.",
        "Then undo the shift of 5 (apply -5), then undo the reversed alphabet with atbash.",
        "You should read 'ARCHIVE OPENED AT DAWN' and the campaign flag is " + CAM["CASE-002"].s5.flag
      ],
      flag: CAM["CASE-002"].s5.flag,
      explanation:
        "Closing this campaign means inverting hex -> caesar(-5) -> atbash and getting 'ARCHIVE OPENED AT DAWN', which " +
        "also confirms the stage 3 strings finding - the decoded sentence contains the value you recovered two stages " +
        "earlier. That convergence is the case's real result: five artifacts (signature scan, manifest, strings, " +
        "trailer bits, sealed blob) that independently describe one another. When you write this up, lead with the " +
        "convergence, not with the individual decodings, because convergence is what makes the conclusion defensible.",
      solutionSteps: [
        "Hex decode the sealed blob.",
        "Apply caesar -5.",
        "Apply atbash -> 'ARCHIVE OPENED AT DAWN'.",
        "Cross-check against the stage 3 finding OPEN_AT_DAWN.",
        "Submit " + CAM["CASE-002"].s5.flag + " and write the convergence summary."
      ]
    },

    /* ------------------------------------------------------------ CASE-003 */
    {
      id: "CASE-003-S1",
      campaign: "CASE-003", stage: 1,
      title: "The Broken Terminal - Stage 1: Filesystem",
      category: CAT, difficulty: "Beginner", points: 100,
      objective: "Locate the file that started the incident and report its absolute path.",
      description:
        "A lab terminal was rebuilt by hand and nobody documented it. Start at the root of the virtual image and find " +
        "the handover note that mentions the collector dropping a batch.\n\n" +
        "Submit the absolute path of that file (not its contents).",
      skills: ["Filesystem Layout", "find", "Path Reporting"],
      data: { artifact: "vfs", view: CTF.VFS_VIEWS["CASE-003-S1"], meta: "virtual lab image, fictional paths" },
      answer: { expects: ["/var/lib/nullpoint/inbox/note.txt", "FLAG{FOUND_THE_NOTE}"] },
      hints: [
        "Application state and handover artifacts live under /var/lib, not /etc and not /home.",
        "find / -name note.txt lists it directly.",
        "The absolute path is /var/lib/nullpoint/inbox/note.txt."
      ],
      flag: "FLAG{FOUND_THE_NOTE}",
      explanation:
        "Stage one is orientation. Knowing the Filesystem Hierarchy Standard - /etc for configuration, /var/lib for " +
        "application state, /var/log for logs, /home for user data, /opt for third-party software - lets you go " +
        "straight to the right branch instead of crawling the tree. The deliverable is the path, not the content: in a " +
        "real case the citation is the artifact, because anyone re-running your work needs to open the same file. Note " +
        "that the note's own content warns against editing daemon.conf without a change record, which is the thread " +
        "stage 4 pulls.",
      solutionSteps: [
        "Reason about layout: a handover note belongs in application state.",
        "ls /var/lib -> nullpoint; ls /var/lib/nullpoint -> inbox, state.",
        "Confirm with find / -name note.txt.",
        "Submit the absolute path /var/lib/nullpoint/inbox/note.txt."
      ]
    },
    {
      id: "CASE-003-S2",
      campaign: "CASE-003", stage: 2,
      title: "The Broken Terminal - Stage 2: Hidden Files",
      category: CAT, difficulty: "Medium", points: 250,
      objective: "Enumerate dot-prefixed entries in another user's home and locate a cached marker file.",
      description:
        "The ops account keeps a cache directory that does not appear in a normal listing. You are user 'ops' starting " +
        "in /home/ops in this stage.\n\n" +
        "Find the cached file that mentions this case and submit its absolute path.",
      skills: ["Hidden Files", "ls -a", "Permission Model", "Cache Directories"],
      data: { artifact: "vfs", view: CTF.VFS_VIEWS["CASE-003-S2"], meta: "dot entries hidden from plain ls" },
      answer: { expects: ["/home/ops/.cache/keys.txt", "FLAG{DOT_FILES_ARE_LISTED}"] },
      hints: [
        "Plain ls hides anything starting with a dot. Use ls -a (or ls -la to see modes at the same time).",
        "The hidden entry in /home/ops is a .cache directory, mode drwx------ owned by ops.",
        "Inside it, keys.txt is the marker file: /home/ops/.cache/keys.txt."
      ],
      flag: "FLAG{DOT_FILES_ARE_LISTED}",
      explanation:
        "Cache and state directories under a home folder are where the interesting residue lives: saved credentials, " +
        "rotation notes, tool output. They are hidden by the dot convention only, so ls -a is the whole trick - but " +
        "the modes matter for what you can actually read. .cache is drwx------ and keys.txt is -rw-------, both owned " +
        "by ops, which is why this stage runs you as the ops user rather than as analyst. In a real engagement that " +
        "difference would require authorisation and would be logged; here the lab simply switches the simulated " +
        "identity, and nothing on your machine changes.",
      solutionSteps: [
        "ls -a /home/ops -> .cache, runbook.txt.",
        "ls -la .cache shows mode drwx------ owner ops.",
        "cat .cache/keys.txt and confirm it references the case.",
        "Submit /home/ops/.cache/keys.txt."
      ]
    },
    {
      id: "CASE-003-S3",
      campaign: "CASE-003", stage: 3,
      title: "The Broken Terminal - Stage 3: grep",
      category: CAT, difficulty: "Medium", points: 300,
      objective: "Search the whole image for a configuration marker and report the exact key/value pair with its file.",
      description:
        "Somewhere on the image a rebuild key was written into a configuration file. Search the filesystem for the " +
        "pattern REBUILD_KEY.\n\n" +
        "Submit the exact 'KEY=VALUE' text you find.",
      skills: ["grep", "Recursive Search", "Configuration Review", "Citation"],
      data: { artifact: "vfs", view: CTF.VFS_VIEWS["CASE-003-S3"], meta: "pattern: REBUILD_KEY" },
      answer: { expects: ["REBUILD_KEY=7F3A9C", "FLAG{REBUILD_KEY_7F3A9C}"] },
      hints: [
        "grep -rn REBUILD_KEY / searches everything readable and prints file, line number and match.",
        "The match is in /etc/nullpoint/daemon.conf, which is group restricted - this stage grants the read.",
        "The exact text is REBUILD_KEY=7F3A9C."
      ],
      flag: "FLAG{REBUILD_KEY_7F3A9C}",
      explanation:
        "Recursive grep with line numbers gives you a citable result in one command: file, line and matched text. The " +
        "interesting part is where the match lives - inside a configuration file that is mode 0640, which explains why " +
        "the value is not visible to a normal read and why stage 4 asks about permissions. Two reporting habits " +
        "matter: quote the line exactly rather than paraphrasing it, and record the file's mode and owner alongside " +
        "the finding so a reader knows what access level was needed to see it.",
      solutionSteps: [
        "grep -rn REBUILD_KEY / -> /etc/nullpoint/daemon.conf.",
        "Read the matched line exactly: REBUILD_KEY=7F3A9C.",
        "Record the file's mode (-rw-r-----) and owner (root:nullpoint) with the finding.",
        "Submit the exact key/value text."
      ]
    },
    {
      id: "CASE-003-S4",
      campaign: "CASE-003", stage: 4,
      title: "The Broken Terminal - Stage 4: Permissions",
      category: CAT, difficulty: "Hard", points: 350,
      objective: "Convert a mode to octal, decide who can read the file, and determine what access was required to obtain stage 3's value.",
      description:
        "Stage 3 returned a value from /etc/nullpoint/daemon.conf, whose mode is " +
        CAM["CASE-003"].s4.perm + " with owner root and group nullpoint.\n\n" +
        "Answer three things in one string, comma separated:\n" +
        "  1. the octal mode\n" +
        "  2. the account configured to run the collector daemon (it is named inside that file)\n" +
        "  3. YES or NO - could the plain 'analyst' account read it without escalation?",
      skills: ["Permission Conversion", "Ownership Model", "Least Privilege", "Escalation Reasoning"],
      data: { artifact: "vfs", view: CTF.VFS_VIEWS["CASE-003-S4"], meta: "focus file: /etc/nullpoint/daemon.conf" },
      answer: { expects: ["0640,svc,NO", "0640, svc, NO", "0640,svc,no", "FLAG{0640_SVC_NO}"] },
      hints: [
        "Convert the triads: rw- = 6, r-- = 4, --- = 0, so the octal mode is 0640.",
        "Read daemon.conf: daemon_user=svc. The manifest under /opt/nullpoint/.svc confirms the same account owns the component.",
        "analyst is neither root, nor the owner, nor in the nullpoint group, so the answer is NO - escalation was required."
      ],
      flag: "FLAG{0640_SVC_NO}",
      explanation:
        "Permission reasoning closes the loop on the previous stage: you obtained a value from a file that a normal " +
        "analyst account cannot read, so the access you used must be stated. Mode " + CAM["CASE-003"].s4.perm +
        " converts to 0640 - owner read/write, group read, nobody else - and the daemon runs as 'svc' per both the " +
        "configuration and the service manifest, so 'svc' must hold group membership for the service to function. " +
        "That is a legitimate least-privilege design. The finding to write is therefore not 'a key is in a config " +
        "file' but 'a rebuild key is stored in a root-owned 0640 file readable by the service group', which is " +
        "accurate, actionable and does not overstate the exposure.",
      solutionSteps: [
        "ls -l /etc/nullpoint/daemon.conf -> " + CAM["CASE-003"].s4.perm + " root nullpoint.",
        "Convert to octal: 6, 4, 0 -> 0640.",
        "Read daemon_user=svc from the file; corroborate with /opt/nullpoint/.svc/manifest.txt.",
        "Check /etc/passwd and the group model for analyst -> not a member -> NO.",
        "Submit 0640,svc,NO."
      ]
    },
    {
      id: "CASE-003-S5",
      campaign: "CASE-003", stage: 5,
      title: "The Broken Terminal - Stage 5: Final Investigation",
      category: CAT, difficulty: "Hard", points: 500,
      objective: "Close a host investigation by combining four artifacts into one attributed, permission-aware finding.",
      description:
        "Final stage of the terminal case. You already hold three values from earlier stages: the rebuild key, the " +
        "file it lives in, and the octal mode of that file. Two more artifacts close the attribution:\n\n" +
        "  - /var/log/auth.log        (sudo and session events, group restricted)\n" +
        "  - /home/analyst/.bash_history (what the account typed)\n" +
        "  - /home/ops/.cache/keys.txt (the stage 2 marker: CASE-003 STAGE 2 MARKER)\n" +
        "  - /opt/nullpoint/.svc/manifest.txt (which account owns the component)\n\n" +
        "Answer three things in one string, separated by single underscores, all uppercase:\n" +
        "  1. the account the daemon runs as\n" +
        "  2. the base name of the file that was read with sudo, with the dot replaced by an underscore\n" +
        "  3. the rebuild key value\n\n" +
        "So the shape is FLAG{<ACCOUNT>_<FILE_BASENAME>_<KEY>}.",
      skills: ["Multi Artifact Correlation", "Attribution", "Escalation Logging", "Report Writing"],
      data: { artifact: "vfs", view: CTF.VFS_VIEWS["CASE-003-S5"], meta: "sudo simulated inside the lab image only" },
      answer: { expects: "FLAG{SVC_DAEMON_CONF_7F3A9C}" },
      hints: [
        "auth.log contains a sudo line: COMMAND=/usr/bin/cat /etc/nullpoint/daemon.conf - that is the file, and its base name is daemon.conf.",
        "daemon.conf names daemon_user=svc and holds REBUILD_KEY=7F3A9C; the manifest under /opt/nullpoint/.svc confirms svc owns the component.",
        "Assemble FLAG{SVC_DAEMON_CONF_7F3A9C} - account, file basename with the dot as an underscore, then the key."
      ],
      flag: "FLAG{SVC_DAEMON_CONF_7F3A9C}",
      explanation:
        "The campaign ends where real host investigations end: attribution plus an access narrative. auth.log gives the " +
        "escalated command with a UTC timestamp, .bash_history independently shows the same command typed " +
        "interactively, daemon.conf supplies both the service account and the rebuild key, and the service manifest " +
        "corroborates that svc owns the component. Those are four artifacts and three independent agreements, which is " +
        "what lets you assert rather than suggest. The report must also state that reading daemon.conf required " +
        "escalation - mode 0640 means a plain analyst account cannot read it - because 'who accessed what with which " +
        "rights' is itself part of the evidence. The lab's sudo is simulated against an in-memory image; nothing on " +
        "your machine is modified.",
      solutionSteps: [
        "sudo cat /var/log/auth.log -> locate the sudo COMMAND line naming /etc/nullpoint/daemon.conf.",
        "cat /home/analyst/.bash_history -> the same command appears, typed by hand (corroboration).",
        "sudo cat /etc/nullpoint/daemon.conf -> daemon_user=svc and REBUILD_KEY=7F3A9C.",
        "cat /opt/nullpoint/.svc/manifest.txt -> confirms svc owns the collector component.",
        "Assemble FLAG{SVC_DAEMON_CONF_7F3A9C} and list which artifacts required escalation."
      ]
    },

      /* ------------------------------------------------------------ CASE-004 */
    {
      id: "CASE-004-S1",
      campaign: "CASE-004", stage: 1,
      title: "Network Ghost - Stage 1: IP Analysis",
      category: CAT, difficulty: "Easy", points: 150,
      objective: "Compute the network, mask and broadcast for a host found on the lab segment.",
      description:
        "A host was observed at " + CAM["CASE-004"].s1.ip + "/" + CAM["CASE-004"].s1.cidr + " on the lab segment " +
        "(fictional, RFC1918 space).\n\n" +
        "Report four values comma separated: network address, subnet mask, broadcast address, usable host count.",
      skills: ["CIDR", "Subnetting", "Bitwise Masking"],
      data: {
        artifact: "table",
        headers: ["HOST", "PREFIX", "NETWORK", "MASK", "BROADCAST", "USABLE"],
        rows: [[CAM["CASE-004"].s1.ip, "/" + CAM["CASE-004"].s1.cidr, "", "", "", ""]],
        meta: "documentation/lab address space only"
      },
      answer: {
        expects: [
          CAM["CASE-004"].s1.network + "," + CAM["CASE-004"].s1.mask + "," + CAM["CASE-004"].s1.broadcast + "," + CAM["CASE-004"].s1.usable,
          "FLAG{GHOST_SEGMENT_MAPPED}"
        ]
      },
      hints: [
        "/" + CAM["CASE-004"].s1.cidr + " means the mask has " + CAM["CASE-004"].s1.cidr + " one-bits: 255.255.252.0.",
        "AND the address with the mask: the third octet 44 AND 252 = 44, so the network is " + CAM["CASE-004"].s1.network + ".",
        "Broadcast sets all host bits: " + CAM["CASE-004"].s1.broadcast + ", and usable hosts = 1024 - 2 = " + CAM["CASE-004"].s1.usable + "."
      ],
      flag: "FLAG{GHOST_SEGMENT_MAPPED}",
      explanation:
        "A /22 leaves ten host bits, so the subnet spans 1024 addresses with 1022 usable. The mask 255.255.252.0 makes " +
        "the third octet the interesting one: 44 AND 252 = 44, so the network is " + CAM["CASE-004"].s1.network + " " +
        "and the broadcast is " + CAM["CASE-004"].s1.broadcast + ". Establishing the segment first is not busywork - " +
        "every later stage of this campaign depends on knowing which addresses are inside the lab segment and which " +
        "are outside it, and that is a pure subnet question.",
      solutionSteps: [
        "Convert /" + CAM["CASE-004"].s1.cidr + " to a mask: 255.255.252.0.",
        "AND the host address with the mask -> network " + CAM["CASE-004"].s1.network + ".",
        "OR with the inverted mask -> broadcast " + CAM["CASE-004"].s1.broadcast + ".",
        "Usable hosts = 2^10 - 2 = " + CAM["CASE-004"].s1.usable + "."
      ]
    },
    {
      id: "CASE-004-S2",
      campaign: "CASE-004", stage: 2,
      title: "Network Ghost - Stage 2: DNS",
      category: CAT, difficulty: "Medium", points: 250,
      objective: "Decode a TXT answer that carries an encoded hostname, and treat the record type as an indicator.",
      description:
        "The lab resolver returned this answer for a name nobody had registered internally:\n\n" +
        "  ghost-04.lab.nullpoint.invalid.  60  IN  TXT  \"" + CAM["CASE-004"].s2.txt + "\"\n\n" +
        "Decode the TXT value and submit the hostname it names.",
      skills: ["DNS Records", "Base64", "TTL Analysis", "Indicator Extraction"],
      data: {
        artifact: "table",
        headers: ["NAME", "TTL", "TYPE", "VALUE"],
        rows: [["ghost-04.lab.nullpoint.invalid", "60", "TXT", CAM["CASE-004"].s2.txt]],
        meta: "fictional zone under the reserved .invalid TLD"
      },
      answer: { expects: [CAM["CASE-004"].s2.answer, "FLAG{TXT_CARRIED_THE_NAME}"] },
      hints: [
        "TXT is the only common record type intended to hold arbitrary text, so treat its value as data.",
        "The value is base64 - decode it.",
        "It decodes to " + CAM["CASE-004"].s2.answer + ". The 60 second TTL is itself an indicator: short TTLs suit machine-generated records."
      ],
      flag: "FLAG{TXT_CARRIED_THE_NAME}",
      explanation:
        "Two signals in one record. The content signal is the base64 value, which decodes to a host label - data " +
        "carried inside a DNS answer rather than describing the zone. The structural signal is the TTL of 60 seconds: " +
        "legitimate infrastructure records are usually cached for hours, while short TTLs suit values that change per " +
        "session, which is what a command channel wants. Neither signal alone is proof, and that is the correct way to " +
        "write it up: two weak indicators pointing the same way justify escalation to full resolver logging, not an " +
        "accusation.",
      solutionSteps: [
        "Note the record type TXT and the short TTL of 60.",
        "Base64 decode the value -> " + CAM["CASE-004"].s2.answer + ".",
        "Record both indicators: data-carrying TXT plus machine-like TTL.",
        "Carry the hostname into stage 3."
      ]
    },
    {
      id: "CASE-004-S3",
      campaign: "CASE-004", stage: 3,
      title: "Network Ghost - Stage 3: Ports",
      category: CAT, difficulty: "Medium", points: 300,
      objective: "Identify the service implied by an observed port and reason about why its presence on a lab host is a finding.",
      description:
        "After the DNS answer in stage 2, the lab host accepted an inbound connection on destination port " +
        CAM["CASE-004"].s3.answer + " from outside the segment.\n\n" +
        "Answer two things comma separated: the conventional service name for that port, and the fictional external " +
        "source address from the stage-1 case data (documentation range).",
      skills: ["Port To Service Mapping", "Ingress Analysis", "Case Correlation"],
      data: {
        artifact: "table",
        headers: ["REFERENCE PORT", "SERVICE", "TYPICAL DIRECTION"],
        rows: [["22", "SSH", "inbound admin"], ["53", "DNS", "outbound query"], ["443", "HTTPS", "outbound"],
          ["3389", CAM["CASE-004"].s3.service, "inbound interactive"], ["8080", "HTTP-ALT", "inbound"]],
        meta: "observed destination port: " + CAM["CASE-004"].s3.answer
      },
      answer: { expects: ["RDP,203.0.113.90", "RDP, 203.0.113.90", "FLAG{RDP_FROM_OUTSIDE}"] },
      hints: [
        "Look the observed port up in the reference table rather than recalling it from memory: " + CAM["CASE-004"].s3.answer + " maps to " + CAM["CASE-004"].s3.service + ".",
        "The case data for this campaign names one external address in the documentation range 203.0.113.0/24.",
        "Answer: RDP,203.0.113.90 - an interactive remote desktop service reachable from outside the segment."
      ],
      flag: "FLAG{RDP_FROM_OUTSIDE}",
      explanation:
        "Port " + CAM["CASE-004"].s3.answer + " is conventionally " + CAM["CASE-004"].s3.service + ", an interactive " +
        "remote desktop service. The finding is not the port number; it is the combination of an interactive service " +
        "with an inbound path from outside the segment. Ports are conventions and prove nothing by themselves - any " +
        "service can bind any port - so the correct next step is to confirm what actually answered: banner or " +
        "protocol behaviour, session duration, and whether the source address belongs to any authorised administrative " +
        "range. The source here comes from the documentation range 203.0.113.0/24, so it is fictional, but the " +
        "reasoning pattern is exactly what you would apply to a live case.",
      solutionSteps: [
        "Look up port " + CAM["CASE-004"].s3.answer + " in the reference table -> " + CAM["CASE-004"].s3.service + ".",
        "Classify the direction: inbound interactive session.",
        "Retrieve the external source from the case data: 203.0.113.90.",
        "Record the finding as service + direction + source, and note that port labels are claims, not proof."
      ]
    },
    {
      id: "CASE-004-S4",
      campaign: "CASE-004", stage: 4,
      title: "Network Ghost - Stage 4: Packet Simulation",
      category: CAT, difficulty: "Hard", points: 350,
      objective: "Characterise a simulated connection pattern from packet metadata alone and label the activity correctly.",
      description:
        "Simulated capture (fictional hosts, no live traffic):\n\n" +
        "  #1  203.0.113.90:50112 -> 192.168.44.9:3389  TCP [SYN]        len=0\n" +
        "  #2  192.168.44.9:3389 -> 203.0.113.90:50112  TCP [SYN,ACK]    len=0\n" +
        "  #3  203.0.113.90:50113 -> 192.168.44.9:3389  TCP [SYN]        len=0   (new source port)\n" +
        "  #4  192.168.44.9:3389 -> 203.0.113.90:50113  TCP [RST,ACK]    len=0\n" +
        "  #5  203.0.113.90:50114 -> 192.168.44.9:3389  TCP [SYN]        len=0   (new source port)\n" +
        "  #6  192.168.44.9:3389 -> 203.0.113.90:50114  TCP [SYN,ACK]    len=0\n" +
        "  #7  203.0.113.90:50114 -> 192.168.44.9:3389  TCP [ACK]        len=0\n" +
        "  #8  203.0.113.90:50114 -> 192.168.44.9:3389  TCP [PSH,ACK]    len=412\n\n" +
        "Describe the activity in the form '<SERVICE> <PATTERN> from <SOURCE IP>' - for example 'SSH scan from " +
        "10.0.0.1'.",
      skills: ["Packet Pattern Recognition", "TCP Flags", "Authentication Failure Analysis", "Activity Labelling"],
      data: {
        artifact: "packet-log",
        packets: [
          { no: 1, src: "203.0.113.90", sport: 50112, dst: "192.168.44.9", dport: 3389, proto: "TCP", flags: "SYN", len: 0 },
          { no: 2, src: "192.168.44.9", sport: 3389, dst: "203.0.113.90", dport: 50112, proto: "TCP", flags: "SYN,ACK", len: 0 },
          { no: 3, src: "203.0.113.90", sport: 50113, dst: "192.168.44.9", dport: 3389, proto: "TCP", flags: "SYN", len: 0 },
          { no: 4, src: "192.168.44.9", sport: 3389, dst: "203.0.113.90", dport: 50113, proto: "TCP", flags: "RST,ACK", len: 0 },
          { no: 5, src: "203.0.113.90", sport: 50114, dst: "192.168.44.9", dport: 3389, proto: "TCP", flags: "SYN", len: 0 },
          { no: 6, src: "192.168.44.9", sport: 3389, dst: "203.0.113.90", dport: 50114, proto: "TCP", flags: "SYN,ACK", len: 0 },
          { no: 7, src: "203.0.113.90", sport: 50114, dst: "192.168.44.9", dport: 3389, proto: "TCP", flags: "ACK", len: 0 },
          { no: 8, src: "203.0.113.90", sport: 50114, dst: "192.168.44.9", dport: 3389, proto: "TCP", flags: "PSH,ACK", len: 412 }
        ],
        meta: "simulated capture; repeated source ports indicate repeated attempts"
      },
      answer: {
        expects: [
          CAM["CASE-004"].s4.answer + " from 203.0.113.90",
          CAM["CASE-004"].s4.answer,
          "RDP brute force from 203.0.113.90",
          "FLAG{REPEATED_ATTEMPTS_THEN_SUCCESS}"
        ]
      },
      hints: [
        "Count the attempts: three SYNs from the same source with three different source ports means three separate connection attempts.",
        "Attempt 2 was reset and attempt 1 never completed, but attempt 3 finished the handshake and then pushed 412 bytes - a successful session with credentials.",
        "That pattern on port 3389 is RDP brute force, so the label is 'RDP brute force from 203.0.113.90'."
      ],
      flag: "FLAG{REPEATED_ATTEMPTS_THEN_SUCCESS}",
      explanation:
        "The signature is in the source ports. Three SYNs from one address with incrementing ephemeral ports means " +
        "three distinct attempts rather than retransmissions of one (retransmits reuse the same port). One attempt is " +
        "reset, one completes the handshake and immediately pushes 412 bytes - a credential exchange - which is the " +
        "transition from probing to a successful interactive session. Reading TCP flags as a narrative is the skill: " +
        "SYN is intent, SYN,ACK is willingness, RST is refusal, and PSH with a payload after ACK is the application " +
        "talking. In a real case this is the moment to preserve the session and check what the account did next, " +
        "because everything before it was noise and everything after it is impact.",
      solutionSteps: [
        "Group packets by source port: 50112, 50113, 50114 -> three attempts.",
        "Attempt 1: SYN then SYN,ACK, never completed. Attempt 2: SYN then RST,ACK -> refused.",
        "Attempt 3: SYN, SYN,ACK, ACK, then PSH,ACK with 412 bytes -> session established with data.",
        "Label the activity: " + CAM["CASE-004"].s4.answer + " from 203.0.113.90.",
        "Escalate: preserve the session and pivot to host logs for that account."
      ]
    },
    {
      id: "CASE-004-S5",
      campaign: "CASE-004", stage: 5,
      title: "Network Ghost - Stage 5: Final Case",
      category: CAT, difficulty: "Hard", points: 450,
      objective: "Close a network case by assembling payload chunks recovered from the channel identified in earlier stages.",
      description:
        "The successful session from stage 4 carried two encoded chunks out over the same DNS channel you found in " +
        "stage 2:\n\n" +
        "  chunk 1 (TXT): " + CAM["CASE-004"].s5.chunks[0] + "\n" +
        "  chunk 2 (TXT): " + CAM["CASE-004"].s5.chunks[1] + "\n\n" +
        "Decode both, concatenate them in order, and submit the campaign flag. In the writeup, list the four stages of " +
        "evidence that led here.",
      skills: ["Base64", "Chunk Reassembly", "Case Closure", "Evidence Narrative"],
      data: {
        artifact: "table",
        headers: ["CHUNK", "RECORD", "VALUE"],
        rows: [["1", "TXT", CAM["CASE-004"].s5.chunks[0]], ["2", "TXT", CAM["CASE-004"].s5.chunks[1]]],
        meta: "two chunks, strict order, fictional channel"
      },
      answer: { expects: CAM["CASE-004"].s5.flag },
      hints: [
        "Both chunks are base64. Decode them separately - decoding the concatenation of the two base64 strings will not work.",
        "Chunk 1 decodes to the opening of the flag and chunk 2 to the remainder, so order matters.",
        "Concatenated: " + CAM["CASE-004"].s5.flag
      ],
      flag: CAM["CASE-004"].s5.flag,
      explanation:
        "Chunked payloads must be decoded separately before concatenation, because base64 operates on byte groups and " +
        "joining two encoded strings produces a different (invalid) encoding. The case narrative writes itself once " +
        "the four stages are lined up: a /22 segment was mapped, a machine-generated TXT record revealed a host name, " +
        "an interactive service was reachable from outside the segment, and a packet pattern showed repeated attempts " +
        "ending in a session that then exfiltrated two encoded chunks over DNS. Each stage alone was a weak indicator; " +
        "the chain is the finding. That is the shape of most real network cases, and it is why stage order matters more " +
        "than stage difficulty.",
      solutionSteps: [
        "Base64 decode chunk 1 -> '" + CAM["CASE-004"].s5.decoded[0] + "'.",
        "Base64 decode chunk 2 -> '" + CAM["CASE-004"].s5.decoded[1] + "'.",
        "Concatenate in order -> " + CAM["CASE-004"].s5.flag + ".",
        "Write the four-stage evidence chain: subnet -> DNS TXT -> external interactive port -> attempt pattern and exfil."
      ]
    },

    /* ------------------------------------------------------------ CASE-005 */
    {
      id: "CASE-005-S1",
      campaign: "CASE-005", stage: 1,
      title: "The Unknown Cipher - Stage 1: Pattern Recognition",
      category: CAT, difficulty: "Medium", points: 300,
      objective: "Classify an unknown cipher from structural evidence: word shape, repeated groups, punctuation retention.",
      description:
        "An intercepted sample, with no key and no stated method:\n\n" + CAM["CASE-005"].s1.sample + "\n\n" +
        "Structural observations you can make yourself: spaces are preserved, word lengths match a famous pangram, the " +
        "same three-letter group appears twice, and the letter frequency distribution looks like English but shifted " +
        "onto different symbols.\n\n" +
        "Recover the plaintext of this sample.",
      skills: ["Cipher Classification", "Pattern Recognition", "Pangram Cribs", "Structural Analysis"],
      data: {
        artifact: "cipher",
        text: CAM["CASE-005"].s1.sample,
        meta: "spaces preserved, monoalphabetic, one-to-one letter mapping"
      },
      answer: { expects: CAM["CASE-005"].s1.answer },
      hints: [
        "Spaces are preserved and the word lengths are 3-5-5-3-5-4-3-4-3 - that is the classic pangram 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG'.",
        "Because the same three letter group appears in positions 1 and 7, the mapping is consistent - so it is monoalphabetic, not polyalphabetic.",
        "Apply the recovered mapping to the whole sample; the plaintext is the pangram above."
      ],
      flag: "FLAG{PATTERN_BEFORE_KEYSPACE}",
      explanation:
        "Classification comes before attack. Three structural facts pin this down: spaces are preserved (so word " +
        "boundaries leak), a repeated group appears at a fixed interval (so the mapping is consistent, ruling out a " +
        "polyalphabetic system), and the letter distribution resembles English under a different alphabet (so it is a " +
        "substitution). The pangram shape is a gift - 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG' has a unique word " +
        "length pattern - and using it as a crib yields the full alphabet mapping in one step. If no crib existed you " +
        "would move to frequency analysis, which is stage 3. Recognising which tool the structure calls for is the " +
        "skill; brute forcing all 26! substitutions is not.",
      solutionSteps: [
        "Note preserved spacing and word length pattern 3-5-5-3-5-4-3-4-3.",
        "Test the pangram crib; it fits exactly.",
        "Confirm monoalphabetic behaviour via the repeated three letter group.",
        "Derive the full letter mapping and record it for later stages."
      ]
    },
    {
      id: "CASE-005-S2",
      campaign: "CASE-005", stage: 2,
      title: "The Unknown Cipher - Stage 2: Substitution",
      category: CAT, difficulty: "Hard", points: 400,
      objective: "Apply a recovered substitution mapping to a new ciphertext and produce the campaign flag.",
      description:
        "A second message arrived using the same mapping you recovered in stage 1:\n\n" +
        CAM["CASE-005"].s2.cipher + "\n\n" +
        "The mapping used by the sender is (plain -> cipher):\n  " +
        SUB.alphabet.split("").map(function (c) { return c + "->" + subMap(false)[c]; }).join(" ") + "\n\n" +
        "Decode the message.",
      skills: ["Substitution Cipher", "Mapping Application", "Inverse Mapping", "Reuse Detection"],
      data: {
        artifact: "cipher",
        text: CAM["CASE-005"].s2.cipher,
        substitution: { alphabet: SUB.alphabet, key: SUB.key },
        meta: "same mapping as stage 1 - key reuse is the finding"
      },
      answer: { expects: CAM["CASE-005"].s2.answer },
      hints: [
        "Invert the published mapping: for each cipher letter, find which plain letter produced it.",
        "The inverted table starts Q->A, W->B, E->C, R->D, T->E, Y->F ...",
        "Applying the inverse to the message gives " + CAM["CASE-005"].s2.answer
      ],
      flag: CAM["CASE-005"].s2.answer,
      explanation:
        "The mapping is reused, which is why stage 1's work pays off immediately: build the inverse table once and " +
        "every later message costs seconds. Key reuse is itself the finding worth reporting - a monoalphabetic system " +
        "is broken by one crib, and reusing it across messages means every subsequent message is readable to anyone " +
        "who saw the first. Note also what the substitution preserves: punctuation, case and word boundaries all " +
        "survive, which is exactly the structure that made stage 1 solvable. Designers who keep structure while " +
        "changing letters are trading almost nothing for the appearance of secrecy.",
      solutionSteps: [
        "Invert the given plain->cipher table into cipher->plain.",
        "Apply it to every letter of the second message; leave punctuation untouched.",
        "Read " + CAM["CASE-005"].s2.answer + ".",
        "Report key reuse across messages as the systemic weakness."
      ]
    },
    {
      id: "CASE-005-S3",
      campaign: "CASE-005", stage: 3,
      title: "The Unknown Cipher - Stage 3: Frequency Analysis",
      category: CAT, difficulty: "Hard", points: 350,
      objective: "Recover a plaintext without a crib, using letter frequency and short-word structure.",
      description:
        "A third message, and this time there is no pangram to lean on:\n\n" + CAM["CASE-005"].s3.cipher + "\n\n" +
        "The same mapping applies. Work it out from frequency: count the letters, compare with English frequencies " +
        "(E is most common, then T, A, O, I, N), and use the one-letter and three-letter words as anchors.\n\n" +
        "Submit the plaintext.",
      skills: ["Frequency Analysis", "Statistical Cryptanalysis", "Short Word Cribs", "Iterative Refinement"],
      data: {
        artifact: "cipher",
        text: CAM["CASE-005"].s3.cipher,
        frequencyHint: "English letter order by frequency: E T A O I N S H R D L U",
        meta: "no crib supplied - derive the mapping from statistics"
      },
      answer: { expects: CAM["CASE-005"].s3.answer },
      hints: [
        "Count letters in the ciphertext. The most frequent symbol should map to E; the sample contains 'THE' twice, so the most common three-letter group is a strong anchor.",
        "One-letter words in English are almost always A or I - use them to pin two mappings.",
        "The plaintext is " + CAM["CASE-005"].s3.answer
      ],
      flag: "FLAG{FREQUENCY_BEATS_BRUTE_FORCE}",
      explanation:
        "Frequency analysis works because monoalphabetic substitution preserves letter statistics - it changes the " +
        "symbols, not their distribution. The method is iterative rather than deductive: count, hypothesise the top " +
        "symbol is E, anchor short words (a single letter word is A or I; the commonest three letter word is THE), " +
        "then let partially decoded words suggest the next letters. Within a few rounds the text collapses. The " +
        "comparison with stage 1 is the lesson: with a crib the mapping fell out in one step, without one it took " +
        "statistics and iteration - but both succeeded because the system leaks structure. A polyalphabetic cipher " +
        "would flatten the distribution and resist this approach entirely.",
      solutionSteps: [
        "Build a letter frequency table for the ciphertext.",
        "Map the most frequent symbol to E and the commonest trigram to THE.",
        "Use single letter words to pin A or I.",
        "Iterate: partially decoded words reveal further letters.",
        "Recover " + CAM["CASE-005"].s3.answer + " and cross-check against the stage 2 mapping."
      ]
    },
    {
      id: "CASE-005-S4",
      campaign: "CASE-005", stage: 4,
      title: "The Unknown Cipher - Stage 4: Multi-Layer Encoding",
      category: CAT, difficulty: "Hard", points: 350,
      objective: "Combine a substitution layer with two encoding layers and invert all three in the right order.",
      description:
        "The fourth transmission wrapped the message in three layers: substitution first, then base64, then hex.\n\n" +
        CAM["CASE-005"].s4.final + "\n\n" +
        "Recover the flag.",
      skills: ["Hexadecimal", "Base64", "Substitution Cipher", "Layer Inversion"],
      data: {
        artifact: "hex",
        text: CAM["CASE-005"].s4.final,
        substitution: { alphabet: SUB.alphabet, key: SUB.key },
        meta: "hex(base64(substitution(flag)))"
      },
      answer: { expects: CAM["CASE-005"].s4.answer },
      hints: [
        "Undo the layers in reverse: hex decode, then base64 decode, then apply the inverse substitution.",
        "After hex and base64 you will have substitution text that still contains braces and underscores in place.",
        "Applying the inverse mapping gives " + CAM["CASE-005"].s4.answer
      ],
      flag: CAM["CASE-005"].s4.answer,
      explanation:
        "Three layers, three different families: a representation (hex), an encoding (base64) and a cipher " +
        "(substitution). The inversion order is forced - hex, then base64, then the cipher - and the confirmation " +
        "signal at each step is different: hex decode should yield a base64 alphabet, base64 decode should yield text " +
        "with preserved punctuation, and the substitution inverse should yield readable words. Adding layers to a weak " +
        "cipher does not strengthen it; the substitution remains the only cryptographic step and it was already broken " +
        "in stage 1, so the two encodings add effort without adding security. That assessment - which layers are " +
        "cosmetic and which are load-bearing - is the analytic product of this stage.",
      solutionSteps: [
        "Hex decode -> a base64 string.",
        "Base64 decode -> substituted text with punctuation intact.",
        "Apply the inverse substitution from stages 1-2.",
        "Read " + CAM["CASE-005"].s4.answer + ".",
        "Assess: only the substitution layer was cryptographic; the encodings were cosmetic."
      ]
    },
    {
      id: "CASE-005-S5",
      campaign: "CASE-005", stage: 5,
      title: "The Unknown Cipher - Stage 5: Final Cipher",
      category: CAT, difficulty: "Expert", points: 600,
      objective: "Invert a four stage chain that mixes a cipher, an encoding, a substitution and a rotation, then close the campaign.",
      description:
        "The last transmission used four operations, listed in the order they were applied: substitution, base64, " +
        "atbash, then a Caesar shift of +9.\n\n" + CAM["CASE-005"].s5.final + "\n\n" +
        "Recover the campaign flag, and in the writeup explain why the shift had to be undone before the atbash even " +
        "though atbash was applied after base64.",
      skills: ["Caesar Cipher", "Atbash", "Base64", "Substitution Cipher", "Strict Order Inversion"],
      data: {
        artifact: "cipher",
        text: CAM["CASE-005"].s5.final,
        substitution: { alphabet: SUB.alphabet, key: SUB.key },
        meta: "caesar9(atbash(base64(substitution(flag))))"
      },
      answer: { expects: CAM["CASE-005"].s5.answer },
      hints: [
        "Invert strictly in reverse order: caesar -9, then atbash, then base64 decode, then the inverse substitution.",
        "The shift must come off first because it was applied last; atbash on shifted text yields nothing meaningful.",
        "The result is " + CAM["CASE-005"].s5.answer + " - the campaign flag."
      ],
      flag: CAM["CASE-005"].s5.answer,
      explanation:
        "Order is the entire content of this stage. The applied chain was substitution, base64, atbash, caesar +9, so " +
        "the inverse is caesar -9, atbash, base64 decode, inverse substitution. Undoing atbash before the shift is the " +
        "classic mistake: atbash was applied to base64 output, so applying it to shifted text operates on the wrong " +
        "alphabet and produces plausible nonsense. Across the five stages of this campaign you classified an unknown " +
        "system from structure, broke it with a crib, broke it again with statistics alone, then handled two layered " +
        "combinations - which is the full arc from 'unknown cipher' to 'documented, reproducible plaintext'.",
      solutionSteps: [
        "Apply caesar -9 to the transmission.",
        "Apply atbash -> a base64 string.",
        "Base64 decode -> substituted text.",
        "Apply the inverse substitution -> " + CAM["CASE-005"].s5.answer + ".",
        "Document why the shift had to be removed first: it was the last operation applied."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
