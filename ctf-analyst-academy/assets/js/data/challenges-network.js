/* ============================================================================
 * data/challenges-network.js - NETWORKING (8 challenges)
 * Every address, hostname and packet below is fictional. Public-looking
 * addresses are taken from the documentation ranges (192.0.2.0/24,
 * 198.51.100.0/24, 203.0.113.0/24) and hostnames use the reserved .invalid TLD.
 * Nothing in here points at a real target and nothing is ever contacted.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var A = CTF.ARTIFACTS;
  var CAT = "Networking";

  CTF.register([
    {
      id: "NET-001",
      title: "Identify the IP",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Classify IPv4 addresses by their role: private, public, loopback, multicast or directed broadcast.",
      description:
        "Intake pulled six addresses out of a lab inventory. Classify each one.\n\n" +
        A["NET-001"].items.map(function (it, i) { return "  " + (i + 1) + ". " + it[0]; }).join("\n") + "\n\n" +
        "Answer with the six classifications in order, comma separated, using: " +
        "PRIVATE, PUBLIC, LOOPBACK, MULTICAST, BROADCAST.",
      skills: ["IPv4 Addressing", "RFC1918", "Address Classes", "Special Use Ranges"],
      data: {
        artifact: "table",
        headers: ["#", "ADDRESS", "CLASSIFICATION"],
        rows: A["NET-001"].items.map(function (it, i) { return [String(i + 1), it[0], ""]; }),
        meta: "classify by role, not by classful letter"
      },
      answer: { expects: [A["NET-001"].answer, "FLAG{EVERY_ADDRESS_HAS_A_ROLE}"] },
      hints: [
        "Start with the reserved ranges: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 are private; 127.0.0.0/8 is loopback.",
        "224.0.0.0/4 is multicast - the first octet alone tells you (224 to 239).",
        "A final octet of 255 inside a /24 is the directed broadcast address, even when the rest of the address is private."
      ],
      flag: "FLAG{EVERY_ADDRESS_HAS_A_ROLE}",
      explanation:
        "Classification drives what you do next: private addresses mean the traffic stayed inside the organisation, " +
        "loopback means it never left the host, multicast means one-to-many, and a directed broadcast means a whole " +
        "subnet was addressed at once - which is interesting in an investigation because amplification and discovery " +
        "tooling use it. The subtle case here is 192.168.1.255: it is inside a private range, but its role on a /24 is " +
        "the broadcast address, and role beats range. Note that a globally routable address such as 198.51.100.23 is " +
        "only 'public' in " +
        "the routing sense - the addresses used in this lab are documentation ranges, never real hosts.",
      solutionSteps: [
        "10.20.30.40 -> RFC1918 10/8 -> PRIVATE.",
        "198.51.100.23 -> documentation range, globally routable shape -> PUBLIC.",
        "127.0.0.1 -> loopback range -> LOOPBACK.",
        "172.16.5.9 -> RFC1918 172.16/12 -> PRIVATE.",
        "224.0.0.5 -> first octet in 224-239 -> MULTICAST.",
        "192.168.1.255 -> final octet 255 on a /24 -> BROADCAST."
      ]
    },
    {
      id: "NET-002",
      title: "Subnet Rookie",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Compute usable host counts from prefix lengths and explain why two addresses are always lost on a normal subnet.",
      description:
        "Capacity planning request from the lab network team. For each prefix below, how many usable host addresses " +
        "are available?\n\n" +
        A["NET-002"].q.map(function (q) { return "  " + q[0]; }).join("\n") + "\n\n" +
        "Answer with the four numbers in order, comma separated.",
      skills: ["Subnetting", "Prefix Length", "Host Counting"],
      data: {
        artifact: "table",
        headers: ["PREFIX", "USABLE HOSTS"],
        rows: A["NET-002"].q.map(function (q) { return [q[0], ""]; }),
        meta: "usable = total addresses - network address - broadcast address"
      },
      answer: { expects: [A["NET-002"].answer, "FLAG{SUBNET_MATH_IS_FAST}"] },
      hints: [
        "A /n prefix leaves 32 - n bits for hosts, so the subnet holds 2^(32-n) addresses in total.",
        "Subtract two from that total for the network address and the directed broadcast address.",
        "/24 -> 256 - 2 = 254, /26 -> 64 - 2 = 62, /28 -> 16 - 2 = 14, /30 -> 4 - 2 = 2."
      ],
      flag: "FLAG{SUBNET_MATH_IS_FAST}",
      explanation:
        "Host counting is one operation: 2^(32-prefix) minus 2. The two subtracted addresses are the network address " +
        "(all host bits zero) and the directed broadcast (all host bits one); neither can be assigned to an interface " +
        "on a normal subnet. The exceptions are worth knowing because they surprise people: /31 is defined for " +
        "point-to-point links and yields two usable addresses with no broadcast, and /32 is a single host route. " +
        "Getting this fast matters in incident response, where 'can this segment even hold the hosts we just found?' " +
        "is a real question.",
      solutionSteps: [
        "/24: 2^8 = 256 total, 254 usable.",
        "/26: 2^6 = 64 total, 62 usable.",
        "/28: 2^4 = 16 total, 14 usable.",
        "/30: 2^2 = 4 total, 2 usable."
      ]
    },
    {
      id: "NET-003",
      title: "CIDR Challenge",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Derive network address, broadcast address, mask and usable host count for a host/prefix pair.",
      description:
        "Two lab hosts were found with these configurations:\n\n" +
        "  A: 192.168.20.130/" + A["NET-003"].a.cidr + "\n" +
        "  B: 10.10.5.77/" + A["NET-003"].b.cidr + "\n\n" +
        "For host A report: network address, broadcast address, usable host count - comma separated, in that order.",
      skills: ["CIDR", "Bitwise Masking", "Subnetting", "Broadcast Address"],
      data: {
        artifact: "table",
        headers: ["HOST", "PREFIX", "MASK", "NETWORK", "BROADCAST", "FIRST", "LAST", "USABLE"],
        rows: [
          ["A", "192.168.20.130/" + A["NET-003"].a.cidr, "", "", "", "", "", ""],
          ["B", "10.10.5.77/" + A["NET-003"].b.cidr, "", "", "", "", "", ""]
        ],
        meta: "fill in host A and submit; host B is practice for the writeup"
      },
      answer: {
        expects: [
          A["NET-003"].answerA,
          A["NET-003"].answerB,
          A["NET-003"].answerA + " | " + A["NET-003"].answerB,
          "FLAG{CIDR_IS_BITWISE}"
        ]
      },
      hints: [
        "Convert the prefix to a mask: /26 is 255.255.255.192, /28 is 255.255.255.240. Then AND the host address with the mask.",
        "For A: 130 AND 192 = 128, so the network is 192.168.20.128; the broadcast is network OR inverted mask.",
        "A = " + A["NET-003"].answerA + " and B = " + A["NET-003"].answerB + " (network, broadcast, usable hosts)."
      ],
      flag: "FLAG{CIDR_IS_BITWISE}",
      explanation:
        "Everything in CIDR is one bitwise AND plus one OR. For host A, /26 gives mask 255.255.255.192; 130 AND 192 = " +
        "128, so the network is " + A["NET-003"].a.network + " and the broadcast is the network with all six host bits " +
        "set: " + A["NET-003"].a.broadcast + ". Usable hosts are 64 - 2 = " + A["NET-003"].a.usable + ". Host B works " +
        "the same way with a /28 (mask 255.255.255.240). Doing this by hand once is worth more than memorising a " +
        "table, because in an incident you are often reasoning about whether two hosts could talk directly, and that " +
        "question is purely 'do they share a network address?'",
      solutionSteps: [
        "A: /26 -> mask 255.255.255.192 -> network " + A["NET-003"].a.network + ".",
        "A: broadcast = network OR 0.0.0.63 = " + A["NET-003"].a.broadcast + ".",
        "A: usable = 64 - 2 = " + A["NET-003"].a.usable + ".",
        "B: /28 -> mask 255.255.255.240 -> network " + A["NET-003"].b.network +
        ", broadcast " + A["NET-003"].b.broadcast + ", usable " + A["NET-003"].b.usable + "."
      ]
    },
    {
      id: "NET-004",
      title: "Port Detective",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Map observed destination ports to their conventional services using a lab reference dataset.",
      description:
        "A lab firewall log recorded six destination ports. Match each to its conventional service using the reference " +
        "dataset below (the dataset is part of the lab, not a live lookup).\n\n" +
        "Observed ports: " + A["NET-004"].ports.map(function (p) { return p[0]; }).join(", ") + "\n\n" +
        "Answer with the six service labels in the observed order, comma separated.",
      skills: ["TCP/UDP Ports", "Service Identification", "Log Triage"],
      data: {
        artifact: "table",
        headers: ["REFERENCE PORT", "SERVICE"],
        rows: [["21", "FTP"], ["22", "SSH"], ["25", "SMTP"], ["53", "DNS"], ["80", "HTTP"],
          ["443", "HTTPS"], ["3389", "RDP"], ["8080", "HTTP-ALT"]],
        meta: "observed: " + A["NET-004"].ports.map(function (p) { return p[0]; }).join(", ")
      },
      answer: { expects: [A["NET-004"].answer, "FLAG{PORTS_ARE_CONVENTIONS}"] },
      hints: [
        "This is a matching exercise: use the reference table, do not guess from memory.",
        "Well known ports live in 0-1023; registered ports such as 3389 and 8080 are above that.",
        "In observed order the labels are: " + A["NET-004"].answer.replace(/,/g, ", ") + "."
      ],
      flag: "FLAG{PORTS_ARE_CONVENTIONS}",
      explanation:
        "Port numbers are conventions, not guarantees - any service can bind any port, which is why a firewall log " +
        "that says 'port 443' tells you what was *claimed*, not what was carried. Matching observed ports to a " +
        "reference table is still the right first triage step because it narrows the hypothesis space fast. The " +
        "follow-up question an analyst should always ask is whether the payload matches the claimed service: SSH " +
        "banner on 443, DNS on a high UDP port, or HTTP inside TLS-free 8443 traffic are all classic tunnel and " +
        "evasion indicators.",
      solutionSteps: [
        "Look up each observed port in the reference dataset.",
        "22 -> SSH, 53 -> DNS, 443 -> HTTPS, 3389 -> RDP, 25 -> SMTP, 8080 -> HTTP-ALT.",
        "Submit the labels in observed order.",
        "Note in the writeup that port labels are claims, not proof of the payload."
      ]
    },
    {
      id: "NET-005",
      title: "Packet Story",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Reconstruct what happened on the wire from a simulated packet list and identify the application protocol.",
      description:
        "Simulated capture from lab segment 192.168.10.0/24 (no real traffic, no real hosts):\n\n" +
        A["NET-005"].packets.map(function (p) {
          return "  #" + p.no + "  " + p.src + ":" + p.sport + " -> " + p.dst + ":" + p.dport +
            "  " + p.proto + "  [" + p.flags + "]  len=" + p.len + "  " + p.info;
        }).join("\n") + "\n\n" +
        "Question set - answer as three values separated by commas:\n" +
        "  1. which application protocol is being set up in packets 1-4?\n" +
        "  2. on which destination port?\n" +
        "  3. which hostname is resolved in packet 5?",
      skills: ["Packet Analysis", "TCP Handshake", "Protocol Identification", "DNS Correlation"],
      data: {
        artifact: "packet-log",
        packets: A["NET-005"].packets,
        meta: "simulated capture, fictional segment, no live host involved"
      },
      answer: {
        expects: [
          "TLS,443,txt.lab.nullpoint.invalid",
          "TLS, 443, txt.lab.nullpoint.invalid",
          A["NET-005"].flag
        ]
      },
      hints: [
        "Packets 1-3 are a three way handshake (SYN, SYN/ACK, ACK) and packet 4 carries 517 bytes of client data on port 443.",
        "Port 443 plus a large first client payload is a TLS ClientHello, so the application protocol is TLS.",
        "Packet 5 is a UDP/53 query - read the hostname out of the info column: txt.lab.nullpoint.invalid."
      ],
      flag: A["NET-005"].flag,
      explanation:
        "Reading a capture is narrative work. The handshake establishes intent (a connection was negotiated, not " +
        "scanned), the 517 byte push on 443 identifies TLS by both port and payload shape, and the UDP/53 exchange " +
        "immediately afterwards shows the host resolving a name before it talks further. Correlating the two - who " +
        "resolved what, and when relative to the connection - is what turns packets into a story. In this lab the name " +
        "is a TXT-style host under a .invalid domain, which is exactly the shape you would escalate on in a real case: " +
        "unusual record type, machine-generated label, and a resolver that is not the corporate one.",
      solutionSteps: [
        "Packets 1-3: SYN -> SYN,ACK -> ACK = TCP three way handshake.",
        "Packet 4: 517 bytes to port 443 = TLS ClientHello -> application protocol is TLS.",
        "Packet 5: UDP source port 51000 to destination port 53 = DNS query.",
        "Packet 6: answer returns an address from the documentation range -> fictional external host.",
        "Answer: TLS, 443, txt.lab.nullpoint.invalid."
      ]
    },
    {
      id: "NET-006",
      title: "DNS Mystery",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Read a zone's record set, understand each record type's role, and find the record that carries data.",
      description:
        "Zone export for the fictional domain lab.nullpoint.invalid:\n\n" +
        A["NET-006"].records.map(function (r) {
          return "  " + r[0] + ".\t" + r[3] + "\tIN\t" + r[1] + "\t" + r[2];
        }).join("\n") + "\n\n" +
        "One of these records is being used to carry data rather than to describe the zone. Find it and decode it.",
      skills: ["DNS Record Types", "Zone Analysis", "Base64", "DNS Data Exfiltration Concepts"],
      data: {
        artifact: "table",
        headers: ["NAME", "TTL", "TYPE", "VALUE"],
        rows: A["NET-006"].records.map(function (r) { return [r[0], String(r[3]), r[1], r[2]]; }),
        meta: "fictional zone, reserved .invalid TLD"
      },
      answer: { expects: [A["NET-006"].flag, "TXT,_ctf.lab.nullpoint.invalid", "_ctf.lab.nullpoint.invalid,TXT"] },
      hints: [
        "A, AAAA, CNAME, MX, NS and SOA all describe where things are. TXT is the only type designed to hold arbitrary text.",
        "Look for a TXT record whose name is unusual and whose value is not an SPF policy.",
        "The record _ctf.lab.nullpoint.invalid holds base64 - decode it to get the flag."
      ],
      flag: A["NET-006"].flag,
      explanation:
        "Every record type here has a job: A and AAAA map names to addresses, CNAME aliases, MX routes mail, NS " +
        "delegates, SOA carries zone metadata, and TXT holds free-form text (legitimately used for SPF, DKIM and " +
        "domain verification). That freedom is why TXT is the usual channel for DNS tunnelling and data " +
        "exfiltration. The detection signals are the same ones you just used: an unusual owner name, a value that is " +
        "not a policy string, high-entropy content, short TTLs, and query volume from one client. None of that " +
        "justifies blocking DNS - it justifies logging and measuring it.",
      solutionSteps: [
        "Classify each record: A, AAAA, CNAME, MX, NS, SOA are structural; TXT is free-form.",
        "Compare the two TXT records: one is an SPF policy, the other is high entropy under an odd name.",
        "Base64 decode the value of _ctf.lab.nullpoint.invalid.",
        "Record the finding as: TXT record used to carry data, short TTL, machine-generated label."
      ]
    },
    {
      id: "NET-007",
      title: "Network Case",
      category: CAT,
      difficulty: "Hard",
      points: 450,
      objective: "Correlate IP addressing, DNS answers, port conventions and packet flow into one incident narrative, then recover the payload.",
      description:
        "Case file 07 (all data fictional, documentation ranges and .invalid hostnames only).\n\n" +
        "HOSTS\n" + A["NET-007"].case.hosts.map(function (h) { return "  " + h; }).join("\n") + "\n\n" +
        "DNS TXT ANSWERS OBSERVED\n" +
        A["NET-007"].case.dns.map(function (r) { return "  " + r[0] + "  " + r[1] + "  " + r[2]; }).join("\n") + "\n\n" +
        "PACKETS\n" +
        A["NET-007"].case.packets.map(function (p) {
          return "  #" + p.no + "  " + p.src + ":" + p.sport + " -> " + p.dst + ":" + p.dport + "  " +
            p.proto + " [" + p.flags + "] len=" + p.len + "  " + p.info;
        }).join("\n") + "\n\n" +
        "PORT REFERENCE\n" +
        A["NET-007"].case.ports.map(function (p) { return "  " + p[0] + " -> " + p[1]; }).join("\n") + "\n\n" +
        "Recover the payload carried by the two TXT answers.",
      skills: ["Incident Correlation", "DNS Tunnelling", "Base64", "Packet Analysis", "IP Addressing"],
      data: {
        artifact: "case-file",
        sections: [
          { title: "HOSTS", lines: A["NET-007"].case.hosts },
          { title: "DNS TXT ANSWERS", lines: A["NET-007"].case.dns.map(function (r) { return r.join("\t"); }) },
          { title: "PACKETS", lines: A["NET-007"].case.packets.map(function (p) { return JSON.stringify(p); }) },
          { title: "PORT REFERENCE", lines: A["NET-007"].case.ports.map(function (p) { return p.join(" -> "); }) }
        ],
        meta: "fictional case, no real infrastructure referenced"
      },
      answer: { expects: A["NET-007"].flag },
      hints: [
        "Packets 7-8 show the workstation querying an external address on UDP/53 for names under exfil.nullpoint.invalid - that is the channel.",
        "Each TXT answer holds one base64 chunk: decode chunk 1 and chunk 2 separately.",
        "Concatenate the two decoded chunks in order to get the flag."
      ],
      flag: A["NET-007"].flag,
      explanation:
        "Four independent data sets converge on one conclusion. The host list tells you workstation-7 is internal and " +
        "203.0.113.44 is external (and from a documentation range, so fictional). The packets show a normal TLS " +
        "handshake to the gateway, then UDP/53 to an external address rather than to the internal resolver at " +
        "192.168.10.9 - that deviation is the finding. The DNS answers carry base64 chunks under sequential " +
        "machine-generated labels, and the port reference confirms 53 is the expected channel being abused. Concatenate " +
        "the decoded chunks and you have the payload. This is the standard shape of DNS exfiltration, and the " +
        "defensive controls are logging resolver traffic, alerting on direct-to-external DNS, and measuring query " +
        "length and entropy per client.",
      solutionSteps: [
        "Establish which hosts are internal (192.168.10.0/24) and which are external.",
        "Note that packets 7-8 bypass the internal resolver 192.168.10.9 and go straight to 203.0.113.44 on UDP/53.",
        "Extract the two TXT answer values and base64 decode each: '" + A["NET-007"].chunk1 + "' and '" + A["NET-007"].chunk2 + "'.",
        "Concatenate in label order to recover the flag.",
        "Report the finding as DNS-based data channel from workstation-7 to an external resolver."
      ]
    },
    {
      id: "NET-012",
      title: "Tunnel Under 53",
      category: CAT,
      difficulty: "Expert",
      points: 850,
      objective: "Reconstruct a multi-label encoded channel, decode each label, and reason about why DNS is an attractive covert channel.",
      description:
        "A lab resolver logged four queries in one second. Each label is encoded separately and the labels must be " +
        "reordered by their sequence number before decoding.\n\n" +
        A["NET-012"].queries.map(function (q, i) {
          return "  seq " + (i + 1) + ":  " + q + "  (TXT, ttl 60, rcode NOERROR)";
        }).join("\n") + "\n\n" +
        "Additional context from the same capture:\n" +
        "  - client 192.168.10.20 issued all four queries, average label length 6.5 hex chars\n" +
        "  - the parent zone t1.nullpoint.invalid has no A record and no web presence\n" +
        "  - query rate for this client is 4 per second; the lab baseline is 0.02 per second\n\n" +
        "Task: decode the labels in sequence order and reconstruct the message. Then state the flag.",
      skills: ["DNS Tunnelling", "Hexadecimal", "Label Reassembly", "Baseline Deviation", "Traffic Analysis"],
      data: {
        artifact: "table",
        headers: ["SEQ", "QUERY NAME", "TYPE", "LABEL ENCODING"],
        rows: A["NET-012"].queries.map(function (q, i) {
          return [String(i + 1), q, "TXT", "hex"];
        }),
        meta: "four labels, one message, fictional zone"
      },
      answer: {
        expects: [
          A["NET-012"].decoded,
          A["NET-012"].flag,
          A["NET-012"].decoded + " | " + A["NET-012"].flag
        ]
      },
      hints: [
        "Strip the parent zone and the sequence prefix: each leftmost label is pure hex (0-9a-f only).",
        "Decode each label from hex: 68656c6c6f, 66726f6d, 746865, 6c6162.",
        "The decoded words are '" + A["NET-012"].decoded + "'. The detection story is the rate and entropy, not the content."
      ],
      flag: A["NET-012"].flag,
      explanation:
        "DNS is an attractive covert channel because it is almost always allowed outbound, it is recursive by design " +
        "(so an attacker's authoritative server can answer from anywhere), and its payloads look like ordinary " +
        "lookups. This lab reconstructs a small one: four hex-encoded labels carrying a four word message. The content " +
        "here is harmless on purpose - the value of the exercise is the detection reasoning. Four signals stand out: a " +
        "query rate 200 times the client baseline, labels made entirely of hex characters, a parent zone with no " +
        "legitimate reason to exist, and identical TTL and record type across all queries. Any one of those is weak; " +
        "together they are a finding. The correct response is not to block DNS but to log it, baseline it per client, " +
        "and alert on deviation - blocking DNS breaks everything and pushes the channel somewhere less observable.",
      solutionSteps: [
        "Split each query name on '.' and take the leftmost label.",
        "Confirm the alphabet is hexadecimal, then decode: hello / from / the / lab.",
        "Order by the seq prefix and join with spaces to reconstruct the message.",
        "Document the detection signals: rate deviation, label entropy, non-existent parent zone, uniform TTL/type.",
        "Submit the reconstructed message and the flag."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
