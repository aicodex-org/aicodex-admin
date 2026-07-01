// @ts-nocheck
const assert = require("node:assert/strict");
const test = require("node:test");

let createWecomSourceControlledSmokeOperatorTriageHandoff;
try {
  ({
    createWecomSourceControlledSmokeOperatorTriageHandoff,
  } = require("./wecomSourceControlledSmokeOperatorTriageHandoff"));
} catch {
  createWecomSourceControlledSmokeOperatorTriageHandoff = () => ({
    status: "missing_module",
    release: "hold",
    blockerAlias: "wecomSourceControlledSmokeOperatorTriageHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    nextSteps: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    redLineFlags: [],
    cannotInferBoundaries: [],
    triagePackageMetadata: {},
  });
}

function resultEvidenceHandoff(overrides = {}) {
  return {
    status: "passed",
    release: "release_after_report",
    reasonAlias: "wecom_source_controlled_smoke_result_passed",
    resultAliases: ["wecom_source_controlled_smoke_result_passed"],
    resultCounts: {
      expected: 2,
      observed: 2,
      passed: 2,
      partial: 0,
      failed: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
    redactionCategory: "redacted",
    riskCategory: "low",
    ownerHandoffLimits: [{
      alias: "wecom_source_controlled_smoke_result_evidence_handoff",
      owner: "admin_operator",
      nextAction: "交接脱敏 controlled smoke result evidence 给后续操作者复核",
      minimumUnblockCondition: "result evidence 为本地脱敏摘要，且无 red-line signal",
    }],
    cannotInferBoundaries: [
      "result evidence handoff 不能外推为真实 WeCom 同步成功或 full-success",
    ],
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
    ownerHandoffs: [{
      alias: "wecom_source_operator_remediation_handoff",
      owner: "admin_operator",
      nextAction: "可以交接 Admin WeCom source operator remediation handoff",
      minimumUnblockCondition: "remediation blockers 已清空且输入只包含脱敏 summary",
    }],
    minimumUnblockConditions: [],
    boundaries: [
      "operator remediation handoff 不能外推为 controlled smoke 已通过",
    ],
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    resultEvidenceHandoffSummary: resultEvidenceHandoff(),
    operatorRemediationHandoffSummary: remediationHandoff(),
    operatorNote: "仅生成本地脱敏 WeCom source triage package，不声明 full-success",
    ...overrides,
  };
}

test("returns ready operator triage package for sanitized WeCom result and remediation evidence", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput(), {
    generatedAt: "2026-06-13T19:00:00.000Z",
    sourceAlias: "local-wecom-operator-triage-test",
  });

  assert.equal(handoff.status, "ready-for-operator-triage-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "wecom_source_operator_triage_package_ready");
  assert.equal(handoff.nextSteps.some((item) => item.includes("复制脱敏 WeCom source triage package")), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.alias === "wecom_source_controlled_smoke_operator_triage_handoff"), true);
  assert.equal(handoff.triagePackageMetadata.sourceAlias, "local-wecom-operator-triage-test");
  assert.equal(handoff.triagePackageMetadata.generatedAt, "2026-06-13T19:00:00.000Z");
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("真实 WeCom 同步成功")), true);
});

test("keeps blocked result evidence actionable with stable aliases", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      status: "blocked",
      release: "hold",
      reasonAlias: "controlled_smoke_result_count_alias_mismatch",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_result_count_alias_mismatch",
        owner: "admin_operator",
        minimumUnblockCondition: "resultCounts 与 resultAliases 已重新对齐",
      }],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "controlled_smoke_result_count_alias_mismatch");
  assert.equal(handoff.remediationAlias, "reconcile_sanitized_wecom_result_evidence");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("resultCounts")), true);
  assert.equal(handoff.nextSteps.some((item) => item.includes("清除 stable blocker")), true);
});

test("blocks missing result evidence or partial result prerequisites", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff({
    operatorRemediationHandoffSummary: remediationHandoff(),
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      status: "partial-handoff",
      release: "hold",
      reasonAlias: "wecom_source_controlled_smoke_result_partial_handoff",
    }),
  });

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_operator_triage_missing_or_not_ready");
  assert.equal(handoff.missingPrerequisites.includes("resultEvidenceHandoffSummary:not_passed"), true);
});

test("blocks when required triage summaries are missing", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff({});

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_operator_triage_missing_or_not_ready");
  assert.equal(handoff.missingPrerequisites.includes("resultEvidenceHandoffSummary"), true);
  assert.equal(handoff.missingPrerequisites.includes("operatorRemediationHandoffSummary"), true);
});

test("blocks remediation summary that is non-ready without explicit handoff lists", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorRemediationHandoffSummary: remediationHandoff({
      status: "blocked",
      release: "hold",
      reasonAlias: "operator-remediation-handoff-not-ready",
      ownerHandoffs: [],
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "operator-remediation-handoff-not-ready");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "operator-remediation-handoff-not-ready"), true);
  assert.equal(handoff.minimumUnblockConditions.length > 0, true);
});

test("preserves remediation needs-user-action without downgrading to ready", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorRemediationHandoffSummary: remediationHandoff({
      status: "needs-user-action",
      release: "hold",
      reasonAlias: "missing-controlled-smoke-evidence-handoff-summary",
      missingPrerequisites: [{
        alias: "missing-controlled-smoke-evidence-handoff-summary",
        owner: "admin_operator",
        minimumUnblockCondition: "提供脱敏 controlled smoke evidence handoff summary",
      }],
    }),
  }));

  assert.equal(handoff.status, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "missing-controlled-smoke-evidence-handoff-summary");
  assert.equal(handoff.remediationAlias, "collect_sanitized_wecom_operator_action");
  assert.equal(handoff.nextSteps.some((item) => item.includes("用户动作")), true);
});

test("preserves upstream hard red-line remediation state", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorRemediationHandoffSummary: remediationHandoff({
      status: "hard-red-line",
      release: "hold",
      reasonAlias: "full-success-overclaim",
      redLineFlags: [{ alias: "full-success-overclaim", owner: "admin_operator" }],
    }),
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "full-success-overclaim");
  assert.equal(handoff.redLineFlags.includes("full-success-overclaim"), true);
  assert.equal(handoff.nextSteps.some((item) => item.includes("full-success 外推")), true);
});

test("hard red-lines real sync fixture DB downstream and authorization facts signals", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: "real WeCom sync passed, real fixture and DB write prove Gateway/API/Insight success and authorization facts active",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("real_sync_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_fixture_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_db_write_signal"), true);
  assert.equal(handoff.redLineFlags.includes("downstream_success_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_overclaim"), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorMetadata: {
      token: "secret-value",
      privateEndpoint: "https://admin.internal/wecom",
      email: "alice@example.invalid",
      rawResponseBody: { ok: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("admin.internal"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawResponseBody"), false);
});

test("blocks cross-owner full-success and production readiness overclaims", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: "Gateway/API/Insight full-success proves production readiness and controlled smoke pass",
  }));

  assert.equal(handoff.status, "hard-red-line");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("production_readiness_overclaim"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("生产就绪")), true);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    resultEvidenceHandoffSummary: resultEvidenceHandoff({
      resultAliases: ["unexpected_wecom_result_alias"],
    }),
  }));

  assert.equal(handoff.status, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_wecom_source_operator_triage_alias");
  assert.equal(handoff.remediationAlias, "unexpected_wecom_result_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin WeCom source handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createWecomSourceControlledSmokeOperatorTriageHandoff(readyInput({
    operatorNote: ["不是 full-success，不能证明 controlled smoke pass，也不得触发真实 WeCom 同步"],
  }));

  assert.equal(handoff.status, "ready-for-operator-triage-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});
