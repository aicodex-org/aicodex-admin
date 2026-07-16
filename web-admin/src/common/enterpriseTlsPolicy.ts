// EnterpriseTlsPolicy 的空值只表示尚未迁移的存量记录，不能作为新建默认值。
export type EnterpriseTlsPolicy = "" | "system" | "custom-ca" | "legacy-insecure";
export type ExplicitEnterpriseTlsPolicy = Exclude<EnterpriseTlsPolicy, "">;

export type EnterpriseTlsPolicyErrorCode =
  | "invalid-policy"
  | "ca-required"
  | "ca-unavailable"
  | "ca-conflict";

export interface EnterpriseTlsCertOption {
  name: string;
}

interface EnterpriseTlsRecord extends Record<string, unknown> {
  tlsPolicy?: unknown;
  cert?: unknown;
}

const httpEmailProviderTypes = new Set(["Azure ACS", "Custom HTTP Email", "SendGrid", "Resend"]);
const explicitPolicies = new Set<unknown>(["system", "custom-ca", "legacy-insecure"]);

export function isExplicitEnterpriseTlsPolicy(value: unknown): value is ExplicitEnterpriseTlsPolicy {
  return explicitPolicies.has(value);
}

// 仅 ADFS 与使用SMTP dialer的Email Provider共享企业TLS配置入口。
export function isEnterpriseTlsProvider(provider: {category?: unknown; type?: unknown}): boolean {
  if (provider.category === "OAuth") {
    return provider.type === "ADFS";
  }
  return provider.category === "Email" && typeof provider.type === "string" && !httpEmailProviderTypes.has(provider.type);
}

// Syncer配置入口只对Active Directory开放，不改变数据库或其它同步器的TLS字段语义。
export function isEnterpriseTlsSyncer(syncer: {type?: unknown}): boolean {
  return syncer.type === "Active Directory";
}

// Add草稿显式采用system；编辑态缺失字段规范为空值以保持legacy_unmigrated。
export function prepareEnterpriseTlsRecord<T extends EnterpriseTlsRecord>(record: T, isTarget: boolean, isAdd: boolean): T {
  const next = {...record};
  if (!isTarget) {
    return next;
  }
  if (isAdd && (next.tlsPolicy === undefined || next.tlsPolicy === "")) {
    next.tlsPolicy = "system";
  } else if (!isAdd && next.tlsPolicy === undefined) {
    next.tlsPolicy = "";
  }
  return next;
}

// 显式切换policy时原子更新状态；离开custom-ca必须清除旧CA引用。
export function applyEnterpriseTlsPolicy<T extends EnterpriseTlsRecord>(record: T, policy: ExplicitEnterpriseTlsPolicy): T {
  return {
    ...record,
    tlsPolicy: policy,
    cert: policy === "custom-ca" ? record.cert : "",
  };
}

// UI只接收SSL Cert名称投影，避免证书正文或私钥进入字段组件。
export function projectSslCertOptions(certs: readonly unknown[]): EnterpriseTlsCertOption[] {
  return certs.flatMap(cert => {
    if (typeof cert !== "object" || cert === null) {
      return [];
    }
    const candidate = cert as {name?: unknown; type?: unknown};
    if (candidate.type !== "SSL" || typeof candidate.name !== "string" || candidate.name === "") {
      return [];
    }
    return [{name: candidate.name}];
  });
}

// 保存前校验只返回稳定错误码，不回显unknown policy、CA名称或证书材料。
export function validateEnterpriseTlsPolicy(
  record: EnterpriseTlsRecord,
  isTarget: boolean,
  sslCertOptions: readonly EnterpriseTlsCertOption[]
): EnterpriseTlsPolicyErrorCode | null {
  if (!isTarget) {
    return null;
  }

  const policy = record.tlsPolicy;
  if (policy === undefined || policy === "") {
    return null;
  }
  if (!isExplicitEnterpriseTlsPolicy(policy)) {
    return "invalid-policy";
  }

  const cert = typeof record.cert === "string" ? record.cert : "";
  if (policy === "custom-ca") {
    if (cert.trim() === "") {
      return "ca-required";
    }
    return sslCertOptions.some(option => option.name === cert) ? null : "ca-unavailable";
  }
  return cert.trim() === "" ? null : "ca-conflict";
}

// getEnterpriseTlsPolicyErrorKey 把稳定错误码映射到双语locale key。
export function getEnterpriseTlsPolicyErrorKey(error: EnterpriseTlsPolicyErrorCode): string {
  switch (error) {
  case "invalid-policy":
    return "provider:TLS policy is invalid";
  case "ca-required":
    return "provider:Select an SSL certificate for custom CA";
  case "ca-unavailable":
    return "provider:Selected custom CA certificate is unavailable";
  case "ca-conflict":
    return "provider:Clear the custom CA certificate before saving this policy";
  }
}
