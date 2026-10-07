/* ============================================================================
 * data/challenges-encoding.js - ENCODING (6 challenges)
 * Theme: representation is not protection. Every layer must be identified by
 * its alphabet before it can be undone.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Encoding";

  CTF.register([
    {
      id: "ENCODE-001",
      title: "Base64 Rookie",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Recognise base64 by its alphabet and padding, and decode it to text.",
      description:
        "A support ticket contained a value that the reporter called 'encrypted'. It is not. Decode it.",
      skills: ["Base64", "Alphabet Recognition", "Encoding vs Encryption"],
      data: { artifact: "encoded", text: A["ENCODE-001"].b64, meta: "single layer, printable output expected" },
      answer: { expects: A["ENCODE-001"].flag },
      hints: [
        "The alphabet is A-Z, a-z, 0-9, '+' and '/', and the string ends with '=' padding - that is base64.",
        "Base64 encodes every 3 bytes into 4 characters, so length is always a multiple of 4.",
        "Decode it once and you already have readable text - there is no second layer."
      ],
      flag: A["ENCODE-001"].flag,
      explanation:
        "Base64 exists to carry binary data through text-only channels (email, JSON, HTTP headers). It has no key, so " +
        "calling it encryption is a category error - and a very common finding in security reviews, where 'we base64 the " +
        "token' is offered as if it were protection. Recognition is instant: the 64 character alphabet plus '=' padding. " +
        "Because each character carries 6 bits, base64 inflates payloads by about 33%, which is also a useful traffic " +
        "analysis signal.",
      solutionSteps: [
        "Identify the alphabet and the trailing '=' padding.",
        "Base64 decode the string.",
        "Read the plaintext flag directly."
      ]
    },
    {
      id: "ENCODE-002",
      title: "URL Trail",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Decode percent-encoding and understand which characters URL encoding is required to escape.",
      description:
        "A proxy log stored this URL in fully percent-encoded form. Decode it and pull out the note parameter.\n\n" +
        A["ENCODE-002"].url,
      skills: ["URL Encoding", "Percent Encoding", "Query String Parsing"],
      data: {
        artifact: "encoded",
        text: A["ENCODE-002"].url,
        meta: "reserved characters are escaped as %XX (uppercase hex)"
      },
      answer: { expects: [A["ENCODE-002"].flag, A["ENCODE-002"].raw], contains: true },
      hints: [
        "Every '%XX' is one byte in hexadecimal - %3A is ':', %2F is '/', %20 is a space.",
        "Decode the percent escapes first, then read the query string parameters.",
        "The parameter named 'note' holds the flag; spaces inside it were encoded as %20."
      ],
      flag: A["ENCODE-002"].flag,
      explanation:
        "Percent encoding (URL encoding) escapes characters that are reserved or unsafe in a URI. It is purely a " +
        "transport representation. Analysts meet it constantly in proxy and WAF logs, and the classic pitfall is " +
        "double encoding: %2520 decodes to %20 and then to a space, which is how filter bypasses work. The discipline " +
        "is to decode to a canonical form exactly once and then reason about the result - and to be suspicious whenever " +
        "decoding a value produces more percent signs.",
      solutionSteps: [
        "Replace each %XX with its byte value.",
        "Read the decoded URL and split the query string on '&'.",
        "Take the value of the 'note' parameter.",
        "Normalise the spaces to get the flag form."
      ]
    },
    {
      id: "ENCODE-003",
      title: "ASCII Grid",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Convert a decimal byte list back into text and spot the printable ASCII range.",
      description:
        "A configuration export dumped a string as decimal byte values. Rebuild the text.\n\n" + A["ENCODE-003"].ascii,
      skills: ["ASCII", "Decimal Conversion", "Byte Lists"],
      data: { artifact: "numbers", text: A["ENCODE-003"].ascii, meta: "space separated decimal byte values" },
      answer: { expects: A["ENCODE-003"].flag },
      hints: [
        "All values are between 32 and 126, which is the printable ASCII range - so this is text, not numbers.",
        "Each decimal value is one byte; map it through the ASCII table.",
        "70='F', 76='L', 65='A', 71='G', 123='{' - the shape of a flag appears immediately."
      ],
      flag: A["ENCODE-003"].flag,
      explanation:
        "Decimal byte lists are the plainest possible encoding and show up in dumps, spreadsheets and badly written " +
        "serialisers. The key observation is range: values confined to 32-126 mean printable text, values around " +
        "0-255 with many low numbers mean binary data, and values above 127 in pairs usually mean UTF-8 multibyte " +
        "characters. Recognising 123 and 125 as '{' and '}' is a fast structural tell for flag-shaped payloads.",
      solutionSteps: [
        "Split on whitespace to get decimal values.",
        "Check the range (32-126) to confirm printable ASCII.",
        "Map each value to its character.",
        "Concatenate to read the flag."
      ]
    },
    {
      id: "ENCODE-004",
      title: "Binary Chain",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Perform a two step conversion: bits to decimal, decimal to ASCII, and verify each step.",
      description:
        "A firmware log printed one message as a single unbroken bit string. Convert bits -> decimal -> text.\n\n" +
        A["ENCODE-004"].binary,
      skills: ["Binary", "Decimal", "ASCII", "Stepwise Verification"],
      data: {
        artifact: "binary",
        text: A["ENCODE-004"].binary,
        meta: "reference decimal row: " + A["ENCODE-004"].decimal
      },
      answer: { expects: A["ENCODE-004"].flag },
      hints: [
        "There are no separators, so first split the string into fixed groups of eight bits.",
        "Convert each 8 bit group to decimal - that gives you the byte values.",
        "Map the decimal values through ASCII; the first group 01000110 is 70, the letter 'F'."
      ],
      flag: A["ENCODE-004"].flag,
      explanation:
        "Unseparated bit strings force you to establish the grouping width before anything else. Eight bits is the " +
        "natural choice for text, and the total length being a multiple of 8 confirms it. Doing the conversion in two " +
        "explicit steps (bits -> decimal -> character) is not just pedagogy: it gives you a checkpoint to verify " +
        "against, which is exactly the habit that prevents silent transcription errors when you are working a real case " +
        "at 3am.",
      solutionSteps: [
        "Count the bits and confirm the length is divisible by 8.",
        "Chunk into 8 bit groups and convert each to decimal.",
        "Verify the decimals fall in the printable ASCII range.",
        "Map to characters and read the flag."
      ]
    },
    {
      id: "ENCODE-005",
      title: "Triple Encoding",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Peel three stacked encodings in reverse order and explain why stacking is not security.",
      description:
        "A webhook payload was prepared like this: base64 encode the secret, then URL-encode that result, then " +
        "hex-encode the whole thing. What you captured is the outer layer:\n\n" + A["ENCODE-005"].final,
      skills: ["Hexadecimal", "URL Encoding", "Base64", "Layer Ordering"],
      data: {
        artifact: "hex",
        text: A["ENCODE-005"].final,
        meta: "built as hex(urlencode(base64(secret)))"
      },
      answer: { expects: A["ENCODE-005"].flag },
      hints: [
        "Undo the last layer first: the string is pure hex, so decode hex to get text.",
        "The result is full of %XX sequences - URL-decode it next.",
        "You are left with base64; decode that to read the secret."
      ],
      flag: A["ENCODE-005"].flag,
      explanation:
        "Stacking encodings only changes the order in which you must undo them. The correct method is always: identify " +
        "the outer alphabet, decode, re-identify, repeat. Here hex -> URL -> base64 -> plaintext. Two practical " +
        "takeaways: payload size grows multiplicatively (hex doubles, base64 adds a third), so triple-wrapped values " +
        "are obvious in logs by length alone; and if a defender stacked layers hoping for security, the finding to " +
        "report is that encoding provides confidentiality of exactly zero.",
      solutionSteps: [
        "Hex decode -> a string containing %XX escapes.",
        "URL decode -> a base64 string.",
        "Base64 decode -> the flag."
      ]
    },
    {
      id: "ENCODE-006",
      title: "Encoding Maze",
      category: CAT,
      difficulty: "Hard",
      points: 350,
      objective: "Use structural clues to reconstruct an unknown decode order that includes a reversal step.",
      description:
        "A dead drop used four operations but the operator only left three clues:\n" +
        "  clue 1: the outer layer is hexadecimal\n" +
        "  clue 2: somewhere a string was written backwards\n" +
        "  clue 3: the innermost layer is a rotation by half the alphabet\n\n" +
        "Captured value:\n\n" + A["ENCODE-006"].final,
      skills: ["Hexadecimal", "Base64", "String Reversal", "ROT13", "Hypothesis Testing"],
      data: {
        artifact: "hex",
        text: A["ENCODE-006"].final,
        meta: "four operations, order unknown, three clues"
      },
      answer: { expects: A["ENCODE-006"].flag },
      hints: [
        "Start with the clue you can act on: hex decode the outer layer.",
        "The result looks like base64 but ends in '}' - it was reversed. Flip it, then base64 decode.",
        "You now have text that is still scrambled; a half-alphabet rotation is ROT13, so apply ROT13 to finish."
      ],
      flag: A["ENCODE-006"].flag,
      explanation:
        "Unknown order means hypothesis testing, and the efficient way is to follow structure rather than guess " +
        "permutations. Hex decode gives a base64-looking string whose tail is wrong - that is the reversal clue " +
        "announcing itself. Reversing restores valid base64, and decoding that yields alphabetic text that is still " +
        "unreadable, which matches 'rotation by half the alphabet': ROT13. Four operations, 24 possible orders, but " +
        "only three steps of real reasoning because each layer's alphabet identifies it. This is the same discipline " +
        "used on obfuscated scripts: normalise one layer at a time and let the output tell you what comes next.",
      solutionSteps: [
        "Hex decode -> reversed base64 string.",
        "Reverse it -> valid base64 with '=' padding.",
        "Base64 decode -> ROT13 text.",
        "ROT13 -> the flag."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
