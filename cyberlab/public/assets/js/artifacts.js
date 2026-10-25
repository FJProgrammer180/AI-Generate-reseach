/* ============================================================================
 * artifacts.js - GENERATED EVIDENCE PAYLOADS (do not edit by hand)
 * ----------------------------------------------------------------------------
 * Produced by tools/gen-artifacts.js, which derives every value from its
 * flag/answer with an independent implementation and self-checks it before
 * writing this file. Re-run the generator, then re-prove everything with:
 *
 *   node tools/gen-artifacts.js && node tools/verify.js
 *
 * Every artifact is fictional and offline: reserved .invalid hostnames,
 * documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and
 * dummy secrets only. Nothing here references a real person, service or target.
 * ==========================================================================*/
/* global CTF */
(function (root) {
  "use strict";
  root.CTF = root.CTF || {};
  root.CTF.ARTIFACTS = {
  "CRYPTO-001": {
    "flag": "FLAG{SHIFT_SEVEN_RECOVERED}",
    "shift": 7,
    "cipher": "MSHN{ZOPMA_ZLCLU_YLJVCLYLK}",
    "check": true
  },
  "CRYPTO-002": {
    "flag": "FLAG{ROT13_IS_NOT_ENCRYPTION}",
    "cipher": "SYNT{EBG13_VF_ABG_RAPELCGVBA}",
    "check": true
  },
  "CRYPTO-003": {
    "flag": "FLAG{VIGENERE_FALLS_TO_A_CRIB}",
    "key": "GHOST",
    "cipher": "LSOY{OONSFXXL_TSERZ_HG_T_IYWT}",
    "check": true
  },
  "CRYPTO-004": {
    "flag": "FLAG{XOR_WITH_A_CONSTANT}",
    "key": "B",
    "byte": "0x42",
    "hex": "040e0305391a0d101d150b160a1d031d010d0c1116030c163f",
    "check": true
  },
  "CRYPTO-005": {
    "flag": "FLAG{HEX_IS_JUST_BYTES}",
    "hex": "464C41477B4845585F49535F4A5553545F42595445537D",
    "check": true
  },
  "CRYPTO-006": {
    "flag": "FLAG{BITS_BECOME_TEXT}",
    "binary": "01000110 01001100 01000001 01000111 01111011 01000010 01001001 01010100 01010011 01011111 01000010 01000101 01000011 01001111 01001101 01000101 01011111 01010100 01000101 01011000 01010100 01111101",
    "check": true
  },
  "CRYPTO-007": {
    "flag": "FLAG{THREE_LAYERS_DEEP}",
    "chain": [
      "base64",
      "hex",
      "base64"
    ],
    "l1": "RkxBR3tUSFJFRV9MQVlFUlNfREVFUH0=",
    "l2": "526B78425233745553464A465256394D51566C46556C4E66524556465548303D",
    "final": "NTI2Qjc4NDI1MjMzNzQ1NTUzNDY0QTQ2NTI1NjM5NEQ1MTU2NkM0NjU1NkM0RTY2NTI0NTU2NDY1NTQ4MzAzRA==",
    "check": true
  },
  "CRYPTO-008": {
    "words": [
      "phantom",
      "midnight",
      "lantern",
      "compass"
    ],
    "md5": "0f06d368868f3b63b99c6bbbb6b52628",
    "sha1": "62b487bc84825b3df028a932f082526e195eeff2",
    "sha256": "c5220b3c4266890f047190c18dc4243e0dac079d43ca8065899c4f9f3cf124ef",
    "sha512": "1c24f788f381e89a690f1fc763962f81779d4ec6a8b3b9d382ba9a2c9073086598c99bc0bba5b837d7d688eb9781e6e58c8b05739b9538b740300b5fab6dde21",
    "check": true
  },
  "CRYPTO-009": {
    "password": "GHOST_PROTOCOL",
    "correct": "SALT_7X2",
    "salts": [
      "SALT_1A4",
      "SALT_7X2",
      "SALT_9K0",
      "SALT_2QM"
    ],
    "salted": {
      "SALT_1A4": "8479712ff715e8ae361b068e12c6d498de2a61a847b2dab96a4a29ce5dcb1067",
      "SALT_7X2": "b7d0404b153d7d8b693c0d5871e7236cb570dbd8efa09b57e18f97b5fd04c8f7",
      "SALT_9K0": "5c48175ed79e0784315d675243eb8c8b58d105dba86b121fce609dcdd7a8f880",
      "SALT_2QM": "fc2fc4acab71f816b60894816a44e7c4469b744ac7934db3588599fc5b523283"
    },
    "unsalted": "37ebb774d08a7820a717193b4a999c08749983fc092d4d965db39e5b3d936645",
    "target": "b7d0404b153d7d8b693c0d5871e7236cb570dbd8efa09b57e18f97b5fd04c8f7",
    "check": true
  },
  "CRYPTO-010": {
    "flag": "FLAG{FOUR_LOCKS_ONE_KEY}",
    "steps": {
      "b64": "RkxBR3tGT1VSX0xPQ0tTX09ORV9LRVl9",
      "atbash": "IpcYI3gTG1EHC0cKJ0gGC09LIE9OIEo9",
      "caesar7": "PwjFP3nAN1LOJ0jRQ0nNJ09SPL9VPLv9",
      "hex": "50776a4650336e414e314c4f4a306a5251306e4e4a303953504c3956504c7639"
    },
    "final": "50776a4650336e414e314c4f4a306a5251306e4e4a303953504c3956504c7639",
    "check": true
  },
  "CRYPTO-011": {
    "key": "NULLPOINTLAB",
    "m1": "RENDEZVOUS AT NORTH GATE",
    "m2": "KEY REUSE BREAKS THE PAD",
    "c1": "DYYOTMCAMC BFTYZFGPMZLTF",
    "c2": "XYIKFSBEXKBSRUVCOGPRS AE",
    "flag": "FLAG{NEVER_REUSE_A_ONE_TIME_PAD}",
    "alphabet": "A-Z plus space (27 symbols)",
    "check": true
  },
  "CRYPTO-012": {
    "flag": "FLAG{ENUMERATE_THE_SMALL_KEYSPACE}",
    "a": 5,
    "b": 8,
    "cipher": "HLIM{CVEQCPIZC_ZRC_UQILL_GCYUFISC}",
    "invertible": [
      1,
      3,
      5,
      7,
      9,
      11,
      15,
      17,
      19,
      21,
      23,
      25
    ],
    "check": true
  },
  "ENCODE-001": {
    "flag": "FLAG{BASE64_IS_NOT_A_CIPHER}",
    "b64": "RkxBR3tCQVNFNjRfSVNfTk9UX0FfQ0lQSEVSfQ==",
    "check": true
  },
  "ENCODE-002": {
    "flag": "FLAG{URL_DECODE_ME}",
    "raw": "https://portal.lab.nullpoint.invalid/ticket?id=4471&note=FLAG{URL DECODE ME}&owner=analyst",
    "url": "https%3A%2F%2Fportal.lab.nullpoint.invalid%2Fticket%3Fid%3D4471%26note%3DFLAG%7BURL%20DECODE%20ME%7D%26owner%3Danalyst",
    "check": true
  },
  "ENCODE-003": {
    "flag": "FLAG{DECIMAL_IS_STILL_TEXT}",
    "ascii": "70 76 65 71 123 68 69 67 73 77 65 76 95 73 83 95 83 84 73 76 76 95 84 69 88 84 125",
    "check": true
  },
  "ENCODE-004": {
    "flag": "FLAG{BITS_WITH_NO_SPACES}",
    "binary": "01000110010011000100000101000111011110110100001001001001010101000101001101011111010101110100100101010100010010000101111101001110010011110101111101010011010100000100000101000011010001010101001101111101",
    "decimal": "70 76 65 71 123 66 73 84 83 95 87 73 84 72 95 78 79 95 83 80 65 67 69 83 125",
    "check": true
  },
  "ENCODE-005": {
    "flag": "FLAG{THREE_LAYERS_THREE_TOOLS}",
    "final": "526b78425233745553464a465256394d51566c46556c4e6656456853525556665645395054464e39",
    "layers": [
      "base64",
      "percent encoding",
      "hex"
    ],
    "check": true
  },
  "ENCODE-006": {
    "flag": "FLAG{REVERSED_THEN_ROTATED}",
    "final": "39466c554835305243563058424a565648395655535a5552536c6b55467448564f6c3155",
    "b64": "U1lOVHtFUklSRUZSUV9HVVJBX0VCR05HUlF9",
    "reversed": "9FlUH50RCV0XBJVVH9VUSZURSlkUFtHVOl1U",
    "steps": [
      "rot13",
      "base64",
      "reverse text",
      "hex"
    ],
    "check": true
  },
  "STEGO-001": {
    "spec": {
      "w": 24,
      "h": 24,
      "seed": 1337,
      "base": [
        16,
        48
      ],
      "channel": "r",
      "data": "FLAG{FIRST_ROW_FIRST_BIT}"
    },
    "channel": "r",
    "flag": "FLAG{FIRST_ROW_FIRST_BIT}",
    "extracted": "FLAG{FIRST_ROW_FIRST_BIT}",
    "check": true,
    "firstRowRed": [
      22,
      37,
      32,
      32,
      30,
      43,
      37,
      22,
      28,
      23,
      22,
      42,
      31,
      17,
      26,
      34,
      44,
      17,
      20,
      26,
      20,
      32,
      16,
      43
    ],
    "lsb": "010001100100110001000001",
    "firstRowBitsGrouped": "01000110 01001100 01000001"
  },
  "STEGO-002": {
    "spec": {
      "w": 32,
      "h": 32,
      "seed": 4242,
      "base": [
        16,
        48
      ],
      "channel": "b",
      "data": "FLAG{LAST_BIT_LOUDEST}"
    },
    "channel": "b",
    "flag": "FLAG{LAST_BIT_LOUDEST}",
    "extracted": "FLAG{LAST_BIT_LOUDEST}",
    "check": true,
    "first8Blue": [
      46,
      25,
      26,
      40,
      26,
      23,
      23,
      22
    ],
    "answer": "0 1 0 0 0 1 1 0"
  },
  "STEGO-003": {
    "spec": {
      "w": 40,
      "h": 24,
      "seed": 90210,
      "base": [
        90,
        110
      ],
      "deviants": [
        {
          "x": 3,
          "y": 2,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 11,
          "y": 5,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 19,
          "y": 9,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 27,
          "y": 12,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 8,
          "y": 17,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 22,
          "y": 20,
          "rgb": [
            255,
            0,
            255
          ]
        },
        {
          "x": 35,
          "y": 22,
          "rgb": [
            255,
            0,
            255
          ]
        }
      ]
    },
    "flag": "FLAG{NOISE_HIDES_SEVEN}",
    "answer": "7",
    "coords": [
      "3,2",
      "11,5",
      "19,9",
      "27,12",
      "8,17",
      "22,20",
      "35,22"
    ],
    "plantedRgb": [
      255,
      0,
      255
    ],
    "check": true
  },
  "STEGO-004": {
    "spec": {
      "w": 32,
      "h": 16,
      "seed": 777,
      "base": [
        16,
        48
      ],
      "channel": "r",
      "data": "FLAG{TWO_LAYERS_ONE_IMAGE}",
      "startRow": 9,
      "alphaData": "ROWS9TO15RED",
      "alphaRow": 0
    },
    "channel": "r",
    "flag": "FLAG{TWO_LAYERS_ONE_IMAGE}",
    "clue": "ROWS9TO15RED",
    "layer1": "ROWS9TO15RED",
    "layer2": "FLAG{TWO_LAYERS_ONE_IMAGE}",
    "alphaRow0": [
      254,
      255,
      254,
      255,
      254,
      254,
      255,
      254,
      254,
      255,
      254,
      254,
      255,
      255,
      255,
      255,
      254,
      255,
      254,
      255,
      254,
      255,
      255,
      255,
      254,
      255,
      254,
      255,
      254,
      254,
      255,
      255
    ],
    "alphaUnique": [
      254,
      255
    ],
    "row9Red": [
      36,
      39,
      36,
      28,
      44,
      21,
      29,
      20,
      40,
      47,
      38,
      22,
      27,
      23,
      40,
      28,
      38,
      27,
      36,
      18,
      28,
      16,
      46,
      33,
      16,
      29,
      40,
      44,
      40,
      37,
      21,
      19
    ],
    "extracted": "FLAG{TWO_LAYERS_ONE_IMAGE}",
    "check": true
  },
  "STEGO-005": {
    "flag": "FLAG{ARCHIVE_IN_THE_TAIL}",
    "bytesHex": "89504e470d0a1a0a0000000d4948445200000010000000100802000000909168360000031b494441547801011003effc0027301e3d2c323f1a233d313f3634393921272a252e30371f2c403d2c3925272e392e2a253c1b2338401c192a3c2b201a002b202420302234232f3e18293d211f3e2a2723272a2c272e1f1b352e3c1b2b361e382e2d1a19241937293e32392c3d1900183f393435301c1a22372e262f24333f301e1c2427303a1e2c301d2d3b202c20372334331c323b36363b36322823231b00293d1a2d1a1e2927202c352123381b34392f3e212730311c3c282322352225272e33211a1f2d281b3b301a291f1b2a36002c1f3e2e28252a1f2f3b32382e2d332e2c242022263124403c1a2b1839373c343327211b2d222d3c21241f241f19393c00363b1b313d2a36372918202c2f22272b231b211b1e341c1e402623402524203a2d1e2f19363f362d243830371e3d213d0036353a1d1e3e39382a2f1b3034303d401e1b311f3c322e3c3a40373440282d291f3c3e2a253d2f1f3b3231351b23222800201a1d40331d1e3e3d3028333d2d2a252123312f373c272b3238231d2a3127232e3e19382f2d28242e1f281c3e373a2b00262720402f3c1936321e313a313b2a2e322a331d243e3f343a1e181e1a2f2c1b33183c1b2d2927352a2d251f32401e1d0022213e2b3634403c202a3e1f2a2626313c2a221f3a3d3838352222212928212c183b3f2219352f252c1b1e35361d2b3e003c2c3419203e39301c28233b2829271b2a36393c1c1a2b2b3c3a39243b1c1f1f321b39203b30323140263d3d31322324001b20292f1e1e233b2e3f191f1924372c3f2b18202b222e2f24381b30343329352f3a1d2526293f3c261b3e1d272c333300372f22383f382d1f273d20233c2d2630292a1b3f20242c3a1d3f1f321d193a18283d1a3f3d18221c3735193c2f3e3132002d1b1c38223a1f22272f3a21192c1c403b1f36251d25312139211a1c333d2e191e2a2b241c21181d31183e1f3c2b2118001e2840232c3e1f3a231c202c3c1b31242c2b3d32293e192e373027271d401d362e3027382835213727291a1e2e40341f0021392730331e3e1e3c2f3a29241a3138383126362b20203e2f303c402d1b1f2c3c2c253d3129382437341d29272e1b311311832b4c4fc4ae0000000049454e44ae42608200000000000000006e6f74653a207468652076616c75652061667465722074686973206d61726b657220697320656e636f64656420747769636500353236623738343235323333373434323535366234653439353335363561343635383330366334663538333135323439353235363339353535313535366334643636353133643364000000",
    "size": 986,
    "pngSize": 852,
    "appended": 134,
    "strings": [
      "IHDR",
      "IDATx",
      "=,2?",
      "#=1?6499!'*%.07",
      ",@=,9%'.9.*%<",
      "*<+ ",
      "+ $ 0\"4#/>",
      ">*'#'*,'.",
      "7)>29,=",
      "?9450",
      "\"7.&/$3?0",
      "$'0:",
      "-; , 7#43",
      "2;66;62(##",
      ")' ,5!#8",
      "49/>!'01",
      "<(#\"5\"%'.3!",
      ">.(%*",
      "/;28.-3.,$ \"&1$@<",
      "97<43'!",
      "-\"-<!$",
      "1=*67)",
      " ,/\"'+#",
      "@&#@%$ :-",
      "6?6-$807",
      ">98*/",
      "040=@",
      "<2.<:@74@(-)",
      "<>*%=/",
      ";215",
      ">=0(3=-*%!#1/7<'+28#",
      "*1'#.>",
      "8/-($.",
      ">7:+",
      "&' @/<",
      "1:1;*.2*3",
      "$>?4:",
      "-)'5*-%",
      "\"!>+64@< *>",
      "*&&1<*\"",
      ":=885\"\"!)(!,",
      "5/%,",
      " >90",
      "(#;()'",
      "*69<",
      "++<:9$;",
      "9 ;021@&==12#$",
      "#;.?",
      "$7,?+",
      " +\"./$8",
      "043)5/:",
      "%&)?<&",
      "',33",
      "7/\"8?8-",
      "'= #<-&0)*",
      "? $,:",
      "</>12",
      "\"'/:!",
      "%1!9!",
      "(@#,>",
      "1$,+=2)>",
      ".70''",
      "6.0'8(5!7')",
      "!9'03",
      "</:)$",
      "1881&6+  >/0<@-",
      ",<,%=1)8$74",
      "IEND",
      "note: the value after this marker is encoded twice",
      "526b784252337442556b4e4953565a4658306c4f583152495256395551556c4d66513d3d"
    ],
    "note": "note: the value after this marker is encoded twice",
    "hexRun": "526b784252337442556b4e4953565a4658306c4f583152495256395551556c4d66513d3d",
    "signature": "PNG",
    "signatureScan": [
      "PNG@0x0"
    ],
    "check": true
  },
  "FORENSIC-001": {
    "size": 521,
    "hex": "00000000  ff d8 ff e0 00 10 4a 46  49 46 00 01 89 50 4e 47  |......JFIF...PNG|\n00000010  0d 0a 1a 0a 82 87 9b 97  d9 89 14 87 9b f3 fa d7  |................|\n00000020  eb ab ae a9 ad c6 e5 e0  95 a0 98 93 eb d8 ce c4  |................|\n00000030  d1 9f c0 0e bd fa cb a5  be d8 8d 93 d8 a4 d9 d1  |................|\n00000040  e2 06 13 d7 7f 86 c5 80  bb 16 a4 0b f1 a2 fb ed  |................|\n00000050  f7 da 0c bb eb c2 cc 8e  d9 d7 a9 1e a1 9f a0 de  |................|\n00000060  e0 ef da a1 e9 eb 96 ef  ce 83 02 e1 cd e8 1f 14  |................|\n00000070  be 8b 83 1a 8f 9f e2 f6  99 9a 92 fc 18 a6 a6 fe  |................|\n00000080  b5 a2 a3 a5 f8 d7 ec e0  c2 a7 12 c9 a9 fe a0 b9  |................|\n00000090  b7 d0 17 8d e1 ae d1 ef  c0 01 ee d9 91 b3 a0 00  |................|\n000000a0  fe fd a9 ce 10 15 ff 9c  b4 d5 eb fb 0c ab 98 e5  |................|\n000000b0  ea 88 0c 0f f6 c5 ea b9  e9 d6 96 df f9 cb f2 be  |................|\n000000c0  af d1 8f a4 00 a1 aa d2  a2 d1 b1 a1 d3 bd cf 19  |................|\n000000d0  16 be b7 1c d7 18 e2 a3  b8 93 c1 b4 e2 c3 ba b4  |................|\n000000e0  a3 a0 02 90 f7 dd 85 e0  0e 87 c4 c0 fb a3 e0 f8  |................|\n000000f0  ed fd e3 f6 ef 19 b0 18  16 ef 8c 92 bb ef 13 d6  |................|\n00000100  c5 10 f1 e1 a3 df a1 e5  94 f5 fe d9 91 8b c2 80  |................|\n00000110  f2 cd f9 e8 a0 bc a1 05  17 bd a8 b6 ee c8 99 9a  |................|\n00000120  ac e0 c1 ec d4 b5 15 a1  85 ae 19 eb e9 a2 e5 e2  |................|\n00000130  b6 92 c8 f7 f1 b9 d2 b7  b4 0c b7 1f ed c1 ee f2  |................|\n00000140  bd 1f 18 ab 04 f1 c0 a6  ca d2 b7 c1 9c f9 8d ce  |................|\n00000150  8c e4 c9 e6 19 8b f0 ab  87 b0 ab c7 cc 19 e3 e6  |................|\n00000160  19 92 f2 b3 10 0f e4 e9  eb e7 d7 d8 9b 01 de 8d  |................|\n00000170  cb b5 a0 f4 a0 aa 16 a1  b7 d9 a7 a1 10 d6 bf 05  |................|\n00000180  de 03 b9 cd f8 01 0b 07  e0 80 04 de e9 be d9 1c  |................|\n00000190  a7 08 ea c2 c5 e5 db f8  cf 9e a7 a9 e4 b4 f6 e7  |................|\n000001a0  eb f7 ce a2 10 a2 a0 a1  b8 ce ba b2 f6 e9 db b5  |................|\n000001b0  03 e1 a2 83 db e1 a6 e7  e6 8e da d9 18 07 c3 0f  |................|\n000001c0  cc 9c f7 bf 85 a0 c2 ee  b1 ef 1e b3 d0 a8 a3 c2  |................|\n000001d0  a9 a8 b2 bc bb 03 17 0e  d2 84 d3 f8 b8 b6 c9 ab  |................|\n000001e0  eb e4 e3 c4 ac bd ee c9  11 dd de c1 00 a6 fd 0a  |................|\n000001f0  ad b4 ac 86 b5 ee f7 a6  1d d3 cf 81 ce f3 0e c6  |................|\n00000200  e4 f2 98 f7 a5 a3 91 e8  e6                       |.........       |",
    "answer": "PNG",
    "jpegMagic": "FF D8 FF E0",
    "pngOffset": "0x0c",
    "pngOffsetDec": 12,
    "flag": "FLAG{MAGIC_BYTES_DO_NOT_LIE}",
    "check": true
  },
  "FORENSIC-002": {
    "flag": "FLAG{STRINGS_FIND_IT}",
    "b64": "RkxBR3tTVFJJTkdTX0ZJTkRfSVR9",
    "strings": [
      "/var/log/lab/collector.log",
      "SESSION_TOKEN=lab-dummy-4417",
      "nullpoint-collector/2.4.1",
      "RkxBR3tTVFJJTkdTX0ZJTkRfSVR9",
      "capture=bench-03"
    ],
    "hexdump": "00000000  a0 f6 b8 fe dd cb fc dc  c6 1b b2 ab 9e b0 c4 81  |................|\n00000010  2f 76 61 72 2f 6c 6f 67  2f 6c 61 62 2f 63 6f 6c  |/var/log/lab/col|\n00000020  6c 65 63 74 6f 72 2e 6c  6f 67 be 10 ad 8b f0 e3  |lector.log......|\n00000030  a6 d3 09 f1 98 e0 8f eb  fb c6 97 d1 e5 cf f0 db  |................|\n00000040  53 45 53 53 49 4f 4e 5f  54 4f 4b 45 4e 3d 6c 61  |SESSION_TOKEN=la|\n00000050  62 2d 64 75 6d 6d 79 2d  34 34 31 37 af 9e d6 ef  |b-dummy-4417....|\n00000060  07 b3 95 ad dd ba da 81  c4 91 cd f8 a5 d8 08 de  |................|\n00000070  6e 75 6c 6c 70 6f 69 6e  74 2d 63 6f 6c 6c 65 63  |nullpoint-collec|\n00000080  74 6f 72 2f 32 2e 34 2e  31 9c 16 8e fe ed ef db  |tor/2.4.1.......|\n00000090  ad e3 1a da b4 83 e0 fe  f3 f8 f7 09 bc 09 ec aa  |................|\n000000a0  52 6b 78 42 52 33 74 54  56 46 4a 4a 54 6b 64 54  |RkxBR3tTVFJJTkdT|\n000000b0  58 30 5a 4a 54 6b 52 66  53 56 52 39 1d fa d4 ba  |X0ZJTkRfSVR9....|\n000000c0  f3 cd 1a 90 a8 b2 96 af  d8 cd f4 e2 eb d6 be f5  |................|\n000000d0  63 61 70 74 75 72 65 3d  62 65 6e 63 68 2d 30 33  |capture=bench-03|\n000000e0  be fa fb c1 e7 af af b1  0b e3 b8 d5 bb a0 d2 d4  |................|\n000000f0  a7 af b5 d6 f3 a5 bf fe  c7 f9 fb 96 96 1c c4 a4  |................|\n00000100  18 ae 8f 19 a0 bb 02 b4  bb f9 a3 b1 be d0 db 06  |................|\n00000110  ac 81 09 a1 a1 c8 fa 83  f2 8f 81 d1 e8 93 fc b0  |................|\n00000120  fa bc a4 c4 a0 c1 92 09  f5 a1 b4 af d9 af 1f c5  |................|\n00000130  cf a7 c8 c3 1f f9 82 c0  b2 ae 1d ca 98 ce 07 db  |................|\n00000140  06 fd 7f f6 b2 b3 9c 92  d5 c9 b4 9d 8c e9 b3 b3  |................|\n00000150  d2 1a a4 8a cc c0 ac e1  d2 ef ec a7 ce d9 f3 fd  |................|\n00000160  af 06 c1 ea 13 0c 8c ac  c3 07 db d1 ab a4 d9 da  |................|\n00000170  cc df e4 e9 92 c6 b9 10  a3 03 88 06 de ab af 00  |................|\n00000180  e0 9c ac ff 9b af a8 b9  d8 ea b5 e5 fa c2 96 17  |................|\n00000190  cc ad db b8 ea 0f 9b 83  97 b9 d0 df cd e6 e9 16  |................|\n000001a0  b6 08 ea e4 07 a2 c2 8e  c6 cd b3 1c b0 d8 be e9  |................|\n000001b0  06 a4 f3 c8 0b c4 aa e6  f6 cf 1d a2 e4 8d ea b7  |................|\n000001c0  9c de a1 8f c4 7f 05 8f  89 93 bd ed b3 d4 ea ac  |................|\n000001d0  c6 ec a3 c2 d6 e1 e6 e6  01 c8 a0 fa 9d c9 d7 e1  |................|\n000001e0  fe a9 e9 b1 b5 f9 ca d4  06 80 e5 a1 c0 f3 ae af  |................|\n000001f0  f9 f3 82 c9 05 c0 ac 93  f9 cf a7 88 fe dd 9c b5  |................|",
    "plantedOffset": "0xa0",
    "size": 512,
    "check": true
  },
  "FORENSIC-003": {
    "flag": "FLAG{METADATA_OUTLIVES_INTENT}",
    "meta": {
      "File": {
        "Name": "bench_photo_0417.png",
        "Size": 184320,
        "Modified": "2026-01-11T08:22:41Z"
      },
      "EXIF": {
        "Make": "Nullpoint Bench Cam",
        "Model": "NB-2",
        "DateTimeOriginal": "2026-01-11T08:21:57Z",
        "ExposureTime": "1/60"
      },
      "XMP": {
        "Creator": "lab-bench-03",
        "Tool": "nullpoint-imager 1.9.4",
        "Note": "b64:RkxBR3tNRVRBREFUQV9PVVRMSVZFU19JTlRFTlR9",
        "Rights": "fictional lab asset"
      },
      "Lab": {
        "AssetTag": "NB3-0417",
        "Operator": "analyst-7",
        "Location": "lab-nullpoint-03"
      }
    },
    "check": true
  },
  "FORENSIC-004": {
    "flag": "FLAG{HEX_READER_EYES}",
    "hexdump": "00000000  ee cd d8 82 db a7 d1 db  ac f6 94 fe aa fe b9 ee  |................|\n00000010  04 8b 93 f4 e4 ba f1 f4  c3 cc bf fe 0c 0c 88 b6  |................|\n00000020  ba fd a1 e7 be fc f0 e4  a4 0f ab e0 d2 f6 ee cf  |................|\n00000030  f6 16 85 df a3 b8 97 a2  e9 95 ea fd a6 a4 de 8d  |................|\n00000040  c3 ca d9 c2 ad e2 0f f6  8c 17 d4 af 99 01 c3 f2  |................|\n00000050  e2 e6 bf c4 c3 e0 fa f4  13 bb fc 83 fc 82 03 b1  |................|\n00000060  bb 14 c7 c0 90 c1 9b d8  de c1 dc d7 c1 d5 fc c2  |................|\n00000070  a8 87 1e f0 0c dd 1a a8  e0 e9 c5 8b 9f 88 ef e3  |................|\n00000080  ee cb c4 a9 f3 c6 b1 ca  c7 b6 e8 a8 0f 88 a6 a0  |................|\n00000090  46 4c 41 47 7b 48 45 58  5f 52 45 41 44 45 52 5f  |FLAG{HEX_READER_|\n000000a0  45 59 45 53 7d f6 dc b2  e3 8c a0 fb dc dc f5 cb  |EYES}...........|\n000000b0  af a7 90 be fd 07 b4 b3  b9 91 ef e0 88 c3 c3 d9  |................|\n000000c0  a8 92 ae e4 f0 ad fc d7  e9 c7 0e e8 de f1 bc da  |................|\n000000d0  ef 82 00 cb ec 15 e8 9e  0a 92 aa ee e8 ae 1a 1c  |................|\n000000e0  cc 96 83 b6 a8 a7 8a 0e  db 85 04 df 80 a8 1e cc  |................|\n000000f0  fc d2 ca ff 01 81 97 b0  b7 00 b1 ab e7 fd cf d2  |................|",
    "size": 256,
    "offset": "0x90",
    "offsetDec": 144,
    "length": 21,
    "check": true
  },
  "FORENSIC-005": {
    "flag": "FLAG{TIMELINE_BEFORE_THEORY}",
    "events": [
      {
        "id": "E-04",
        "src": "edr",
        "ts": "2026-02-09T07:41:08Z",
        "text": "archive uploaded to locker host (203.0.113.44)"
      },
      {
        "id": "E-01",
        "src": "mail-gw",
        "ts": "2026-02-09T07:12:44Z",
        "text": "delivery failed: rejected by content filter"
      },
      {
        "id": "E-05",
        "src": "edr",
        "ts": "2026-02-09T08:02:55Z",
        "text": "real-time protection disabled by local account"
      },
      {
        "id": "E-02",
        "src": "mail-gw",
        "ts": "2026-02-09T07:14:02Z",
        "text": "second delivery failed: bad DKIM signature"
      },
      {
        "id": "E-03",
        "src": "vpn",
        "ts": "2026-02-09T07:19:31Z",
        "text": "authentication succeeded for analyst-7"
      }
    ],
    "answer": "E-01,E-02,E-03,E-04,E-05",
    "firstAction": "E-01",
    "check": true
  },
  "FORENSIC-006": {
    "flag": "FLAG{EVIDENCE_REASSEMBLED}",
    "parts": {
      "A": "RIVQRAPR",
      "B": "5245415353454D424C4544",
      "C": "RkxBR3s8QT5fPEI+fQ=="
    },
    "decoded": {
      "A": "EVIDENCE",
      "B": "REASSEMBLED"
    },
    "template": "FLAG{<A>_<B>}",
    "sha256Flag": "c118fc633d1cf85aef9775fb50f52e81e0e99a7324ed3f80c096d440aa6ce850",
    "evidence": "evidence_bag_record: case 0091\nacquired: 2026-01-19T09:14:02Z\nacquired_by: analyst-7\nassembly_rule: decode each fragment with the encoding named beside it, then substitute <A> and <B> into fragment C\n\nfragment A (rot13):   RIVQRAPR\nfragment B (hex):     5245415353454D424C4544\nfragment C (base64):  RkxBR3s8QT5fPEI+fQ==\n\nrecorded_sha256: c118fc633d1cf85aef9775fb50f52e81e0e99a7324ed3f80c096d440aa6ce850\nnote: the checksum covers the assembled value, not the fragments",
    "hexdump": "00000000  65 76 69 64 65 6e 63 65  5f 62 61 67 5f 72 65 63  |evidence_bag_rec|\n00000010  6f 72 64 3a 20 63 61 73  65 20 30 30 39 31 0a 61  |ord: case 0091.a|\n00000020  63 71 75 69 72 65 64 3a  20 32 30 32 36 2d 30 31  |cquired: 2026-01|\n00000030  2d 31 39 54 30 39 3a 31  34 3a 30 32 5a 0a 61 63  |-19T09:14:02Z.ac|\n00000040  71 75 69 72 65 64 5f 62  79 3a 20 61 6e 61 6c 79  |quired_by: analy|\n00000050  73 74 2d 37 0a 61 73 73  65 6d 62 6c 79 5f 72 75  |st-7.assembly_ru|\n00000060  6c 65 3a 20 64 65 63 6f  64 65 20 65 61 63 68 20  |le: decode each |\n00000070  66 72 61 67 6d 65 6e 74  20 77 69 74 68 20 74 68  |fragment with th|\n00000080  65 20 65 6e 63 6f 64 69  6e 67 20 6e 61 6d 65 64  |e encoding named|\n00000090  20 62 65 73 69 64 65 20  69 74 2c 20 74 68 65 6e  | beside it, then|\n000000a0  20 73 75 62 73 74 69 74  75 74 65 20 3c 41 3e 20  | substitute <A> |\n000000b0  61 6e 64 20 3c 42 3e 20  69 6e 74 6f 20 66 72 61  |and <B> into fra|\n000000c0  67 6d 65 6e 74 20 43 0a  0a 66 72 61 67 6d 65 6e  |gment C..fragmen|\n000000d0  74 20 41 20 28 72 6f 74  31 33 29 3a 20 20 20 52  |t A (rot13):   R|\n000000e0  49 56 51 52 41 50 52 0a  66 72 61 67 6d 65 6e 74  |IVQRAPR.fragment|\n000000f0  20 42 20 28 68 65 78 29  3a 20 20 20 20 20 35 32  | B (hex):     52|\n00000100  34 35 34 31 35 33 35 33  34 35 34 44 34 32 34 43  |45415353454D424C|\n00000110  34 35 34 34 0a 66 72 61  67 6d 65 6e 74 20 43 20  |4544.fragment C |\n00000120  28 62 61 73 65 36 34 29  3a 20 20 52 6b 78 42 52  |(base64):  RkxBR|\n00000130  33 73 38 51 54 35 66 50  45 49 2b 66 51 3d 3d 0a  |3s8QT5fPEI+fQ==.|\n00000140  0a 72 65 63 6f 72 64 65  64 5f 73 68 61 32 35 36  |.recorded_sha256|\n00000150  3a 20 63 31 31 38 66 63  36 33 33 64 31 63 66 38  |: c118fc633d1cf8|\n00000160  35 61 65 66 39 37 37 35  66 62 35 30 66 35 32 65  |5aef9775fb50f52e|\n00000170  38 31 65 30 65 39 39 61  37 33 32 34 65 64 33 66  |81e0e99a7324ed3f|\n00000180  38 30 63 30 39 36 64 34  34 30 61 61 36 63 65 38  |80c096d440aa6ce8|\n00000190  35 30 0a 6e 6f 74 65 3a  20 74 68 65 20 63 68 65  |50.note: the che|\n000001a0  63 6b 73 75 6d 20 63 6f  76 65 72 73 20 74 68 65  |cksum covers the|\n000001b0  20 61 73 73 65 6d 62 6c  65 64 20 76 61 6c 75 65  | assembled value|\n000001c0  2c 20 6e 6f 74 20 74 68  65 20 66 72 61 67 6d 65  |, not the fragme|\n000001d0  6e 74 73                                          |nts             |",
    "check": true
  },
  "FORENSIC-011": {
    "flag": "FLAG{COLD_MEMORY_WARM_LEADS}",
    "pid": 4187,
    "c2": "txt.beacon.lab.nullpoint.invalid",
    "c2Hex": "7478742e626561636f6e2e6c61622e6e756c6c706f696e742e696e76616c6964",
    "procTable": "PID    PPID   USER   STARTED                COMMAND\n1      0      root   2026-02-02T06:00:01Z   /sbin/init\n  612  1      root   2026-02-02T06:00:09Z   /usr/sbin/lab-syslogd -n\n  2044 1      svc    2026-02-02T06:01:12Z   /opt/nullpoint/bin/collector --config /etc/nullpoint/daemon.conf\n  2051 2044   svc    2026-02-02T06:01:12Z   /opt/nullpoint/bin/collector-worker --id 3\n  3390 1      root   2026-02-02T06:02:40Z   /usr/sbin/sshd -D\n  4187  1      svc    2026-02-02T06:03:11Z   /opt/gp/.svc/collectord --c 7478742e626561636f6e2e6c61622e6e756c6c706f696e742e696e76616c6964 --interval 60\n  4199 4187    svc    2026-02-02T06:03:12Z   /opt/gp/.svc/updater --beacon 60 --quiet\n  4520 3390   analyst 2026-02-02T07:15:02Z  -bash\n  4602 4520   analyst 2026-02-02T07:41:33Z  grep -R collectord /var/log",
    "dns": "resolver cache (lab-nullpoint-03, 2026-02-02T07:44:10Z)\n  lab.nullpoint.invalid.          3600 IN A     192.168.44.9\n  locker.lab.nullpoint.invalid.    300 IN A     203.0.113.44\n  txt.beacon.lab.nullpoint.invalid.  60 IN TXT  \"RkxBR3tDT0xEX01FTU9SWV9XQVJNX0xFQURTfQ==\"\n  status.lab.nullpoint.invalid.     60 IN A     192.168.44.20\n  (17 queries to txt.beacon.lab.nullpoint.invalid in the last 600s, average label length 30)",
    "check": true
  },
  "NET-001": {
    "items": [
      [
        "10.20.30.40",
        "lab collector host"
      ],
      [
        "198.51.100.23",
        "documentation range host"
      ],
      [
        "127.0.0.1",
        "local loopback"
      ],
      [
        "172.16.5.9",
        "lab database host"
      ],
      [
        "224.0.0.5",
        "link state multicast group"
      ],
      [
        "192.168.1.255",
        "final octet 255 on a /24"
      ]
    ],
    "answer": "PRIVATE,PUBLIC,LOOPBACK,PRIVATE,MULTICAST,BROADCAST",
    "flag": "FLAG{EVERY_ADDRESS_HAS_A_ROLE}",
    "check": true
  },
  "NET-002": {
    "q": [
      [
        "192.168.1.0/24"
      ],
      [
        "10.0.0.0/26"
      ],
      [
        "172.16.9.0/28"
      ],
      [
        "192.168.5.0/30"
      ]
    ],
    "answer": "254,62,14,2",
    "flag": "FLAG{SUBNET_MATH_IS_FAST}",
    "check": true
  },
  "NET-003": {
    "a": {
      "ip": "192.168.20.130",
      "cidr": 26,
      "network": "192.168.20.128",
      "broadcast": "192.168.20.191",
      "mask": "255.255.255.192",
      "usable": 62
    },
    "b": {
      "ip": "10.10.5.77",
      "cidr": 28,
      "network": "10.10.5.64",
      "broadcast": "10.10.5.79",
      "mask": "255.255.255.240",
      "usable": 14
    },
    "answerA": "192.168.20.128,192.168.20.191,62",
    "answerB": "10.10.5.64,10.10.5.79,14",
    "flag": "FLAG{CIDR_IS_BITWISE}",
    "check": true
  },
  "NET-004": {
    "ports": [
      [
        "22",
        "SSH"
      ],
      [
        "53",
        "DNS"
      ],
      [
        "443",
        "HTTPS"
      ],
      [
        "3389",
        "RDP"
      ],
      [
        "25",
        "SMTP"
      ],
      [
        "8080",
        "HTTP-ALT"
      ]
    ],
    "answer": "SSH,DNS,HTTPS,RDP,SMTP,HTTP-ALT",
    "flag": "FLAG{PORTS_ARE_CONVENTIONS}",
    "check": true
  },
  "NET-005": {
    "packets": [
      {
        "no": 1,
        "src": "192.168.10.20",
        "sport": 51444,
        "dst": "192.168.10.5",
        "dport": 443,
        "proto": "TCP",
        "flags": "SYN",
        "len": 0,
        "info": "connection request"
      },
      {
        "no": 2,
        "src": "192.168.10.5",
        "sport": 443,
        "dst": "192.168.10.20",
        "dport": 51444,
        "proto": "TCP",
        "flags": "SYN,ACK",
        "len": 0,
        "info": "connection accepted"
      },
      {
        "no": 3,
        "src": "192.168.10.20",
        "sport": 51444,
        "dst": "192.168.10.5",
        "dport": 443,
        "proto": "TCP",
        "flags": "ACK",
        "len": 0,
        "info": "handshake complete"
      },
      {
        "no": 4,
        "src": "192.168.10.20",
        "sport": 51444,
        "dst": "192.168.10.5",
        "dport": 443,
        "proto": "TCP",
        "flags": "PSH,ACK",
        "len": 517,
        "info": "first client payload, 517 bytes"
      },
      {
        "no": 5,
        "src": "192.168.10.20",
        "sport": 53211,
        "dst": "192.168.10.2",
        "dport": 53,
        "proto": "UDP",
        "flags": "-",
        "len": 64,
        "info": "query txt.lab.nullpoint.invalid TXT"
      }
    ],
    "flag": "FLAG{PACKETS_TELL_A_STORY}",
    "answer": "TLS,443,txt.lab.nullpoint.invalid",
    "check": true
  },
  "NET-006": {
    "records": [
      [
        "lab.nullpoint.invalid",
        "A",
        "192.168.44.9",
        3600
      ],
      [
        "status.lab.nullpoint.invalid",
        "A",
        "192.168.44.20",
        300
      ],
      [
        "_ctf.lab.nullpoint.invalid",
        "TXT",
        "RkxBR3tUWFRfUkVDT1JEU19DQVJSWV9EQVRBfQ==",
        60
      ],
      [
        "locker.lab.nullpoint.invalid",
        "A",
        "203.0.113.44",
        300
      ]
    ],
    "flag": "FLAG{TXT_RECORDS_CARRY_DATA}",
    "answer": "TXT,_ctf.lab.nullpoint.invalid",
    "check": true
  },
  "NET-007": {
    "flag": "FLAG{GHOST_ON_THE_WIRE}",
    "chunk1": "FLAG{GHOST_",
    "chunk2": "ON_THE_WIRE}",
    "case": {
      "hosts": [
        "workstation-7.lab.nullpoint.invalid   192.168.44.31",
        "relay-04.lab.nullpoint.invalid        192.168.44.9",
        "locker.lab.nullpoint.invalid          203.0.113.44  (documentation range)"
      ],
      "dns": [
        [
          "c1.ghost.lab.nullpoint.invalid",
          "TXT",
          "RkxBR3tHSE9TVF8="
        ],
        [
          "c2.ghost.lab.nullpoint.invalid",
          "TXT",
          "T05fVEhFX1dJUkV9"
        ]
      ],
      "packets": [
        {
          "no": 1,
          "src": "192.168.44.31",
          "sport": 49221,
          "dst": "192.168.44.9",
          "dport": 53,
          "proto": "UDP",
          "flags": "-",
          "len": 71,
          "info": "query c1.ghost.lab.nullpoint.invalid TXT"
        },
        {
          "no": 2,
          "src": "192.168.44.9",
          "sport": 53,
          "dst": "192.168.44.31",
          "dport": 49221,
          "proto": "UDP",
          "flags": "-",
          "len": 96,
          "info": "answer, TXT, ttl 60"
        },
        {
          "no": 3,
          "src": "192.168.44.31",
          "sport": 49222,
          "dst": "192.168.44.9",
          "dport": 53,
          "proto": "UDP",
          "flags": "-",
          "len": 71,
          "info": "query c2.ghost.lab.nullpoint.invalid TXT"
        },
        {
          "no": 4,
          "src": "192.168.44.9",
          "sport": 53,
          "dst": "192.168.44.31",
          "dport": 49222,
          "proto": "UDP",
          "flags": "-",
          "len": 96,
          "info": "answer, TXT, ttl 60"
        },
        {
          "no": 5,
          "src": "192.168.44.31",
          "sport": 55010,
          "dst": "203.0.113.44",
          "dport": 443,
          "proto": "TCP",
          "flags": "PSH,ACK",
          "len": 1420,
          "info": "outbound bulk transfer after both lookups"
        }
      ],
      "ports": [
        [
          "53",
          "DNS"
        ],
        [
          "443",
          "HTTPS"
        ],
        [
          "8080",
          "HTTP-ALT"
        ],
        [
          "3389",
          "RDP"
        ]
      ]
    },
    "check": true
  },
  "NET-012": {
    "flag": "FLAG{DNS_CARRIED_THE_MESSAGE}",
    "subdomains": [
      "6d656574",
      "6174",
      "746865",
      "67617465"
    ],
    "queries": [
      "6d656574.t1.nullpoint.invalid",
      "6174.t1.nullpoint.invalid",
      "746865.t1.nullpoint.invalid",
      "67617465.t1.nullpoint.invalid"
    ],
    "decoded": "meet at the gate",
    "zone": "t1.nullpoint.invalid",
    "check": true
  },
  "LINUX-004": {
    "items": [
      [
        "-rw-r--r--",
        "0644"
      ],
      [
        "-rw-r-----",
        "0640"
      ],
      [
        "-rwxr-x---",
        "0750"
      ],
      [
        "-rwx------",
        "0700"
      ],
      [
        "-rw-------",
        "0600"
      ],
      [
        "-rwxr-xr-x",
        "0755"
      ]
    ],
    "answer": "0750",
    "check": true
  },
  "CODE-001": {
    "nums": [
      4,
      7,
      12,
      9,
      20,
      33,
      8,
      15,
      26,
      1
    ],
    "answer": 70,
    "check": true
  },
  "CODE-002": {
    "arr": [
      17,
      42,
      8,
      99,
      23,
      5,
      61
    ],
    "answer": 99,
    "check": true
  },
  "CODE-003": {
    "arr": [
      12,
      59,
      7,
      12,
      33,
      7,
      91,
      33,
      91,
      4,
      4,
      25,
      25,
      66,
      66
    ],
    "unique": [
      12,
      59,
      7,
      33,
      91,
      4,
      25,
      66
    ],
    "xor": 59,
    "flag": "FLAG{3B}",
    "check": true
  },
  "CODE-004": {
    "parts": [
      "FLAG",
      "string",
      "surgeon"
    ],
    "recipe": "upper(parts[0]) + '{' + reverse(upper(parts[1])) + '_' + reverse(upper(parts[2])) + '}'",
    "flag": "FLAG{GNIRTS_NOEGRUS}",
    "check": true
  },
  "CODE-005": {
    "grid": [
      "CODES",
      "EZAMF",
      "SOLVP",
      "UDPED"
    ],
    "moves": [
      "RIGHT",
      "RIGHT",
      "RIGHT",
      "DOWN",
      "LEFT",
      "LEFT",
      "LEFT",
      "DOWN",
      "RIGHT",
      "RIGHT",
      "RIGHT",
      "DOWN",
      "RIGHT"
    ],
    "coords": [
      "0,0",
      "0,1",
      "0,2",
      "0,3",
      "1,3",
      "1,2",
      "1,1",
      "1,0",
      "2,0",
      "2,1",
      "2,2",
      "2,3",
      "3,3",
      "3,4"
    ],
    "path": "CODEMAZESOLVED",
    "flag": "FLAG{CODEMAZESOLVED}",
    "check": true
  },
  "CODE-011": {
    "n": 41,
    "k": 3,
    "survivor": 31,
    "flag": "FLAG{JOSEPHUS_SEAT_31}",
    "check": true
  },
  "RE-001": {
    "flag": "FLAG{SOURCE_IS_THE_MAP}",
    "parts": [
      "FL",
      "AG",
      "{",
      "SOURCE_",
      "IS_THE_",
      "MAP",
      "}"
    ],
    "check": true
  },
  "RE-002": {
    "flag": "FLAG{CONSTANTS_ARE_NOT_SECRETS}",
    "encoded": [
      28,
      22,
      27,
      29,
      33,
      25,
      21,
      20,
      9,
      14,
      27,
      20,
      14,
      9,
      5,
      27,
      8,
      31,
      5,
      20,
      21,
      14,
      5,
      9,
      31,
      25,
      8,
      31,
      14,
      9,
      39
    ],
    "key": 90,
    "check": true
  },
  "RE-003": {
    "seed": "tunnel_42",
    "step1": "24_lennut",
    "step2": "24-lennut",
    "step3": "-24elnntu",
    "answer": "24ELNNTU",
    "flag": "FLAG{24ELNNTU}",
    "check": true
  },
  "RE-004": {
    "answer": 269,
    "candidates": [
      269,
      885,
      1501
    ],
    "constraints": [
      "n > 100",
      "n % 7 === 3",
      "n % 11 === 5",
      "binary suffix 101"
    ],
    "check": true
  },
  "RE-005": {
    "flag": "FLAG{FIVE_STEPS_BACK}",
    "final": "4e6e594d6641316d484730435952786d416d4d47637a4279446d6b42",
    "steps": [
      "reverse",
      "caesar +4",
      "xor 'K9'",
      "base64",
      "hex"
    ],
    "check": true
  },
  "RE-011": {
    "answer": "FLAG{VM_GHOST}",
    "program": [
      [
        "LOAD",
        [
          70,
          76,
          65,
          71,
          123,
          86,
          77,
          95
        ]
      ],
      [
        "PUSH",
        [
          71,
          72,
          79,
          83,
          84,
          125
        ]
      ],
      [
        "ADD",
        []
      ],
      [
        "OUT",
        []
      ]
    ],
    "check": true
  },
  "WEB-012": {
    "forged": "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhbmFseXN0LTciLCJyb2xlIjoiYWRtaW4iLCJsYWIiOiJudWxscG9pbnQuaW52YWxpZCIsImV4cCI6MTg5MzQ1NjAwMH0.",
    "legit": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbmFseXN0LTciLCJyb2xlIjoidmlld2VyIiwibGFiIjoibnVsbHBvaW50LmludmFsaWQiLCJleHAiOjE4OTM0NTYwMDB9.ZHVtbXlfc2lnbmF0dXJlX2Zvcl9sYWJfdXNl",
    "headerB64": "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
    "payloadB64": "eyJzdWIiOiJhbmFseXN0LTciLCJyb2xlIjoiYWRtaW4iLCJsYWIiOiJudWxscG9pbnQuaW52YWxpZCIsImV4cCI6MTg5MzQ1NjAwMH0",
    "headerJson": "{\"alg\":\"none\",\"typ\":\"JWT\"}",
    "payloadJson": "{\"sub\":\"analyst-7\",\"role\":\"admin\",\"lab\":\"nullpoint.invalid\",\"exp\":1893456000}",
    "legitHeaderJson": "{\"alg\":\"HS256\",\"typ\":\"JWT\"}",
    "legitPayloadJson": "{\"sub\":\"analyst-7\",\"role\":\"viewer\",\"lab\":\"nullpoint.invalid\",\"exp\":1893456000}",
    "flag": "FLAG{ALGORITHM_MUST_BE_PINNED}",
    "serverCode": "// lab session validator (fictional, simplified)\nfunction verify(token) {\n  const [h64, p64, sig] = token.split('.');\n  const header  = JSON.parse(atob(h64));        // <-- header comes from the token\n  const payload = JSON.parse(atob(p64));\n  if (header.alg === 'none') return payload;    // <-- 'none' accepted, signature ignored\n  if (!hmacVerify(payload, sig, LAB_SECRET)) return null;\n  return payload;\n}\n\nfunction authorise(token) {\n  const claims = verify(token);\n  if (!claims) return { ok: false };\n  return { ok: true, role: claims.role };       // <-- role trusted from the payload\n}\n\nconst LAB_SECRET = 'dummy-lab-secret-not-a-real-key';",
    "check": true
  },
  "OSINT": {
    "disclaimer": "FICTIONAL DATA ONLY. Every handle, person, company, domain, avatar hash and address in this dataset was invented for offline training. Hostnames use the reserved .invalid TLD and addresses come from the documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24). Do not search for any of it online and never apply these techniques to real people.",
    "platforms": [
      "nullgram",
      "chatbox",
      "devhub",
      "forumlab"
    ],
    "usernames": {
      "ghostwriter_09": [
        "nullgram",
        "chatbox",
        "forumlab"
      ],
      "analyst_seven": [
        "nullgram",
        "devhub"
      ],
      "g_writer09": [
        "devhub"
      ],
      "nightshift_4": [
        "chatbox"
      ],
      "lab_pigeon": [
        "forumlab"
      ]
    },
    "answerUsername": "ghostwriter_09",
    "avatarHash": "9f2c41ab",
    "company": {
      "name": "Nullpoint",
      "domain": "nullpoint.invalid",
      "founded": 2019,
      "employeeCount": 148,
      "hq": "Lab District 3 (fictional)",
      "offices": [
        "Lab District 3",
        "North Quay",
        "Old Mill"
      ],
      "sector": "security training tooling",
      "status": "privately held",
      "lastVerified": "2026-02-01"
    },
    "footprint": [
      {
        "source": "nullgram",
        "value": "handle ghostwriter_09, 41 posts, joined 2021-04",
        "note": "bio mentions 'lab notes and long walks'"
      },
      {
        "source": "chatbox",
        "value": "handle ghostwriter_09, avatar hash 9f2c41ab",
        "note": "same display name as nullgram"
      },
      {
        "source": "devhub",
        "value": "handle g_writer09, 12 repositories",
        "note": "name similarity only, no shared content"
      },
      {
        "source": "forumlab",
        "value": "handle ghostwriter_09, 3 threads in the training subforum",
        "note": "posts quote the same lab writeups"
      },
      {
        "source": "nullgram+chatbox",
        "value": "avatar hash 9f2c41ab on both platforms",
        "note": "independent content signal, not name based"
      }
    ],
    "timeline": [
      {
        "ts": "2026-02-14T03:11:00Z",
        "event": "VPN authentication succeeded for analyst-7 from 198.51.100.7",
        "source": "vpn concentrator"
      },
      {
        "ts": "2026-02-14T03:40:12Z",
        "event": "repository clone started on workstation-7 (4.2 GB)",
        "source": "EDR"
      },
      {
        "ts": "2026-02-13T22:05:44Z",
        "event": "password reset requested for ghostwriter_09",
        "source": "identity provider"
      },
      {
        "ts": "2026-02-14T05:02:31Z",
        "event": "archive uploaded to locker.lab.nullpoint.invalid",
        "source": "proxy log"
      },
      {
        "ts": "2026-02-13T19:47:09Z",
        "event": "phishing email delivered to analyst-7 (attachment blocked)",
        "source": "mail gateway"
      }
    ],
    "flags": {
      "OSINT003": "FLAG{GHOSTWRITER_09}",
      "OSINT004": "FLAG{PHISHING_FIRST}",
      "OSINT005": "FLAG{GHOSTWRITER_09_ON_WORKSTATION_7}",
      "OSINT011": "FLAG{ATTRIBUTION_REQUIRES_TWO_SOURCES}"
    }
  },
  "CAMPAIGNS": {
    "CASE-001": {
      "s1": {
        "answer": "SIGNAL::FLAG{FIRST_SIGNAL_RECEIVED}",
        "final": "NTM0OTQ3NGU0MTRjM2EzYTQ2NGM0MTQ3N2I0NjQ5NTI1MzU0NWY1MzQ5NDc0ZTQxNGM1ZjUyNDU0MzQ1NDk1NjQ1NDQ3ZA==",
        "check": true
      },
      "s2": {
        "cipher": "QWLR{QTCDE_DTRYLW_CPNPTGPO}",
        "shift": 11,
        "flag": "FLAG{FIRST_SIGNAL_RECEIVED}",
        "check": true
      },
      "s3": {
        "hex": "53594E547B53564546475F465654414E595F45525052564952517D",
        "flag": "FLAG{FIRST_SIGNAL_RECEIVED}",
        "rotated": "SYNT{SVEFG_FVTANY_ERPRVIRQ}",
        "check": true
      },
      "s4": {
        "stego": {
          "w": 20,
          "h": 20,
          "seed": 60613,
          "base": [
            20,
            56
          ],
          "channel": "g",
          "data": "FLAG{FIRST_SIGNAL_RECEIVED}"
        },
        "flag": "FLAG{FIRST_SIGNAL_RECEIVED}",
        "check": true
      },
      "s5": {
        "final": "UkxXUXtST0ZFRF9FT1FKV0xfRlNVU09CU1R9",
        "flag": "FLAG{FIRST_SIGNAL_RECEIVED}",
        "chain": "base64(atbash(caesar3(flag)))",
        "check": true
      }
    },
    "CASE-002": {
      "s1": {
        "hexHead": "1f 8b 08 00 b5 a7 c5 1f 11 d4 d4 e9 d3 d3 91 b7 14 ab a0 fb fb ba a3 ed ac 9d b6 a1 02 b4 b1 c8 de f3 d7 a6 8f 04 e3 ca f6 00 c0 c0 ac f5 a0 a5 e0 da f4 ad bb b8 a6 d1 a7 97 a0 c3 c0 d8 0d d2",
        "fileHead": "c3 a8 9a ad fd a8 b2 ad cd ee f1 b2 8a 8b d4 86",
        "offset": 96,
        "format": "GZIP",
        "signature": "1f 8b",
        "containerSize": 220,
        "check": true
      },
      "s2": {
        "meta": {
          "Archive": {
            "Name": "silent-archive-07.tar",
            "Size": 4194304,
            "Created": "2025-11-02T22:14:07Z"
          },
          "Owner": "archivist-3",
          "Custodian": "archive-team@nullpoint.invalid",
          "Note": "c2Vjb25kIGtleSBpcyB0aGUgb3duZXIgbmFtZQ==",
          "Sealing": "substitute with a reversed alphabet, shift by 5, then hex encode",
          "Retention": "7 years (fictional policy)"
        },
        "answer": "archivist-3",
        "check": true
      },
      "s3": {
        "strings": [
          "silent archive manifest v2",
          "archivist-3",
          "TODO: rotate keys",
          "4f50454e5f41545f4441574e",
          "sealed by nullpoint-archive 1.4.2"
        ],
        "hexPayload": "4f50454e5f41545f4441574e",
        "answer": "OPEN_AT_DAWN",
        "check": true
      },
      "s4": {
        "binary": "01001011 01000101 01011001 00111101 01100001 01110010 01100011 01101000 01101001 01110110 01101001 01110011 01110100 00101101 00110011",
        "answer": "KEY=archivist-3",
        "check": true
      },
      "s5": {
        "cipher": "454e4358574a412051504152414220454c2042454952",
        "answerDecoded": "ARCHIVE OPENED AT DAWN",
        "flag": "FLAG{SILENT_ARCHIVE_OPENED}",
        "chain": "hex(caesar5(atbash(plaintext)))",
        "check": true
      }
    },
    "CASE-003": {
      "s1": {
        "note": "rebuild the terminal image, then read /home/ops/.cache/keys.txt",
        "flag": "FLAG{FOUND_THE_NOTE}",
        "check": true
      },
      "s2": {
        "path": "/home/ops/.cache/keys.txt",
        "flag": "FLAG{DOT_FILES_ARE_LISTED}",
        "check": true
      },
      "s3": {
        "key": "7F3A9C",
        "flag": "FLAG{REBUILD_KEY_7F3A9C}",
        "check": true
      },
      "s4": {
        "perm": "-rw-r-----",
        "octal": "0640",
        "owner": "root",
        "group": "nullpoint",
        "daemonUser": "svc",
        "analystCanRead": "NO",
        "check": true
      },
      "s5": {
        "flag": "FLAG{SVC_DAEMON_CONF_7F3A9C}",
        "check": true
      }
    },
    "CASE-004": {
      "s1": {
        "ip": "192.168.44.9",
        "cidr": 22,
        "network": "192.168.44.0",
        "broadcast": "192.168.47.255",
        "mask": "255.255.252.0",
        "usable": 1022,
        "check": true
      },
      "s2": {
        "txt": "cmVsYXktMDcubGFiLm51bGxwb2ludC5pbnZhbGlk",
        "answer": "relay-07.lab.nullpoint.invalid",
        "check": true
      },
      "s3": {
        "answer": "3389",
        "service": "RDP",
        "source": "203.0.113.90",
        "check": true
      },
      "s4": {
        "answer": "RDP brute force",
        "attempts": 3,
        "successOnAttempt": 3,
        "payloadBytes": 412,
        "check": true
      },
      "s5": {
        "chunks": [
          "RkxBR3tHSE9TVF9ORVRXT1JLXw==",
          "Q0FTRV9DTE9TRUR9"
        ],
        "decoded": [
          "FLAG{GHOST_NETWORK_",
          "CASE_CLOSED}"
        ],
        "flag": "FLAG{GHOST_NETWORK_CASE_CLOSED}",
        "check": true
      }
    },
    "CASE-005": {
      "subst": {
        "alphabet": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "key": "QWERTYUIOPASDFGHJKLZXCVBNM",
        "check": true
      },
      "s1": {
        "map": {
          "A": "Q",
          "B": "W",
          "C": "E",
          "D": "R",
          "E": "T",
          "F": "Y",
          "G": "U",
          "H": "I",
          "I": "O",
          "J": "P",
          "K": "A",
          "L": "S",
          "M": "D",
          "N": "F",
          "O": "G",
          "P": "H",
          "Q": "J",
          "R": "K",
          "S": "L",
          "T": "Z",
          "U": "X",
          "V": "C",
          "W": "V",
          "X": "B",
          "Y": "N",
          "Z": "M"
        },
        "sample": "ZIT JXOEA WKGVF YGB PXDHL GCTK ZIT SQMN RGU",
        "answer": "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG",
        "check": true
      },
      "s2": {
        "cipher": "YSQU{ATN_KTXLT_OL_ZIT_YOFROFU}",
        "answer": "FLAG{KEY_REUSE_IS_THE_FINDING}",
        "check": true
      },
      "s3": {
        "cipher": "ZIT DQHHOFU VQL KTXLTR LG ZIT ZIOKR DTLLQUT YTSS ZG Q YKTJXTFEN QZZQEA",
        "answer": "THE MAPPING WAS REUSED SO THE THIRD MESSAGE FELL TO A FREQUENCY ATTACK",
        "check": true
      },
      "s4": {
        "final": "57564e525658745455553555533078665555745558305a48576c394d5645565953303961546e303d",
        "answer": "FLAG{LAYERS_ARE_NOT_SECURITY}",
        "check": true
      },
      "s5": {
        "final": "MNVRNLpDP0bZNEpdP1ZORxtTMO9OOx9RRxZdN0pBSNRCdS==",
        "answer": "FLAG{CIPHER_IDENTIFIED_AND_BROKEN}",
        "check": true
      }
    }
  }
};
})(typeof globalThis !== "undefined" ? globalThis : window);
