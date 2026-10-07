/* ============================================================================
 * data/challenges-code.js - PROGRAMMING (6 challenges)
 * Code answers are executed in a frozen, capability-free sandbox
 * (CTF.runCode): no DOM, no network, no timers, no require, no globals leaking.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Programming";

  var BUGGY_SUM_EVEN = [
    "function sumEven(nums) {",
    "  let total = 0;",
    "  for (let i = 0; i <= nums.length; i++) {",
    "    if (nums[i] % 2 === 1) {",
    "      total += nums[i];",
    "    }",
    "  }",
    "  return total;",
    "}",
    "",
    "// keep the function name and signature; fix the body"
  ].join("\n");

  var BUGGY_MAX = [
    "function maxOf(nums) {",
    "  let best = 0;",
    "  for (let i = 0; i < nums.length; i++) {",
    "    if (nums[i] > best) {",
    "      best = nums[i];",
    "    }",
    "  }",
    "  return best;",
    "}"
  ].join("\n");

  CTF.register([
    {
      id: "CODE-001",
      title: "Fix the Function",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Repair two defects in a small loop - a bound error and an inverted condition - so the function satisfies its tests.",
      description:
        "sumEven should return the sum of the even numbers in an array. It currently returns undefined or the wrong " +
        "total. For the reference array " + JSON.stringify(A["CODE-001"].nums) + " the correct answer is " +
        A["CODE-001"].answer + ".\n\n" + BUGGY_SUM_EVEN + "\n\n" +
        "Paste the corrected function below. It is checked against three hidden test cases in a sandbox with no " +
        "network, no DOM and no timers.",
      skills: ["Loop Bounds", "Off By One", "Parity Check", "Undefined Handling", "Test Driven Fixing"],
      data: {
        artifact: "code",
        language: "javascript",
        code: BUGGY_SUM_EVEN,
        reference: "sumEven(" + JSON.stringify(A["CODE-001"].nums) + ") === " + A["CODE-001"].answer,
        meta: "sandboxed evaluation: the function is called with three arrays and must return exact numbers"
      },
      answer: {
        type: "code",
        tests: [
          { call: "sumEven([4, 7, 12, 9, 20, 33, 8, 15, 26, 1])", expect: 70 },
          { call: "sumEven([])", expect: 0 },
          { call: "sumEven([1, 3, 5])", expect: 0 },
          { call: "sumEven([2, 2, 2])", expect: 6 },
          { call: "sumEven([-4, 7, -6])", expect: -10 }
        ]
      },
      hints: [
        "Two separate defects. First, the loop condition: i <= nums.length reads one element past the end, which is undefined.",
        "Second, the parity test is inverted - % 2 === 1 selects odd numbers, not even ones.",
        "Fix both: loop while i < nums.length and select nums[i] % 2 === 0. Return 0 for an empty array."
      ],
      flag: "FLAG{BOUNDS_AND_CONDITIONS}",
      explanation:
        "Two classic defects in six lines. The bound i <= nums.length runs one iteration too far, so nums[i] is " +
        "undefined; undefined % 2 is NaN, NaN === 1 is false, and the bad iteration silently contributes nothing - " +
        "which is why this bug often survives review. The parity test is simply inverted, selecting odd values. " +
        "Corrected: iterate while i < nums.length and add when nums[i] % 2 === 0, with an empty array naturally " +
        "returning the initial 0. The wider lesson is that both defects are invisible in the happy path and only " +
        "appear at the edges, so test the edges: empty input, all-odd input, and negative numbers (note that -4 % 2 " +
        "is 0 in JavaScript, so the even test still works, but -3 % 2 is -1, not 1, which breaks naive odd tests).",
      solutionSteps: [
        "Change the loop bound to i < nums.length.",
        "Change the condition to nums[i] % 2 === 0.",
        "Keep total initialised to 0 so empty and all-odd arrays return 0.",
        "Verify against the reference array: 4+12+20+8+26 = 70."
      ]
    },
    {
      id: "CODE-002",
      title: "Find the Bug",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Explain why code that looks reasonable returns a wrong result, then fix it so it passes negative-number tests.",
      description:
        "maxOf is supposed to return the largest value in an array. It passes the obvious test with " +
        JSON.stringify(A["CODE-002"].arr) + " and returns " + A["CODE-002"].answer + ", so it was shipped. It then " +
        "returned 0 for [-5, -2, -9] in production.\n\n" + BUGGY_MAX + "\n\n" +
        "Line numbers start at 1. Submit the corrected function; it must also work for all-negative arrays.",
      skills: ["Initialisation Bugs", "Invariant Reasoning", "Edge Case Testing"],
      data: {
        artifact: "code",
        language: "javascript",
        code: BUGGY_MAX,
        reference: "maxOf(" + JSON.stringify(A["CODE-002"].arr) + ") === " + A["CODE-002"].answer +
          "  and  maxOf([-5, -2, -9]) === -2",
        meta: "the defect is not the comparison operator - it is the starting value"
      },
      answer: {
        type: "code",
        tests: [
          { call: "maxOf([17, 42, 8, 99, 23, 5, 61])", expect: 99 },
          { call: "maxOf([-5, -2, -9])", expect: -2 },
          { call: "maxOf([7])", expect: 7 },
          { call: "maxOf([3, 3, 3])", expect: 3 },
          { call: "maxOf([0, -1])", expect: 0 }
        ]
      },
      hints: [
        "The loop and the comparison are both correct. The problem is the value 'best' starts at before any element is examined.",
        "Starting at 0 assumes the answer is at least 0, so an all-negative array never updates best and the function returns 0.",
        "Initialise best from the data instead: let best = nums[0]; then loop from index 1."
      ],
      flag: "FLAG{INITIALISE_FROM_THE_DATA}",
      explanation:
        "This is an invariant bug rather than a syntax bug. The accumulator must start at a value that cannot win " +
        "unless it is genuinely the answer; 0 wins by default whenever every element is negative, so the function " +
        "returns a value that is not even in the array. Initialising from the data (best = nums[0], then comparing " +
        "from index 1) makes the invariant true by construction and removes the need to reason about the sign of the " +
        "input. It also fails loudly on an empty array instead of silently returning 0, which is usually what you " +
        "want. The testing lesson is sharper: the bug was invisible to the test the author wrote because that test " +
        "used positive numbers, so the acceptance criteria - not the code - is where the review should have caught it.",
      solutionSteps: [
        "Read the function and confirm the comparison is correct.",
        "Identify the initial value 0 as an assumption about the data.",
        "Initialise best = nums[0] and iterate from i = 1.",
        "Test the all-negative case, the single element case and duplicates."
      ]
    },
    {
      id: "CODE-003",
      title: "Array Detective",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Use the algebraic properties of XOR to isolate a value, without sorting or counting.",
      description:
        "A telemetry batch produced this array. Every value appears exactly twice except one, which appears once:\n\n" +
        "  " + JSON.stringify(A["CODE-003"].arr) + "\n\n" +
        "Find the unpaired value in a single pass with no extra storage, then build the flag as " +
        "FLAG{<that value as two digit uppercase hex>}.\n\n" +
        "The array has " + A["CODE-003"].arr.length + " elements and " + A["CODE-003"].unique.length +
        " distinct values, so the odd one out is not obvious by eye.",
      skills: ["XOR Properties", "Single Pass Algorithms", "Constant Space", "Hexadecimal Formatting"],
      data: {
        artifact: "code",
        language: "javascript",
        code: "// reduce with XOR: x ^ x === 0 and x ^ 0 === x\nconst arr = " + JSON.stringify(A["CODE-003"].arr) + ";\nlet acc = 0;\nfor (const v of arr) acc ^= v;\n// acc is now the unpaired value",
        reference: "xor of all elements = " + A["CODE-003"].xor,
        meta: "pairs cancel; the remaining accumulator is the answer"
      },
      answer: { expects: [A["CODE-003"].flag, "59", "0x3B"] },
      hints: [
        "XOR is commutative, associative, and self-cancelling: a ^ a = 0 and a ^ 0 = a.",
        "XOR every element into one accumulator; all paired values cancel and only the single one survives.",
        "The accumulator is 59, which is 3B in two digit uppercase hex, so the flag is FLAG{3B}."
      ],
      flag: A["CODE-003"].flag,
      explanation:
        "The whole trick is algebraic: because XOR is commutative and associative you can fold the array in any order, " +
        "and because every value is its own inverse the pairs annihilate, leaving exactly the unpaired element. That " +
        "gives one pass, O(1) extra space and no sorting - strictly better than building a frequency map. The same " +
        "property is why XOR shows up everywhere in security work: checksums, simple obfuscation, and the crib attacks " +
        "in the crypto category. The final step is presentation, not logic: 59 formats as 3B in two digit uppercase " +
        "hex. Always confirm the required output format - most lost points in this kind of task come from submitting " +
        "59 when 3B was asked for.",
      solutionSteps: [
        "Initialise an accumulator to 0.",
        "XOR each array element into it.",
        "The result is the unpaired value: 59.",
        "Format as two digit uppercase hex: 3B, and build FLAG{3B}."
      ]
    },
    {
      id: "CODE-004",
      title: "String Puzzle",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Apply a documented string recipe exactly, and see why case and order transformations must be specified precisely.",
      description:
        "A build script produced the flag from three words using this recipe:\n\n" +
        "  parts    = " + JSON.stringify(A["CODE-004"].parts) + "\n" +
        "  recipe   = " + A["CODE-004"].recipe + "\n\n" +
        "Reconstruct the value. Submit the exact result.",
      skills: ["String Manipulation", "Case Conversion", "Reversal", "Recipe Following"],
      data: {
        artifact: "code",
        language: "javascript",
        code: "const parts = " + JSON.stringify(A["CODE-004"].parts) + ";\nconst rev = (s) => s.split('').reverse().join('');\nconst flag = parts[0].toUpperCase() + '{' + rev(parts[1].toUpperCase()) + '_' + rev(parts[2].toUpperCase()) + '}';",
        reference: "three words, one reversal per word, one brace pair",
        meta: "the recipe is literal - apply it exactly as written"
      },
      answer: { expects: A["CODE-004"].flag },
      hints: [
        "Reverse each of the second and third words *after* uppercasing them; the first word is only uppercased.",
        "'string' uppercased and reversed is GNIRTS; 'surgeon' uppercased and reversed is NOEGRUS.",
        "Assemble: FLAG{ + GNIRTS + _ + NOEGRUS + } -> " + A["CODE-004"].flag
      ],
      flag: A["CODE-004"].flag,
      explanation:
        "This task measures precision, not cleverness. Reversal and case conversion do not commute in the sense that " +
        "matters here: you must apply the operations in the documented order, and the reversal applies to two of the " +
        "three words only. The common failure is reversing the first word as well, or forgetting the single underscore " +
        "separator, or dropping the braces. In real work the same discipline applies to any deterministic " +
        "transformation chain - implement it exactly as specified, then verify by running the chain forward from your " +
        "answer to see whether you land on the documented input.",
      solutionSteps: [
        "Uppercase all three parts: FLAG, STRING, SURGEON.",
        "Reverse the second and third: GNIRTS, NOEGRUS.",
        "Assemble with braces and one underscore between them.",
        "Verify by reversing the process back to the original words."
      ]
    },
    {
      id: "CODE-005",
      title: "Algorithm Maze",
      category: CAT,
      difficulty: "Hard",
      points: 350,
      objective: "Simulate a deterministic walk over a grid by hand or in code, and collect the letters on the path.",
      description:
        "A 4x5 letter grid and a list of moves. Start at the top left cell (row 0, column 0), include that first " +
        "letter, then apply each move in order and append the letter you land on.\n\n" +
        "  GRID (rows top to bottom)\n" +
        A["CODE-005"].grid.map(function (r, i) { return "    row " + i + ": " + r; }).join("\n") + "\n\n" +
        "  MOVES\n    " + A["CODE-005"].moves.join(" -> ") + "\n\n" +
        "RIGHT and DOWN increase the column and row index; LEFT and UP decrease them. Submit the flag wrapping the " +
        "collected letters.",
      skills: ["Grid Simulation", "State Tracking", "Instruction Interpretation", "Index Arithmetic"],
      data: {
        artifact: "grid",
        grid: A["CODE-005"].grid,
        moves: A["CODE-005"].moves,
        meta: "start (0,0) inclusive; " + A["CODE-005"].moves.length + " moves; the walk never leaves the grid"
      },
      answer: { expects: [A["CODE-005"].flag, A["CODE-005"].path] },
      hints: [
        "Track (row, col) explicitly and include the starting cell letter 'C' before applying any move.",
        "The first three moves are RIGHT, RIGHT, RIGHT, taking you along row 0: C O D E.",
        "The full walk spells " + A["CODE-005"].path + ", so the flag is " + A["CODE-005"].flag + "."
      ],
      flag: A["CODE-005"].flag,
      explanation:
        "Grid walks are state machines: your only job is to keep the position accurate and to include the starting " +
        "cell, which most people forget. Applying the moves in order traces a snake down the grid and spells " +
        A["CODE-005"].path + ". Whether you do it by hand or write the four line loop, the discipline that matters is " +
        "the same as when reading a disassembled control flow or replaying a packet capture: maintain explicit state, " +
        "advance one step at a time, and validate the intermediate value (here: does the partial string still look " +
        "like a word?) rather than trusting the final result.",
      solutionSteps: [
        "Start at (0,0) = 'C'; keep a path string.",
        "Apply each move, updating row/col, appending the landed letter.",
        "Check the partial string after every few moves - it should read as words.",
        "Final path: " + A["CODE-005"].path + "; wrap it in FLAG{...}."
      ]
    },
    {
      id: "CODE-011",
      title: "The Last Seat",
      category: CAT,
      difficulty: "Expert",
      points: 600,
      objective: "Recognise a known elimination process, model it correctly, and verify the closed form against a simulation.",
      description:
        "A lab scheduling puzzle with a classic shape. n = " + A["CODE-011"].n + " analysts sit in a circle numbered " +
        "1.." + A["CODE-011"].n + ". Counting starts at analyst 1 and every k-th person is removed from the circle, " +
        "with k = " + A["CODE-011"].k + ". Counting continues from the next remaining person until one is left.\n\n" +
        "Which analyst number is left standing? Submit the flag FLAG{JOSEPHUS_SEAT_<n>}.\n\n" +
        "Two requirements: model it exactly (the count resumes after each removal, it does not restart at 1), and " +
        "confirm your answer with a second method.",
      skills: ["Josephus Problem", "Simulation", "Recurrence Relations", "Model Verification"],
      data: {
        artifact: "code",
        language: "javascript",
        code: "// simulate: keep a list, advance (k - 1) positions modulo the current length, remove, repeat\nconst people = Array.from({ length: " + A["CODE-011"].n + " }, (_, i) => i + 1);\nlet idx = 0;\nwhile (people.length > 1) {\n  idx = (idx + " + A["CODE-011"].k + " - 1) % people.length;\n  people.splice(idx, 1);\n}\n// people[0] is the survivor",
        reference: "n = " + A["CODE-011"].n + ", k = " + A["CODE-011"].k,
        meta: "the recurrence J(1)=0, J(n)=(J(n-1)+k) mod n gives the zero-based survivor"
      },
      answer: { expects: [A["CODE-011"].flag, String(A["CODE-011"].survivor)] },
      hints: [
        "The counting index must be carried across removals: idx = (idx + k - 1) % currentLength. Restarting from zero each round gives a wrong answer.",
        "Simulate it with a list and splice, or use the recurrence J(1) = 0, J(n) = (J(n-1) + k) mod n and add 1 to convert to 1-based numbering.",
        "Both methods give survivor " + A["CODE-011"].survivor + ", so the flag is " + A["CODE-011"].flag + "."
      ],
      flag: A["CODE-011"].flag,
      explanation:
        "This is the Josephus problem, and the interesting part is not the answer but the modelling. The elimination " +
        "count continues from the position after each removal, so the index must be carried modulo the shrinking " +
        "length - a simulation that resets the counter each round produces a plausible but wrong number. The closed " +
        "form recurrence J(1) = 0 and J(n) = (J(n-1) + k) mod n computes the same result in O(n) time with O(1) " +
        "space, zero-based, so add 1 for the seat number. Running both a direct simulation and the recurrence and " +
        "requiring them to agree is the actual skill being tested: two independent derivations agreeing is evidence, " +
        "one derivation is a hope. For n = " + A["CODE-011"].n + " and k = " + A["CODE-011"].k + " the survivor is " +
        "seat " + A["CODE-011"].survivor + ".",
      solutionSteps: [
        "Model the circle as a list; carry the index across removals with modulo arithmetic.",
        "Simulate until one remains -> " + A["CODE-011"].survivor + ".",
        "Independently apply J(n) = (J(n-1) + k) mod n from n = 1 up to " + A["CODE-011"].n + ", then add 1.",
        "Confirm both methods agree, then submit FLAG{JOSEPHUS_SEAT_" + A["CODE-011"].survivor + "}."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
