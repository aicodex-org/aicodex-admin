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
