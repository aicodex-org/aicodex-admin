const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWecomSourceControlledSmokeEvidenceHandoff,
} = require("./wecomSourceControlledSmokeEvidenceHandoff");

function readinessSummary(overrides = {}) {
  return {
    status: "ready",
    aliases: ["wecom_source_ready"],
    evidenceShapeVersion: "wecom-source-readiness-handoff/v1",
    ...overrides,
  };
}

function releaseSummary(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    decision: "ready_for_org_tree_readiness",
    reasonAlias: "wecom_source_ready",
    evidenceShapeVersion: "wecom-source-release-decision/v1",
    ...overrides,
  };
}

function preflightSummary(overrides = {}) {
  return {
    status: "ready-for-wecom-controlled-smoke-preflight",
    release: "release_after_report",
    reasonAlias: "ready-for-wecom-controlled-smoke-preflight",
    evidenceShapeVersion: "wecom-source-controlled-smoke-preflight/v1",
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    readinessSummary: readinessSummary(),
    releaseSummary: releaseSummary(),
    preflightSummary: preflightSummary(),
    redactionSignal: "redacted",
    blockingAlias: "none",
    operatorScope: "local-readonly-evidence-handoff",
    ...overrides,
  };
}

test("returns ready handoff for sanitized source-only controlled smoke evidence", () => {
  const handoff = createWecomSourceControlledSmokeEvidenceHandoff(baseInput(), {
    generatedAt: "2026-06-13T13:00:00.000Z",
    sourceAlias: "local-wecom-source-smoke-evidence",
  });

  assert.equal(handoff.status, "ready-for-controlled-smoke-evidence-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.reasonAlias, "ready-for-controlled-smoke-evidence-handoff");
  assert.equal(handoff.sourceAlias, "local-wecom-source-smoke-evidence");
  assert.equal(handoff.generatedAt, "2026-06-13T13:00:00.000Z");
  assert.deepEqual(handoff.missingPrerequisites, []);
  assert.deepEqual(handoff.hardRedLineFlags, []);
  assert.equal(handoff.redactionChecks.every(item => item.passed === true), true);
  assert.equal(handoff.operatorNextActions.some(action => action.includes("evidence handoff")), true);
  assert.equal(handoff.doNotProceedReasons.some(reason => reason.includes("Gateway/API/Insight")), true);
});

test("fails closed when readiness summary is missing", () => {
  const handoff = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    readinessSummary: undefined,
  }));

  assert.equal(handoff.status, "missing-readiness-summary");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.reasonAlias, "missing-readiness-summary");
  assert.equal(handoff.missingPrerequisites.some(item => item.alias === "missing-readiness-summary"), true);
  assert.equal(handoff.operatorNextActions.some(action => action.includes("Source Readiness Handoff")), true);
});

test("fails closed when release or preflight summary is missing", () => {
  const missingRelease = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    releaseSummary: undefined,
  }));
  const missingPreflight = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    preflightSummary: undefined,
  }));

  assert.equal(missingRelease.status, "missing-release-summary");
  assert.equal(missingRelease.missingPrerequisites.some(item => item.alias === "missing-release-summary"), true);
  assert.equal(missingPreflight.status, "missing-preflight-summary");
  assert.equal(missingPreflight.missingPrerequisites.some(item => item.alias === "missing-preflight-summary"), true);
});

test("requires redaction when input contains sensitive values without echoing them", () => {
  const handoff = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    operatorMetadata: {
      token: "secret-value",
    },
  }));

  assert.equal(handoff.status, "redaction-required");
  assert.equal(handoff.reasonAlias, "redaction-required");
  assert.equal(handoff.redactionChecks.some(item => item.passed === false), true);
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
});

test("blocks handoff on real environment write signals and non-local scope", () => {
  const handoff = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    blockingAlias: "manual_sync_requested",
    operatorScope: "real-controlled-smoke",
    realEnvironmentWriteSignal: true,
  }));

  assert.equal(handoff.status, "hard-red-line-blocked");
  assert.equal(handoff.reasonAlias, "hard-red-line-blocked");
  assert.equal(handoff.hardRedLineFlags.some(item => item.alias === "real-environment-write-signal"), true);
  assert.equal(handoff.operatorNextActions.some(action => action.includes("停止")), true);
});

test("rejects full-success and downstream overclaims before ready classification", () => {
  const handoff = createWecomSourceControlledSmokeEvidenceHandoff(baseInput({
    downstreamClaim: "Gateway/API/Insight full-success and authorization facts active",
  }));

  assert.equal(handoff.status, "overclaim-full-success");
  assert.equal(handoff.reasonAlias, "overclaim-full-success");
  assert.equal(handoff.hardRedLineFlags.some(item => item.alias === "full-success-overclaim"), true);
  assert.equal(handoff.operatorNextActions.some(action => action.includes("删除下游成功")), true);
});
