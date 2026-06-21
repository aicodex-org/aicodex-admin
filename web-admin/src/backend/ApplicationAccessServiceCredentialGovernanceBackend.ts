import * as Setting from "../Setting";

export type ServiceCredentialGovernanceStatus = "configured" | "missing" | "partial" | "blocked" | "not_applicable";
export type ServiceCredentialReferenceStatus = "configured" | "missing" | "external_secret" | "not_applicable";

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
