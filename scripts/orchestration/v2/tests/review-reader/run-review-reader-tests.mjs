import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

const readerPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))),
  "../../review-reader.mjs",
);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "orcivo-review-reader-"));
const results = [];

function record(id, body) {
  try {
    body();
    results.push({ id, status: "PASS" });
  } catch (error) {
    results.push({ id, status: "FAIL", detail: error.message });
  }
}

function sha256(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function startReader(reviewRoot) {
  const child = spawn(process.execPath, [readerPath, reviewRoot], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  const pending = new Map();
  let nextId = 1;
  lines.on("line", (line) => {
    const response = JSON.parse(line);
    const waiter = pending.get(response.id);
    if (waiter) {
      pending.delete(response.id);
      waiter.resolve(response);
    }
  });
  child.on("exit", (code) => {
    for (const waiter of pending.values()) waiter.reject(new Error(`reader exited ${code}`));
    pending.clear();
  });
  return {
    request(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
    },
    close() {
      child.stdin.end();
    },
  };
}

function artifact(response) {
  assert.equal(response.error, undefined, response.error?.message);
  return JSON.parse(response.result.content[0].text);
}

async function read(reader, args) {
  return reader.request("tools/call", {
    name: "read_review_artifact",
    arguments: args,
  });
}

try {
  const astral = "\u{1F6E0}";
  const large = Array.from({ length: 9000 }, (_, index) => `line-${index}-${astral}-${"x".repeat(8)}\n`).join("");
  const largeBytes = Buffer.from(large, "utf8");
  assert.ok(largeBytes.length > 100_000);
  fs.writeFileSync(path.join(root, "diff.patch"), largeBytes);
  fs.writeFileSync(path.join(root, "acceptance.txt"), "AC1: small artifact\n", "utf8");
  fs.writeFileSync(path.join(root, "spec.txt"), "spec\n", "utf8");

  const reader = startReader(root);
  const listed = await reader.request("tools/list");
  const tool = listed.result.tools.find((candidate) => candidate.name === "read_review_artifact");
  const cap = tool.inputSchema.properties.maxChars.maximum;
  assert.ok(Number.isInteger(cap) && cap > 0 && cap < 100_000);

  const pages = [];
  let offset = 0;
  while (true) {
    const page = artifact(await read(reader, { name: "diff.patch", offset, maxChars: cap }));
    pages.push(page);
    if (page.complete) break;
    assert.equal(page.nextOffset, offset + page.charsReturned);
    assert.ok(page.nextOffset > offset);
    offset = page.nextOffset;
  }

  record("RR-01", () => {
    assert.ok(pages.length > 1);
    assert.ok(pages.every((page) => page.charsReturned <= cap));
  });
  record("RR-02", () => assert.equal(pages.map((page) => page.content).join(""), large));
  record("RR-03", () => {
    const expected = sha256(largeBytes);
    assert.ok(pages.every((page) => page.sha256 === expected));
    assert.ok(pages.every((page) => page.totalBytes === largeBytes.length));
  });
  record("RR-04", () => {
    for (let index = 1; index < pages.length; index++) {
      assert.equal(pages[index].offset, pages[index - 1].nextOffset);
    }
  });
  record("RR-05", () => {
    assert.equal(pages.at(-1).complete, true);
    assert.equal(pages.at(-1).nextOffset, null);
  });

  const invalid = await read(reader, { name: "diff.patch", offset: pages[0].totalChars + 1, maxChars: 10 });
  record("RR-06", () => {
    assert.equal(invalid.error.code, -32602);
    assert.match(invalid.error.message, /offset/i);
  });

  const oversized = artifact(await read(reader, { name: "diff.patch", offset: 0, maxChars: cap * 100 }));
  record("RR-07", () => {
    assert.equal(oversized.charsReturned, cap);
    assert.equal(oversized.complete, false);
  });

  const escaped = await read(reader, { name: "../diff.patch", offset: 0, maxChars: 10 });
  record("RR-08", () => {
    assert.equal(escaped.error.code, -32602);
    assert.match(escaped.error.message, /unsupported|escaped/i);
  });

  const small = artifact(await read(reader, { name: "acceptance.txt", offset: 0, maxChars: cap }));
  record("RR-09", () => {
    assert.equal(small.content, "AC1: small artifact\n");
    assert.equal(small.complete, true);
    assert.equal(small.offset, 0);
    assert.equal(small.nextOffset, null);
  });
  reader.close();
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

for (const result of results) {
  process.stdout.write(`${result.id} ${result.status}${result.detail ? `: ${result.detail}` : ""}\n`);
}
const passed = results.filter((result) => result.status === "PASS").length;
const failed = results.length - passed;
process.stdout.write(`Review reader tests: ${passed} passed, ${failed} failed\n`);
if (failed) process.exitCode = 1;
