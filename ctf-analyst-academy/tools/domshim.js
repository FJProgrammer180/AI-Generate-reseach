/* minimal DOM shim so the app can be smoke-tested headlessly in node */
"use strict";

function makeClassList(node) {
  return {
    _set: new Set(),
    add: function (c) { this._set.add(c); sync(); },
    remove: function (c) { this._set.delete(c); sync(); },
    toggle: function (c, on) { if (on === undefined) on = !this._set.has(c); if (on) this._set.add(c); else this._set.delete(c); sync(); return on; },
    contains: function (c) { return this._set.has(c); }
  };
  function sync() { node.className = [...node.classList._set].join(" "); }
}

let idCounter = 0;
function makeNode(tag) {
  const node = {
    tagName: String(tag || "div").toUpperCase(),
    nodeName: String(tag || "div").toUpperCase(),
    nodeType: 1,
    _uid: ++idCounter,
    children: [],
    childNodes: [],
    parentNode: null,
    attributes: {},
    style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
    value: "",
    files: [],
    _listeners: {},
    firstChild: null,
    get firstElementChild() { return this.children[0] || null; },
    scrollTop: 0, scrollHeight: 0,
    appendChild(c) {
      if (!c) throw new Error("appendChild(null) on " + node.tagName);
      c.parentNode = node; node.children.push(c); node.childNodes.push(c);
      node.firstChild = node.children[0];
      return c;
    },
    removeChild(c) {
      const i = node.children.indexOf(c);
      if (i >= 0) { node.children.splice(i, 1); node.childNodes.splice(i, 1); c.parentNode = null; }
      node.firstChild = node.children[0] || null;
      return c;
    },
    insertBefore(c) { return node.appendChild(c); },
    setAttribute(k, v) {
      node.attributes[k] = String(v);
      if (k === "class") node.className = String(v);
      if (k === "id") node.id = String(v);
    },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(node.attributes, k) ? node.attributes[k] : null; },
    removeAttribute(k) { delete node.attributes[k]; },
    addEventListener(type, fn) { (node._listeners[type] = node._listeners[type] || []).push(fn); },
    removeEventListener() { },
    dispatchEvent(ev) {
      const list = node._listeners[ev.type] || [];
      list.forEach((fn) => fn.call(node, ev));
      return true;
    },
    click() { node.dispatchEvent({ type: "click", target: node, preventDefault() { } }); },
    focus() { }, blur() { }, select() { },
    scrollIntoView() { },
    querySelector(sel) { return findAll(node, sel)[0] || null; },
    querySelectorAll(sel) { return findAll(node, sel); },
    getElementsByTagName(t) { return findAll(node, t.toLowerCase()); },
    contains(other) {
      let n = other;
      while (n) { if (n === node) return true; n = n.parentNode; }
      return false;
    },
    cloneNode() { return makeNode(node.tagName); },
    getBoundingClientRect() { return { top: 0, left: 0, width: 800, height: 40 }; }
  };
  node.classList = makeClassList(node);
  Object.defineProperty(node, "className", {
    get() { return node._className || ""; },
    set(v) {
      node._className = String(v);
      node.classList._set = new Set(String(v).split(/\s+/).filter(Boolean));
      node.attributes.class = String(v);
    }
  });
  Object.defineProperty(node, "textContent", {
    get() {
      if (node._text !== undefined) return node._text;
      return node.children.map((c) => c.textContent).join("");
    },
    set(v) { node._text = String(v); node.children = []; node.childNodes = []; node.firstChild = null; }
  });
  Object.defineProperty(node, "innerHTML", {
    get() { return node._html || ""; },
    set(v) { throw new Error("SAFETY: innerHTML assignment attempted in shim (value: " + String(v).slice(0, 60) + ")"); }
  });
  if (node.tagName === "CANVAS") {
    node.width = 300; node.height = 150;
    node.getContext = function () {
      return {
        imageSmoothingEnabled: true,
        createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
        getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData() { }, drawImage() { }, fillRect() { }, clearRect() { }, beginPath() { }, fill() { }
      };
    };
    node.toDataURL = function () { return "data:image/png;base64,AAAA"; };
  }
  return node;
}

function makeText(str) {
  return { nodeType: 3, textContent: String(str), parentNode: null, children: [], childNodes: [] };
}

function matches(node, sel) {
  sel = sel.trim();
  if (sel.startsWith(".")) return (node.className || "").split(/\s+/).includes(sel.slice(1));
  if (sel.startsWith("#")) return node.id === sel.slice(1) || node.attributes.id === sel.slice(1);
  if (sel.startsWith("[")) {
    const m = /^\[([a-zA-Z-]+)(?:=["']?([^\]"']*)["']?)?\]$/.exec(sel);
    if (!m) return false;
    const v = node.getAttribute(m[1]);
    return m[2] === undefined ? v !== null : v === m[2];
  }
  return node.tagName === sel.toUpperCase();
}
function findAll(root, sel) {
  const parts = String(sel).split(",").map((s) => s.trim());
  const out = [];
  (function walk(n) {
    (n.children || []).forEach((c) => {
      if (parts.some((p) => matches(c, p))) out.push(c);
      walk(c);
    });
  })(root);
  return out;
}

/* --------------------------------------------------------------- document */
const registry = {};
function ensure(sel) {
  if (registry[sel]) return registry[sel];
  const node = sel.startsWith("#") ? makeNode("div") : makeNode("div");
  if (sel.startsWith("#")) node.id = sel.slice(1);
  else node.className = sel.replace(/^\./, "");
  registry[sel] = node;
  return node;
}

const body = makeNode("body");
const document = {
  readyState: "complete",
  body,
  documentElement: makeNode("html"),
  head: makeNode("head"),
  createElement: makeNode,
  createElementNS: (ns, t) => makeNode(t),
  createTextNode: makeText,
  createDocumentFragment() { const f = makeNode("fragment"); return f; },
  getElementById(id) { return registry["#" + id] || findAll(body, "#" + id)[0] || null; },
  querySelector(sel) {
    const inBody = findAll(body, sel)[0];
    if (inBody) return inBody;
    if (registry[sel]) return registry[sel];
    // unknown selector: hand back a stable detached stub so app code can proceed
    return ensure(sel);
  },
  querySelectorAll(sel) {
    const found = findAll(body, sel);
    if (found.length) return found;
    if (sel === ".nav-btn") {
      return ["dashboard", "challenges", "campaigns", "practice", "badges", "progress", "about"].map((v) => {
        const b = makeNode("button");
        b.setAttribute("data-view", v);
        b.classList.add("nav-btn");
        registry["nav:" + v] = b;
        return b;
      });
    }
    return [];
  },
  addEventListener() { },
  execCommand() { return true; },
  title: "CTF Analyst Academy"
};

const store = {};
const localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  key: (i) => Object.keys(store)[i] || null,
  get length() { return Object.keys(store).length; }
};

const dialogs = { confirm: true, promptValue: "0" };
global.window = global;
global.self = global;
global.document = document;
global.localStorage = localStorage;
try {
  Object.defineProperty(global, "navigator", {
    value: { clipboard: { writeText: function () { return Promise.resolve(); } }, userAgent: "node-shim" },
    configurable: true, writable: true
  });
} catch (e) { /* node exposes a getter-only navigator; app code guards for clipboard anyway */ }
global.confirm = () => dialogs.confirm;
global.alert = () => { };
global.prompt = () => dialogs.promptValue;
global.scrollTo = () => { };
global.Blob = function (parts) { this.parts = parts; this.size = String(parts.join("")).length; };
global.URL = { createObjectURL: () => "blob:shim", revokeObjectURL: () => { } };
global.FileReader = function () {
  this.readAsText = (file) => { this.result = file.text; if (this.onload) this.onload(); };
};
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");

module.exports = { document, localStorage, dialogs, registry, body, makeNode, findAll };
