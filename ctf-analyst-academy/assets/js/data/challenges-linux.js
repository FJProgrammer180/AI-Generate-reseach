/* ============================================================================
 * data/challenges-linux.js - LINUX (6 challenges)
 * All labs run against the in-memory virtual filesystem in data/vfs.js.
 * No real shell, no real files, no privilege changes on the host machine.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = root.CTF;
  var CAT = "Linux";
  var V = CTF.VFS_VIEWS;

  CTF.register([
    {
      id: "LINUX-001",
      title: "Find the File",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Locate a named file on an unfamiliar filesystem and read it, using path reasoning rather than guessing.",
      description:
        "You are dropped into the lab image as user 'analyst' in /home/analyst. Somewhere on this filesystem there is " +
        "a handover file called note.txt. Find it, read it, and submit the flag it contains.\n\n" +
        "The terminal below is a simulation: ls, cd, pwd, cat, find, grep, stat, head, tail and help all work.",
      skills: ["find", "cat", "Path Navigation", "Filesystem Layout"],
      data: { artifact: "vfs", view: V["LINUX-001"], meta: "virtual lab image, no real files touched" },
      answer: { expects: "FLAG{READ_THE_FILE_YOU_FOUND}" },
      hints: [
        "Standard Unix layout puts application state under /var/lib/<name>. List /var/lib and follow the directory that matches the product.",
        "find / -name note.txt would list it directly: the file lives under an 'inbox' directory.",
        "The full path is /var/lib/nullpoint/inbox/note.txt - cat it."
      ],
      flag: "FLAG{READ_THE_FILE_YOU_FOUND}",
      explanation:
        "Navigating an unfamiliar system is a layout question before it is a search question. Knowing that /etc holds " +
        "configuration, /var holds state and logs, /home holds user data and /opt holds third party software lets you " +
        "guess the right branch immediately - here, a collector's handover note belongs in application state, so " +
        "/var/lib. When the guess fails, find is the fallback: find / -name note.txt. Reading the file is the last " +
        "step and the easiest one; most mistakes happen by searching in the wrong tree for ten minutes.",
      solutionSteps: [
        "Reason about layout: application state lives in /var/lib.",
        "ls /var/lib -> nullpoint; ls /var/lib/nullpoint -> inbox, state.",
        "ls /var/lib/nullpoint/inbox -> note.txt, queue.lst.",
        "cat /var/lib/nullpoint/inbox/note.txt and read the flag.",
        "Fallback if lost: find / -name note.txt."
      ]
    },
    {
      id: "LINUX-002",
      title: "Hidden Directory",
      category: CAT,
      difficulty: "Easy",
      points: 100,
      objective: "Understand that dot-prefixed entries are hidden by convention only, and enumerate them.",
      description:
        "The analyst says they stored a key inventory somewhere in their home directory, but ls shows nothing " +
        "interesting. You are user 'analyst' in /home/analyst. Find the hidden directory, read keys.txt inside it and " +
        "submit the flag.",
      skills: ["ls -a", "Hidden Files", "Directory Enumeration", "Unix Conventions"],
      data: { artifact: "vfs", view: V["LINUX-002"], meta: "dot-prefixed entries are hidden from plain ls" },
      answer: { expects: "FLAG{HIDDEN_DIRS_ARE_NOT_SECRET}" },
      hints: [
        "A leading dot hides an entry from ls by default - it is a convention, not protection. Use ls -a.",
        "Run ls -a in /home/analyst: two dot entries appear, .backup and .bash_history.",
        "cat /home/analyst/.backup/keys.txt - note that the directory itself is drwx------ so only the owner can enter."
      ],
      flag: "FLAG{HIDDEN_DIRS_ARE_NOT_SECRET}",
      explanation:
        "Dotfiles are hidden from ls purely by convention: any tool can list them with -a, and any process running as " +
        "the owner (or root) can read them. The real access control here is the mode bits - .backup is drwx------ so " +
        "only the analyst can traverse it, and keys.txt is -rw------- so only the analyst can read it. That " +
        "distinction matters constantly in reviews: 'we hid the endpoint' is not a control, 'the file is mode 0600 " +
        "and owned by the service account' is. Also note the second dot entry, .bash_history, which in a real " +
        "investigation is one of the first things you read.",
      solutionSteps: [
        "ls -a /home/analyst -> .backup, .bash_history, notes, readme.txt.",
        "ls -la .backup shows mode drwx------ owner analyst.",
        "cat .backup/keys.txt and read the flag.",
        "Bonus: cat .bash_history to see what the analyst actually ran."
      ]
    },
    {
      id: "LINUX-003",
      title: "Grep Hunter",
      category: CAT,
      difficulty: "Easy",
      points: 150,
      objective: "Search recursively for a pattern, handle unreadable files, and combine two findings into one answer.",
      description:
        "A collector wrote acknowledgement markers into several logs. Search the whole image for the pattern " +
        "NEEDLE_HAYSTACK_ACK and use what you find.\n\n" +
        "You are user 'analyst' at /. Note that some log files are group restricted - a recursive search will report " +
        "those it cannot read, and that is information in itself.",
      skills: ["grep", "Recursive Search", "Permission Awareness", "Log Correlation"],
      data: { artifact: "vfs", view: V["LINUX-003"], meta: "pattern: NEEDLE_HAYSTACK_ACK" },
      answer: { expects: ["FLAG{NEEDLE_9C31}", "9C31", "9c31"] },
      hints: [
        "grep -rn NEEDLE_HAYSTACK_ACK / gives you file, line number and the matching text in one pass.",
        "The value after the equals sign is 9c31, and it appears in both daemon.log and the collector's own log.",
        "The flag format is FLAG{NEEDLE_<value in uppercase>}, so FLAG{NEEDLE_9C31}."
      ],
      flag: "FLAG{NEEDLE_9C31}",
      explanation:
        "grep -rn is the workhorse: -r recurses, -n numbers the lines so you can cite them in a report. Two details " +
        "turn this from a command into a skill. First, the same value appears in two different logs written by two " +
        "different components - that is a correlation, and correlations are evidence. Second, permission errors during " +
        "a recursive search are not noise: they tell you which files exist that you cannot read, which is exactly the " +
        "list worth escalating for. The value itself is lowercase in the log and uppercase in the flag, a small " +
        "normalisation step that catches people who copy instead of read.",
      solutionSteps: [
        "grep -rn NEEDLE_HAYSTACK_ACK /var/log -> matches in daemon.log and nullpoint/collector.log.",
        "Read the value: 9c31, identical in both files.",
        "Note any 'permission denied' lines as files requiring escalation.",
        "Normalise to the required flag format: FLAG{NEEDLE_9C31}."
      ]
    },
    {
      id: "LINUX-004",
      title: "Permission Puzzle",
      category: CAT,
      difficulty: "Medium",
      points: 200,
      objective: "Convert symbolic permissions to octal, reason about who can read a file, and act on that reasoning.",
      description:
        "In /etc/nullpoint there is a file the collector daemon reads but nobody else should: daemon.conf, mode " +
        "-rw-r----- owner root group nullpoint.\n\n" +
        "Three questions, one answer string:\n" +
        "  1. what is the octal mode of -rw-r----- ?\n" +
        "  2. which account is configured to run the daemon (read the file to find out)?\n" +
        "  3. can user 'analyst' read it without escalation?\n\n" +
        "Submit the flag built as FLAG{<octal>_<daemon_user>_<YES|NO>}.",
      skills: ["File Permissions", "Octal Conversion", "Ownership Model", "Least Privilege"],
      data: { artifact: "vfs", view: V["LINUX-004"], meta: "focus file: /etc/nullpoint/daemon.conf" },
      answer: { expects: ["FLAG{0640_ROOT_NULLPOINT}", "0640,svc,no"] },
      hints: [
        "Split -rw-r----- into three triads: owner rw- = 6, group r-- = 4, other --- = 0, so the octal mode is 0640.",
        "Group 'nullpoint' has read access. Check /etc/passwd for the service account - daemon.conf names daemon_user=svc.",
        "User analyst is not root, not the owner and (per /etc/passwd) not in the nullpoint group, so the answer is NO - you need escalation to read it."
      ],
      flag: "FLAG{0640_ROOT_NULLPOINT}",
      explanation:
        "Permission triads convert directly: r=4, w=2, x=1, so rw- is 6, r-- is 4 and --- is 0, giving 0640. Reading " +
        "the mode tells you who can act: owner root can read and write, members of group nullpoint can read, and " +
        "everybody else gets nothing. That is a deliberate least-privilege shape for a configuration file holding a " +
        "key value. The second half of the task is ownership reasoning - the daemon runs as 'svc' per the " +
        "configuration and /etc/passwd, so 'svc' must be in the nullpoint group for the service to work. The third " +
        "part is the operational conclusion: a normal analyst account cannot read this file, so any finding that " +
        "requires it must be requested through escalation and logged - which is precisely what the auth.log in the " +
        "next lab shows someone doing.",
      solutionSteps: [
        "ls -l /etc/nullpoint/daemon.conf -> -rw-r----- root nullpoint.",
        "Convert: rw- = 6, r-- = 4, --- = 0 -> octal 0640.",
        "Read daemon.conf (with escalation in the lab) -> daemon_user=svc.",
        "Check /etc/passwd and the group model: analyst is not in nullpoint -> NO.",
        "Assemble FLAG{0640_ROOT_NULLPOINT}."
      ]
    },
    {
      id: "LINUX-005",
      title: "Lost Configuration",
      category: CAT,
      difficulty: "Medium",
      points: 250,
      objective: "Locate a configuration value across candidate files and detect that it was changed by comparing versions.",
      description:
        "The gateway's retry limit was changed during an incident and nobody recorded the new value. Find the current " +
        "RETRY_LIMIT on this image, and confirm it differs from the archived copy in the analyst's hidden backup " +
        "folder.\n\n" +
        "You are user 'analyst' at /. Submit the flag built as FLAG{RETRY_LIMIT_<current_value>}.",
      skills: ["grep", "Configuration Review", "Version Comparison", "Change Detection"],
      data: { artifact: "vfs", view: V["LINUX-005"], meta: "two copies exist: live config and archived backup" },
      answer: { expects: ["FLAG{RETRY_LIMIT_17}", "17"] },
      hints: [
        "Configuration lives in /etc. grep -rn RETRY_LIMIT /etc finds the live value in the nullpoint directory.",
        "The live value is 17. The analyst's hidden backup folder holds old.conf with RETRY_LIMIT=3.",
        "The comment in the live file even says the limit was raised from 3 during the March review - the flag is FLAG{RETRY_LIMIT_17}."
      ],
      flag: "FLAG{RETRY_LIMIT_17}",
      explanation:
        "Configuration review is comparison work. The live file in /etc/nullpoint/gateway.conf holds RETRY_LIMIT=17 " +
        "with a comment explaining the change; the archived copy in the analyst's hidden .backup/old.conf holds the " +
        "old default of 3. Finding both is what turns 'the value is 17' into a finding: a retry limit raised more " +
        "than five times its default is the kind of quiet change that causes retry storms and masks failures, and it " +
        "is only visible if you have a baseline to compare against. The general rule is that /etc is authoritative for " +
        "the present and backups, package defaults or version control are authoritative for the past.",
      solutionSteps: [
        "grep -rn RETRY_LIMIT /etc -> /etc/nullpoint/gateway.conf:RETRY_LIMIT=17.",
        "Read the surrounding comment: raised from 3 during the March incident review.",
        "ls -a /home/analyst reveals .backup; cat .backup/old.conf shows RETRY_LIMIT=3.",
        "State the finding as a change from 3 to 17 and submit FLAG{RETRY_LIMIT_17}."
      ]
    },
    {
      id: "LINUX-006",
      title: "Linux Investigation",
      category: CAT,
      difficulty: "Hard",
      points: 400,
      objective: "Combine navigation, hidden entries, recursive search, permission reasoning and escalation into one assembled answer.",
      description:
        "Full lab investigation. Three fragments are scattered across the image, each reachable only with a different " +
        "technique:\n\n" +
        "  PART_ONE  - in a configuration file that is group restricted (you have sudo in this lab)\n" +
        "  PART_TWO  - in a hidden directory under a user's home\n" +
        "  PART_THREE- in a root-owned file that only root can read\n\n" +
        "You are user 'analyst' at / with sudo available. Assemble the flag as " +
        "FLAG{<PART_ONE>_<PART_TWO>_<PART_THREE>} using the values in uppercase with spaces replaced by underscores.",
      skills: ["find", "grep", "cat", "Permission Escalation Reasoning", "Evidence Assembly"],
      data: { artifact: "vfs", view: V["LINUX-006"], meta: "sudo simulated in-lab only; nothing on the host changes" },
      answer: { expects: "FLAG{TERMINAL_REBUILT_BY_ANALYST_SEVEN}" },
      hints: [
        "PART_ONE: /etc/nullpoint/daemon.conf is -rw-r----- root:nullpoint, so read it with sudo cat - the value is PART_ONE=TERMINAL.",
        "PART_TWO: ls -a /home/analyst reveals .backup; keys.txt inside it holds PART_TWO=REBUILT.",
        "PART_THREE: /root/case-0091.txt is -rw------- root only; sudo cat it and take PART_THREE=BY_ANALYST_SEVEN."
      ],
      flag: "FLAG{TERMINAL_REBUILT_BY_ANALYST_SEVEN}",
      explanation:
        "Each fragment is guarded by a different mechanism, so a single technique will not collect them all: one needs " +
        "group membership or escalation, one needs the -a flag to be visible at all, and one needs root. That is the " +
        "real lesson - investigations fail on enumeration, not on difficulty. Note also that this lab simulates sudo " +
        "inside a virtual filesystem; nothing on your machine is modified and no privilege boundary is actually " +
        "crossed. In a real case every escalated read should be recorded in the case log with the account used and the " +
        "time, because 'who read what with which rights' is itself evidence.",
      solutionSteps: [
        "sudo cat /etc/nullpoint/daemon.conf -> PART_ONE=TERMINAL.",
        "ls -a /home/analyst -> .backup; sudo cat /home/analyst/.backup/keys.txt -> PART_TWO=REBUILT.",
        "find / -name 'case-*' -> /root/case-0091.txt; sudo cat it -> PART_THREE=BY_ANALYST_SEVEN.",
        "Assemble FLAG{TERMINAL_REBUILT_BY_ANALYST_SEVEN}.",
        "Record each escalated read: path, account, timestamp."
      ]
    },
    {
      id: "LINUX-011",
      title: "The Broken Terminal",
      category: CAT,
      difficulty: "Expert",
      points: 750,
      objective: "Correlate authentication logs, command history, service configuration and a process manifest to attribute one action on a host.",
      description:
        "Case: someone read a restricted configuration file on lab host lab-nullpoint-03 during the night of 16-17 " +
        "April. Reconstruct the event from four artifacts on the image and answer with the attribution flag.\n\n" +
        "Artifacts to correlate (all fictional):\n" +
        "  /var/log/auth.log      - authentication and sudo events\n" +
        "  /home/analyst/.bash_history - what the account actually typed\n" +
        "  /etc/nullpoint/daemon.conf  - the file that was read (restricted)\n" +
        "  /opt/nullpoint/.svc/manifest.txt - which account owns the service\n\n" +
        "Submit FLAG{<SOURCE_IP_OF_SUCCESSFUL_LOGIN>_<DAEMON_USER_UPPERCASE>} using the values you prove from the logs.",
      skills: ["Log Correlation", "sudo Analysis", "Attribution", "Timeline Construction", "Permission Model"],
      data: { artifact: "vfs", view: V["LINUX-011"], meta: "four artifacts, one attribution; sudo simulated in-lab only" },
      answer: { expects: "FLAG{198.51.100.7_SVC}" },
      hints: [
        "auth.log shows three failed logins for 'analyst' then an Accepted password at 22:06:02Z from 198.51.100.7 - that is the session, and the source is a documentation-range address (fictional).",
        "The same log has a sudo entry at 23:41:57Z: COMMAND=/usr/bin/cat /etc/nullpoint/daemon.conf. Cross-check .bash_history, which shows the same command typed by hand.",
        "daemon.conf contains daemon_user=svc and the manifest confirms the service account, so the flag is FLAG{198.51.100.7_SVC}."
      ],
      flag: "FLAG{198.51.100.7_SVC}",
      explanation:
        "Attribution is a correlation problem, and each artifact alone is insufficient. auth.log gives the session " +
        "(three failures then a success from 198.51.100.7 - a documentation range address, so fictional) and the " +
        "escalated command with its exact timestamp. .bash_history independently shows the same command was typed " +
        "interactively rather than scripted, which changes the intent assessment. daemon.conf supplies the service " +
        "account name, and the manifest under /opt confirms which account owns the component, so the two agree. Only " +
        "when all four line up can you state a finding. Two cautions carry into real work: logs are host-local and " +
        "their clocks drift, so normalise to UTC before ordering; and a history file is user-writable, so it " +
        "corroborates but never proves on its own.",
      solutionSteps: [
        "sudo cat /var/log/auth.log -> failed x3 then Accepted at 22:06:02Z from 198.51.100.7.",
        "Find the sudo line at 23:41:57Z: COMMAND=/usr/bin/cat /etc/nullpoint/daemon.conf.",
        "cat /home/analyst/.bash_history -> the same command appears, typed by hand.",
        "sudo cat /etc/nullpoint/daemon.conf -> daemon_user=svc.",
        "cat /opt/nullpoint/.svc/manifest.txt -> confirms the svc-owned component and its log path.",
        "Assemble the attribution: FLAG{198.51.100.7_SVC}."
      ]
    }
  ]);
})(typeof globalThis !== "undefined" ? globalThis : window);
