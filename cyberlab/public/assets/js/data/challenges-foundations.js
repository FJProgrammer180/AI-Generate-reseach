/* ============================================================================
 * data/challenges-foundations.js - the BEGINNER tier (first hour of training)
 * ----------------------------------------------------------------------------
 * Six absolute-starter challenges, one per core discipline. Every piece of
 * evidence below is built in this file from literals using the offline engine
 * helpers, so the ciphertext, the Morse burst, the hex dump and the base64
 * parameter can never drift away from the answer they encode.
 *
 * Fictional data only: hosts use the reserved .invalid TLD and addresses come
 * from the documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  /* --------------------------------------------------- CRYPTO-013 (Caesar) */
  var shiftFlag = "FLAG{SHIFT_BY_THREE}";
  var shiftCipher = CTF.caesar(shiftFlag, 3);
  var shiftKeyRow = CTF.caesar(ALPHABET, 3);

  /* ------------------------------------------------------- ENCODE-007 (Morse) */
  var MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
    H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
    O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
    V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--.."
  };
  function toMorse(text) {
    return String(text).toUpperCase().split(/\s+/).map(function (word) {
      return word.split("").map(function (ch) { return MORSE[ch] || ""; }).filter(Boolean).join(" ");
    }).join(" / ");
  }
  var morsePlain = "DOTS AND DASHES";
  var morseFlag = "FLAG{DOTS_AND_DASHES}";
  var morseBurst = toMorse(morsePlain);
  var morseLegend = morsePlain.replace(/[^A-Z]/g, "").split("")
    .filter(function (ch, i, arr) { return arr.indexOf(ch) === i; })
    .sort()
    .map(function (ch) { return "  " + ch + "  " + MORSE[ch]; })
    .join("\n");

  /* ------------------------------------------------- FORENSIC-007 (magic bytes) */
  // PNG signature + a 16x16 8-bit RGB IHDR, then the start of the chunk CRC
  var pngHead = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68
  ];
  var pngDump = CTF.hexdump(new Uint8Array(pngHead), { width: 16, length: 32 });

  /* ------------------------------------------------------ NET-008 (RFC 1918) */
  var addressRows = [
    ["A-1", "10.10.4.7", "collector heartbeat, seen every 90 s"],
    ["A-2", "192.168.10.1", "default gateway in the daemon configuration"],
    ["A-3", "172.16.250.9", "test-bench plotter, quiet since March"],
    ["A-4", "198.51.100.23", "peer named in the incident report"],
    ["A-5", "127.0.0.1", "loopback line the daemon writes to itself"],
    ["A-6", "224.0.0.251", "multicast group in the discovery traffic"]
  ];
  var privateCount = addressRows.filter(function (r) { return CTF.ipKind(r[1]) === "PRIVATE"; }).length;

  /* --------------------------------------------------- WEB-008 (query string) */
  var notePlain = "REDACTED_FOR_TRAINING";
  var noteParam = CTF.b64encode(notePlain);
  var requestLines = [
    "GET /lab/report?view=summary&user=analyst&note=" + noteParam + " HTTP/1.1",
    "Host: lab.nullpoint.invalid",
    "User-Agent: academy-browser/1.0",
    "Accept: text/html",
    "Referer: lab.nullpoint.invalid/lab/index"
  ].join("\n");

  CTF.register([
    {
      id: "CRYPTO-013",
      title: "The First Shift",
      category: "Cryptography",
      difficulty: "Beginner",
      points: 50,
      objective: "Read a Caesar-shifted note by finding the shift from the supplied alphabet table and applying it backwards.",
      description:
        "A paper note was photographed in the lab break room (fictional). Somebody wrote the whole thing with a " +
        "single-alphabet shift. The table under the ciphertext shows exactly how the alphabet was rotated, so you do " +
        "not have to guess the shift - you have to notice it, then run it in reverse. Report the recovered flag.",
      skills: ["Caesar Cipher", "Alphabet Tables", "Reversing a Transform"],
      data: {
        artifact: "cipher",
        meta: "shifted note, photographed in the lab (fictional)",
        text:
          "INTERCEPTED NOTE\n" +
          "----------------\n" + shiftCipher + "\n\n" +
          "ROTATION TABLE FOUND ON THE SAME PAGE\n" +
          "  PLAIN : " + ALPHABET.split("").join(" ") + "\n" +
          "  CIPHER: " + shiftKeyRow.split("").join(" ") + "\n\n" +
          "note: only letters were rotated. Digits, '_' and the braces were copied unchanged."
      },
      answer: { expects: [shiftFlag], contains: true },
      hints: [
        "Look at the shape of the ciphertext: the braces and the underscore never moved, so the flag format FLAG{...} is still visible. That tells you only letters were transformed.",
        "The rotation table is the key. Plain A became cipher D, plain B became cipher E - every letter moved three places forward.",
        "To read the note, move three places BACKWARD (shift -3). The analyst workbench under the evidence has a Caesar button: paste the ciphertext and enter -3."
      ],
      flag: shiftFlag,
      explanation:
        "A Caesar cipher substitutes each letter with another letter a fixed distance away, and it is the clearest " +
        "example of the difference between encoding and encrypting: there is no secret beyond the shift, so anyone " +
        "who can see one plain/cipher letter pair can recover the whole key. Here the table gave the pair away " +
        "(A -> D), which means the shift is 3 and the inverse is -3. Non-letters were copied through untouched, " +
        "which is why the flag skeleton survived - a reminder that punctuation and structure leak information even " +
        "when the alphabet does not. Real analysts meet this constantly in malware configuration strings and in " +
        "puzzle-style CTF traffic; the habit to build is 'find one known pair, derive the rule, apply the inverse'.",
      solutionSteps: [
        "Notice that '{', '}' and '_' are unchanged, so only letters were substituted.",
        "Read the rotation table: plain A maps to cipher D, so the shift is +3.",
        "Apply the inverse shift of -3 to every letter of the ciphertext (by hand or with the workbench Caesar button).",
        "Confirm the result starts with FLAG{ and ends with }, then submit " + shiftFlag + "."
      ]
    },

    {
      id: "ENCODE-007",
      title: "Dots At The Gate",
      category: "Encoding",
      difficulty: "Beginner",
      points: 60,
      objective: "Decode a Morse burst using the supplied legend and report the three words it spells.",
      description:
        "The lab's fictional hobby radio channel logged a burst of dots and dashes at 03:12. Nothing is encrypted - " +
        "Morse is a representation, not a protection - but you do need the legend. Spaces separate letters, ' / ' " +
        "separates words. Decode the burst and report the three words it spells.",
      skills: ["Morse Code", "Encoding vs Encryption", "Reference Tables"],
      data: {
        artifact: "text",
        meta: "radio burst, lab channel 3 (simulated recording)",
        text:
          "BURST 03:12:04 UTC - channel 3 (fictional)\n" +
          "-------------------------------------------\n" + morseBurst + "\n\n" +
          "LEGEND (every letter used in this burst)\n" + morseLegend + "\n\n" +
          "convention: one space = letter gap, ' / ' = word gap"
      },
      answer: { expects: [morsePlain, "DOTS AND DASHES", morseFlag], contains: true },
      hints: [
        "Split on ' / ' first: you get three groups, so the answer is three words. Then split each group on single spaces to get letters.",
        "The first group is '-.. --- - ...' which the legend maps to D, O, T, S. Every letter you need is in the legend, so this is a lookup job, not a guessing job.",
        "Decode the three words, then write the flag in lab format with underscores instead of spaces: FLAG{WORD1_WORD2_WORD3}."
      ],
      flag: morseFlag,
      explanation:
        "Morse encodes characters as timing patterns, and like Base64 or hex it protects nothing - it only changes " +
        "the representation so a different channel can carry it. The reliable method is mechanical: segment on the " +
        "word separator, segment again on the letter separator, look each token up in the table, and only then think " +
        "about what the words mean. Verification is cheap and worth doing: re-encode your plaintext and compare it " +
        "to the original burst character by character. The flag format matters too - the lab expects underscores " +
        "where the burst had spaces, which is the same normalisation step you perform when turning a decoded phrase " +
        "into an indicator you can search for in logs.",
      solutionSteps: [
        "Split the burst on ' / ' to isolate the three words.",
        "Split each word on single spaces and map every token through the legend.",
        "Read the plaintext: " + morsePlain + ".",
        "Re-encode the plaintext to Morse and diff it against the burst to prove the reading is exact.",
        "Submit the flag in lab format: " + morseFlag + "."
      ]
    },

    {
      id: "LINUX-007",
      title: "Where Am I?",
      category: "Linux",
      difficulty: "Beginner",
      points: 75,
      objective: "Use pwd, whoami and cat inside the simulated lab image to identify the host and your own home directory.",
      description:
        "You have been dropped into the lab's simulated image with a terminal below. Before you trust any log you " +
        "find there, an analyst confirms two things: which machine this is, and which account is doing the looking. " +
        "Report the lab hostname and the absolute path of the analyst's home directory, comma separated: " +
        "<hostname>,<home-path>. Nothing you type leaves the browser - the filesystem is an in-memory image.",
      skills: ["Terminal Navigation", "Filesystem Layout", "Host Identification"],
      data: {
        artifact: "vfs",
        view: { user: "analyst", groups: ["analyst"], start: "/home/analyst", hintPath: "/etc/hostname" },
        meta: "simulated lab image, fictional paths only"
      },
      answer: {
        expects: ["lab-nullpoint-03,/home/analyst", "lab-nullpoint-03, /home/analyst", "lab-nullpoint-03"],
        contains: true
      },
      hints: [
        "Two commands answer half the question instantly: 'pwd' prints the directory you are standing in and 'whoami' prints the account you are using.",
        "The hostname of a Linux image is a one-line file: 'cat /etc/hostname'. Type 'help' if you want the full command list for this lab.",
        "Answer format is hostname,home with no spaces around the comma - for example something,/home/analyst."
      ],
      flag: "FLAG{READ_THE_HOSTNAME_FILE}",
      explanation:
        "Attribution starts with orientation. 'lab-nullpoint-03' is the host identity and '/home/analyst' is where " +
        "this account's files live; together they let you say precisely which machine and which user a later " +
        "observation belongs to. The commands are trivial but the discipline is not: in a real investigation the " +
        "first lines of your notes should record host, account, current directory and time, because every path you " +
        "quote afterwards is relative to them. Note also that /etc/hostname is a convention, not a guarantee - the " +
        "same value can appear in /etc/hosts, in 'uname -a' output and in log prefixes, and a careful analyst " +
        "cross-checks at least two of those before writing the host into a report.",
      solutionSteps: [
        "Run 'whoami' to confirm you are the analyst account and 'pwd' to see that you started in /home/analyst.",
        "Run 'cat /etc/hostname' to read the host identity: lab-nullpoint-03.",
        "Cross-check with 'cat /etc/hosts' - the same name appears next to the loopback address.",
        "Submit lab-nullpoint-03,/home/analyst."
      ]
    },

    {
      id: "NET-008",
      title: "Which Ones Are Mine?",
      category: "Networking",
      difficulty: "Beginner",
      points: 60,
      objective: "Classify six addresses from a lab inventory and count how many fall inside the RFC 1918 private ranges.",
      description:
        "An intern copied six addresses out of a lab inventory into one table and asked which of them belong to the " +
        "internal network. Private space is defined by RFC 1918: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. " +
        "Loopback, multicast and the reserved documentation ranges are NOT private space. Answer with a single " +
        "number: how many of the six addresses are RFC 1918 private?",
      skills: ["IP Address Classes", "RFC 1918", "Triage Counting"],
      data: {
        artifact: "table",
        meta: "lab address inventory (fictional)",
        headers: ["REF", "ADDRESS", "WHERE IT WAS SEEN"],
        rows: addressRows
      },
      answer: { expects: [String(privateCount), privateCount + " addresses", privateCount + " of 6"] },
      hints: [
        "Only three ranges count: 10.0.0.0/8, 172.16.0.0/12 (that is 172.16.x.x through 172.31.x.x) and 192.168.0.0/16.",
        "127.0.0.1 is loopback and 224.0.0.251 is a multicast group address - neither is RFC 1918 private space, even though both are non-routable on the internet.",
        "198.51.100.23 comes from the TEST-NET-2 documentation range, which is reserved for writing examples, not for private networks. That leaves three addresses inside the RFC 1918 ranges."
      ],
      flag: "FLAG{PRIVATE_SPACE_COUNTED}",
      explanation:
        "Sorting addresses by kind is the first filter on any network dataset: it decides what is 'ours', what is a " +
        "peer, and what is noise generated by the host itself. Three of the six rows sit inside RFC 1918 space " +
        "(10.10.4.7, 192.168.10.1 and 172.16.250.9). 198.51.100.23 is public-but-reserved documentation space " +
        "(this lab uses those ranges deliberately so no real network is ever referenced), 127.0.0.1 is loopback " +
        "traffic that never left the machine, and 224.0.0.251 is a link-local multicast group used by discovery " +
        "protocols. Confusing 'not routable on the internet' with 'private' is one of the most common triage " +
        "mistakes, and it hides real internal hosts behind loopback noise.",
      solutionSteps: [
        "Write the three RFC 1918 ranges at the top of your notes before looking at the table.",
        "Test each address against them: 10.10.4.7, 192.168.10.1 and 172.16.250.9 match.",
        "Reject 127.0.0.1 (loopback), 224.0.0.251 (multicast) and 198.51.100.23 (documentation range, publicly reserved).",
        "Submit the count: " + privateCount + "."
      ]
    },

    {
      id: "FORENSIC-007",
      title: "The Wrong Extension",
      category: "Digital Forensics",
      difficulty: "Beginner",
      points: 80,
      objective: "Identify a file's true type from its magic bytes instead of trusting the filename extension.",
      description:
        "Evidence arrived as 'evidence.bin' after somebody renamed it twice and lost track of what it was. You have " +
        "the first 32 bytes. Filenames are user-supplied metadata and they lie; the first bytes of a file are " +
        "written by the program that created it. Decide what this file really is and answer with the format name " +
        "(for example: PDF, ZIP, GIF, PNG).",
      skills: ["Magic Bytes", "File Type Identification", "Hex Reading"],
      data: {
        artifact: "hex",
        meta: "first 32 bytes of evidence.bin (renamed by the lab intern)",
        text: pngDump
      },
      answer: { expects: ["PNG", "png", "image/png", "PNG image", "a PNG image"] },
      hints: [
        "Read the ASCII column on the right of the dump as well as the hex column - the first four bytes are meant to be recognisable text.",
        "'89 50 4e 47' is 0x89 followed by the ASCII letters P, N, G. The leading high-bit byte exists so the file is corrupted by text-only transfers.",
        "Confirm with the second signal: bytes 12-15 are 0x0000000d and bytes 16-19 spell 'IHDR', the header chunk that only this format uses. Answer: PNG."
      ],
      flag: "FLAG{MAGIC_BYTES_WIN}",
      explanation:
        "File type identification is a signature problem, not a naming problem. The eight-byte sequence " +
        "89 50 4E 47 0D 0A 1A 0A is the PNG signature, and the IHDR chunk name four bytes later is a second, " +
        "independent confirmation - two signals agreeing is what turns a guess into a finding. The next bytes " +
        "(00 00 00 10 twice, then 08 02) describe a 16x16 image with 8-bit truecolour, which is exactly the kind " +
        "of detail you record when you need to argue that the file is intact rather than truncated. On a real " +
        "workstation 'file' and 'xxd | head' do this in one line; the analytical habit is the same: never write an " +
        "extension into a report without checking the header, because renamed malware and mislabelled evidence are " +
        "both common.",
      solutionSteps: [
        "Look at the ASCII column of the first line: '.PNG........IHDR'.",
        "Match the first eight bytes against known signatures: 89 50 4E 47 0D 0A 1A 0A is PNG.",
        "Confirm with the chunk structure: length 0x0000000d, type 'IHDR', width 0x10, height 0x10, bit depth 8, colour type 2.",
        "Answer PNG and note in your writeup that the filename evidence.bin was wrong."
      ]
    },

    {
      id: "WEB-008",
      title: "The Loud Parameter",
      category: "Web Security",
      difficulty: "Beginner",
      points: 70,
      objective: "Read a logged HTTP request line, isolate one query parameter and decode its Base64 value.",
      description:
        "One request line was copied out of the lab's access log. Query parameters are visible to every proxy, log " +
        "collector and browser history between the client and the server, so people sometimes wrap them in Base64 " +
        "to make them look tidier - which hides nothing at all. Find the 'note' parameter, decode it, and report the " +
        "text it contains.",
      skills: ["URL Anatomy", "Base64", "Log Reading"],
      data: {
        artifact: "text",
        meta: "access log excerpt, lab.nullpoint.invalid (fictional)",
        text: requestLines + "\n\n# logged by the lab access collector - query strings are stored verbatim"
      },
      answer: { expects: [notePlain, "REDACTED FOR TRAINING", "FLAG{QUERY_STRINGS_ARE_NOT_SECRET}"], contains: true },
      hints: [
        "A query string starts at '?' and is a list of name=value pairs joined by '&'. Split the request line on '&' and look for the pair that starts with 'note='.",
        "The value uses only A-Z, a-z, 0-9 and has no padding here - that alphabet is Base64, not encryption.",
        "Copy just the value into the analyst workbench under the evidence and press 'base64 decode'. The text you get is the answer."
      ],
      flag: "FLAG{QUERY_STRINGS_ARE_NOT_SECRET}",
      explanation:
        "Everything after the '?' in a URL is transmitted in clear text and written to logs on both ends, so a " +
        "parameter is never a secret - wrapping it in Base64 only changes how it looks to a human skimming a log " +
        "line. Decoding '" + noteParam + "' gives '" + notePlain + "', which is what this lab stores where a real " +
        "system would store something sensitive. The analyst takeaways are: split a request line into method, path, " +
        "query and protocol before reasoning about it; treat each parameter as a separate evidence item with its own " +
        "encoding; and when you find sensitive-looking data in a query string, the finding is 'data exposure through " +
        "URL logging', not 'weak encoding'.",
      solutionSteps: [
        "Separate the request line into method (GET), path (/lab/report), query string and protocol (HTTP/1.1).",
        "Split the query on '&' into view=summary, user=analyst and note=" + noteParam + ".",
        "Recognise the note value as Base64 and decode it to '" + notePlain + "'.",
        "Report the decoded text, and note the exposure finding: the value is stored verbatim in the access log."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
