import * as Setting from "../Setting";

export type ServiceCredentialGovernanceStatus = "configured" | "missing" | "partial" | "blocked" | "not_applicable";
export type ServiceCredentialReferenceStatus = "configured" | "missing" | "external_secret" | "not_applicable";
export type ServiceCredentialGovernanceSourceClass = "admin_config" | "env_config" | "external_secret_system";

export interface ServiceCredentialGovernanceGroup {
  key: string;
  label: string;
  owner: string;
  status: ServiceCredentialGovernanceStatus;
  configuredKeys?: string[];
  missingKeys?: string[];
  credentialReferenceStatus: ServiceCredentialReferenceStatus;
  callerPolicy?: string;
  boundedRuntimePolicy?: Record<string, unknown>;
  keepInEnvKeys?: string[];
  blockedReasons?: string[];
  remediationRoute?: string;
  nextAction?: string;
}

export interface ServiceCredentialGovernanceStatusResponse {
  generatedAt: string;
  source: "admin_runtime_config";
  groups: ServiceCredentialGovernanceGroup[];
}

export interface ServiceCredentialGovernanceApiResponse {
  status: "ok" | "error";
  msg?: string;
  data?: ServiceCredentialGovernanceStatusResponse;
}

export interface ServiceCredentialGovernanceConfigGroup {
  key: string;
  label?: string;
  enabled: boolean;
  owner?: string;
  sourceClass?: ServiceCredentialGovernanceSourceClass;
  credentialReferenceStatus?: ServiceCredentialReferenceStatus;
  credentialReferenceKey?: string;
  ownerManaged?: boolean;
  keepInEnv?: boolean;
  callerPolicy?: string;
  boundedRuntimePolicy?: Record<string, unknown>;
  remediationRoute?: string;
  nextAction?: string;
  blockedReasons?: string[];
  keepInEnvKeys?: string[];
}

export interface ServiceCredentialGovernanceConfigResponse {
  updatedAt?: string;
  source: "admin_service_credential_governance_config";
  isConfigured: boolean;
  groups: ServiceCredentialGovernanceConfigGroup[];
}

export interface ServiceCredentialGovernanceConfigApiResponse {
  status: "ok" | "error";
  msg?: string;
  data?: ServiceCredentialGovernanceConfigResponse;
}

export type ServiceCredentialGovernanceDiagnosticStatus = "ready" | "blocked" | "disabled" | "missing_reference" | "keep_in_env" | "cannot_infer";

export interface ServiceCredentialGovernanceDiagnosticGroup {
  key: string;
  label?: string;
  status: ServiceCredentialGovernanceDiagnosticStatus;
  stableAlias: string;
  owner?: string;
  sourceClass?: ServiceCredentialGovernanceSourceClass;
  credentialReferenceStatus?: ServiceCredentialReferenceStatus;
  callerPolicyPresent: boolean;
  keepInEnv: boolean;
  nextAction?: string;
  cannotInfer: boolean;
  blockedReasons?: string[];
}

export interface ServiceCredentialGovernanceDiagnosticResponse {
  generatedAt: string;
  source: "admin_service_credential_governance_diagnostic";
  groups: ServiceCredentialGovernanceDiagnosticGroup[];
}

export interface ServiceCredentialGovernanceDiagnosticApiResponse {
  status: "ok" | "error";
  msg?: string;
  data?: ServiceCredentialGovernanceDiagnosticResponse;
}

export type ServiceCredentialGovernanceHandoffReadiness = "ready" | "blocked" | "keep_in_env" | "cannot_infer";

export interface ServiceCredentialGovernanceHandoffGroup {
  key: string;
  label?: string;
  status?: ServiceCredentialGovernanceStatus;
  readiness: ServiceCredentialGovernanceHandoffReadiness;
  ownerHint?: string;
  sourceClass?: ServiceCredentialGovernanceSourceClass;
  credentialReferenceStatus?: ServiceCredentialReferenceStatus;
  credentialReferenceKeySummary?: string;
  callerPolicyPresent: boolean;
  callerPolicyAlias?: string;
  boundedRuntimePolicy?: Record<string, unknown>;
  keepInEnv: boolean;
  cannotInferRuntimeTruth: boolean;
  nextAction?: string;
  stableAliases: string[];
  blockedAliases: string[];
}

export interface ServiceCredentialGovernanceHandoffPackage {
  schema: "aicodex.admin.serviceCredentialGovernanceHandoff";
  version: "2026-06-22";
  source: "admin_service_credential_governance_handoff_package";
  generatedAt: string;
  targetConsumerAlias: string;
  adminOwnerAlias: string;
  groups: ServiceCredentialGovernanceHandoffGroup[];
}

export interface ServiceCredentialGovernanceHandoffPackageInput {
  config?: ServiceCredentialGovernanceConfigResponse | null;
  status?: ServiceCredentialGovernanceStatusResponse | null;
  diagnostic?: ServiceCredentialGovernanceDiagnosticResponse | null;
  generatedAt?: string;
  targetConsumerAlias?: string;
  adminOwnerAlias?: string;
}

const SUPPORTED_SERVICE_CREDENTIAL_SOURCE_CLASSES = new Set(["admin_config", "env_config", "external_secret_system"]);

function containsUnsafeHandoffText(value: unknown): boolean {
  const text = `${value ?? ""}`.trim().toLowerCase();
  if (!text) {
    return false;
  }

  return /[a-z][a-z0-9+.-]*:\/\//i.test(text)
    || text.includes("authorization")
    || text.includes("cookie")
    || text.includes("bearer ")
    || /\bdsn\b/.test(text)
    || text.includes("password")
    || text.includes("clientsecret")
    || text.includes("client_secret")
    || text.includes("privatekey")
    || text.includes("private_key")
    || text.includes("-----begin")
    || text.includes("access_token")
    || text.includes("accesstoken")
    || text.includes("refresh_token")
    || text.includes("refreshtoken")
    || /token(?:[_-]?value|[:=])/.test(text)
    || /secret(?:[_-]?value|[:=])/.test(text)
    || /raw[_-]?payload|rawpayload/.test(text)
    || /raw[_-]?id\b/.test(text);
}

function getSafeHandoffText(value?: string): string | undefined {
  if (!value || containsUnsafeHandoffText(value)) {
    return undefined;
  }
  return value;
}

function getSafeHandoffRuntimePolicy(policy?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!policy) {
    return undefined;
  }

  const safePolicy: Record<string, unknown> = {};
  Object.entries(policy).forEach(([key, value]) => {
    if (containsUnsafeHandoffText(key) || containsUnsafeHandoffText(value)) {
      return;
    }
    if (["string", "number", "boolean"].includes(typeof value)) {
      safePolicy[key] = value;
    }
  });

  return Object.keys(safePolicy).length > 0 ? safePolicy : undefined;
}

function addSafeAlias(aliases: Set<string>, alias?: string): void {
  const safeAlias = getSafeHandoffText(alias);
  if (safeAlias) {
    aliases.add(safeAlias);
  }
}

function getOrderedHandoffGroupKeys(
  configGroups: ServiceCredentialGovernanceConfigGroup[],
  statusGroups: ServiceCredentialGovernanceGroup[],
  diagnosticGroups: ServiceCredentialGovernanceDiagnosticGroup[]
): string[] {
  const keys = new Set<string>();
  configGroups.forEach(group => keys.add(group.key));
  statusGroups.forEach(group => keys.add(group.key));
  diagnosticGroups.forEach(group => keys.add(group.key));
  return Array.from(keys);
}

function isHandoffSourceClassSupported(sourceClass?: string): boolean {
  return !sourceClass || SUPPORTED_SERVICE_CREDENTIAL_SOURCE_CLASSES.has(sourceClass);
}

// 生成只包含别名和状态的交接摘要；不能把它解释为 resolver、Gateway 或 Insight 的运行态成功证明。
export function buildServiceCredentialGovernanceHandoffPackage(input: ServiceCredentialGovernanceHandoffPackageInput): ServiceCredentialGovernanceHandoffPackage {
  const configGroups = input.config?.groups ?? [];
  const statusGroups = input.status?.groups ?? [];
  const diagnosticGroups = input.diagnostic?.groups ?? [];
  const generatedAt = input.generatedAt ?? input.diagnostic?.generatedAt ?? input.status?.generatedAt ?? input.config?.updatedAt ?? new Date().toISOString();

  return {
    schema: "aicodex.admin.serviceCredentialGovernanceHandoff",
    version: "2026-06-22",
    source: "admin_service_credential_governance_handoff_package",
    generatedAt,
    targetConsumerAlias: getSafeHandoffText(input.targetConsumerAlias) ?? "insight_business_service_access",
    adminOwnerAlias: getSafeHandoffText(input.adminOwnerAlias) ?? "admin_identity_application_access",
    groups: getOrderedHandoffGroupKeys(configGroups, statusGroups, diagnosticGroups).map(key => {
      const configGroup = configGroups.find(group => group.key === key);
      const statusGroup = statusGroups.find(group => group.key === key);
      const diagnosticGroup = diagnosticGroups.find(group => group.key === key);
      const sourceClass = configGroup?.sourceClass ?? diagnosticGroup?.sourceClass;
      const credentialReferenceStatus = configGroup?.credentialReferenceStatus ?? diagnosticGroup?.credentialReferenceStatus ?? statusGroup?.credentialReferenceStatus;
      const stableAliases = new Set<string>();
      const blockedAliases = new Set<string>();
      const keepInEnv = Boolean(configGroup?.keepInEnv || diagnosticGroup?.keepInEnv || key === "keep_in_env");
      const callerPolicyAlias = getSafeHandoffText(configGroup?.callerPolicy ?? statusGroup?.callerPolicy);
      const callerPolicyPresent = Boolean(callerPolicyAlias || diagnosticGroup?.callerPolicyPresent);
      const credentialReferenceKeySummary = getSafeHandoffText(configGroup?.credentialReferenceKey);
      const status = statusGroup?.status;
      let cannotInferRuntimeTruth = Boolean(diagnosticGroup?.cannotInfer);
      let readiness: ServiceCredentialGovernanceHandoffReadiness = "ready";

      addSafeAlias(stableAliases, diagnosticGroup?.stableAlias);
      (configGroup?.blockedReasons ?? []).forEach(alias => addSafeAlias(blockedAliases, alias));
      (statusGroup?.blockedReasons ?? []).forEach(alias => addSafeAlias(blockedAliases, alias));
      (diagnosticGroup?.blockedReasons ?? []).forEach(alias => addSafeAlias(blockedAliases, alias));

      if (keepInEnv) {
        readiness = "keep_in_env";
        cannotInferRuntimeTruth = true;
        addSafeAlias(stableAliases, "admin_service_credential_keep_in_env");
        addSafeAlias(blockedAliases, "admin_service_credential_keep_in_env");
      } else if (status === "not_applicable") {
        readiness = "cannot_infer";
        cannotInferRuntimeTruth = true;
      } else if (configGroup?.enabled === false || diagnosticGroup?.status === "disabled") {
        readiness = "blocked";
        addSafeAlias(blockedAliases, "admin_service_credential_group_disabled");
      } else if (!isHandoffSourceClassSupported(sourceClass)) {
        readiness = "blocked";
        addSafeAlias(blockedAliases, "admin_service_credential_source_class_unsupported");
      } else if (credentialReferenceStatus === "missing" || diagnosticGroup?.status === "missing_reference") {
        readiness = "blocked";
        addSafeAlias(blockedAliases, "admin_service_credential_reference_missing");
      } else if (sourceClass === "env_config") {
        readiness = "cannot_infer";
        cannotInferRuntimeTruth = true;
        addSafeAlias(blockedAliases, "admin_service_credential_env_config_cannot_infer");
      } else if (sourceClass === "external_secret_system") {
        readiness = "cannot_infer";
        cannotInferRuntimeTruth = true;
        addSafeAlias(blockedAliases, "admin_service_credential_external_reference_unresolved");
      } else if (diagnosticGroup?.status === "cannot_infer") {
        readiness = "cannot_infer";
        cannotInferRuntimeTruth = true;
      } else if (diagnosticGroup?.status === "blocked" || status === "blocked" || status === "missing" || status === "partial") {
        readiness = "blocked";
      }

      blockedAliases.forEach(alias => addSafeAlias(stableAliases, alias));

      return {
        key,
        label: getSafeHandoffText(configGroup?.label ?? statusGroup?.label ?? diagnosticGroup?.label),
        status,
        readiness,
        ownerHint: getSafeHandoffText(configGroup?.owner ?? statusGroup?.owner ?? diagnosticGroup?.owner),
        sourceClass: isHandoffSourceClassSupported(sourceClass) ? sourceClass as ServiceCredentialGovernanceSourceClass | undefined : undefined,
        credentialReferenceStatus,
        credentialReferenceKeySummary,
        callerPolicyPresent,
        callerPolicyAlias,
        boundedRuntimePolicy: getSafeHandoffRuntimePolicy(configGroup?.boundedRuntimePolicy ?? statusGroup?.boundedRuntimePolicy),
        keepInEnv,
        cannotInferRuntimeTruth,
        nextAction: getSafeHandoffText(configGroup?.nextAction ?? diagnosticGroup?.nextAction),
        stableAliases: Array.from(stableAliases),
        blockedAliases: Array.from(blockedAliases),
      };
    }),
  };
}

function getHeaders(): Record<string, string> {
  return {
    "Accept-Language": Setting.getAcceptLanguage(),
  };
}

export function getServiceCredentialGovernanceStatus(): Promise<ServiceCredentialGovernanceApiResponse> {
  return fetch(`${Setting.ServerUrl}/api/application-access/service-credential-governance-status`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function getServiceCredentialGovernanceConfig(): Promise<ServiceCredentialGovernanceConfigApiResponse> {
  return fetch(`${Setting.ServerUrl}/api/application-access/service-credential-governance-config`, {
    method: "GET",
    credentials: "include",
    headers: getHeaders(),
  }).then(res => res.json());
}

export function saveServiceCredentialGovernanceConfig(config: ServiceCredentialGovernanceConfigResponse): Promise<ServiceCredentialGovernanceConfigApiResponse> {
  return fetch(`${Setting.ServerUrl}/api/application-access/service-credential-governance-config`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  }).then(res => res.json());
}

export function diagnoseServiceCredentialGovernanceConfig(config: ServiceCredentialGovernanceConfigResponse): Promise<ServiceCredentialGovernanceDiagnosticApiResponse> {
  return fetch(`${Setting.ServerUrl}/api/application-access/service-credential-governance-diagnostics`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  }).then(res => res.json());
}
