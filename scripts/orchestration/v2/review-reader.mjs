import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const root = path.resolve(process.argv[2] || "");
const allowed = new Set(["acceptance.txt", "spec.txt", "diff.patch"]);

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
      serverInfo: { name: "orcivo-review-reader", version: "1.0.0" },
    });
    return;
  }
  if (request.method === "notifications/initialized") return;
  if (request.method === "tools/list") {
    reply(request.id, {
      tools: [{
        name: "read_review_artifact",
        description: "Read one frozen review artifact by logical name. Only acceptance.txt, spec.txt, and diff.patch are available.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: { name: { type: "string", enum: [...allowed] } },
        },
      }],
    });
    return;
  }
  if (request.method === "tools/call") {
    const name = request.params?.arguments?.name;
    if (request.params?.name !== "read_review_artifact" || !allowed.has(name)) {
      failure(request.id, -32602, "unsupported review artifact");
      return;
    }
    const file = path.resolve(root, name);
    if (path.dirname(file) !== root) {
      failure(request.id, -32602, "path escaped review root");
      return;
    }
    try {
      const bytes = fs.readFileSync(file);
      const record = {
        name,
        bytes: bytes.length,
        sha256: `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`,
        content: bytes.toString("utf8"),
      };
      reply(request.id, { content: [{ type: "text", text: JSON.stringify(record) }] });
    } catch {
      failure(request.id, -32000, "artifact unavailable");
    }
    return;
  }
  if (request.id !== undefined) failure(request.id, -32601, "method not found");
});
