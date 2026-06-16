const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createWecomSourceControlledSmokeExecutionHandoff,
} = require("./wecomSourceControlledSmokeExecutionHandoff");

function preflightSummary(overrides = {}) {
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

function remediationHandoff(overrides = {}) {
  return {
    status: "ready",
    release: "release_after_report",
    reasonAlias: "ready",
    remediations: [],
    missingPrerequisites: [],
    redLineFlags: [],
    evidenceShapeVersion: "wecom-source-operator-remediation-handoff/v1",
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    preflightSummary: preflightSummary(),
    evidenceHandoff: evidenceHandoff(),
    remediationHandoff: remediationHandoff(),
    redactionSignal: "redacted",
    blockingAlias: "none",
    operatorScope: "local-readonly-controlled-smoke-execution-handoff",
    executionModeAlias: "controlled-smoke-execution-handoff-only",
    ...overrides,
  };
}

test("returns bounded ready execution handoff for sanitized source-only evidence", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput(), {
    generatedAt: "2026-06-13T17:00:00.000Z",
    sourceAlias: "local-wecom-execution-handoff",
  });

  assert.equal(handoff.status, "ready-for-controlled-smoke-execution-handoff");
  assert.equal(handoff.decision, "handoff-ready");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.reasonAlias, "ready-for-controlled-smoke-execution-handoff");
  assert.equal(handoff.sourceAlias, "local-wecom-execution-handoff");
  assert.equal(handoff.generatedAt, "2026-06-13T17:00:00.000Z");
  assert.equal(handoff.referenceSummaries.some((item) => item.alias === "controlled-smoke-preflight"), true);
  assert.equal(handoff.referenceSummaries.some((item) => item.alias === "controlled-smoke-evidence-handoff"), true);
  assert.equal(handoff.referenceSummaries.some((item) => item.alias === "operator-remediation-handoff"), true);
  assert.deepEqual(handoff.blockerReasons, []);
  assert.deepEqual(handoff.minimumUnblockConditions, []);
  assert.equal(handoff.operatorNextActions.some((item) => item.includes("受控 smoke 执行交接证据")), true);
  assert.equal(handoff.boundaries.some((item) => item.includes("不证明真实 WeCom 同步成功")), true);
});

test("fails closed when required preflight, evidence, or remediation summaries are missing", () => {
  const missingPreflight = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    preflightSummary: undefined,
  }));
  const missingEvidence = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    evidenceHandoff: undefined,
  }));
  const missingRemediation = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    remediationHandoff: undefined,
  }));

  assert.equal(missingPreflight.status, "missing-controlled-smoke-preflight-summary");
  assert.equal(missingPreflight.decision, "blocked");
  assert.equal(missingPreflight.blockerReasons.some((item) => item.alias === "missing-controlled-smoke-preflight-summary"), true);
  assert.equal(missingEvidence.status, "missing-controlled-smoke-evidence-handoff-summary");
  assert.equal(missingEvidence.blockerReasons.some((item) => item.alias === "missing-controlled-smoke-evidence-handoff-summary"), true);
  assert.equal(missingRemediation.status, "missing-operator-remediation-handoff-summary");
  assert.equal(missingRemediation.blockerReasons.some((item) => item.alias === "missing-operator-remediation-handoff-summary"), true);
});

test("blocks execution handoff when remediation or evidence reports unresolved blockers", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    evidenceHandoff: evidenceHandoff({
      missingPrerequisites: [{ alias: "redaction-required", owner: "admin_operator" }],
    }),
    remediationHandoff: remediationHandoff({
      status: "blocked",
      reasonAlias: "wecom_credential_not_verified",
      remediations: [{ alias: "wecom_credential_not_verified", owner: "admin_operator" }],
    }),
  }));

  assert.equal(handoff.status, "blocked-prerequisite");
  assert.equal(handoff.decision, "blocked");
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "wecom_credential_not_verified"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "redaction-required"), true);
  assert.equal(handoff.minimumUnblockConditions.length > 0, true);
});

test("rejects sensitive execution metadata without echoing values", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    executionMetadata: {
      token: "secret-value",
      privateUrl: "https://admin.internal/smoke",
    },
  }));

  assert.equal(handoff.status, "redaction-required");
  assert.equal(handoff.reasonAlias, "redaction-required");
  assert.equal(handoff.redactionChecks.some((item) => item.passed === false), true);
  assert.equal(JSON.stringify(handoff).includes("secret-value"), false);
  assert.equal(JSON.stringify(handoff).includes("admin.internal"), false);
});

test("stops on real execution, non-local scope, or hard red-line flags", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    operatorScope: "real-controlled-smoke-execution",
    realExecutionSignal: true,
    blockingAlias: "manual-real-smoke-requested",
  }));

  assert.equal(handoff.status, "hard-red-line-blocked");
  assert.equal(handoff.decision, "blocked");
  assert.equal(handoff.hardRedLineFlags.some((item) => item.alias === "real-execution-signal"), true);
  assert.equal(handoff.hardRedLineFlags.some((item) => item.alias === "non-local-readonly-scope"), true);
});

test("preserves red-line and non-ready summary blockers as minimum unblock conditions", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    preflightSummary: preflightSummary({
      status: "source-not-fresh",
      reasonAlias: "source-not-fresh",
    }),
    evidenceHandoff: evidenceHandoff({
      status: "hard-red-line-blocked",
      reasonAlias: "hard-red-line-blocked",
      hardRedLineFlags: [{ alias: "real-environment-write-signal", owner: "admin_operator" }],
    }),
    remediationHandoff: remediationHandoff({
      status: "needs-user-action",
      reasonAlias: "missing-controlled-smoke-evidence-handoff-summary",
      missingPrerequisites: [{ alias: "missing-controlled-smoke-evidence-handoff-summary", owner: "admin_operator" }],
      redLineFlags: [{ alias: "redaction-required", owner: "admin_operator" }],
    }),
  }));

  assert.equal(handoff.status, "blocked-prerequisite");
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "source-not-fresh"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "real-environment-write-signal"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "missing-controlled-smoke-evidence-handoff-summary"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "redaction-required"), true);
  assert.equal(handoff.minimumUnblockConditions.length >= 4, true);
});

test("requires handoff-only execution mode", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    executionModeAlias: "real-controlled-smoke",
  }));

  assert.equal(handoff.status, "hard-red-line-blocked");
  assert.equal(handoff.hardRedLineFlags.some((item) => item.alias === "non-handoff-only-mode"), true);
});

test("blocks when remediation summary is non-ready without explicit blocker list", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    remediationHandoff: remediationHandoff({
      status: "blocked",
      release: "hold",
      reasonAlias: "operator-remediation-handoff-not-ready",
    }),
  }));

  assert.equal(handoff.status, "blocked-prerequisite");
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "operator-remediation-handoff-not-ready"), true);
  assert.equal(handoff.operatorNextActions.some((item) => item.includes("解除")), true);
});

test("accepts string blocker aliases and fills safe default handoff guidance", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    evidenceHandoff: evidenceHandoff({
      missingPrerequisites: ["wecom_run_active"],
      hardRedLineFlags: ["evidence-red-line"],
    }),
    remediationHandoff: remediationHandoff({
      remediations: ["wecom_config_missing"],
      missingPrerequisites: ["missing-release-decision-summary"],
      redLineFlags: ["remediation-red-line"],
    }),
  }));

  assert.equal(handoff.status, "blocked-prerequisite");
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "wecom_run_active"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "evidence-red-line"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "wecom_config_missing"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "missing-release-decision-summary"), true);
  assert.equal(handoff.blockerReasons.some((item) => item.alias === "remediation-red-line"), true);
  assert.equal(handoff.ownerHandoffs.every((item) => item.owner === "admin_operator"), true);
});

test("fails closed when redaction alias is not confirmed", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    redactionSignal: "redaction-required",
  }));

  assert.equal(handoff.status, "redaction-required");
  assert.equal(handoff.redactionChecks.some((item) => item.alias === "redaction-required" && item.passed === false), true);
});

test("uses stable fallback fields for sparse ready summaries", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    preflightSummary: {
      aliases: ["ready-for-wecom-controlled-smoke-preflight"],
    },
    evidenceHandoff: {
      aliases: ["ready-for-controlled-smoke-evidence-handoff"],
    },
    remediationHandoff: {
      aliases: ["ready"],
    },
  }));

  assert.equal(handoff.status, "ready-for-controlled-smoke-execution-handoff");
  assert.equal(handoff.referenceSummaries.every((item) => item.status === "unknown"), true);
  assert.equal(handoff.referenceSummaries.some((item) => item.evidenceShapeVersion === "unknown"), true);
});

test("rejects downstream, production, and full-success overclaims before ready classification", () => {
  const handoff = createWecomSourceControlledSmokeExecutionHandoff(baseInput({
    operatorNote: "Gateway/API/Insight full-success and authorization facts active; production ready",
  }));

  assert.equal(handoff.status, "overclaim-full-success");
  assert.equal(handoff.decision, "blocked");
  assert.equal(handoff.reasonAlias, "overclaim-full-success");
  assert.equal(handoff.hardRedLineFlags.some((item) => item.alias === "full-success-overclaim"), true);
  assert.equal(handoff.operatorNextActions.some((item) => item.includes("删除下游成功")), true);
});
