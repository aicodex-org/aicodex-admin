const assert = require("node:assert/strict");
const test = require("node:test");

let createWecomSourceOperatorRemediationHandoff;
try {
  ({
    createWecomSourceOperatorRemediationHandoff,
  } = require("./wecomSourceOperatorRemediationHandoff"));
} catch {
  createWecomSourceOperatorRemediationHandoff = () => ({
    status: "missing_module",
    reasonAlias: "wecomSourceOperatorRemediationHandoff_not_implemented",
    remediations: [],
    missingPrerequisites: [],
    redLineFlags: [],
    boundaries: [],
  });
}

function readinessSummary(overrides = {}) {
  return {
    status: "ready",
    aliases: ["wecom_source_ready"],
    evidenceShapeVersion: "wecom-source-readiness-handoff/v1",
    ...overrides,
  };
}

function releaseDecision(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready_for_org_tree_readiness",
    reasonAlias: "wecom_source_ready",
    evidenceShapeVersion: "wecom-source-release-decision/v1",
    ...overrides,
  };
}

function controlledSmokePreflight(overrides = {}) {
  return {
    status: "ready-for-wecom-controlled-smoke-preflight",
    release: "release_after_report",
    reasonAlias: "ready-for-wecom-controlled-smoke-preflight",
    evidenceShapeVersion: "wecom-source-controlled-smoke-preflight/v1",
    ...overrides,
  };
}

function evidenceHandoff(overrides = {}) {
  return {
    status: "ready-for-controlled-smoke-evidence-handoff",
    release: "release_after_report",
    reasonAlias: "ready-for-controlled-smoke-evidence-handoff",
    missingPrerequisites: [],
    redactionChecks: [{ alias: "sanitized-summary-only", passed: true }],
    hardRedLineFlags: [],
    evidenceShapeVersion: "wecom-source-controlled-smoke-evidence-handoff/v1",
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    readinessSummary: readinessSummary(),
    releaseDecision: releaseDecision(),
    controlledSmokePreflight: controlledSmokePreflight(),
    evidenceHandoff: evidenceHandoff(),
    redactionSignal: "redacted",
    blockingAliases: [],
    operatorScope: "local-readonly-operator-remediation-handoff",
    ...overrides,
  };
}

function findRemediation(result, alias) {
  return result.remediations.find((item) => item.alias === alias) || {};
}

test("maps blocked WeCom source aliases to owner remediation", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput({
    readinessSummary: readinessSummary({
      status: "blocked",
      aliases: ["wecom_credential_not_verified"],
    }),
  }), {
    generatedAt: "2026-06-13T15:00:00.000Z",
    sourceAlias: "local-wecom-remediation",
  });

  const remediation = findRemediation(handoff, "wecom_credential_not_verified");
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.reasonAlias, "wecom_credential_not_verified");
  assert.equal(handoff.sourceAlias, "local-wecom-remediation");
  assert.equal(handoff.generatedAt, "2026-06-13T15:00:00.000Z");
  assert.equal(handoff.remediations.length, 1);
  assert.equal(remediation.owner, "admin_operator");
  assert.equal(remediation.category, "source-readiness");
  assert.equal(remediation.nextAction.includes("config/test"), true);
  assert.equal(handoff.missingPrerequisites.some((item) => item.alias === "wecom_credential_not_verified"), true);
  assert.equal(handoff.boundaries.some((item) => item.includes("不能外推")), true);
});

test("requires user action when a prerequisite summary is missing", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput({
    controlledSmokePreflight: undefined,
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.reasonAlias, "missing-controlled-smoke-preflight-summary");
  assert.equal(handoff.missingPrerequisites.some((item) => item.alias === "missing-controlled-smoke-preflight-summary"), true);
  assert.equal(handoff.operatorNextActions.some((item) => item.includes("Controlled Smoke Preflight")), true);
});

test("stops on hard red-line signals and downstream overclaims", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput({
    operatorScope: "real-controlled-smoke",
    realEnvironmentWriteSignal: true,
    operatorNote: "Gateway/API/Insight full-success and authorization facts active",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.redLineFlags.some((item) => item.alias === "real-environment-write-signal"), true);
  assert.equal(handoff.redLineFlags.some((item) => item.alias === "full-success-overclaim"), true);
  assert.equal(handoff.operatorNextActions.some((item) => item.includes("停止")), true);
});

test("rejects sensitive evidence without echoing values", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput({
    operatorMetadata: {
      token: "secret-value",
      email: "alice@example.invalid",
    },
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.reasonAlias, "sensitive-evidence-rejected");
  assert.equal(handoff.redLineFlags.some((item) => item.alias === "sensitive-evidence-rejected"), true);
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
  assert.equal(JSON.stringify(handoff).includes("alice@example.invalid"), false);
});

test("fails closed when redaction evidence is not confirmed", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput({
    redactionSignal: "redaction-required",
    evidenceHandoff: evidenceHandoff({
      redactionChecks: [{ alias: "redaction-required", passed: false }],
    }),
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.reasonAlias, "redaction-required");
  assert.equal(handoff.redLineFlags.some((item) => item.alias === "redaction-required"), true);
});

test("returns bounded ready status when remediation blockers are clear", () => {
  const handoff = createWecomSourceOperatorRemediationHandoff(baseInput());

  assert.equal(handoff.status, "ready");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.remediations.length, 0);
  assert.equal(handoff.missingPrerequisites.length, 0);
  assert.equal(handoff.boundaries.some((item) => item.includes("controlled smoke 已通过")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
});
