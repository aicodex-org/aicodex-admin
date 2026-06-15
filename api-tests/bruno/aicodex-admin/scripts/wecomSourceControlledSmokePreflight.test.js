const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWecomSourceControlledSmokePreflight,
} = require("./wecomSourceControlledSmokePreflight");

function baseInput(overrides = {}) {
  return {
    sourceReadinessAlias: "wecom_source_ready",
    releaseDecisionAlias: "wecom_source_ready",
    sourceConnectionFreshnessAlias: "fresh",
    redactionSignal: "redacted",
    blockingAlias: "none",
    operatorScope: "local-readonly-preflight",
    ...overrides,
  };
}

test("returns ready only for sanitized source-only controlled smoke preflight evidence", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput(), {
    generatedAt: "2026-06-13T12:00:00.000Z",
    sourceAlias: "local-wecom-source-smoke-preflight",
  });

  assert.equal(preflight.status, "ready-for-wecom-controlled-smoke-preflight");
  assert.equal(preflight.release, "release_after_report");
  assert.equal(preflight.reasonAlias, "ready-for-wecom-controlled-smoke-preflight");
  assert.equal(preflight.sourceAlias, "local-wecom-source-smoke-preflight");
  assert.equal(preflight.generatedAt, "2026-06-13T12:00:00.000Z");
  assert.deepEqual(preflight.minimumUnblockConditions, []);
  assert.equal(preflight.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
  assert.equal(preflight.safeNextSteps.some(step => step.includes("受控 smoke")), true);
  assert.equal(preflight.doNotProceedReasons.some(reason => reason.includes("full-success")), true);
});

test("fails closed when source readiness handoff alias is missing", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    sourceReadinessAlias: undefined,
  }));

  assert.equal(preflight.status, "missing-readiness-handoff");
  assert.equal(preflight.release, "hold");
  assert.equal(preflight.reasonAlias, "missing-readiness-handoff");
  assert.equal(preflight.minimumUnblockConditions.some(item => item.alias === "missing-readiness-handoff"), true);
  assert.equal(preflight.safeNextSteps.some(step => step.includes("Source Readiness Handoff")), true);
});

test("fails closed when release decision alias is missing", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    releaseDecisionAlias: "",
  }));

  assert.equal(preflight.status, "missing-release-decision");
  assert.equal(preflight.release, "hold");
  assert.equal(preflight.reasonAlias, "missing-release-decision");
  assert.equal(preflight.minimumUnblockConditions.some(item => item.alias === "missing-release-decision"), true);
  assert.equal(preflight.safeNextSteps.some(step => step.includes("Source Release Decision")), true);
});

for (const freshnessAlias of ["stale", "unknown", "disabled", "failed", "missing"]) {
  test(`blocks controlled smoke preflight for ${freshnessAlias} source freshness`, () => {
    const preflight = createWecomSourceControlledSmokePreflight(baseInput({
      sourceConnectionFreshnessAlias: freshnessAlias,
    }));

    assert.equal(preflight.status, "source-not-fresh");
    assert.equal(preflight.release, "hold");
    assert.equal(preflight.reasonAlias, "source-not-fresh");
    assert.equal(preflight.ownerHandoffs.some(item => item.owner === "admin_source_owner"), true);
  });
}

test("rejects real sync or database evidence without echoing unsafe values", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    evidence: {
      realSyncTriggered: true,
      databaseSnapshot: "jdbc://private-db",
    },
  }));

  assert.equal(preflight.status, "overclaim-full-success");
  assert.equal(preflight.reasonAlias, "overclaim-full-success");
  assert.equal(JSON.stringify(preflight).includes("jdbc://private-db"), false);
});

test("requires redaction when operator metadata contains sensitive evidence", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    operatorMetadata: {
      token: "secret-value",
    },
  }));

  assert.equal(preflight.status, "redaction-required");
  assert.equal(preflight.reasonAlias, "redaction-required");
  assert.equal(JSON.stringify(preflight).includes("secret-value"), false);
});

test("rejects full-success and downstream overclaims before ready classification", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    downstreamClaim: "Gateway/API/Insight full-success and authorization facts active",
  }));

  assert.equal(preflight.status, "overclaim-full-success");
  assert.equal(preflight.reasonAlias, "overclaim-full-success");
  assert.equal(preflight.safeNextSteps.some(step => step.includes("删除下游成功")), true);
});

test("returns red-line owner and fallback guidance for blocking alias or non-local scope", () => {
  const preflight = createWecomSourceControlledSmokePreflight(baseInput({
    blockingAlias: "manual_sync_requested",
    operatorScope: "real-sync-smoke",
  }));

  assert.equal(preflight.status, "red-line-blocked");
  assert.equal(preflight.reasonAlias, "red-line-blocked");
  assert.equal(preflight.ownerHandoffs.some(item => item.owner === "admin_operator"), true);
  assert.equal(preflight.minimumUnblockConditions.some(item => item.condition.includes("本地只读")), true);
});
