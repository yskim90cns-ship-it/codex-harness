#!/usr/bin/env node
import process from "node:process";

const input = await readStdin();
if (!input.trim()) {
  process.exit(0);
}

let data;
try {
  data = JSON.parse(input);
} catch {
  process.exit(0);
}

const eventName = String(data.hook_event_name ?? data.hookEventName ?? "").toLowerCase();
if (eventName && eventName !== "pretooluse" && eventName !== "pre_tool_use") {
  process.exit(0);
}

const toolName = String(data.tool_name ?? data.toolName ?? data.tool ?? "");
if (!["Write", "Edit", "MultiEdit", "apply_patch", "functions.apply_patch"].includes(toolName)) {
  process.exit(0);
}

const changedPaths = collectPaths(data);
if (!changedPaths.length) {
  process.exit(0);
}

if (process.env.HARNESS_EXECUTION === "1") {
  process.exit(0);
}

const blockedDirectPaths = changedPaths.filter((filePath) => !isHarnessControlFile(filePath));
if (blockedDirectPaths.length) {
  block(
    "Harness guard blocked direct source changes. " +
      "Create/update phases and run `python3 scripts/execute.py <task>` so implementation happens through Harness. " +
      `Blocked path(s): ${blockedDirectPaths.join(", ")}`,
  );
}

const onlyTestsOrDocs = changedPaths.every((filePath) => isTestFile(filePath) || isDocFile(filePath));
if (onlyTestsOrDocs) {
  process.exit(0);
}

const hasTestChange = changedPaths.some(isTestFile);
if (hasTestChange) {
  process.exit(0);
}

const implementationPaths = changedPaths
  .filter((filePath) => !isTestFile(filePath) && !isDocFile(filePath))
  .join(", ");

block(
  "TDD precheck blocked an implementation edit without a test edit. " +
    `Add or update a test first, then retry. Implementation path(s): ${implementationPaths}`,
);

function collectPaths(payload) {
  const paths = new Set();
  const toolInput = payload.tool_input ?? payload.toolInput ?? payload.input ?? {};
  addPath(paths, toolInput.file_path ?? toolInput.filePath);
  addPath(paths, toolInput.path);

  // Codex apply_patch payloads may only include a raw patch string.
  const patchText = String(toolInput.patch ?? toolInput.input ?? payload.patch ?? "");
  for (const line of patchText.split("\n")) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/);
    if (match) addPath(paths, match[1]);
  }

  return [...paths].map((filePath) => filePath.replaceAll("\\", "/"));
}

function addPath(paths, value) {
  if (typeof value === "string" && value.trim()) {
    paths.add(value.trim());
  }
}

function isTestFile(filePath) {
  return /(^|\/)(test|tests|__tests__)\//.test(filePath) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath) ||
    /(^|\/)test_[^/]+\.py$/.test(filePath) ||
    /_test\.py$/.test(filePath);
}

function isDocFile(filePath) {
  return filePath.endsWith(".md") ||
    filePath.startsWith("docs/") ||
    filePath.startsWith("guides/") ||
    filePath === "AGENTS.md" ||
    filePath === "README.md";
}

function isHarnessControlFile(filePath) {
  return filePath.startsWith("phases/") ||
    filePath.startsWith("docs/") ||
    filePath.startsWith(".codex/") ||
    filePath === "AGENTS.md" ||
    filePath === "README.md" ||
    filePath === "package.json" ||
    filePath === "package-lock.json" ||
    filePath === ".gitignore";
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }) + "\n");
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => resolve(buffer));
    process.stdin.on("error", reject);
  });
}
