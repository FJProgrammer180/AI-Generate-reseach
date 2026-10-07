/* ============================================================================
 * data/challenges-forensics.js - DIGITAL FORENSICS (7 challenges)
 * All artifacts are fictional lab evidence: invented case numbers, invented
 * hosts, no real personal data, no real services.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Digital Forensics";

  CTF.register([
    {
      id: "FORENSIC-001",
      title: "Strange File",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Identify a file's real format from its magic bytes when the extension and header disagree.",
      description:
        "Intake logged this evidence item as 'photo_0417.jpg' (" + A["FORENSIC-001"].size + " bytes). The first bytes " +
        "of the file are below. Something is wrong with it.\n\n" + A["FORENSIC-001"].hex + "\n\n" +
        "What format is the *real* payload? Answer with the format name.",
      skills: ["File Signatures", "Magic Bytes", "Hex Reading", "Evidence Intake"],
      data: {
        artifact: "hexdump",
        text: A["FORENSIC-001"].hex,
        meta: "extension says JPEG, first signature says JPEG, second signature disagrees"
      },
      answer: { expects: ["PNG", "FLAG{MAGIC_BYTES_DO_NOT_LIE}"] },
      hints: [
        "Read the ASCII column on the right of the dump - it already spells out chunk names for you.",
        "At offset 0x0c you can see 89 50 4e 47 0d 0a 1a 0a, which is the PNG signature.",
        "The JPEG header was prepended to a complete PNG. The real payload is PNG."
      ],
      flag: "FLAG{MAGIC_BYTES_DO_NOT_LIE}",
      explanation:
        "Extensions are metadata that anyone can edit; magic bytes are part of the content. This file wears a JPEG " +
        "header (FF D8 FF E0 ... 'JFIF') but at offset 0x0c the PNG signature 89 50 4E 47 0D 0A 1A 0A appears, " +
        "followed by an IHDR chunk. That is a prepended header, a classic trick to defeat naive type checks and " +
        "upload filters. Intake rule: always record both the declared type and the detected type, and treat a " +
        "mismatch as an indicator in its own right rather than as a nuisance.",
      solutionSteps: [
        "Read the first bytes: FF D8 FF E0 -> JPEG/JFIF header.",
        "Scan the dump for other signatures: 89 50 4E 47 at 0x0c -> PNG.",
        "Confirm with the chunk name 'IHDR' that follows the PNG signature.",
        "Conclude the payload is a PNG with a JPEG header glued on the front."
      ]
    },
    {
      id: "FORENSIC-002",
      title: "Suspicious Strings",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Use a strings-style pass over a binary artifact to locate an encoded secret, then decode it.",
      description:
        "A " + A["FORENSIC-002"].strings.length + "-run strings pass over a 512 byte lab memory capture produced the " +
        "printable runs below. One of them is not what it appears to be.\n\n" +
        A["FORENSIC-002"].strings.map(function (s, i) { return "  [" + i + "] " + s; }).join("\n"),
      skills: ["strings", "Memory Artifacts", "Base64", "Triage"],
      data: {
        artifact: "hexdump",
        text: A["FORENSIC-002"].hexdump,
        strings: A["FORENSIC-002"].strings,
        meta: "512 byte capture, seeded noise with a planted region at offset 0xa0"
      },
      answer: { expects: A["FORENSIC-002"].flag },
      hints: [
        "Ignore runs that look like paths or environment values; look for a run whose alphabet is exactly base64.",
        "Run [3] is 28 characters of A-Za-z0-9+/ with no spaces - that is a base64 candidate.",
        "Base64 decode that run to get the flag."
      ],
      flag: A["FORENSIC-002"].flag,
      explanation:
        "A strings pass is the cheapest triage step in binary forensics: it converts a wall of bytes into a short list " +
        "of human-readable candidates. The skill is in filtering - paths, tokens and version strings are noise, while a " +
        "run with a clean base64 alphabet and a plausible length is signal. Note also what else the dump gave you: a " +
        "session token name and a log path. Those are leads for the next investigative step even though they are not " +
        "the answer here. Everything in this capture is fictional lab data.",
      solutionSteps: [
        "Run a printable-ASCII pass (minimum run length 4) over the 512 bytes.",
        "Discard obvious paths and configuration strings.",
        "Pick the run with a pure base64 alphabet.",
        "Decode it to recover the flag."
      ]
    },
    {
      id: "FORENSIC-003",
      title: "Metadata Trail",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Read structured metadata and locate a value that was hidden in a non-obvious field.",
      description:
        "Metadata extracted from a lab bench photo (all fields fictional):\n\n" +
        JSON.stringify(A["FORENSIC-003"].meta, null, 2) + "\n\n" +
        "One field carries an encoded note. Decode it and submit the flag.",
      skills: ["EXIF", "XMP", "Metadata Analysis", "Base64"],
      data: {
        artifact: "metadata",
        meta2: A["FORENSIC-003"].meta,
        meta: "fictional EXIF/XMP record from a lab camera, no GPS of any real location"
      },
      answer: { expects: A["FORENSIC-003"].flag },
      hints: [
        "Scan every field value, not just the obvious ones. Metadata has dozens of rarely-read fields.",
        "The XMP 'Note' field contains a 'b64:' prefix followed by an encoded string.",
        "Strip the prefix and base64 decode the remainder."
      ],
      flag: A["FORENSIC-003"].flag,
      explanation:
        "Metadata outlives the intent of whoever wrote it. Cameras, editors, document tools and upload pipelines all " +
        "leave fields behind - make, model, software version, timestamps, author, description - and those fields are " +
        "routinely used to build timelines and attribute artefacts. In this lab item the payload sat in an XMP note " +
        "field with an explicit 'b64:' marker, but the transferable habit is to enumerate every field rather than read " +
        "the first five. Two cautions: metadata timestamps are device-local and can be wrong or forged, and publishing " +
        "metadata leaks information - which is why this exercise uses invented values only.",
      solutionSteps: [
        "Enumerate all metadata fields, including rarely-read XMP entries.",
        "Spot the 'b64:' prefixed value in XMP.Note.",
        "Strip the prefix and base64 decode.",
        "Cross-check the decoded text against the other timestamps for consistency."
      ]
    },
    {
      id: "FORENSIC-004",
      title: "Hex Detective",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Locate a payload inside a binary blob by reading a hex dump and converting offsets.",
      description:
        "A 256 byte lab artifact is shown in full below. Somewhere inside it, a text payload was written over the " +
        "noise. Find it.\n\n" + A["FORENSIC-004"].hexdump,
      skills: ["Hex Dump", "Offset Arithmetic", "ASCII Recognition"],
      data: {
        artifact: "hexdump",
        text: A["FORENSIC-004"].hexdump,
        meta: "256 bytes, 16 bytes per row, payload starts at offset " + A["FORENSIC-004"].offset
      },
      answer: { expects: A["FORENSIC-004"].flag },
      hints: [
        "Do not read the hex column first - read the ASCII column on the right. Text announces itself there.",
        "The payload starts on the row labelled 00000090, which is decimal 144.",
        "Read the ASCII column from offset 0x90 onward: the flag is written in clear."
      ],
      flag: A["FORENSIC-004"].flag,
      explanation:
        "A hex dump has two columns for a reason: the hex side is for exact byte work, the ASCII side is for pattern " +
        "recognition. Scanning the ASCII column for a run of readable characters finds this payload immediately at " +
        "offset 0x90 (144 decimal). Being fluent in offset arithmetic matters because tooling reports both forms - " +
        "0x90 and 144 are the same place, and confusing them is a common source of false conclusions. Once located, " +
        "record the offset with the finding: it is part of the evidence, not just a step.",
      solutionSteps: [
        "Scan the ASCII column for printable runs amid the '.' noise.",
        "Note the row offset where the run begins: 0x90 = 144 decimal.",
        "Read the run: the flag in clear text.",
        "Record offset plus length as part of the finding."
      ]
    },
    {
      id: "FORENSIC-005",
      title: "Timeline",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Merge events from several sources into one chronological timeline and identify the first action.",
      description:
        "Five events were collected from four different lab sources. They arrived out of order because each tool " +
        "exports differently.\n\n" +
        A["FORENSIC-005"].events.map(function (e) {
          return "  " + e.id + "  [" + e.src + "]  " + e.ts + "  " + e.text;
        }).join("\n") + "\n\n" +
        "Submit the event IDs in chronological order, comma separated (earliest first).",
      skills: ["Timeline Analysis", "Timestamp Normalisation", "Log Correlation"],
      data: {
        artifact: "table",
        rows: A["FORENSIC-005"].events.map(function (e) { return [e.id, e.src, e.ts, e.text]; }),
        headers: ["ID", "SOURCE", "TIMESTAMP (UTC)", "EVENT"],
        meta: "all timestamps are UTC ISO-8601, all hosts and accounts are fictional"
      },
      answer: { expects: ["E-01,E-02,E-03,E-04,E-05", "E-01, E-02, E-03, E-04, E-05"] },
      hints: [
        "All timestamps are already UTC ISO-8601, so they sort correctly as plain strings - no timezone math needed.",
        "Sort ascending on the timestamp column: the earliest is late on 2026-03-10, not 2026-03-11.",
        "The order is E-01, E-02, E-03, E-04, E-05 - a phishing-adjacent pattern of failures, then a success, then persistence."
      ],
      flag: "FLAG{TIMELINE_BEFORE_THEORY}",
      explanation:
        "Timelines beat theories. Once the events are ordered, the story writes itself: repeated authentication failures " +
        "(01), a successful login from a different network (02), a new service installed (03), outbound traffic to an " +
        "external address (04), and finally a firewall rule disabled (05). Reading the same events in arrival order " +
        "would have suggested the firewall change came first and inverted the whole narrative. Two habits matter: " +
        "normalise every timestamp to one timezone before sorting (mixed local/UTC is the classic trap), and keep the " +
        "source system attached to each event so you can weigh its reliability.",
      solutionSteps: [
        "Confirm every timestamp is UTC ISO-8601.",
        "Sort ascending by timestamp.",
        "Emit the IDs in that order.",
        "Read the resulting sequence as a narrative: failures -> success -> persistence -> egress -> defence disabled."
      ]
    },
    {
      id: "FORENSIC-006",
      title: "Broken Evidence",
      category: CAT,
      difficulty: "Hard",
      points: 400,
      objective: "Reassemble a split payload using three different encodings and verify it against a checksum.",
      description:
        "Case 0091 (fictional). The evidence bag record below was recovered from a damaged lab share. The payload was " +
        "deliberately split into three fragments, each in a different encoding, and a checksum was recorded so the " +
        "reassembly can be proven.\n\n" + A["FORENSIC-006"].evidence + "\n" +
        "Rebuild the flag from the three decoded fragments and confirm it against the recorded checksum.",
      skills: ["ROT13", "Hexadecimal", "Base64", "Checksum Verification", "Evidence Handling"],
      data: {
        artifact: "text",
        text: A["FORENSIC-006"].evidence,
        hexdump: A["FORENSIC-006"].hexdump,
        meta: "three fragments, three encodings, one sha256 recorded for verification"
      },
      answer: { expects: A["FORENSIC-006"].flag },
      hints: [
        "Each fragment is labelled with its encoding: A is rot13, B is hex, C is base64. Decode each with the right tool.",
        "Fragment C is not a piece of the message - it decodes to the TEMPLATE " + A["FORENSIC-006"].template + ". Substitute the placeholders with decoded A and decoded B.",
        "After assembling, hash the result with sha256 and compare it to the recorded checksum - if it matches, the evidence is intact."
      ],
      flag: A["FORENSIC-006"].flag,
      explanation:
        "This is the full evidence workflow in miniature: acquire, decode, reassemble, verify. Fragment A is rot13, B is " +
        "hex, and C is base64 - but C is the template, not a third piece of text, which is the trap in this item. The " +
        "step people skip is verification - the recorded " +
        "sha256 exists so you can prove the reassembled value is the original and not something you accidentally " +
        "corrupted while decoding. In a real case that checksum is what lets you state in a report that the artifact " +
        "is unchanged since acquisition. Encoding three fragments differently is not security; it is just friction, and " +
        "friction is what makes an analyst slow down and document.",
      solutionSteps: [
        "Decode fragment A with rot13 -> 'EVIDENCE'.",
        "Decode fragment B from hex -> 'REASSEMBLED'.",
        "Decode fragment C from base64 -> the template " + A["FORENSIC-006"].template + ".",
        "Substitute the placeholders: FLAG{EVIDENCE_REASSEMBLED}.",
        "Hash the assembled value with sha256 and compare to the recorded digest to prove integrity."
      ]
    },
    {
      id: "FORENSIC-011",
      title: "Cold Memory",
      category: CAT,
      difficulty: "Expert",
      points: 800,
      objective: "Triage a simulated process table, follow an encoded command line argument to a C2 name, then pivot to DNS records.",
      description:
        "A lab host was snapshotted and two artifacts were exported. Everything below is fictional.\n\n" +
        "ARTIFACT 1 - process table\n" + A["FORENSIC-011"].procTable + "\n" +
        "ARTIFACT 2 - resolver cache\n" + A["FORENSIC-011"].dns + "\n" +
        "Task: identify the implanted process, decode the argument passed to it, correlate that value with the " +
        "resolver cache, then decode the interesting TXT answer to obtain the flag. Report the PID as part of your " +
        "reasoning in the writeup step.",
      skills: ["Memory Triage", "Process Analysis", "Hexadecimal", "DNS Records", "Cross Artifact Correlation"],
      data: {
        artifact: "text",
        text: A["FORENSIC-011"].procTable + "\n" + A["FORENSIC-011"].dns,
        meta: "simulated process table + resolver cache, fictional hostnames only"
      },
      answer: { expects: A["FORENSIC-011"].flag },
      hints: [
        "Compare parent/child relationships and install locations. One process runs from a hidden directory under /opt and has a child named 'updater' - that is PID " + A["FORENSIC-011"].pid + ".",
        "Its --c argument is a long hex string. Decode hex to ASCII to get a hostname.",
        "That hostname appears in the resolver cache as a TXT query. Base64 decode the TXT answer to get the flag."
      ],
      flag: A["FORENSIC-011"].flag,
      explanation:
        "Three skills chained: process triage, argument decoding and DNS correlation. The implanted process stands out " +
        "structurally - it runs from a dot-prefixed directory under /opt, it was started by init rather than by a " +
        "session, and it has a child that beacons on a fixed interval. Its command line hides a hostname in hex, which " +
        "decodes to a TXT query name that also appears in the resolver cache, and the TXT answer is base64. That is " +
        "exactly the shape of DNS tunnelling used for command and control: small encoded payloads carried inside " +
        "queries and answers that most egress filters allow. The defensive conclusion is not 'block DNS' but 'log and " +
        "measure DNS': query length, entropy, query rate per client and unusual record types are all detectable.",
      solutionSteps: [
        "Triage the process table: flag the service running from /opt/gp/.svc with a beaconing child.",
        "Record its PID (" + A["FORENSIC-011"].pid + ") and hex-decode the --c argument -> " + A["FORENSIC-011"].c2 + ".",
        "Search the resolver cache for that name: a TXT query is present.",
        "Base64 decode the TXT answer to obtain the flag.",
        "Write the finding as: implanted PID, encoded C2 argument, DNS TXT channel."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
