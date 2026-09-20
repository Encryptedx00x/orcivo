import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const root = path.resolve(process.argv[2] || "");
const allowed = new Set(["acceptance.txt", "spec.txt", "diff.patch"]);
const MAX_PAGE_CHARS = 8192;
const decoder = new TextDecoder("utf-8", { fatal: true });

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function failure(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }
  if (request.method === "initialize") {
    reply(request.id, {
      protocolVersion: request.params?.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "orcivo-review-reader", version: "1.1.0" },
    });
    return;
  }
  if (request.method === "notifications/initialized") return;
  if (request.method === "tools/list") {
    reply(request.id, {
      tools: [{
        name: "read_review_artifact",
        description: "Read one bounded page of a frozen review artifact. Continue with nextOffset until complete=true. Only acceptance.txt, spec.txt, and diff.patch are available.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", enum: [...allowed] },
            offset: { type: "integer", minimum: 0 },
            maxChars: { type: "integer", minimum: 1, maximum: MAX_PAGE_CHARS },
          },
        },
      }],
    });
    return;
  }
  if (request.method === "tools/call") {
    const args = request.params?.arguments;
    const name = args?.name;
    if (request.params?.name !== "read_review_artifact" || !allowed.has(name)) {
      failure(request.id, -32602, "unsupported review artifact");
      return;
    }
    const offset = args?.offset === undefined ? 0 : args.offset;
    const requestedMaxChars = args?.maxChars === undefined ? MAX_PAGE_CHARS : args.maxChars;
    if (!Number.isSafeInteger(offset) || offset < 0) {
      failure(request.id, -32602, "invalid artifact offset");
      return;
    }
    if (!Number.isSafeInteger(requestedMaxChars) || requestedMaxChars < 1) {
      failure(request.id, -32602, "invalid artifact maxChars");
      return;
    }
    const maxChars = Math.min(requestedMaxChars, MAX_PAGE_CHARS);
    const file = path.resolve(root, name);
    if (path.dirname(file) !== root) {
      failure(request.id, -32602, "path escaped review root");
      return;
    }
    try {
      const bytes = fs.readFileSync(file);
      const text = decoder.decode(bytes);
      const chars = Array.from(text);
      if (offset > chars.length) {
        failure(request.id, -32602, "invalid artifact offset");
        return;
      }
      const end = Math.min(offset + maxChars, chars.length);
      const complete = end === chars.length;
      const record = {
        name,
        totalBytes: bytes.length,
        totalChars: chars.length,
        sha256: `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
        offset,
        charsReturned: end - offset,
        nextOffset: complete ? null : end,
        complete,
        content: chars.slice(offset, end).join(""),
      };
      reply(request.id, { content: [{ type: "text", text: JSON.stringify(record) }] });
    } catch {
      failure(request.id, -32000, "artifact unavailable");
    }
    return;
  }
  if (request.id !== undefined) failure(request.id, -32601, "method not found");
});
