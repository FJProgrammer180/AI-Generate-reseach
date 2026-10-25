/* ============================================================================
 * data/challenges-web.js - WEB SECURITY LAB (7 challenges)
 * ----------------------------------------------------------------------------
 * Everything here is a *simulated* vulnerable application rendered inside this
 * offline page. No request ever leaves the browser, no database is contacted,
 * no JavaScript supplied by the learner or by the dataset is executed - the
 * payload panels render as inert escaped text.
 *
 * The goal is recognition and reasoning about defensive code, not exploitation.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Web Security";

  CTF.register([
    {
      id: "WEB-001",
      title: "Input Inspector",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Spot which field of a form is processed without validation and explain the risk in one sentence.",
      description:
        "Code review of a lab registration endpoint (fictional app, inert snippet):\n\n" +
        "  function register(req) {\n" +
        "    const username = normaliseUser(req.body.username);   // trims, lowercases, length 3..20\n" +
        "    const email    = normaliseEmail(req.body.email);     // regex + domain allowlist\n" +
        "    const country  = lookupCountry(req.body.country);    // enum table, rejects unknown\n" +
        "    const note     = req.body.note;                      // stored exactly as received\n" +
        "    return db.insert({ username, email, country, note });\n" +
        "  }\n\n" +
        "Which input reaches storage without any validation? Answer with the field name.",
      skills: ["Input Validation", "Code Review", "Trust Boundaries", "Allowlisting"],
      data: {
        artifact: "web-lab",
        mode: "code",
        code: "function register(req) {\n  const username = normaliseUser(req.body.username);   // trims, lowercases, length 3..20\n  const email    = normaliseEmail(req.body.email);     // regex + domain allowlist\n  const country  = lookupCountry(req.body.country);    // enum table, rejects unknown\n  const note     = req.body.note;                      // stored exactly as received\n  return db.insert({ username, email, country, note });\n}",
        simulatedFields: [
          { name: "username", sample: "analyst_seven", validation: "trim, lowercase, length 3..20" },
          { name: "email", sample: "analyst@nullpoint.invalid", validation: "regex + domain allowlist" },
          { name: "country", sample: "NL", validation: "enum lookup, rejects unknown values" },
          { name: "note", sample: "anything at all, any length, any characters", validation: "NONE" }
        ],
        meta: "simulated app - submitting the form only echoes text back to you"
      },
      answer: { expects: ["note", "the note field", "FLAG{VALIDATE_AT_THE_BOUNDARY}"] },
      hints: [
        "Follow each field: three of them pass through a named normalisation or lookup function before storage.",
        "The fourth is assigned directly from the request body with a comment admitting it is stored as received.",
        "That field is 'note' - unvalidated free text going straight into the database."
      ],
      flag: "FLAG{VALIDATE_AT_THE_BOUNDARY}",
      explanation:
        "Three fields cross the trust boundary through a named function: normaliseUser constrains length and case, " +
        "normaliseEmail applies a pattern and an allowlist, lookupCountry rejects anything outside an enum. The note " +
        "field is assigned directly from the request body and stored verbatim - the comment even says so. That is the " +
        "finding. The risk is not that long text is ugly; it is that whatever this note is later rendered into " +
        "(a page, an email, a log viewer) inherits attacker-controlled content with no shape guarantee. The defensive " +
        "rule to write in the review: validate at the boundary, constrain by type and length, prefer allowlists, and " +
        "encode on output according to the context you are writing into.",
      solutionSteps: [
        "Trace each field from req.body to db.insert.",
        "Note the three named validators and the one direct assignment.",
        "Conclude 'note' is unvalidated.",
        "State the risk: stored free text with no shape guarantee, later rendered in unknown contexts."
      ]
    },
    {
      id: "WEB-002",
      title: "Safe vs Unsafe",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Distinguish parsing sinks from text sinks in DOM code and name the content type that makes the difference.",
      description:
        "Two lab widgets render the same user-supplied value. Only one of them is safe.\n\n" +
        "  A) panel.innerHTML = userValue;\n" +
        "  B) panel.textContent = userValue;\n\n" +
        "The simulated preview below shows both panels with the same inert sample string. Answer two things: which " +
        "option is unsafe, and what kind of content does the unsafe sink parse?",
      skills: ["DOM Sinks", "innerHTML vs textContent", "Output Encoding", "Context Awareness"],
      data: {
        artifact: "web-lab",
        mode: "safe-vs-unsafe",
        sample: "<b>hello</b> & <script>alert(1)</script>",
        unsafeLine: "panel.innerHTML = userValue;",
        safeLine: "panel.textContent = userValue;",
        meta: "the sample is displayed as inert escaped text; nothing is parsed or executed in this lab"
      },
      answer: { expects: ["A,HTML", "A, HTML", "A,HTML content", "FLAG{TEXTCONTENT_DOES_NOT_PARSE}"] },
      hints: [
        "Ask what each property does with a string: one parses it as markup, the other inserts it as literal text.",
        "innerHTML parses HTML, so tags in the value become real elements. textContent never parses.",
        "The unsafe option is A and the content type it parses is HTML."
      ],
      flag: "FLAG{TEXTCONTENT_DOES_NOT_PARSE}",
      explanation:
        "The distinction is about sinks, not about strings. innerHTML is a parsing sink: whatever you assign is " +
        "interpreted as markup, so a value containing tags produces elements. textContent is a text sink: the same " +
        "value appears literally and inertly. In the preview panel both widgets receive the identical sample and you " +
        "can see that only one of them would have produced structure. This is why output encoding must be chosen per " +
        "context - HTML body, HTML attribute, URL, JavaScript and CSS each need different escaping - and why 'escape " +
        "everything' only works if you know which sink you are writing into. Note that this lab never executes the " +
        "sample: it is rendered as escaped text on purpose.",
      solutionSteps: [
        "Identify the sink type of each line: parser (innerHTML) vs text (textContent).",
        "Compare the two previews with the same input.",
        "Answer A, HTML.",
        "Generalise: choose the escaping for the sink, not for the data."
      ]
    },
    {
      id: "WEB-003",
      title: "SQL Logic Lab",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Understand how string concatenation changes query logic, and why parameterisation removes the class of bug.",
      description:
        "Simulated login against an in-memory dummy table. Nothing is sent anywhere - the 'database' is a JavaScript " +
        "array in this page.\n\n" +
        "  users (dummy):\n" +
        "    { username: 'admin',   pin: '0000', role: 'admin'  }\n" +
        "    { username: 'guest',  pin: '1234', role: 'viewer' }\n" +
        "    { username: 'svc',    pin: '9999', role: 'service'}\n\n" +
        "  vulnerable builder:\n" +
        "    sql = \"SELECT * FROM users WHERE username = '\" + input.username + \"' AND pin = '\" + input.pin + \"'\";\n\n" +
        "The lab panel evaluates that expression against the dummy rows using a tiny SQL-shape evaluator. Two " +
        "questions, comma separated: which username is returned when the logic is subverted, and what is the classic " +
        "tautology fragment used in the username field?",
      skills: ["SQL Injection Concepts", "Query Logic", "Parameterised Queries", "Defensive Design"],
      data: {
        artifact: "sql-lab",
        table: [
          { username: "admin", pin: "0000", role: "admin" },
          { username: "guest", pin: "1234", role: "viewer" },
          { username: "svc", pin: "9999", role: "service" }
        ],
        builder: "SELECT * FROM users WHERE username = '<username>' AND pin = '<pin>'",
        safeBuilder: "SELECT * FROM users WHERE username = ? AND pin = ?",
        meta: "dummy in-memory table only - no external database, no real query is ever sent"
      },
      answer: {
        expects: [
          "admin,' OR '1'='1",
          "admin, ' OR '1'='1",
          "admin,OR 1=1",
          "FLAG{PARAMETERS_NOT_STRINGS}"
        ]
      },
      hints: [
        "Concatenation means the input is part of the query text, so a quote in the username closes the string literal early.",
        "Adding a tautology after the closing quote makes the WHERE clause always true, and the trailing comment or the pin clause absorbs the rest.",
        "The classic fragment is ' OR '1'='1 and the first matching row is admin, so answer: admin,' OR '1'='1"
      ],
      flag: "FLAG{PARAMETERS_NOT_STRINGS}",
      explanation:
        "The bug is a type confusion: user data is being merged into code. Once the username field contains a quote, " +
        "the database can no longer tell where the literal ends, and the tautology makes the WHERE clause " +
        "unconditionally true so the first row - admin - is returned regardless of the pin. Parameterisation fixes the " +
        "class of bug rather than the instance, because placeholders send the statement structure and the values " +
        "separately: the value can never be re-interpreted as SQL. Escaping and input filtering are weaker controls " +
        "and are bypassed often enough that they should not be the primary defence. This lab uses a dummy in-memory " +
        "table precisely so you can see the logic change without any query ever reaching a real database.",
      solutionSteps: [
        "Read the builder: the input is concatenated inside single quotes.",
        "Close the literal in the username field and append a tautology: ' OR '1'='1",
        "Observe the evaluator return the first row: admin.",
        "Rewrite with placeholders (?) and confirm no input can alter the statement shape."
      ]
    },
    {
      id: "WEB-004",
      title: "XSS Sandbox",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Recognise an unsafe rendering path and reason about impact, while the lab itself refuses to execute anything.",
      description:
        "A lab notes widget echoes a value back into the page:\n\n" +
        "  const out = document.getElementById('notes');\n" +
        "  out.innerHTML = 'Note: ' + new URLSearchParams(location.search).get('q');\n\n" +
        "The sandbox panel below lets you type a value and shows what the widget would do. It never executes " +
        "JavaScript: the value is displayed as inert text and the panel reports which sink would have received it.\n\n" +
        "Two questions, comma separated: which sink makes this unsafe, and which mitigation fixes it at the sink?",
      skills: ["XSS Concepts", "Unsafe Sinks", "Output Encoding", "Content Security Policy", "Sandbox Reasoning"],
      data: {
        artifact: "xss-sandbox",
        code: "out.innerHTML = 'Note: ' + params.get('q');",
        sink: "innerHTML",
        safeAlternatives: ["textContent", "setAttribute with encoded value", "template + escaped interpolation"],
        inertSamples: [
          "<b>bold</b>",
          "<img src=x onerror=alert(1)>",
          "<script>alert(1)</script>",
          "\"><svg onload=alert(1)>"
        ],
        meta: "sandbox displays samples as escaped text; no script is parsed, loaded or executed"
      },
      answer: {
        expects: [
          "innerHTML,textContent",
          "innerHTML, textContent",
          "innerHTML,use textContent",
          "FLAG{SANDBOX_NOT_EXECUTE}"
        ]
      },
      hints: [
        "The sink is named in the code: innerHTML, which parses markup from a value that includes user input.",
        "The minimal correct fix at the sink is to use a text-only property instead of a parsing property.",
        "Answer: innerHTML,textContent - then add defence in depth with a Content-Security-Policy and context-aware escaping."
      ],
      flag: "FLAG{SANDBOX_NOT_EXECUTE}",
      explanation:
        "The unsafe part is the sink: innerHTML parses its input, and the input is partly user controlled, so the page " +
        "can be made to build elements the author never intended. Replacing it with textContent removes the parsing " +
        "step entirely and is the smallest correct fix. Defence in depth still matters - a Content-Security-Policy " +
        "that forbids inline script, context-aware escaping when you genuinely need markup, and never placing user " +
        "data into attribute or URL contexts unencoded. Note the lab design choice: this panel shows you the payload " +
        "as inert text and tells you which sink would have received it. Understanding the mechanism does not require " +
        "executing anything, and a training tool that ran attacker-supplied script in your browser would itself be the " +
        "vulnerability.",
      solutionSteps: [
        "Identify the sink: innerHTML.",
        "Confirm the value is user-controlled via the query parameter.",
        "Choose the text-only sink: textContent (or an escaped template).",
        "Add CSP and context-aware escaping as layered controls.",
        "Verify in the sandbox that no sample is ever executed - it only reports the sink."
      ]
    },
    {
      id: "WEB-005",
      title: "Parameter Puzzle",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Read a request/response pair, spot the parameter that is trusted without an allowlist, and name the issue.",
      description:
        "Simulated application traffic from the lab portal (fictional host, .invalid domain):\n\n" +
        "  REQUEST\n" +
        "    GET /portal/redirect?next=https%3A%2F%2Flocker.nullpoint.invalid%2Ffiles HTTP/1.1\n" +
        "    Host: portal.lab.nullpoint.invalid\n\n" +
        "  RESPONSE\n" +
        "    HTTP/1.1 302 Found\n" +
        "    Location: https://locker.nullpoint.invalid/files\n\n" +
        "  REQUEST (second observation, same endpoint)\n" +
        "    GET /portal/redirect?next=https%3A%2F%2Fexample-attacker.invalid%2Fphish HTTP/1.1\n\n" +
        "  RESPONSE\n" +
        "    HTTP/1.1 302 Found\n" +
        "    Location: https://example-attacker.invalid/phish\n\n" +
        "Two questions, comma separated: which parameter is mishandled, and what control is missing?",
      skills: ["HTTP Semantics", "Query Parameters", "Open Redirect Concepts", "Allowlisting"],
      data: {
        artifact: "web-lab",
        mode: "traffic",
        exchanges: [
          {
            request: "GET /portal/redirect?next=https%3A%2F%2Flocker.nullpoint.invalid%2Ffiles HTTP/1.1\nHost: portal.lab.nullpoint.invalid",
            response: "HTTP/1.1 302 Found\nLocation: https://locker.nullpoint.invalid/files"
          },
          {
            request: "GET /portal/redirect?next=https%3A%2F%2Fexample-attacker.invalid%2Fphish HTTP/1.1\nHost: portal.lab.nullpoint.invalid",
            response: "HTTP/1.1 302 Found\nLocation: https://example-attacker.invalid/phish"
          }
        ],
        meta: "simulated traffic, fictional hosts only"
      },
      answer: {
        expects: ["next,allowlist", "next, allowlist", "next,domain allowlist", "FLAG{ALLOWLIST_THE_REDIRECT}"]
      },
      hints: [
        "Compare the two exchanges: the only thing that changed is the value of one query parameter.",
        "That parameter is 'next', and the server puts it straight into the Location header.",
        "The missing control is an allowlist of permitted destinations (or a relative-path-only redirect)."
      ],
      flag: "FLAG{ALLOWLIST_THE_REDIRECT}",
      explanation:
        "The server treats a request parameter as a trusted destination and reflects it into a 302 Location header. " +
        "Both exchanges succeed, including the one pointing at an attacker-controlled host, which is the definition of " +
        "an open redirect. On its own it looks minor; in a real case it is a credibility amplifier - the link starts " +
        "with your organisation's hostname, so it defeats the 'check the domain' advice you gave your users, and it " +
        "chains into phishing and into OAuth flows where the redirect target is security-relevant. The fix is an " +
        "allowlist of known destinations, or restricting the parameter to a relative path that cannot name a host. " +
        "Rejecting unknown values with a 400 and logging them gives you detection as well as prevention.",
      solutionSteps: [
        "Diff the two requests: only the 'next' value differs.",
        "Follow it into the response Location header - it is reflected verbatim.",
        "Conclude: unvalidated redirect target.",
        "Recommend an allowlist or relative-path-only handling, plus logging of rejected values."
      ]
    },
    {
      id: "WEB-006",
      title: "Authentication Logic",
      category: CAT,
      difficulty: "Hard",
      points: 400,
      objective: "Find a logic defect in authentication code that has no injection and no broken crypto - only a bad comparison.",
      description:
        "Session check from a dummy lab service. No real accounts exist; the token is a random value generated for " +
        "this exercise.\n\n" +
        "  function authorize(sessionToken) {\n" +
        "    const expected = process.env.LAB_TOKEN;      // dummy random string\n" +
        "    if (sessionToken == expected) {              // line 3\n" +
        "      return { ok: true, role: 'admin' };        // line 4\n" +
        "    }\n" +
        "    return { ok: false, role: null };\n" +
        "  }\n\n" +
        "The comparison on line 3 uses a loose equality operator. In this language, one particular string value " +
        "coerces to the number 0, and the dummy token in the lab environment can be the number 0 when the variable is " +
        "unset. Two questions, comma separated: which line is defective, and which single-character string value " +
        "abuses the coercion?",
      skills: ["Authentication Logic", "Type Coercion", "Secure Comparison", "Code Review"],
      data: {
        artifact: "web-lab",
        mode: "code",
        code: "function authorize(sessionToken) {\n  const expected = process.env.LAB_TOKEN;      // dummy random string\n  if (sessionToken == expected) {              // line 3\n    return { ok: true, role: 'admin' };        // line 4\n  }\n  return { ok: false, role: null };\n}",
        meta: "dummy service, no accounts, no network, no credentials"
      },
      answer: { expects: ["3,0", "line 3, 0", "3,'0'", "FLAG{STRICT_COMPARE_ALWAYS}"] },
      hints: [
        "Count the lines: the comparison itself is on line 3, and line 4 is only the consequence of it.",
        "Loose equality between a string and a number coerces the string to a number first.",
        "The string '0' coerces to 0, so when the expected token is the number 0 the check passes: answer 3,0"
      ],
      flag: "FLAG{STRICT_COMPARE_ALWAYS}",
      explanation:
        "There is no injection here and no cryptographic weakness - only a comparison. Loose equality coerces operands " +
        "to a common type, so the string '0' becomes the number 0 and matches an unset or numeric-zero expected value, " +
        "granting the admin role on line 4. Three fixes belong in the review: use strict equality so no coercion " +
        "happens; fail closed when the expected secret is missing instead of comparing against an empty or zero value; " +
        "and compare secrets with a constant-time routine so that timing does not leak how many leading characters " +
        "matched. The generalisable habit is to treat every conditional in an authentication path as security-critical " +
        "code and read it asking 'what makes this true?' rather than 'does this look right?'",
      solutionSteps: [
        "Locate the comparison: line 3 uses loose equality.",
        "Ask what makes it true: any value that coerces to the expected value.",
        "Identify '0' -> 0 as the coercion path when the expected token is numeric zero.",
        "Recommend strict equality, fail-closed on missing secrets, and constant-time comparison."
      ]
    },
    {
      id: "WEB-007",
      title: "Web Security Case",
      category: CAT,
      difficulty: "Hard",
      points: 500,
      objective: "Triage four findings in one simulated application, rank them by severity, and identify the highest risk item.",
      description:
        "Full review of the lab portal (simulated, fictional host). Four observations were recorded by the intake " +
        "scanner:\n\n" +
        "  F1  GET /portal/debug?dump=1 returns the service configuration including the database DSN and a\n" +
        "      dummy lab secret. No authentication is required and the endpoint is not in the route map.\n" +
        "  F2  GET /portal/search?q=<value> reflects the value into the response body without encoding.\n" +
        "  F3  A failed database call returns the raw driver error, including the statement text, to the client.\n" +
        "  F4  The session cookie is set without the Secure and HttpOnly attributes.\n\n" +
        "Rank them from most to least severe and submit the ordering as four labels separated by '>', for example " +
        "F1>F2>F3>F4. Justify the top item in the writeup step.",
      skills: ["Finding Triage", "Severity Ranking", "Security Misconfiguration", "Information Disclosure", "Cookie Flags"],
      data: {
        artifact: "web-lab",
        mode: "findings",
        findings: [
          { id: "F1", text: "unauthenticated /portal/debug?dump=1 exposes configuration and a dummy secret" },
          { id: "F2", text: "search parameter reflected into the body without encoding" },
          { id: "F3", text: "raw driver error including statement text returned to the client" },
          { id: "F4", text: "session cookie without Secure and HttpOnly" }
        ],
        meta: "simulated portal, fictional host, dummy secret value only"
      },
      answer: { expects: ["F1>F2>F3>F4", "F1>F2>F4>F3", "FLAG{TRIAGE_BEFORE_YOU_FIX}"] },
      hints: [
        "Rank by what an attacker gains without any preconditions: an unauthenticated configuration dump hands out secrets and internal structure immediately.",
        "Reflected unencoded output is next - it needs a victim to click, but it runs in the victim's session.",
        "Verbose errors and missing cookie flags are hardening items: they amplify other bugs rather than granting access on their own. F1>F2>F3>F4"
      ],
      flag: "FLAG{TRIAGE_BEFORE_YOU_FIX}",
      explanation:
        "Severity is about preconditions and reach, not about how interesting a bug looks. F1 needs nothing - no " +
        "session, no victim interaction - and it discloses configuration plus a secret, so it is the top item and it " +
        "also invalidates any assumption you made about the other findings. F2 needs a victim to follow a crafted " +
        "link but then executes in that victim's session, which is a strong second. F3 leaks statement text and schema " +
        "detail that makes F2 and any injection easier to develop, and F4 removes two cheap browser-side protections " +
        "(transport confidentiality and script access to the cookie) that limit the damage from F2. A defensible " +
        "ordering is F1>F2>F3>F4, with F3 and F4 close enough that either order is acceptable if you justify it - the " +
        "skill being assessed is the reasoning, not the exact tie-break.",
      solutionSteps: [
        "List the precondition for each finding: none (F1), victim interaction (F2), error path only (F3), transport/script access (F4).",
        "Rank by unconditioned gain: F1 first.",
        "Place F2 second because it executes in a user session.",
        "Treat F3 and F4 as amplifiers/hardening and justify the tie-break.",
        "Write the remediation order: remove the debug route, encode output, generic error pages, set cookie flags."
      ]
    },
    {
      id: "WEB-012",
      title: "The Unsigned Session",
      category: CAT,
      difficulty: "Expert",
      points: 900,
      objective: "Analyse a token validator whose trust decisions come from attacker-supplied data, forge the lab token, and state the correct validation contract.",
      description:
        "A lab service validates session tokens with three base64url parts. The validator is below; the secret is a " +
        "dummy value and no real service is involved.\n\n" + A["WEB-012"].serverCode + "\n\n" +
        "A legitimate viewer token was captured:\n  " + A["WEB-012"].legit + "\n\n" +
        "Tasks:\n" +
        "  1. identify the two distinct defects that together allow privilege change\n" +
        "  2. construct the forged token this validator accepts for role=admin\n" +
        "  3. submit the flag that states the validation rule that was broken\n\n" +
        "You can decode the captured token in the lab panel to see its header and payload.",
      skills: ["Token Validation", "Algorithm Confusion", "Signature Verification", "Authorisation Design", "Base64url"],
      data: {
        artifact: "web-lab",
        mode: "token",
        code: A["WEB-012"].serverCode,
        tokens: [
          { label: "captured viewer token", value: A["WEB-012"].legit },
          { label: "header (decoded)", value: A["WEB-012"].legitHeaderJson },
          { label: "payload (decoded)", value: A["WEB-012"].legitPayloadJson }
        ],
        forgeParts: { header: A["WEB-012"].headerJson, payload: A["WEB-012"].payloadJson },
        meta: "dummy secret, fictional service, no token is ever sent anywhere"
      },
      answer: { expects: [A["WEB-012"].flag, A["WEB-012"].forged] },
      hints: [
        "Defect one: the algorithm is read from the token header, so the attacker chooses it. Defect two: role is taken from the payload without a server-side authorisation check.",
        "With alg 'none' the validator returns the payload without touching the signature, and the third segment may be empty.",
        "base64url-encode {\"alg\":\"none\",\"typ\":\"JWT\"} and {\"sub\":\"analyst-7\",\"role\":\"admin\",\"lab\":\"nullpoint.invalid\",\"exp\":1893456000}, join with dots and leave the signature empty: " + A["WEB-012"].forged
      ],
      flag: A["WEB-012"].flag,
      explanation:
        "Two independent defects compound. First, the validator asks the token which algorithm protects it - the header " +
        "is attacker-controlled data, so 'none' means 'do not check anything', and the early return skips signature " +
        "verification entirely. Second, authorisation reads role straight from the payload, so whoever controls the " +
        "payload controls the privilege. Forging is then trivial: encode a header with alg none, a payload with " +
        "role admin, join with dots, leave the signature empty. The correct validation contract is the flag: the " +
        "server pins the algorithm it expects, rejects any token that does not match, verifies the signature with a " +
        "constant-time comparison before reading a single claim, validates exp/nbf/iss/aud, and only then derives " +
        "authorisation from server-side state rather than from a claim the client supplied. This is the same shape as " +
        "every 'trust the client's description of its own security' bug.",
      solutionSteps: [
        "Decode the captured token: header alg HS256, payload role viewer.",
        "Read the validator: header.alg decides the branch, and 'none' returns the payload unverified.",
        "Note that authorize() trusts payload.role with no server-side check.",
        "Build the forged token: base64url({\"alg\":\"none\",\"typ\":\"JWT\"}) + '.' + base64url(payload with role admin) + '.'",
        "State the contract: pin the algorithm, verify before trusting, authorise from server state."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
