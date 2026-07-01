// @ts-nocheck
const assert = require("node:assert/strict");
const test = require("node:test");

let createWecomSourceControlledSmokeOperatorActionHandoff;
try {
  ({
    createWecomSourceControlledSmokeOperatorActionHandoff,
  } = require("./wecomSourceControlledSmokeOperatorActionHandoff"));
} catch {
  createWecomSourceControlledSmokeOperatorActionHandoff = () => ({
    actionStatus: "missing_module",
    release: "hold",
    nextAction: "blocked",
    blockerAlias: "wecomSourceControlledSmokeOperatorActionHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    actionPackageMetadata: {},
    redLineFlags: [],
    missingPrerequisites: [],
    ownerHandoffLimits: [],
    minimumUnblockConditions: [],
    cannotInferBoundaries: [],
  });
}

function decisionHandoff(overrides = {}) {
  return {
    status: "ready-for-operator-decision-handoff",
    release: "release_after_report",
    decisionStatus: "ready-for-operator-release-decision",
    blockerAlias: "none",
    remediationAlias: "wecom_source_operator_decision_package_ready",
    decisionOptions: ["handoff_to_release_operator"],
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
    redactionMetadata: {
      category: "redacted",
      riskCategory: "low",
      rejectedSensitiveEvidence: false,
      summaryOnly: true,
    },
    ownerHandoffLimits: [{
      alias: "wecom_source_controlled_smoke_operator_decision_handoff",
      owner: "admin_operator",
      nextAction: "交接本地脱敏 WeCom source operator decision package",
      minimumUnblockCondition: "preflight、execution、result evidence、operator remediation 和 operator triage 均 ready，且无 red-line signal",
    }],
    minimumUnblockConditions: [{
      alias: "wecom_source_controlled_smoke_operator_decision_handoff",
      owner: "admin_operator",
      condition: "preflight、execution、result evidence、operator remediation 和 operator triage 均 ready，且无 red-line signal",
    }],
    cannotInferBoundaries: [
      "decision package 不能外推为真实 WeCom 同步、组织树非空、controlled smoke pass 或 full-success",
    ],
    doNotDispatchUntil: "只可交接本地脱敏 WeCom source operator decision package；不要外派为 controlled smoke pass 或 full-success",
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    operatorDecisionHandoffSummary: decisionHandoff(),
    operatorNote: "只生成本地 WeCom source operator action package，不声明 full-success",
    ...overrides,
  };
}

test("returns owner-safe WeCom action package from sanitized decision handoff", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput(), {
    generatedAt: "2026-06-15T09:30:00.000Z",
    sourceAlias: "local-wecom-operator-action-test",
  });

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.nextAction, "handoff_owner_safe_wecom_operator_action_package");
  assert.equal(handoff.blockerAlias, "none");
  assert.equal(handoff.remediationAlias, "wecom_source_operator_action_package_ready");
  assert.equal(handoff.actionPackageMetadata.sourceAlias, "local-wecom-operator-action-test");
  assert.equal(handoff.actionPackageMetadata.generatedAt, "2026-06-15T09:30:00.000Z");
  assert.equal(handoff.actionPackageMetadata.packageShape, "wecom-source-controlled-smoke-operator-action-handoff/v1");
  assert.equal(handoff.ownerHandoffLimits.every((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("decision package")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInferBoundaries.some((item) => item.includes("真实 WeCom 同步成功")), true);
});

test("keeps blocked decision package blocked with upstream alias", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "blocked",
      release: "hold",
      blockerAlias: "missing_operator_triage_handoff_summary",
      remediationAlias: "rerun_wecom_source_operator_decision_handoff",
      ownerHandoffLimits: [{
        alias: "missing_operator_triage_handoff_summary",
        owner: "admin_operator",
        minimumUnblockCondition: "补齐脱敏 operator triage handoff 后重跑 decision package",
      }],
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "missing_operator_triage_handoff_summary");
  assert.equal(handoff.remediationAlias, "rerun_wecom_source_operator_decision_handoff");
  assert.equal(handoff.nextAction, "clear_blocker_then_regenerate_wecom_action_package");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("triage")), true);
});

test("preserves needs-user-action from decision package", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "needs-user-action",
      release: "hold",
      blockerAlias: "missing_operator_approval_alias",
      remediationAlias: "collect_sanitized_wecom_operator_action",
      ownerHandoffLimits: [{
        alias: "missing_operator_approval_alias",
        owner: "admin_operator",
        minimumUnblockCondition: "operator approval alias 已补齐且脱敏",
      }],
    }),
  }));

  assert.equal(handoff.actionStatus, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "missing_operator_approval_alias");
  assert.equal(handoff.remediationAlias, "collect_sanitized_wecom_operator_action");
  assert.equal(handoff.nextAction, "collect_user_action_then_regenerate_wecom_action_package");
});

test("preserves upstream hard red-line decision package", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      status: "hard-red-line",
      release: "hold",
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_wecom_operator_decision_signal",
      redLineFlags: ["real_controlled_smoke_signal"],
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("real_controlled_smoke_signal"), true);
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "real_execution_signal"), true);
});

test("hard red-lines real sync controlled smoke downstream and full-success claims", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "real WeCom sync completed, real controlled smoke passed, Gateway/API/Insight success, authorization facts and full-success",
  }));

  assert.equal(handoff.actionStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockerAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("real_sync_signal"), true);
  assert.equal(handoff.redLineFlags.includes("real_controlled_smoke_signal"), true);
  assert.equal(handoff.redLineFlags.includes("downstream_success_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_overclaim"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("blocks missing decision package", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff({});

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_operator_action_decision_missing");
  assert.equal(handoff.missingPrerequisites.includes("operatorDecisionHandoffSummary"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("operatorDecisionHandoffSummary"), true);
});

test("blocks ready decision packages that still hold release", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      release: "hold",
      blockerAlias: "none",
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "wecom_source_operator_action_decision_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_wecom_operator_decision_inputs");
  assert.equal(handoff.missingPrerequisites.includes("operatorDecisionHandoffSummary:not_ready"), true);
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorMetadata: {
      token: "secret-value",
      privateEndpoint: "https://admin.internal/wecom",
      email: "alice@example.invalid",
      rawResponseBody: { ok: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("admin.internal"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawResponseBody"), false);
});

test("blocks primitive credential-like operator notes without echoing them", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "Bearer secret-token-value",
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "sanitization_failed");
  assert.equal(JSON.stringify(handoff).includes("secret-token-value"), false);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorDecisionHandoffSummary: decisionHandoff({
      remediationAlias: "unexpected_wecom_operator_action_alias",
    }),
  }));

  assert.equal(handoff.actionStatus, "blocked");
  assert.equal(handoff.blockerAlias, "unknown_wecom_source_operator_action_alias");
  assert.equal(handoff.remediationAlias, "unexpected_wecom_operator_action_alias");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.owner === "admin_operator"), true);
  assert.equal(handoff.doNotDispatchUntil.includes("稳定 Admin WeCom source handoff alias"), true);
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createWecomSourceControlledSmokeOperatorActionHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发真实 WeCom 同步",
    claim: ["cannot infer production readiness", "no authorization facts success"],
  }));

  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.redLineFlags.length, 0);
});
