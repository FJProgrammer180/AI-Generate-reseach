/* ============================================================================
 * data/vfs.js - the virtual filesystem used by the Linux and campaign labs
 * ----------------------------------------------------------------------------
 * A small, fully fictional disk image. Nothing here maps to a real host, a real
 * user or a real path on your machine; it is an in-memory tree that the lab
 * terminal (assets/js/vfs.js) walks.
 *
 * Node shapes:
 *   directory -> { "/": { perm, owner, group, mtime }, ...children }
 *   file      -> { "$": content, perm, owner, group, mtime, size? }
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  var CTF = (root.CTF = root.CTF || {});

  var NOW = "2026-04-17T09:12:44Z";

  CTF.VFS = {
    "/": {
      "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-01-04T08:00:00Z" },
      "etc": {
        "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-03-02T11:20:00Z" },
        "hostname": {
          "$": "lab-nullpoint-03\n",
          perm: "-rw-r--r--", owner: "root", group: "root", mtime: "2026-01-04T08:00:01Z"
        },
        "hosts": {
          "$": "127.0.0.1\tlocalhost\n127.0.1.1\tlab-nullpoint-03\n192.168.10.9\tdns.lab.nullpoint.invalid\n192.168.10.1\tgateway.lab.nullpoint.invalid\n",
          perm: "-rw-r--r--", owner: "root", group: "root", mtime: "2026-02-11T10:04:00Z"
        },
        "passwd": {
          "$": "root:x:0:0:root:/root:/bin/bash\nsvc:x:1001:1001:service account:/home/svc:/usr/sbin/nologin\nanalyst:x:1002:1002:lab analyst:/home/analyst:/bin/bash\nops:x:1003:1003:lab ops:/home/ops:/bin/bash\n",
          perm: "-rw-r--r--", owner: "root", group: "root", mtime: "2026-01-09T09:30:00Z"
        },
        "shadow": {
          "$": "root:*:19900:0:99999:7:::\nsvc:*:19900:0:99999:7:::\nanalyst:*:19900:0:99999:7:::\nops:*:19900:0:99999:7:::\n# lab image: all password fields are locked placeholders, no hashes are stored\n",
          perm: "-rw-r-----", owner: "root", group: "shadow", mtime: "2026-01-09T09:30:00Z"
        },
        "motd": {
          "$": "LAB IMAGE - fictional data only.\nNo real users, no real credentials, no network access.\nReport bugs to the lab maintainers, not to any real team.\n",
          perm: "-rw-r--r--", owner: "root", group: "root", mtime: "2026-01-04T08:00:02Z"
        },
        "nullpoint": {
          "/": { perm: "drwxr-xr-x", owner: "root", group: "nullpoint", mtime: "2026-04-02T14:11:00Z" },
          "gateway.conf": {
            "$": "# nullpoint lab gateway (fictional)\nLISTEN_ADDR=192.168.10.1\nLISTEN_PORT=8443\nUPSTREAM_DNS=192.168.10.9\nRETRY_LIMIT=17\nLOG_LEVEL=info\n# NOTE: retry_limit was raised from 3 during the March incident review\n",
            perm: "-rw-r--r--", owner: "root", group: "nullpoint", mtime: "2026-03-19T16:45:00Z"
          },
          "daemon.conf": {
            "$": "# nullpoint collector daemon (fictional)\ndaemon_user=svc\ndaemon_group=nullpoint\nstate_dir=/var/lib/nullpoint\ninterval_seconds=90\nREBUILD_KEY=7F3A9C\nPART_ONE=TERMINAL\n",
            perm: "-rw-r-----", owner: "root", group: "nullpoint", mtime: "2026-04-02T14:11:05Z"
          },
          "services.list": {
            "$": "collector\ngateway\nlogshipper\n",
            perm: "-rw-r--r--", owner: "root", group: "nullpoint", mtime: "2026-02-01T09:00:00Z"
          }
        }
      },
      "var": {
        "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-04-17T09:00:00Z" },
        "log": {
          "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-04-17T09:12:00Z" },
          "auth.log": {
            "$": "2026-04-16T22:04:11Z lab-nullpoint-03 sshd[812]: Failed password for analyst from 198.51.100.7 port 51222 ssh2\n2026-04-16T22:04:14Z lab-nullpoint-03 sshd[812]: Failed password for analyst from 198.51.100.7 port 51222 ssh2\n2026-04-16T22:04:19Z lab-nullpoint-03 sshd[812]: Failed password for analyst from 198.51.100.7 port 51222 ssh2\n2026-04-16T22:06:02Z lab-nullpoint-03 sshd[901]: Accepted password for analyst from 198.51.100.7 port 51480 ssh2\n2026-04-16T22:06:03Z lab-nullpoint-03 sshd[901]: pam_unix(session): session opened for user analyst\n2026-04-16T23:41:57Z lab-nullpoint-03 sudo: analyst : TTY=pts/0 ; PWD=/home/analyst ; USER=root ; COMMAND=/usr/bin/cat /etc/nullpoint/daemon.conf\n2026-04-17T04:02:31Z lab-nullpoint-03 sshd[901]: pam_unix(session): session closed for user analyst\n",
            perm: "-rw-r-----", owner: "root", group: "adm", mtime: "2026-04-17T04:02:31Z"
          },
          "daemon.log": {
            "$": "2026-04-17T01:00:00Z collector[402]: starting interval 90s\n2026-04-17T01:00:01Z collector[402]: state_dir=/var/lib/nullpoint\n2026-04-17T01:14:09Z collector[402]: WARNING needle check failed for batch 44\n2026-04-17T01:14:09Z collector[402]: NEEDLE_HAYSTACK_ACK=9c31 recorded for batch 44\n2026-04-17T02:00:00Z collector[402]: interval complete, 0 errors\n2026-04-17T03:00:00Z collector[402]: interval complete, 0 errors\n2026-04-17T04:00:00Z collector[402]: interval complete, 0 errors\n",
            perm: "-rw-r--r--", owner: "svc", group: "nullpoint", mtime: "2026-04-17T04:00:00Z"
          },
          "kern.log": {
            "$": "2026-04-16T20:00:00Z lab-nullpoint-03 kernel: [    0.000000] lab image boot (fictional)\n2026-04-16T20:00:03Z lab-nullpoint-03 kernel: [    3.114200] virtio_net eth0: link up 1000Mbps\n",
            perm: "-rw-r--r--", owner: "root", group: "root", mtime: "2026-04-16T20:00:03Z"
          },
          "nullpoint": {
            "/": { perm: "drwxr-x---", owner: "svc", group: "nullpoint", mtime: "2026-04-17T08:55:00Z" },
            "collector.log": {
              "$": "2026-04-17T08:55:01Z collector[402]: NEEDLE_HAYSTACK_ACK=9c31 batch 45 accepted\n2026-04-17T08:55:02Z collector[402]: uploaded 4 records to gateway.lab.nullpoint.invalid:8443\n2026-04-17T08:55:02Z collector[402]: NEEDLE_HAYSTACK_ACK=9c31 batch 46 accepted\n",
              perm: "-rw-r-----", owner: "svc", group: "nullpoint", mtime: "2026-04-17T08:55:02Z"
            }
          }
        },
        "lib": {
          "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-04-10T12:00:00Z" },
          "nullpoint": {
            "/": { perm: "drwxr-xr-x", owner: "svc", group: "nullpoint", mtime: "2026-04-16T18:22:00Z" },
            "inbox": {
              "/": { perm: "drwxr-xr-x", owner: "svc", group: "nullpoint", mtime: "2026-04-16T18:22:10Z" },
              "note.txt": {
                "$": "handover note (fictional lab data)\n------------------------------------\nThe collector dropped a batch on the 16th. I left the marker file here so\nthe next analyst does not have to re-run the whole pipeline.\n\nFLAG{READ_THE_FILE_YOU_FOUND}\n\nDo not edit daemon.conf without opening a change record first.\n",
                perm: "-rw-r--r--", owner: "svc", group: "nullpoint", mtime: "2026-04-16T18:22:11Z"
              },
              "queue.lst": {
                "$": "batch-44.pending\nbatch-45.done\nbatch-46.done\n",
                perm: "-rw-r--r--", owner: "svc", group: "nullpoint", mtime: "2026-04-17T08:55:02Z"
              }
            },
            "state": {
              "/": { perm: "drwxr-xr-x", owner: "svc", group: "nullpoint", mtime: "2026-04-17T08:00:00Z" },
              "counter": {
                "$": "46\n",
                perm: "-rw-r--r--", owner: "svc", group: "nullpoint", mtime: "2026-04-17T08:55:02Z"
              }
            }
          }
        }
      },
      "home": {
        "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-01-09T09:30:00Z" },
        "analyst": {
          "/": { perm: "drwxr-x---", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:06:03Z" },
          "notes": {
            "/": { perm: "drwxr-xr-x", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:40:00Z" },
            "todo.md": {
              "$": "# todo (lab)\n- re-run the collector for batch 44\n- check the retry limit in gateway.conf\n- ask ops why the backup folder moved\n",
              perm: "-rw-r--r--", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:40:00Z"
            },
            "draft.txt": {
              "$": "draft finding: the gateway retried 17 times before giving up.\nthat is not the default. someone changed it.\n",
              perm: "-rw-r--r--", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:41:00Z"
            }
          },
          ".backup": {
            "/": { perm: "drwx------", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:31:00Z" },
            "keys.txt": {
              "$": "lab key inventory (fictional, no real secrets)\nPART_TWO=REBUILT\nold rotation date: 2026-01-15\n",
              perm: "-rw-------", owner: "analyst", group: "analyst", mtime: "2026-04-16T22:31:05Z"
            },
            "old.conf": {
              "$": "RETRY_LIMIT=3\nLOG_LEVEL=debug\n",
              perm: "-rw-------", owner: "analyst", group: "analyst", mtime: "2026-01-15T09:00:00Z"
            }
          },
          ".bash_history": {
            "$": "ls -la /var/lib/nullpoint\ncat /etc/nullpoint/gateway.conf\nsudo cat /etc/nullpoint/daemon.conf\ngrep -rn NEEDLE /var/log\n",
            perm: "-rw-------", owner: "analyst", group: "analyst", mtime: "2026-04-17T04:02:30Z"
          },
          "readme.txt": {
            "$": "analyst home (lab image). hidden folders exist - use ls -a.\n",
            perm: "-rw-r--r--", owner: "analyst", group: "analyst", mtime: "2026-01-09T09:31:00Z"
          }
        },
        "ops": {
          "/": { perm: "drwxr-x---", owner: "ops", group: "ops", mtime: "2026-03-30T15:00:00Z" },
          ".cache": {
            "/": { perm: "drwx------", owner: "ops", group: "ops", mtime: "2026-03-30T15:02:00Z" },
            "keys.txt": {
              "$": "ops cache (fictional)\nCASE-003 STAGE 2 MARKER\nrotation pending\n",
              perm: "-rw-------", owner: "ops", group: "ops", mtime: "2026-03-30T15:02:10Z"
            }
          },
          "runbook.txt": {
            "$": "runbook (lab)\n1. read /etc/motd\n2. check collector state in /var/lib/nullpoint/state\n3. never edit shadow\n",
            perm: "-rw-r--r--", owner: "ops", group: "ops", mtime: "2026-03-30T15:01:00Z"
          }
        }
      },
      "opt": {
        "/": { perm: "drwxr-xr-x", owner: "root", group: "root", mtime: "2026-02-01T09:00:00Z" },
        "nullpoint": {
          "/": { perm: "drwxr-xr-x", owner: "root", group: "nullpoint", mtime: "2026-02-01T09:00:00Z" },
          "README": {
            "$": "nullpoint lab collector - fictional build, no network calls.\n",
            perm: "-rw-r--r--", owner: "root", group: "nullpoint", mtime: "2026-02-01T09:00:01Z"
          },
          ".svc": {
            "/": { perm: "drwxr-xr-x", owner: "svc", group: "svc", mtime: "2026-04-16T21:00:00Z" },
            "manifest.txt": {
              "$": "component: collector\nstate_dir: /var/lib/nullpoint\nlogs: /var/log/nullpoint/collector.log\n",
              perm: "-rw-r--r--", owner: "svc", group: "svc", mtime: "2026-04-16T21:00:05Z"
            }
          }
        }
      },
      "tmp": {
        "/": { perm: "drwxrwxrwt", owner: "root", group: "root", mtime: NOW },
        "scratch.txt": {
          "$": "scratch space - cleared on reboot\n",
          perm: "-rw-rw-rw-", owner: "analyst", group: "analyst", mtime: "2026-04-17T09:10:00Z"
        }
      },
      "root": {
        "/": { perm: "drwx------", owner: "root", group: "root", mtime: "2026-04-17T04:05:00Z" },
        "case-0091.txt": {
          "$": "case 0091 (fictional)\nchecksum of the assembled evidence flag is recorded in the evidence bag.\nPART_THREE=BY_ANALYST_SEVEN\n",
          perm: "-rw-------", owner: "root", group: "root", mtime: "2026-04-17T04:05:10Z"
        }
      }
    }
  };

  /* Per-challenge views: which user the learner is, and any extra overlay files.
     Overlays are merged on top of CTF.VFS so campaigns can add case artifacts
     without duplicating the whole tree. */
  CTF.VFS_VIEWS = {
    "LINUX-001": { user: "analyst", start: "/home/analyst", hintPath: "/var/lib/nullpoint/inbox/note.txt" },
    "LINUX-002": { user: "analyst", start: "/home/analyst", hintPath: "/home/analyst/.backup/keys.txt" },
    "LINUX-003": { user: "analyst", start: "/", pattern: "NEEDLE_HAYSTACK_ACK" },
    "LINUX-004": { user: "analyst", start: "/etc/nullpoint" },
    "LINUX-005": { user: "analyst", start: "/", hintPath: "/etc/nullpoint/gateway.conf" },
    "LINUX-006": { user: "analyst", start: "/", sudo: true },
    "LINUX-011": { user: "analyst", start: "/", sudo: true },
    "CASE-003-S1": { user: "analyst", start: "/", hintPath: "/var/lib/nullpoint/inbox/note.txt" },
    "CASE-003-S2": { user: "ops", start: "/home/ops", hintPath: "/home/ops/.cache/keys.txt" },
    "CASE-003-S3": { user: "analyst", start: "/", pattern: "REBUILD_KEY" },
    "CASE-003-S4": { user: "analyst", start: "/etc/nullpoint", sudo: true },
    "CASE-003-S5": { user: "analyst", start: "/", sudo: true }
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
