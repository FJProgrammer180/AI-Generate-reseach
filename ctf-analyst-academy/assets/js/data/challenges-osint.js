/* ============================================================================
 * data/challenges-osint.js - OSINT SIMULATOR (5 challenges)
 * ----------------------------------------------------------------------------
 * HARD RULE FOR THIS CATEGORY: every person, company, handle, domain, avatar
 * hash and address below is invented for this lab. Domains use the reserved
 * .invalid TLD, "public" addresses come from the documentation ranges
 * (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), and no step asks you to
 * look anything up on the real internet.
 *
 * The point is the *method* - correlate, attribute, order, verify - practised
 * on data that cannot harm anyone.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var O = A.OSINT;
  var CAT = "OSINT";

  var DISCLAIMER =
    "FICTIONAL DATA ONLY: the identities, companies, domains and hashes in this lab are invented. " +
    "Do not search for them online, and never apply these techniques to real people.";

  var FLAG_001 = "FLAG{WIDEST_FOOTPRINT_WINS}";
  var FLAG_003 = "FLAG{GHOSTWRITER_09}";
  var FLAG_004 = "FLAG{PHISHING_FIRST}";
  var FLAG_005 = "FLAG{GHOSTWRITER_09_ON_WORKSTATION_7}";
  var FLAG_011 = "FLAG{ATTRIBUTION_REQUIRES_TWO_SOURCES}";

  CTF.register([
    {
      id: "OSINT-001",
      title: "Username Trail",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Correlate handles across fictional platforms and identify the one persona with the widest footprint.",
      description: DISCLAIMER + "\n\n" +
        "Four fictional lab platforms were scraped. Each handle below is a persona observed on that platform:\n\n" +
        Object.keys(O.usernames).map(function (u) {
          return "  " + u.padEnd(20, " ") + " -> " + O.usernames[u].join(", ");
        }).join("\n") + "\n\n" +
        "Which handle appears on the most platforms, and is therefore the strongest single persona lead? Submit it.",
      skills: ["Handle Correlation", "Footprint Mapping", "Persona Analysis"],
      data: {
        artifact: "table",
        headers: ["HANDLE", "PLATFORMS OBSERVED", "COUNT"],
        rows: Object.keys(O.usernames).map(function (u) {
          return [u, O.usernames[u].join(", "), String(O.usernames[u].length)];
        }),
        meta: "fictional platforms: nullgram, devhub, chatbox, forumlab"
      },
      answer: { expects: [O.answerUsername, FLAG_001] },
      hints: [
        "Count the platforms per handle rather than eyeballing the list - one handle appears three times.",
        "Note that 'g_writer09' looks like a shortened variant of the same name; treat similar handles as a lead, not as proof.",
        "The handle on the most platforms is " + O.answerUsername + " (nullgram, chatbox, forumlab)."
      ],
      flag: FLAG_001,
      explanation:
        "Handle correlation is a counting exercise first and an inference exercise second. " + O.answerUsername + " " +
        "appears on three of the four platforms, which makes it the widest footprint and the natural starting point. " +
        "The near-variant g_writer09 is a lead worth pursuing but is not evidence on its own - similar names are " +
        "common and coincidence is the default explanation. The discipline that keeps this ethical and accurate: " +
        "require a second independent linking signal (here the shared avatar hash in the next lab) before treating two " +
        "handles as one person, and never apply the technique to real identities. In this lab everything is invented, " +
        "so the only thing you can damage is your own reasoning.",
      solutionSteps: [
        "Tabulate handle -> platforms.",
        "Count occurrences: " + O.answerUsername + " = 3, analyst_seven = 2, others = 1.",
        "Flag g_writer09 as a possible variant requiring corroboration.",
        "Submit the widest footprint handle."
      ]
    },
    {
      id: "OSINT-002",
      title: "Fake Company",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Extract and cross-check structured facts about an organisation from a fictional profile dataset.",
      description: DISCLAIMER + "\n\n" +
        "Profile of the fictional company used across this lab:\n\n" +
        Object.keys(O.company).map(function (k) {
          var v = O.company[k];
          return "  " + k.padEnd(16, " ") + ": " + (Array.isArray(v) ? v.join(" | ") : v);
        }).join("\n") + "\n\n" +
        "Question: report the founding year and the employee count, comma separated.",
      skills: ["Structured Data Extraction", "Source Cross Checking", "Entity Profiling"],
      data: {
        artifact: "table",
        headers: ["FIELD", "VALUE"],
        rows: Object.keys(O.company).map(function (k) {
          var v = O.company[k];
          return [k, Array.isArray(v) ? v.join(" | ") : String(v)];
        }),
        meta: "fictional company, reserved .invalid domain"
      },
      answer: { expects: ["2019,148", "2019, 148", "FLAG{NULLPOINT_2019_148}"] },
      hints: [
        "Both values are explicit fields in the profile - this task tests reading, not guessing.",
        "Founded 2019; employeeCount 148.",
        "Submit 2019,148."
      ],
      flag: "FLAG{NULLPOINT_2019_148}",
      explanation:
        "Entity profiling is mostly disciplined reading plus source awareness. The profile states founded 2019 and 148 " +
        "employees directly, so the correct answer is a lookup - but the point is the surrounding habit. Ask where " +
        "each field came from, when it was last true, and whether two sources agree; employee counts in particular " +
        "drift quickly and are often copied between pages. In a real investigation you would record the retrieval date " +
        "with every field and prefer primary sources over aggregators. Here the company is invented, the domain uses " +
        "the reserved .invalid TLD, and the exercise is safe precisely because of that.",
      solutionSteps: [
        "Read the profile fields rather than inferring from the narrative.",
        "Take founded = 2019 and employeeCount = 148.",
        "Note in your writeup which fields are volatile (headcount, offices) and which are stable (founding year).",
        "Submit 2019,148."
      ]
    },
    {
      id: "OSINT-003",
      title: "Digital Footprint",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Link separate observations into one identity using an independent corroborating signal, not name similarity.",
      description: DISCLAIMER + "\n\n" +
        "Five observations were collected from the fictional platforms:\n\n" +
        O.footprint.map(function (f, i) {
          return "  [" + (i + 1) + "] " + f.source.padEnd(18, " ") + " value: " + f.value + "\n      note: " + f.note;
        }).join("\n") + "\n\n" +
        "Two different handles are linked by one strong independent signal. Identify the persona and submit the flag " +
        "built from the primary handle in uppercase.",
      skills: ["Identity Linking", "Corroboration", "Evidence Weighting", "Avatar Hashing Concepts"],
      data: {
        artifact: "table",
        headers: ["#", "SOURCE", "VALUE", "NOTE"],
        rows: O.footprint.map(function (f, i) { return [String(i + 1), f.source, f.value, f.note]; }),
        meta: "the linking signal is observation 5: an identical avatar hash on two platforms"
      },
      answer: { expects: [FLAG_003, O.answerUsername] },
      hints: [
        "Name similarity is weak evidence. Look for a signal that is independent of the chosen name.",
        "Observation 5 records the same avatar hash (9f2c41ab, fictional) on nullgram and chatbox.",
        "Those two platforms carry the handle " + O.answerUsername + ", so the flag is " + FLAG_003 + "."
      ],
      flag: FLAG_003,
      explanation:
        "Attribution quality depends on the independence of your evidence. Handle similarity is weak: people reuse " +
        "name patterns, and adversaries deliberately mimic them. A matching avatar hash is stronger because it is a " +
        "property of an uploaded file rather than of a chosen string - though still not conclusive, since images are " +
        "shared and re-uploaded. Here nullgram and chatbox both carry " + O.answerUsername + " and both carry avatar " +
        "hash 9f2c41ab, which is two independent signals pointing the same way; devhub's g_writer09 stays a lead " +
        "because it has only name similarity. The rule to take away: count independent signals, weight them, and say " +
        "out loud which conclusions are provisional.",
      solutionSteps: [
        "List each observation and classify its evidence type: name-based or content-based.",
        "Discard name similarity as a linking signal on its own.",
        "Use the identical avatar hash across nullgram and chatbox as the corroboration.",
        "Conclude the persona is " + O.answerUsername + " and submit " + FLAG_003 + ".",
        "Record devhub's g_writer09 as an unconfirmed lead."
      ]
    },
    {
      id: "OSINT-004",
      title: "Timeline Investigation",
      category: CAT,
      difficulty: "Medium",
      points: 300,
      objective: "Order events from mixed sources into one UTC timeline and identify the earliest step of an intrusion chain.",
      description: DISCLAIMER + "\n\n" +
        "Five events were exported from different fictional systems, in arrival order:\n\n" +
        O.timeline.map(function (e, i) {
          return "  [" + (i + 1) + "] " + e.ts + "  " + e.event;
        }).join("\n") + "\n\n" +
        "Submit the event numbers (the bracketed indices above) in chronological order, comma separated, earliest " +
        "first.",
      skills: ["Timeline Construction", "Timestamp Normalisation", "Intrusion Chain Reasoning"],
      data: {
        artifact: "timeline",
        events: O.timeline.map(function (e, i) {
          return { id: String(i + 1), ts: e.ts, text: e.event };
        }),
        meta: "all timestamps are UTC ISO-8601; fictional hosts and accounts"
      },
      answer: { expects: ["5,3,1,2,4", "5, 3, 1, 2, 4", FLAG_004] },
      hints: [
        "All timestamps are already UTC, so plain string sorting on the ISO-8601 value gives the correct order.",
        "Two events fall on 2026-02-13 and three on 2026-02-14 - the earliest is the phishing delivery at 19:47:09Z on the 13th.",
        "Chronological order is 5, 3, 1, 2, 4 - phishing, password reset, VPN login, repo clone, archive upload."
      ],
      flag: FLAG_004,
      explanation:
        "Once the events are ordered, the chain reads as a coherent intrusion narrative: a phishing email is delivered " +
        "(event 5), a password reset is requested for the same persona (3), a VPN login succeeds from an external " +
        "documentation-range address (1), a repository is cloned to a workstation (2), and an archive is uploaded to a " +
        "locker host (4). Arrival order told a completely different story - the upload looked first and the phishing " +
        "looked last, which would have pointed you at the wrong entry vector. Two habits make timelines trustworthy: " +
        "normalise every timestamp to one timezone before sorting, and keep the source system attached to each event " +
        "so you can weigh clock reliability. The earliest event is not automatically the cause, but it is always where " +
        "you start reading.",
      solutionSteps: [
        "Confirm every timestamp is UTC ISO-8601.",
        "Sort ascending: 2026-02-13T19:47:09Z, 22:05:44Z, then 2026-02-14T03:11:00Z, 03:40:12Z, 05:02:31Z.",
        "Map back to event indices: 5, 3, 1, 2, 4.",
        "Read the chain and identify the earliest step as initial access."
      ]
    },
    {
      id: "OSINT-005",
      title: "Investigation Case",
      category: CAT,
      difficulty: "Hard",
      points: 500,
      objective: "Combine handle correlation, an organisation profile, a corroborating content signal and a timeline into one attributed finding.",
      description: DISCLAIMER + "\n\n" +
        "Case file: an archive was uploaded from inside the fictional company to a fictional locker host. You have " +
        "four evidence sets - the handle table, the company profile, the footprint observations and the event " +
        "timeline (all shown in the lab panel).\n\n" +
        "Answer three things, then assemble the flag:\n" +
        "  1. which persona is linked by an independent content signal?\n" +
        "  2. which workstation did the clone, per the timeline?\n" +
        "  3. which organisation do both belong to?\n\n" +
        "Submit FLAG{<PERSONA_HANDLE_UPPERCASE>_ON_<WORKSTATION_WITH_UNDERSCORE>}.",
      skills: ["Case Correlation", "Attribution", "Evidence Assembly", "Report Writing"],
      data: {
        artifact: "case-file",
        sections: [
          { title: "HANDLE TABLE", lines: Object.keys(O.usernames).map(function (u) { return u + " -> " + O.usernames[u].join(", "); }) },
          { title: "COMPANY PROFILE", lines: Object.keys(O.company).map(function (k) { return k + ": " + (Array.isArray(O.company[k]) ? O.company[k].join(" | ") : O.company[k]); }) },
          { title: "FOOTPRINT OBSERVATIONS", lines: O.footprint.map(function (f) { return f.source + " | " + f.value + " | " + f.note; }) },
          { title: "EVENT TIMELINE (UTC)", lines: O.timeline.map(function (e) { return e.ts + "  " + e.event; }) }
        ],
        meta: "one persona, one workstation, one organisation - all fictional"
      },
      answer: { expects: [FLAG_005, "ghostwriter_09 on workstation-7"] },
      hints: [
        "Start with the strongest link: the identical avatar hash ties nullgram and chatbox to the handle " + O.answerUsername + ".",
        "The timeline event at 2026-02-14T03:40:12Z names the workstation that cloned the repository: workstation-7.",
        "Both belong to " + O.company.name + ", so the flag is " + FLAG_005 + "."
      ],
      flag: FLAG_005,
      explanation:
        "A case conclusion is only as good as its weakest link, so the work is in ordering the evidence by strength. " +
        "The avatar hash plus matching handle on two platforms gives a solid persona identification (" +
        O.answerUsername + "); the timeline event at 03:40:12Z places a repository clone on workstation-7, which is a " +
        "system fact rather than an inference; and the company profile ties both to " + O.company.name + ", a " +
        "fictional organisation. Note what the evidence does not support: it does not prove intent, it does not prove " +
        "that the persona personally performed the upload, and the devhub variant handle remains unconfirmed. Writing " +
        "those limits down is the difference between an investigation and an accusation - and in this lab the " +
        "limitation that matters most is that every entity is invented.",
      solutionSteps: [
        "Correlate handles; use the avatar hash as the independent signal -> " + O.answerUsername + ".",
        "Order the timeline; locate the clone event -> workstation-7.",
        "Attach the organisation from the profile -> " + O.company.name + ".",
        "Assemble " + FLAG_005 + ".",
        "Record the limits of the conclusion: no intent, no direct attribution of the upload, one unconfirmed variant handle."
      ]
    },
    {
      id: "OSINT-011",
      title: "The Attribution Contract",
      category: CAT,
      difficulty: "Expert",
      points: 950,
      objective: "Apply an explicit evidence standard: decide which conclusions are supported by two independent sources and which are not.",
      description: DISCLAIMER + "\n\n" +
        "Six candidate conclusions were drafted by a junior analyst working the same fictional case. Your job is not " +
        "to find more data - it is to apply the attribution contract used by the lab: a conclusion may only be " +
        "asserted when at least two *independent* sources support it, where independence means the evidence does not " +
        "derive from the same observation.\n\n" +
        "  C1  the persona behind nullgram and chatbox is the same account holder\n" +
        "  C2  the devhub handle g_writer09 is the same person as " + O.answerUsername + "\n" +
        "  C3  workstation-7 performed the repository clone\n" +
        "  C4  the persona personally uploaded the archive to the locker host\n" +
        "  C5  the phishing email and the password reset concern the same persona\n" +
        "  C6  the organisation is " + O.company.name + "\n\n" +
        "Submit the labels of the conclusions that satisfy the contract, in ascending order, comma separated.",
      skills: ["Evidence Independence", "Attribution Standards", "Analytic Rigour", "Confidence Language"],
      data: {
        artifact: "case-file",
        sections: [
          { title: "ATTRIBUTION CONTRACT", lines: [
            "assert only conclusions supported by >= 2 independent sources",
            "independent = not derived from the same underlying observation",
            "name similarity alone is never an independent source",
            "state confidence and limits for anything you do assert"
          ] },
          { title: "AVAILABLE SOURCES", lines: O.footprint.map(function (f) { return f.source + " | " + f.value + " | " + f.note; }) },
          { title: "TIMELINE (UTC)", lines: O.timeline.map(function (e) { return e.ts + "  " + e.event; }) },
          { title: "ORGANISATION PROFILE", lines: Object.keys(O.company).map(function (k) { return k + ": " + (Array.isArray(O.company[k]) ? O.company[k].join(" | ") : O.company[k]); }) }
        ],
        meta: "the answer is a judgement call that the contract makes mechanical"
      },
      answer: { expects: ["C1,C3,C5,C6", "C1, C3, C5, C6", FLAG_011] },
      hints: [
        "Test each conclusion by naming its two sources. C1 has handle match plus avatar hash - two different observation types, so it passes.",
        "C2 rests only on name similarity, and C4 has a single log line with no independent support: both fail the contract. C3 and C6 pass on system facts and the profile.",
        "C5 passes: the phishing delivery and the reset request both name the same persona across two different systems. Answer: C1,C3,C5,C6"
      ],
      flag: FLAG_011,
      explanation:
        "Applying the contract conclusion by conclusion: C1 passes because a matching handle and a matching avatar hash " +
        "are two different kinds of observation. C2 fails - name similarity is a single weak signal and the contract " +
        "explicitly excludes it. C3 passes because the clone event is recorded by the host and corroborated by the " +
        "session record. C4 fails: one log line, no independent source, and it asserts a person's physical action " +
        "rather than a system event. C5 passes because two different systems (mail delivery and the account system) " +
        "name the same persona. C6 passes from the profile plus the domain in the timeline events. The habit this " +
        "builds is the one that separates analysis from speculation: name your sources, test their independence, and " +
        "write confidence language that matches the evidence. Everything here is fictional, which is exactly why the " +
        "standard can be practised safely.",
      solutionSteps: [
        "For each conclusion, write down the sources that support it.",
        "Reject any conclusion whose sources are all name-based or all from one observation.",
        "C1 pass, C2 fail, C3 pass, C4 fail, C5 pass, C6 pass.",
        "Submit C1,C3,C5,C6 and note the confidence level and limits for each asserted conclusion."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
