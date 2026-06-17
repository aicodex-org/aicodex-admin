import type {RedactionSummary, SourceScope, SourceScopeKind} from "./identityAssetRelationship";

export type GovernanceTaskType =
  | "sync_failed"
  | "orphan_account"
  | "privileged_role"
  | "application_incomplete"
  | "abnormal_token"
  | "callback_missing"
  | "provider_binding_risk"
  | "gateway_mapping_gap";

export type GovernanceTaskSeverity = "high" | "medium" | "low" | "info";
export type GovernanceTaskDomain =
  | "organization_identity"
  | "identity_sources"
  | "application_access"
  | "audit_operations"
  | "llm_ai_gateway"
  | "authorization_governance";
export type GovernanceTaskStatus = "pending_review" | "viewed" | "session_ignored" | "cannot_infer";
export type GovernanceTaskActionKind = "configure" | "evidence" | "detail" | "ignore_current_view" | "wait_for_aggregation";

export interface GovernanceTaskSourceDataset {
  pagePath: string;
  rows?: unknown[];
  totalRows?: number;
  filterSummary?: string;
  errorMessage?: string;
}

export interface GovernanceTaskImpactObject {
  type: string;
  id: string;
  displayName: string;
  owner?: string;
  organization?: string;
  to: string;
}

export interface GovernanceTaskAction {
  key: string;
  labelKey: string;
  defaultLabel: string;
  to: string;
  kind: GovernanceTaskActionKind;
}

export interface GovernanceTaskEvidenceEntry {
  key: string;
  labelKey: string;
  defaultLabel: string;
  to: string;
  source: SourceScope;
}

export interface GovernanceTask {
  key: string;
  taskType: GovernanceTaskType;
  severity: GovernanceTaskSeverity;
  domain: GovernanceTaskDomain;
  status: GovernanceTaskStatus;
  impactObject: GovernanceTaskImpactObject;
  source: SourceScope;
  sourceOfTruth: string;
  suggestedAction: GovernanceTaskAction;
  evidenceEntry: GovernanceTaskEvidenceEntry;
  safetyBoundaryKey: string;
  defaultSafetyBoundary: string;
  redactionSummary: RedactionSummary;
}

export interface GovernanceTaskClassifierInput {
  applications?: GovernanceTaskSourceDataset;
  providers?: GovernanceTaskSourceDataset;
  users?: GovernanceTaskSourceDataset;
  roles?: GovernanceTaskSourceDataset;
  tokens?: GovernanceTaskSourceDataset;
  records?: GovernanceTaskSourceDataset;
  agents?: GovernanceTaskSourceDataset;
}

export interface GovernanceTaskFilter {
  type?: GovernanceTaskType | "all";
  severity?: GovernanceTaskSeverity | "all";
  status?: GovernanceTaskStatus | "all";
  sourceScope?: SourceScopeKind | "all";
  impactObjectType?: string | "all";
  keyword?: string;
}

type UnknownRecord = Record<string, unknown>;

const highPrivilegePattern = /(admin|owner|root|super|管理员|超级)/i;
const syncSignalPattern = /(sync|provider|wecom|feishu|ldap|syncer|同步|飞书|企业微信)/i;
const sensitiveFieldPattern = /(secret|token|cookie|private|password|clientsecret|client_secret|accessToken|refreshToken|idToken)/i;
const privateUrlPattern = /^https?:\/\//i;

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(item => hasValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const record = asRecord(value);
    return hasValue(record.name) || hasValue(record.value) || hasValue(record.scope);
  }

  return normalizeText(value) !== "";
}

function datasetRows(dataset?: GovernanceTaskSourceDataset): UnknownRecord[] {
  return Array.isArray(dataset?.rows) ? dataset.rows.map(asRecord) : [];
}

function sourceForObject(dataset: GovernanceTaskSourceDataset, objectType: string, objectId: string): SourceScope {
  return {
    kind: "current_object",
    pagePath: dataset.pagePath,
    filterSummary: dataset.filterSummary,
    loadedRows: datasetRows(dataset).length,
    totalRows: dataset.totalRows,
    objectType,
    objectId,
  };
}

function reviewSource(dataset: GovernanceTaskSourceDataset): SourceScope {
  return {
    kind: "read_only_review",
    pagePath: dataset.pagePath,
    filterSummary: dataset.filterSummary,
    loadedRows: datasetRows(dataset).length,
    totalRows: dataset.totalRows,
  };
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function objectId(owner: string, name: string): string {
  return `${owner || "admin"}/${name || "unnamed"}`;
}

function applicationPath(record: UnknownRecord): string {
  const organization = normalizeText(record.organization || record.owner || "admin");
  const name = normalizeText(record.name);
  return name ? `/applications/${encoded(organization)}/${encoded(name)}` : "/applications";
}

function providerPath(record: UnknownRecord): string {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name);
  return name ? `/providers/${encoded(owner)}/${encoded(name)}` : "/providers";
}

function userPath(record: UnknownRecord): string {
  const owner = normalizeText(record.owner || record.organization || "admin");
  const name = normalizeText(record.name);
  return name ? `/users/${encoded(owner)}/${encoded(name)}` : "/users";
}

function rolePath(record: UnknownRecord): string {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name);
  return name ? `/roles/${encoded(owner)}/${encoded(name)}` : "/roles";
}

function agentPath(record: UnknownRecord): string {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name);
  return name ? `/agents/${encoded(owner)}/${encoded(name)}` : "/agents";
}

function displayName(record: UnknownRecord, fallback: string): string {
  return normalizeText(record.displayName || record.name || fallback);
}

function redactionSummary(record: UnknownRecord, extraHiddenFields: string[] = []): RedactionSummary {
  const hiddenFields = new Set(extraHiddenFields);

  Object.entries(record).forEach(([field, value]) => {
    if (sensitiveFieldPattern.test(field) && hasValue(value)) {
      hiddenFields.add(field);
    }

    if (typeof value === "string" && privateUrlPattern.test(value)) {
      hiddenFields.add("privateUrl");
    }

    if (Array.isArray(value) && value.some(item => typeof item === "string" && privateUrlPattern.test(item))) {
      hiddenFields.add("privateUrl");
    }
  });

  return {
    hiddenFields: Array.from(hiddenFields).sort(),
    note: hiddenFields.size > 0 ? "sensitive_values_hidden" : "no_raw_credentials_rendered",
  };
}

function createTask(params: {
  taskType: GovernanceTaskType;
  severity: GovernanceTaskSeverity;
  domain: GovernanceTaskDomain;
  status?: GovernanceTaskStatus;
  impactObject: GovernanceTaskImpactObject;
  source: SourceScope;
  sourceOfTruth: string;
  suggestedAction: GovernanceTaskAction;
  evidenceEntry: GovernanceTaskEvidenceEntry;
  redactionSummary?: RedactionSummary;
  safetyBoundaryKey?: string;
  defaultSafetyBoundary?: string;
  discriminator?: string;
}): GovernanceTask {
  return {
    key: [
      params.taskType,
      params.impactObject.type,
      params.impactObject.id,
      params.discriminator || params.suggestedAction.key,
    ].join(":"),
    taskType: params.taskType,
    severity: params.severity,
    domain: params.domain,
    status: params.status || "pending_review",
    impactObject: params.impactObject,
    source: params.source,
    sourceOfTruth: params.sourceOfTruth,
    suggestedAction: params.suggestedAction,
    evidenceEntry: params.evidenceEntry,
    safetyBoundaryKey: params.safetyBoundaryKey || "readOnlyRouteOnly",
    defaultSafetyBoundary: params.defaultSafetyBoundary || "Only opens existing pages for review; it does not execute sync, delete, refresh, publish, cleanup, or callback behavior.",
    redactionSummary: params.redactionSummary || {hiddenFields: [], note: "no_raw_credentials_rendered"},
  };
}

function applicationImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const organization = normalizeText(record.organization || record.owner || "admin");
  const name = normalizeText(record.name || displayName(record, "unnamed-application"));
  return {
    type: "Application",
    id: objectId(organization, name),
    displayName: displayName(record, "Unnamed application"),
    owner: normalizeText(record.owner || "admin"),
    organization,
    to: applicationPath(record),
  };
}

function providerImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name || displayName(record, "unnamed-provider"));
  return {
    type: "Provider",
    id: objectId(owner, name),
    displayName: displayName(record, "Unnamed Provider"),
    owner,
    organization: owner,
    to: providerPath(record),
  };
}

function userImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const owner = normalizeText(record.owner || record.organization || "admin");
  const name = normalizeText(record.name || displayName(record, "unnamed-user"));
  return {
    type: "User",
    id: objectId(owner, name),
    displayName: displayName(record, "Unnamed user"),
    owner,
    organization: owner,
    to: userPath(record),
  };
}

function roleImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name || displayName(record, "unnamed-role"));
  return {
    type: "Role",
    id: objectId(owner, name),
    displayName: displayName(record, "Unnamed role"),
    owner,
    organization: owner,
    to: rolePath(record),
  };
}

function tokenImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name || "visible-token");
  return {
    type: "Token",
    id: objectId(owner, name),
    displayName: name,
    owner,
    organization: normalizeText(record.organization || owner),
    to: "/tokens",
  };
}

function recordImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const organization = normalizeText(record.organization || "current-scope");
  const id = normalizeText(record.id || record.name || "visible-record");
  return {
    type: "AuditRecord",
    id: `${organization}/${id}`,
    displayName: `#${id}`,
    organization,
    to: "/records",
  };
}

function agentImpact(record: UnknownRecord): GovernanceTaskImpactObject {
  const owner = normalizeText(record.owner || "admin");
  const name = normalizeText(record.name || displayName(record, "unnamed-agent"));
  return {
    type: "Agent",
    id: objectId(owner, name),
    displayName: displayName(record, "Unnamed Agent"),
    owner,
    organization: owner,
    to: agentPath(record),
  };
}

function taskEvidence(key: string, labelKey: string, defaultLabel: string, to: string, source: SourceScope): GovernanceTaskEvidenceEntry {
  return {key, labelKey, defaultLabel, to, source};
}

function taskAction(key: string, labelKey: string, defaultLabel: string, to: string, kind: GovernanceTaskActionKind): GovernanceTaskAction {
  return {key, labelKey, defaultLabel, to, kind};
}

function addApplicationTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((application) => {
    const impact = applicationImpact(application);
    const source = sourceForObject(dataset, "Application", impact.id);
    const redirectUris = toArray(application.redirectUris);
    const providers = toArray(application.providers);
    const scopes = toArray(application.scopes);
    const grantTypes = toArray(application.grantTypes);
    const hasClientId = hasValue(application.clientId);

    if (redirectUris.length === 0) {
      tasks.push(createTask({
        taskType: "callback_missing",
        severity: "high",
        domain: "application_access",
        impactObject: impact,
        source,
        sourceOfTruth: "application.visible_row.redirectUris",
        suggestedAction: taskAction("review-application-callback", "reviewApplicationConfig", "Review application configuration", impact.to, "configure"),
        evidenceEntry: taskEvidence("records", "auditEvidence", "Audit evidence", "/records", source),
        redactionSummary: redactionSummary(application),
      }));
    }

    if (!hasClientId || scopes.length === 0 || grantTypes.length === 0) {
      tasks.push(createTask({
        taskType: "application_incomplete",
        severity: "medium",
        domain: "application_access",
        impactObject: impact,
        source,
        sourceOfTruth: "application.visible_row.client_scope_grant",
        suggestedAction: taskAction("review-application-config", "reviewApplicationConfig", "Review application configuration", impact.to, "configure"),
        evidenceEntry: taskEvidence("application", "applicationEvidence", "Application evidence", impact.to, source),
        redactionSummary: redactionSummary(application),
      }));
    }

    if (providers.length === 0) {
      tasks.push(createTask({
        taskType: "provider_binding_risk",
        severity: "high",
        domain: "application_access",
        impactObject: impact,
        source,
        sourceOfTruth: "application.visible_row.providers",
        suggestedAction: taskAction("review-provider-binding", "reviewProviderBinding", "Review Provider binding", impact.to, "configure"),
        evidenceEntry: taskEvidence("providers", "providerEvidence", "Provider evidence", "/providers", source),
        redactionSummary: redactionSummary(application),
      }));
    }
  });
}

function addProviderTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((provider) => {
    const impact = providerImpact(provider);
    const source = sourceForObject(dataset, "Provider", impact.id);
    const category = normalizeText(provider.category || provider.type);
    const syncStatus = normalizeText(provider.lastSyncStatus || provider.syncStatus || provider.status);
    const syncError = normalizeText(provider.lastSyncError || provider.errorText || provider.error);
    const requiresClient = /(OAuth|OIDC|SAML|Web3)/i.test(category);

    if (/failed|error|失败/i.test(syncStatus) || syncError !== "") {
      tasks.push(createTask({
        taskType: "sync_failed",
        severity: "high",
        domain: "identity_sources",
        impactObject: impact,
        source,
        sourceOfTruth: "provider.visible_row.sync_status",
        suggestedAction: taskAction("review-provider-sync", "reviewProviderDiagnostics", "Review Provider diagnostics", providerPath(provider), "evidence"),
        evidenceEntry: taskEvidence("records", "auditEvidence", "Audit evidence", "/records", source),
        redactionSummary: redactionSummary(provider, syncError ? ["errorSummary"] : []),
      }));
    }

    if (requiresClient && (!hasValue(provider.clientId) || !hasValue(provider.providerUrl))) {
      tasks.push(createTask({
        taskType: "provider_binding_risk",
        severity: "high",
        domain: "identity_sources",
        impactObject: impact,
        source,
        sourceOfTruth: "provider.visible_row.configuration",
        suggestedAction: taskAction("review-provider-config", "reviewProviderConfig", "Review Provider configuration", impact.to, "configure"),
        evidenceEntry: taskEvidence("applications", "applicationEvidence", "Application evidence", "/applications", source),
        redactionSummary: redactionSummary(provider),
      }));
    }
  });
}

function addUserTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((user) => {
    const hasApplication = hasValue(user.signupApplication);
    const hasGroups = toArray(user.groups).length > 0;
    const hasRoles = toArray(user.roles).length > 0;
    if (hasApplication || hasGroups || hasRoles) {
      return;
    }

    const impact = userImpact(user);
    const source = sourceForObject(dataset, "User", impact.id);
    tasks.push(createTask({
      taskType: "orphan_account",
      severity: "medium",
      domain: "organization_identity",
      impactObject: impact,
      source,
      sourceOfTruth: "user.visible_row.assignment_fields",
      suggestedAction: taskAction("review-user", "reviewUserDetail", "Review user detail", impact.to, "detail"),
      evidenceEntry: taskEvidence("records", "auditEvidence", "Audit evidence", "/records", source),
      redactionSummary: redactionSummary(user),
    }));
  });
}

function addRoleTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((role) => {
    const name = `${normalizeText(role.name)} ${normalizeText(role.displayName)}`;
    const enabled = role.isEnabled !== false;
    if (!enabled || !highPrivilegePattern.test(name)) {
      return;
    }

    const impact = roleImpact(role);
    const source = sourceForObject(dataset, "Role", impact.id);
    tasks.push(createTask({
      taskType: "privileged_role",
      severity: "high",
      domain: "authorization_governance",
      impactObject: impact,
      source,
      sourceOfTruth: "role.visible_row.name_displayName",
      suggestedAction: taskAction("review-role", "reviewRoleMembers", "Review role members", impact.to, "detail"),
      evidenceEntry: taskEvidence("permissions", "permissionEvidence", "Permission evidence", "/permissions", source),
      redactionSummary: redactionSummary(role),
    }));
  });
}

function addTokenTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((token) => {
    const expiresIn = Number(token.expiresIn);
    const abnormal = !hasValue(token.application) || !hasValue(token.user) || (Number.isFinite(expiresIn) && expiresIn <= 0) || token.isExpired === true;
    if (!abnormal) {
      return;
    }

    const impact = tokenImpact(token);
    const source = sourceForObject(dataset, "Token", impact.id);
    tasks.push(createTask({
      taskType: "abnormal_token",
      severity: "high",
      domain: "audit_operations",
      impactObject: impact,
      source,
      sourceOfTruth: "token.visible_row.expiry_owner_application",
      suggestedAction: taskAction("review-token", "reviewToken", "Review token", "/tokens", "evidence"),
      evidenceEntry: taskEvidence("tokens", "tokenEvidence", "Token evidence", "/tokens", source),
      redactionSummary: redactionSummary(token),
    }));
  });
}

function addRecordTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((record) => {
    const statusCode = Number(record.statusCode);
    const searchable = `${normalizeText(record.action)} ${normalizeText(record.requestUri)} ${normalizeText(record.object)}`;
    if (!Number.isFinite(statusCode) || statusCode < 400 || !syncSignalPattern.test(searchable)) {
      return;
    }

    const impact = recordImpact(record);
    const source = sourceForObject(dataset, "AuditRecord", impact.id);
    tasks.push(createTask({
      taskType: "sync_failed",
      severity: statusCode >= 500 ? "high" : "medium",
      domain: "audit_operations",
      impactObject: impact,
      source,
      sourceOfTruth: "record.visible_row.status_action",
      suggestedAction: taskAction("review-audit-record", "reviewAuditRecords", "Review audit records", "/records", "evidence"),
      evidenceEntry: taskEvidence("records", "auditEvidence", "Audit evidence", "/records", source),
      redactionSummary: redactionSummary(record, ["requestSummary"]),
    }));
  });
}

function addAgentTasks(tasks: GovernanceTask[], dataset?: GovernanceTaskSourceDataset): void {
  if (!dataset) {
    return;
  }

  datasetRows(dataset).forEach((agent) => {
    if (hasValue(agent.application) && hasValue(agent.url)) {
      return;
    }

    const impact = agentImpact(agent);
    const source = sourceForObject(dataset, "Agent", impact.id);
    tasks.push(createTask({
      taskType: "gateway_mapping_gap",
      severity: "high",
      domain: "llm_ai_gateway",
      impactObject: impact,
      source,
      sourceOfTruth: "agent.visible_row.application_url",
      suggestedAction: taskAction("review-agent", "reviewAgentMapping", "Review Agent mapping", impact.to, "configure"),
      evidenceEntry: taskEvidence("gateway", "gatewayEvidence", "Gateway evidence", "/platform-api-mappings", source),
      redactionSummary: redactionSummary(agent),
    }));
  });
}

function addCannotInferTasks(tasks: GovernanceTask[], input: GovernanceTaskClassifierInput): void {
  const candidates: Array<{dataset?: GovernanceTaskSourceDataset; type: GovernanceTaskType; domain: GovernanceTaskDomain; actionTo: string; actionKey: string; labelKey: string; defaultLabel: string}> = [
    {dataset: input.providers, type: "provider_binding_risk", domain: "identity_sources", actionTo: "/providers", actionKey: "review-provider-config", labelKey: "reviewProviderConfig", defaultLabel: "Review Provider configuration"},
    {dataset: input.applications, type: "application_incomplete", domain: "application_access", actionTo: "/applications", actionKey: "review-application-config", labelKey: "reviewApplicationConfig", defaultLabel: "Review application configuration"},
    {dataset: input.records, type: "sync_failed", domain: "audit_operations", actionTo: "/records", actionKey: "review-audit-record", labelKey: "reviewAuditRecords", defaultLabel: "Review audit records"},
    {dataset: input.agents, type: "gateway_mapping_gap", domain: "llm_ai_gateway", actionTo: "/agents", actionKey: "review-agent", labelKey: "reviewAgentMapping", defaultLabel: "Review Agent mapping"},
  ];

  candidates.forEach(candidate => {
    if (!candidate.dataset?.errorMessage) {
      return;
    }

    const source = reviewSource(candidate.dataset);
    const impactObject: GovernanceTaskImpactObject = {
      type: "EvidenceSource",
      id: candidate.dataset.pagePath,
      displayName: candidate.dataset.pagePath,
      to: candidate.actionTo,
    };
    tasks.push(createTask({
      taskType: candidate.type,
      severity: "info",
      domain: candidate.domain,
      status: "cannot_infer",
      impactObject,
      source,
      sourceOfTruth: "source_unavailable",
      suggestedAction: taskAction(candidate.actionKey, candidate.labelKey, candidate.defaultLabel, candidate.actionTo, "wait_for_aggregation"),
      evidenceEntry: taskEvidence("source", "sourceEvidence", "Source evidence", candidate.actionTo, source),
      safetyBoundaryKey: "cannotInferBoundary",
      defaultSafetyBoundary: "The source is unavailable, so the task only points to the evidence entry and does not infer risk clearance.",
      redactionSummary: {hiddenFields: [], note: "no_raw_credentials_rendered"},
    }));
  });
}

export function buildGovernanceTasks(input: GovernanceTaskClassifierInput = {}): GovernanceTask[] {
  const tasks: GovernanceTask[] = [];

  addApplicationTasks(tasks, input.applications);
  addProviderTasks(tasks, input.providers);
  addUserTasks(tasks, input.users);
  addRoleTasks(tasks, input.roles);
  addTokenTasks(tasks, input.tokens);
  addRecordTasks(tasks, input.records);
  addAgentTasks(tasks, input.agents);
  addCannotInferTasks(tasks, input);

  return tasks;
}

function matchesText(task: GovernanceTask, keyword: string): boolean {
  const value = keyword.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (value === "") {
    return true;
  }

  return [
    task.taskType,
    task.severity,
    task.domain,
    task.status,
    task.impactObject.type,
    task.impactObject.id,
    task.impactObject.displayName,
    task.source.pagePath,
    task.sourceOfTruth,
    task.suggestedAction.defaultLabel,
    task.evidenceEntry.defaultLabel,
  ].join(" ").toLowerCase().replace(/[_-]+/g, " ").includes(value);
}

export function filterGovernanceTasks(tasks: GovernanceTask[], filter: GovernanceTaskFilter = {}): GovernanceTask[] {
  return tasks.filter(task => {
    if (filter.type && filter.type !== "all" && task.taskType !== filter.type) {
      return false;
    }

    if (filter.severity && filter.severity !== "all" && task.severity !== filter.severity) {
      return false;
    }

    if (filter.status && filter.status !== "all" && task.status !== filter.status) {
      return false;
    }

    if (filter.sourceScope && filter.sourceScope !== "all" && task.source.kind !== filter.sourceScope) {
      return false;
    }

    if (filter.impactObjectType && filter.impactObjectType !== "all" && task.impactObject.type !== filter.impactObjectType) {
      return false;
    }

    return matchesText(task, filter.keyword || "");
  });
}
