/* ============================================================================
 * data/challenges-re.js - REVERSE ENGINEERING CONCEPTS (6 challenges)
 * ----------------------------------------------------------------------------
 * Every "binary" in this category is a readable JavaScript snippet or a data
 * table. No executable is ever loaded, run, downloaded or emulated - the labs
 * train the reading skill (control flow, data flow, encoding, invariants)
 * without any of the risk of handling real malware samples.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Reverse Engineering";

  var RE001 = [
    "// lab build script (fictional)",
    "const PARTS = ['FL', 'AG', '{', 'SOURCE_', 'IS_THE_', 'MAP', '}'];",
    "let out = '';",
    "for (const p of PARTS) out += p;",
    "console.log(out);"
  ].join("\n");

  var RE002 = [
    "// obfuscated constant (fictional)",
    "const K = 0x5A;",
    "const E = " + JSON.stringify(A["RE-002"].encoded) + ";",
    "let s = '';",
    "for (let i = 0; i < E.length; i++) s += String.fromCharCode(E[i] ^ K);",
    "// s is the value the rest of the program compares against"
  ].join("\n");

  var RE003 = [
    "// three helpers and one call chain (fictional)",
    "function stepA(s) { return s.split('').reverse().join(''); }",
    "function stepB(s) { return s.replace(/_/g, '-'); }",
    "function stepC(s) { return s.split('').sort().join(''); }",
    "",
    "const seed = '" + A["RE-003"].seed + "';",
    "const value = stepC(stepB(stepA(seed)));",
    "const answer = value.toUpperCase().replace(/[^A-Z0-9]/g, '');"
  ].join("\n");

  var RE004 = [
    "// gate condition (fictional)",
    "function opensGate(n) {",
    "  if (typeof n !== 'number' || !Number.isInteger(n)) return false;",
    "  if (n <= 100) return false;",
    "  if (n % 7 !== 3) return false;",
    "  if (n % 11 !== 5) return false;",
    "  if (!n.toString(2).endsWith('101')) return false;",
    "  return true;",
    "}",
    "",
    "// the smallest n that opens the gate is embedded in the flag"
  ].join("\n");

  var RE005 = [
    "// build-time transform chain (fictional)",
    "function build(secret) {",
    "  let s = secret.split('').reverse().join('');",
    "  s = caesar(s, 4);",
    "  s = xorWith(s, 'K9');",
    "  s = toBase64(s);",
    "  s = toHex(s);",
    "  return s;",
    "}",
    "",
    "// the shipped artifact contains only the result:",
    "const ARTIFACT = '" + A["RE-005"].final + "';",
    "// recover `secret`"
  ].join("\n");

  var RE011 = [
    "// tiny stack machine (fictional). Opcodes operate on a stack of byte arrays.",
    "//   LOAD  <bytes>  push a byte array",
    "//   PUSH  <bytes>  push a byte array",
    "//   ADD            pop two, push concat(first, second)",
    "//   XOR   <byte>   pop one, push each byte XORed with <byte>",
    "//   ROT   <n>      pop one, push rotated left by n bytes",
    "//   OUT            pop one, append to the output buffer",
    "",
    "const PROGRAM = [",
    "  ['LOAD', [70, 76, 65, 71, 123, 86, 77, 95]],",
    "  ['PUSH', [71, 72, 79, 83, 84, 125]],",
    "  ['ADD',  []],",
    "  ['OUT',  []]",
    "];",
    "",
    "// what ends up in the output buffer? convert bytes to text."
  ].join("\n");

  CTF.register([
    {
      id: "RE-001",
      title: "Read the Code",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Recover a value from source that is already fully visible - the first skill of reverse engineering.",
      description:
        "Recover the printed value from this lab build script. Nothing is executed for you; read it.\n\n" + RE001,
      skills: ["Source Reading", "String Assembly", "Control Flow", "Static Analysis"],
      data: { artifact: "code", language: "javascript", code: RE001, meta: "readable source, no obfuscation" },
      answer: { expects: A["RE-001"].flag },
      hints: [
        "The loop concatenates the PARTS array in order - no reordering, no filtering.",
        "Join them literally: FL + AG + { + SOURCE_ + IS_THE_ + MAP + }.",
        "The result is " + A["RE-001"].flag
      ],
      flag: A["RE-001"].flag,
      explanation:
        "Before any tooling, reverse engineering is reading. This snippet has no control flow worth tracing and no " +
        "encoding - only an array and a concatenation loop - so the answer is obtained by joining the fragments in " +
        "declaration order. The value of the exercise is the habit it builds: identify the data, identify the " +
        "transformation, then apply the transformation to the data by hand. Splitting constants into fragments is the " +
        "most common trivial obfuscation in real samples, and it defeats nothing except a hurried reader.",
      solutionSteps: [
        "Locate the constant array PARTS.",
        "Confirm the loop only appends, in order, with no condition.",
        "Concatenate the fragments.",
        "Read the flag."
      ]
    },
    {
      id: "RE-002",
      title: "Obfuscated String",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Identify an XOR-with-constant decoder loop and recover the hidden string from a numeric array.",
      description:
        "A lab component stores a comparison value as numbers plus a decoder loop. Recover the string.\n\n" + RE002,
      skills: ["XOR Decoding", "Constant Identification", "Array Inspection", "Deobfuscation"],
      data: {
        artifact: "code",
        language: "javascript",
        code: RE002,
        encoded: A["RE-002"].encoded,
        meta: "single byte XOR key, given in the source"
      },
      answer: { expects: A["RE-002"].flag },
      hints: [
        "The decoder XORs every array element with K = 0x5A (90 decimal) and builds a string from the results.",
        "Apply the same operation: 76 ^ 90 = 70 = 'F', 62 ^ 90 = 76 = 'L', and so on.",
        "Decoding the whole array gives " + A["RE-002"].flag
      ],
      flag: A["RE-002"].flag,
      explanation:
        "Single-byte XOR is the most common string obfuscation in the wild because it is one line to implement and one " +
        "line to undo. The key is normally present in the binary near the decoder - here it is literally named K - so " +
        "the task reduces to applying the same operation. Two habits transfer directly to real samples: first, verify " +
        "the key on the first byte before processing the rest (76 ^ 90 = 70 = 'F' immediately confirms a flag-shaped " +
        "result), and second, treat any array of small integers near a loop containing XOR as a string until proven " +
        "otherwise. If the key had not been given, you would recover it by assuming the plaintext prefix 'FLAG' and " +
        "solving key = cipher[0] ^ 'F'.",
      solutionSteps: [
        "Find the decoder loop and the constant K = 0x5A.",
        "XOR the first array element with K and check the result is printable.",
        "Decode the whole array.",
        "Read the flag."
      ]
    },
    {
      id: "RE-003",
      title: "Function Flow",
      category: CAT,
      difficulty: "Medium",
      points: 300,
      objective: "Trace a call chain precisely, keeping the intermediate value after each transformation.",
      description:
        "Three helpers are chained. Follow the data from seed to answer without skipping a step.\n\n" + RE003 + "\n\n" +
        "Submit the final 'answer' value wrapped in FLAG{...}.",
      skills: ["Call Graph Tracing", "Data Flow", "Intermediate Values", "String Normalisation"],
      data: {
        artifact: "code",
        language: "javascript",
        code: RE003,
        trace: [
          ["seed", A["RE-003"].seed],
          ["stepA(seed) reversed", A["RE-003"].step1],
          ["stepB(...) underscore to dash", A["RE-003"].step2],
          ["stepC(...) sorted", A["RE-003"].step3],
          ["answer (uppercased, alphanumerics only)", A["RE-003"].answer]
        ],
        meta: "each helper is pure - no side effects, no hidden state"
      },
      answer: { expects: ["FLAG{" + A["RE-003"].answer + "}", A["RE-003"].answer] },
      hints: [
        "Work inside-out: stepA reverses, stepB swaps underscore for dash, stepC sorts the characters.",
        "'" + A["RE-003"].seed + "' reversed is '" + A["RE-003"].step1 + "', then '" + A["RE-003"].step2 +
        "', then sorted '" + A["RE-003"].step3 + "'.",
        "The last line uppercases and strips non-alphanumerics, giving " + A["RE-003"].answer +
        ", so the flag is FLAG{" + A["RE-003"].answer + "}."
      ],
      flag: "FLAG{" + A["RE-003"].answer + "}",
      explanation:
        "Chained pure functions are the friendliest form of obfuscation because every step is verifiable in isolation. " +
        "The discipline is to write down the intermediate value after each call rather than trying to compose them " +
        "mentally: reverse gives '" + A["RE-003"].step1 + "', the underscore swap gives '" + A["RE-003"].step2 + "', " +
        "and the character sort gives '" + A["RE-003"].step3 + "'. Note the last transformation is a normalisation " +
        "(uppercase, drop non-alphanumerics), which is where most manual attempts lose a character - the dash " +
        "disappears there. Sorting is also lossy in an important sense: it destroys order information, so if you ever " +
        "need to invert a chain like this, the sort step is the one that blocks you.",
      solutionSteps: [
        "Identify the chain: stepA -> stepB -> stepC.",
        "Apply stepA (reverse): '" + A["RE-003"].step1 + "'.",
        "Apply stepB (underscore to dash): '" + A["RE-003"].step2 + "'.",
        "Apply stepC (sort characters): '" + A["RE-003"].step3 + "'.",
        "Apply the final normalisation and wrap in FLAG{...}."
      ]
    },
    {
      id: "RE-004",
      title: "Hidden Condition",
      category: CAT,
      difficulty: "Hard",
      points: 400,
      objective: "Convert nested guard conditions into a solvable constraint set and find the smallest satisfying input.",
      description:
        "A gate function hides the value used in the flag behind four conditions.\n\n" + RE004 + "\n\n" +
        "Find the smallest integer that opens the gate and submit FLAG{GATE_<that integer>}.",
      skills: ["Constraint Extraction", "Modular Arithmetic", "Binary Representation", "Guard Clause Analysis"],
      data: {
        artifact: "code",
        language: "javascript",
        code: RE004,
        constraints: [
          "n is an integer",
          "n > 100",
          "n mod 7 === 3",
          "n mod 11 === 5",
          "binary representation of n ends with 101"
        ],
        candidates: A["RE-004"].candidates,
        meta: "four independent constraints; the answer is the smallest n satisfying all of them"
      },
      answer: { expects: ["FLAG{GATE_" + A["RE-004"].answer + "}", String(A["RE-004"].answer)] },
      hints: [
        "Guard clauses are constraints, not obstacles: list them all before testing any number.",
        "Combine n mod 7 = 3 and n mod 11 = 5 with the Chinese Remainder Theorem: n mod 77 = 44, so n is 44, 121, 198, 275 ...",
        "Of those above 100, test the binary suffix 101 (n mod 8 = 5): 269 works, so the flag is FLAG{GATE_269}."
      ],
      flag: "FLAG{GATE_" + A["RE-004"].answer + "}",
      explanation:
        "The skill here is turning control flow into mathematics. Each early return is a constraint, and reading them " +
        "as a set - integer, greater than 100, n mod 7 = 3, n mod 11 = 5, binary suffix 101 - is worth more than " +
        "testing numbers one at a time. Two constraints combine cleanly: n mod 7 = 3 and n mod 11 = 5 give n mod 77 = " +
        "44 by the Chinese Remainder Theorem, so the candidates above 100 are 121, 198, 275, 352 ... Testing the " +
        "final constraint (binary ending 101, equivalently n mod 8 = 5) selects " + A["RE-004"].answer + ". Brute " +
        "force would also find it, and in practice you would run both: brute force to get the answer, constraint " +
        "reasoning to prove it is the smallest and to explain it in a report.",
      solutionSteps: [
        "Convert each guard clause into a constraint.",
        "Solve n mod 7 = 3 and n mod 11 = 5 -> n mod 77 = 44.",
        "Enumerate candidates above 100 and test n mod 8 = 5 (binary suffix 101).",
        "Smallest satisfying value: " + A["RE-004"].answer + ".",
        "Verify by substituting back into all four guards."
      ]
    },
    {
      id: "RE-005",
      title: "Mini Reverse Challenge",
      category: CAT,
      difficulty: "Hard",
      points: 500,
      objective: "Invert a five stage build pipeline, handling a lossy-looking step and a byte level XOR correctly.",
      description:
        "A build script produced one artifact from a secret using five transformations. Only the artifact " +
        "survived.\n\n" + RE005 + "\n\n" +
        "Note that the XOR step operates on raw bytes and can produce values outside the printable range - carry them " +
        "as bytes, not as text. Recover the secret.",
      skills: ["Pipeline Inversion", "XOR on Bytes", "Base64", "Hexadecimal", "Caesar Cipher", "Order Discipline"],
      data: {
        artifact: "code",
        language: "javascript",
        code: RE005,
        artifactValue: A["RE-005"].final,
        stages: ["reverse", "caesar +4", "xor with 'K9'", "base64", "hex"],
        meta: "invert in reverse order; the xor stage is byte-wise with a repeating two byte key"
      },
      answer: { expects: A["RE-005"].flag },
      hints: [
        "Invert in the opposite order to the build: hex decode, base64 decode, XOR with 'K9', caesar -4, reverse.",
        "The XOR stage must be handled at byte level - after base64 decoding you have raw bytes, some below 0x20, which are not valid text yet.",
        "After XOR with the repeating key 'K9' and a caesar shift of -4 you get '}KCAB_SPETS_EVIF{GALF'; reversing it gives the flag."
      ],
      flag: A["RE-005"].flag,
      explanation:
        "Pipeline inversion is order discipline plus one trap. The five stages invert as hex -> base64 -> XOR -> " +
        "caesar -> reverse, and the trap is the XOR step: it operates on raw bytes, so its output contains values " +
        "below 0x20 that are not text. If you convert to a string too early you corrupt the data and every later step " +
        "fails silently, which is the most common way this kind of task is lost. Keep bytes as bytes until the final " +
        "step. The reversing stage is also worth noting because it is not invertible in the presence of the " +
        "substitution if you try to shortcut - each stage must be undone completely before the next one, and only the " +
        "last reversal produces readable text: " + A["RE-005"].flag + ".",
      solutionSteps: [
        "Hex decode the artifact -> a base64 string.",
        "Base64 decode -> 21 raw bytes (some non-printable).",
        "XOR those bytes with the repeating key 'K9' -> '}OGEF_WTIXW_IZMJ{KEPJ'.",
        "Caesar shift -4 -> '}KCAB_SPETS_EVIF{GALF'.",
        "Reverse -> " + A["RE-005"].flag + "."
      ]
    },
    {
      id: "RE-011",
      title: "Stack Machine",
      category: CAT,
      difficulty: "Expert",
      points: 1000,
      objective: "Emulate a small instruction set by hand: maintain a stack, apply each opcode's semantics, and convert the output buffer to text.",
      description:
        "A lab component ships a tiny stack machine and a four instruction program. Emulate it exactly.\n\n" +
        RE011 + "\n\n" +
        "Requirements: track the stack after every instruction, apply ADD as concatenation in the correct order (first " +
        "pushed comes first), and convert the output buffer from bytes to text. Submit the resulting text as the flag.",
      skills: ["Instruction Set Semantics", "Stack Discipline", "Byte To Text Conversion", "Manual Emulation"],
      data: {
        artifact: "code",
        language: "javascript",
        code: RE011,
        opcodes: {
          LOAD: "push the given byte array",
          PUSH: "push the given byte array",
          ADD: "pop two, push concat(first pushed, second pushed)",
          XOR: "pop one, push each byte XORed with the operand",
          ROT: "pop one, push rotated left by n bytes",
          OUT: "pop one, append to the output buffer"
        },
        meta: "four instructions in the shipped program; XOR and ROT are defined but unused"
      },
      answer: { expects: [A["RE-011"].answer, "70,76,65,71,123,86,77,95,71,72,79,83,84,125"] },
      hints: [
        "LOAD pushes the bytes [70,76,65,71,123,86,77,95]; PUSH adds [71,72,79,83,84,125] on top of it.",
        "ADD pops both and concatenates in push order, so the LOAD bytes come first - getting this order wrong reverses the string.",
        "OUT appends the result to the output buffer; converting those bytes to ASCII gives " + A["RE-011"].answer + "."
      ],
      flag: A["RE-011"].answer,
      explanation:
        "Emulating an instruction set is the core reverse-engineering skill, and it is entirely mechanical if you keep " +
        "state honestly. Here the stack holds byte arrays: LOAD pushes eight bytes (which decode to 'FLAG{VM_'), PUSH " +
        "adds six more ('GHOST}'), ADD concatenates them in push order, and OUT moves the result to the output buffer. " +
        "Converting the fourteen bytes to ASCII gives the flag. Two details decide whether you succeed: the " +
        "concatenation order (pop order is the reverse of push order, so 'first pushed comes first' must be read " +
        "carefully from the spec), and the fact that XOR and ROT are defined but unused - a distraction you should " +
        "notice rather than hunt for. The general method scales: write the state after every instruction, and never " +
        "hold two instructions in your head at once.",
      solutionSteps: [
        "Instruction 1 LOAD: stack = [[70,76,65,71,123,86,77,95]].",
        "Instruction 2 PUSH: stack = [[70,...,95], [71,72,79,83,84,125]].",
        "Instruction 3 ADD: pop both, concat in push order -> one array of 14 bytes.",
        "Instruction 4 OUT: output buffer = those 14 bytes.",
        "Convert to ASCII -> " + A["RE-011"].answer + "."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
