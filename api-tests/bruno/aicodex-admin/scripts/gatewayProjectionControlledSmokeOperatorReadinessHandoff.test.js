const assert = require("node:assert/strict");
const test = require("node:test");

let createGatewayProjectionControlledSmokeOperatorReadinessHandoff;
try {
  ({
    createGatewayProjectionControlledSmokeOperatorReadinessHandoff,
  } = require("./gatewayProjectionControlledSmokeOperatorReadinessHandoff"));
} catch {
  createGatewayProjectionControlledSmokeOperatorReadinessHandoff = () => ({
    readinessStatus: "missing_module",
    release: "hold",
    blockedAlias: "gatewayProjectionControlledSmokeOperatorReadinessHandoff_not_implemented",
    remediationAlias: "helper_not_implemented",
    readyChecks: [],
    ownerSafeNextActions: [],
    evidenceReferences: [],
    minimumUnblockConditions: [],
    redLineFlags: [],
    missingPrerequisites: [],
    cannotInfer: [],
    cannotInferBoundaries: [],
    readinessPackageMetadata: {},
  });
}

function actionHandoff(overrides = {}) {
  return {
    actionStatus: "ready-for-operator-action",
    release: "release_after_report",
    nextAction: "handoff_owner_safe_operator_action_package",
    blockerAlias: "none",
    remediationAlias: "operator_action_package_ready",
    decisionStatus: "ready-for-operator-decision-handoff",
    releaseSummaryAliases: ["controlled_smoke_release_summary_ready"],
    resultAliases: ["controlled_smoke_result_ready_for_handoff"],
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 4,
      blockedItems: 0,
      needsUserActionItems: 0,
      hardRedLineItems: 0,
    },
    resultCounts: {
      expected: 3,
      observed: 3,
      passed: 3,
      failed: 0,
      partial: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
    redactionCategory: "sanitized",
    riskCategory: "low",
    ownerHandoffLimits: [{
      alias: "controlled_smoke_operator_action_handoff",
      owner: "admin_operator",
      nextAction: "交接本地脱敏 operator action package",
      minimumUnblockCondition: "decision package 已 ready，且 action 输入仍为本地脱敏摘要",
    }],
    minimumUnblockConditions: [{
      alias: "controlled_smoke_operator_action_handoff",
      owner: "admin_operator",
      condition: "decision package 已 ready，且 action 输入仍为本地脱敏摘要",
    }],
    actionPackageMetadata: {
      sourceAlias: "local-controlled-smoke-operator-action-handoff",
      generatedAt: "2026-06-13T19:30:00.000Z",
      packageShape: "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
    },
    cannotInferBoundaries: [
      "action package 不能外推为真实 publish、真实 controlled smoke、Gateway ingestion、authorization facts、controlled smoke pass 或 full-success",
    ],
    doNotDispatchUntil: "只可交接本地脱敏 operator action package；不要外派为 controlled smoke pass 或 full-success",
    ...overrides,
  };
}

function readyInput(overrides = {}) {
  return {
    operatorActionHandoffSummary: actionHandoff(),
    operatorNote: "只生成本地 operator readiness package，不声明 full-success",
    ...overrides,
  };
}

test("returns readiness package from sanitized action handoff", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput(), {
    generatedAt: "2026-06-13T19:35:00.000Z",
    sourceAlias: "local-operator-readiness-test",
  });

  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.equal(handoff.release, "release_after_report");
  assert.equal(handoff.blockedAlias, "none");
  assert.equal(handoff.remediationAlias, "operator_readiness_package_ready");
  assert.equal(handoff.actionStatus, "ready-for-operator-action");
  assert.equal(handoff.readinessPackageMetadata.sourceAlias, "local-operator-readiness-test");
  assert.equal(handoff.readinessPackageMetadata.generatedAt, "2026-06-13T19:35:00.000Z");
  assert.equal(handoff.readinessPackageMetadata.packageShape, "admin-gateway-projection-controlled-smoke-operator-readiness-handoff/v1");
  assert.equal(handoff.readyChecks.every((item) => item.status === "passed"), true);
  assert.equal(handoff.readyChecks.some((item) => item.alias === "action_package_ready"), true);
  assert.equal(handoff.ownerSafeNextActions.some((item) => item.includes("readiness package")), true);
  assert.equal(handoff.evidenceReferences.some((item) => item.sourceAlias === "local-controlled-smoke-operator-action-handoff"), true);
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("action package")), true);
  assert.equal(handoff.doNotDispatchUntil.includes("full-success"), true);
  assert.equal(handoff.cannotInfer.some((item) => item.includes("真实 publish")), true);
});

test("keeps blocked action package blocked with upstream alias", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "blocked",
      release: "hold",
      blockerAlias: "controlled_smoke_operator_action_decision_missing",
      remediationAlias: "collect_sanitized_operator_decision_inputs",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_operator_action_decision_missing",
        owner: "admin_operator",
        minimumUnblockCondition: "decision package 输入补齐后重跑",
      }],
    }),
  }));

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockedAlias, "controlled_smoke_operator_action_decision_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_decision_inputs");
  assert.equal(handoff.ownerSafeNextActions.some((item) => item.includes("清除 stable blocker")), true);
});

test("preserves needs-user-action from action package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "needs-user-action",
      release: "hold",
      blockerAlias: "controlled_smoke_release_summary_needs_user_action",
      remediationAlias: "collect_operator_release_summary_action",
      ownerHandoffLimits: [{
        alias: "controlled_smoke_release_summary_needs_user_action",
        owner: "admin_operator",
        minimumUnblockCondition: "operator action alias 已清除",
      }],
    }),
  }));

  assert.equal(handoff.readinessStatus, "needs-user-action");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockedAlias, "controlled_smoke_release_summary_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_release_summary_action");
});

test("uses safe defaults for needs-user-action action package without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "needs-user-action",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.readinessStatus, "needs-user-action");
  assert.equal(handoff.blockedAlias, "controlled_smoke_operator_readiness_needs_user_action");
  assert.equal(handoff.remediationAlias, "collect_operator_readiness_action");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "controlled_smoke_operator_readiness_blocked"), true);
});

test("preserves upstream hard red-line action package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "hard-red-line",
      release: "hold",
      blockerAlias: "real_execution_signal",
      remediationAlias: "remove_real_operator_action_signal",
      redLineFlags: ["gateway_ingestion_signal"],
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.readinessStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockedAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
});

test("uses safe defaults for hard red-line action package without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "hard-red-line",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.readinessStatus, "hard-red-line");
  assert.equal(handoff.blockedAlias, "real_execution_signal");
  assert.equal(handoff.remediationAlias, "remove_real_operator_readiness_signal");
  assert.equal(handoff.ownerHandoffLimits.some((item) => item.alias === "controlled_smoke_operator_readiness_blocked"), true);
});

test("hard red-lines real publish gateway ingestion authorization facts and full-success claims", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorNote: "real publish completed, gateway ingestion success, authorization facts success, full-success",
  }));

  assert.equal(handoff.readinessStatus, "hard-red-line");
  assert.equal(handoff.release, "hold");
  assert.equal(handoff.blockedAlias, "full_success_overclaim");
  assert.equal(handoff.redLineFlags.includes("real_publish_signal"), true);
  assert.equal(handoff.redLineFlags.includes("gateway_ingestion_signal"), true);
  assert.equal(handoff.redLineFlags.includes("authorization_facts_signal"), true);
  assert.equal(handoff.redLineFlags.includes("full_success_overclaim"), true);
});

test("hard red-lines mapping confirm read model rebuild gate and production-like signals", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorNote: "mapping confirm and read model rebuild are done against production endpoint with real gate enabled",
  }));

  assert.equal(handoff.readinessStatus, "hard-red-line");
  assert.equal(handoff.blockedAlias, "real_execution_signal");
  assert.equal(handoff.redLineFlags.includes("mapping_confirm_signal"), true);
  assert.equal(handoff.redLineFlags.includes("read_model_rebuild_signal"), true);
  assert.equal(handoff.redLineFlags.includes("production_like_signal"), true);
});

test("blocks missing action package", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff({});

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "controlled_smoke_operator_readiness_action_missing");
  assert.equal(handoff.missingPrerequisites.includes("operatorActionHandoffSummary"), true);
});

test("blocks ready action packages that still hold release", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      release: "hold",
      blockerAlias: "none",
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "controlled_smoke_operator_readiness_action_missing");
  assert.equal(handoff.missingPrerequisites.includes("operatorActionHandoffSummary:not_ready"), true);
});

test("uses safe defaults for blocked action package without upstream aliases", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionStatus: "blocked",
      release: "hold",
      blockerAlias: undefined,
      remediationAlias: undefined,
      ownerHandoffLimits: [],
    }),
  }));

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "controlled_smoke_operator_readiness_action_missing");
  assert.equal(handoff.remediationAlias, "collect_sanitized_operator_action_inputs");
});

test("does not echo sensitive values when redaction fails", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorMetadata: {
      token: "secret-value",
      privateEndpoint: "https://gateway.internal/api",
      email: "alice@example.invalid",
      rawGatewayResponseBody: { accepted: true },
    },
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret-value"), false);
  assert.equal(serialized.includes("gateway.internal"), false);
  assert.equal(serialized.includes("alice@example.invalid"), false);
  assert.equal(serialized.includes("rawGatewayResponseBody"), false);
});

test("blocks primitive credential-like operator notes without echoing them", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorNote: "Bearer secret-token-value",
  }));

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "sanitization_failed");
  assert.equal(JSON.stringify(handoff).includes("secret-token-value"), false);
});

test("blocks cookie and private endpoint primitive notes without echoing them", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorNote: "Cookie: session=value against http://127.0.0.1/private",
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "sanitization_failed");
  assert.equal(serialized.includes("session=value"), false);
  assert.equal(serialized.includes("127.0.0.1"), false);
});

test("blocks array-shaped sensitive metadata without echoing values", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorMetadata: ["safe-alias", "secret://local/value"],
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "sanitization_failed");
  assert.equal(serialized.includes("secret://local/value"), false);
});

test("sanitizes evidence references from action package metadata and counts", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      actionPackageMetadata: {
        sourceAlias: "local-action",
        generatedAt: "2026-06-13T19:40:00.000Z",
        packageShape: "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
        extraDebugSummary: "must-not-copy",
      },
    }),
  }));

  const serialized = JSON.stringify(handoff);
  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.deepEqual(handoff.evidenceReferences[0], {
    sourceAlias: "local-action",
    generatedAt: "2026-06-13T19:40:00.000Z",
    packageShape: "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
    actionStatus: "ready-for-operator-action",
    blockerAlias: "none",
    remediationAlias: "operator_action_package_ready",
    redactionCategory: "sanitized",
    riskCategory: "low",
    releaseSummaryCounts: {
      sectionsExpected: 4,
      sectionsObserved: 4,
      blockedItems: 0,
      needsUserActionItems: 0,
      hardRedLineItems: 0,
    },
    resultCounts: {
      expected: 3,
      observed: 3,
      passed: 3,
      failed: 0,
      partial: 0,
      blocked: 0,
      missing: 0,
      unauthorized: 0,
    },
  });
  assert.equal(serialized.includes("must-not-copy"), false);
});

test("keeps unknown sanitized aliases blocked and Admin scoped", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      remediationAlias: "unexpected_operator_readiness_alias",
    }),
  }));

  assert.equal(handoff.readinessStatus, "blocked");
  assert.equal(handoff.blockedAlias, "unknown_controlled_smoke_operator_readiness_alias");
  assert.equal(handoff.remediationAlias, "unexpected_operator_readiness_alias");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.owner === "admin_operator"), true);
});

test("uses default metadata and owner limit fallbacks safely", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: actionHandoff({
      ownerHandoffLimits: [{
        condition: "action fallback condition",
      }],
    }),
  }));

  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.equal(handoff.readinessPackageMetadata.sourceAlias, "local-controlled-smoke-operator-readiness-handoff");
  assert.equal(typeof handoff.readinessPackageMetadata.generatedAt, "string");
  assert.equal(handoff.minimumUnblockConditions.some((item) => item.condition.includes("action package")), true);
});

test("uses default evidence references when action metadata and counts are absent", () => {
  const action = actionHandoff({
    actionPackageMetadata: undefined,
    releaseSummaryCounts: undefined,
    resultCounts: undefined,
  });
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorActionHandoffSummary: action,
  }));

  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.deepEqual(handoff.evidenceReferences[0], {
    sourceAlias: "local-controlled-smoke-operator-action-handoff",
    generatedAt: undefined,
    packageShape: "admin-gateway-projection-controlled-smoke-operator-action-handoff/v1",
    actionStatus: "ready-for-operator-action",
    blockerAlias: "none",
    remediationAlias: "operator_action_package_ready",
    redactionCategory: "sanitized",
    riskCategory: "low",
    releaseSummaryCounts: {},
    resultCounts: {},
  });
});

test("ignores non-extrapolation boundary text", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    operatorNote: "不是 full-success，不能证明 controlled smoke pass，也不得触发 gateway ingestion",
    claim: ["cannot infer production readiness", "no authorization facts success"],
  }));

  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});

test("ignores readiness guidance text that only states dispatch boundaries", () => {
  const handoff = createGatewayProjectionControlledSmokeOperatorReadinessHandoff(readyInput({
    claim: {
      ownerSafeNextActions: ["不要外派为 full-success"],
      nested: ["routine sanitized readiness handoff"],
    },
  }));

  assert.equal(handoff.readinessStatus, "ready-for-operator-readiness-handoff");
  assert.equal(handoff.redLineFlags.length, 0);
});
