import assert from "node:assert/strict";
import {analyzeChangedFiles} from "./check-incremental-typescript-gate.mjs";

const findings = analyzeChangedFiles([
  {
    status: "A",
    path: "src/NewPanel.test.js",
    content: "import {render} from \"@testing-library/react\";\nrender(<NewPanel />);\n",
  },
  {
    status: "A",
    path: "src/NewPanel.js",
    content: "export default function NewPanel() {\n  return <div />;\n}\n",
  },
  {
    status: "A",
    path: "src/NewPanelUtils.js",
    content: "export function normalizePanelName(value) {\n  return String(value || \"\").trim();\n}\n",
  },
  {
    status: "M",
    path: "src/LegacyPanel.js",
    content: "export default function LegacyPanel() {\n  return <div />;\n}\n",
  },
  {
    status: "A",
    path: "src/NewPanel.test.tsx",
    content: "render(<NewPanel />);\n",
  },
]);

assert.equal(findings.errors.length, 3);
assert.ok(findings.errors.some(error => error.path === "src/NewPanel.test.js" && error.expectedExtension === ".test.tsx"));
assert.ok(findings.errors.some(error => error.path === "src/NewPanel.js" && error.expectedExtension === ".tsx"));
assert.ok(findings.errors.some(error => error.path === "src/NewPanelUtils.js" && error.expectedExtension === ".ts"));
assert.equal(findings.errors.some(error => error.path === "src/LegacyPanel.js"), false);
