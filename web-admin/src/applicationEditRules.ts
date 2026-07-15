/** 应用编辑页会读取的可选集合字段，后端可能返回 null。 */
export interface EditableApplicationRecord {
  grantTypes?: unknown[] | null;
  tags?: unknown[] | null;
  providers?: unknown[] | null;
  name?: unknown;
  displayName?: unknown;
  [key: string]: unknown;
}

/** 自定义 scope 表格行保留后端扩展字段，只规范管理员可编辑的文本字段。 */
export interface CustomScopeRecord {
  scope?: unknown;
  displayName?: unknown;
  description?: unknown;
  [key: string]: unknown;
}

export interface CustomScopeValidation {
  ok: boolean;
  scopes: CustomScopeRecord[];
}

interface NamedRecord {
  name?: unknown;
  [key: string]: unknown;
}

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

/**
 * 将详情接口的可选集合转为页面可直接编辑的值，避免组件因 null 数组崩溃。
 * 返回副本，避免在调用方不知情的情况下修改接口响应对象。
 */
export function normalizeLoadedApplication<T extends EditableApplicationRecord>(application: T): T {
  return {
    ...application,
    grantTypes: Array.isArray(application.grantTypes) && application.grantTypes.length > 0
      ? application.grantTypes
      : ["authorization_code"],
    tags: Array.isArray(application.tags) ? application.tags : [],
    providers: Array.isArray(application.providers) ? application.providers : [],
  } as T;
}

/** 保留 legacy 表单的 offset 数值转换，其它字段保持原始输入值。 */
export function normalizeApplicationFieldValue<T>(key: string, value: T, parseInteger: (value: T) => unknown): unknown {
  return key === "offset" ? parseInteger(value) : value;
}

/** 将自定义 scope 的管理员输入统一去除首尾空白，同时保留扩展字段。 */
export function normalizeCustomScopes(customScopes: unknown): CustomScopeRecord[] {
  if (!Array.isArray(customScopes)) {
    return [];
  }

  return customScopes.map((item): CustomScopeRecord => {
    const record = item !== null && typeof item === "object" ? item as CustomScopeRecord : {};

    return {
      ...record,
      scope: normalizeText(record.scope),
      displayName: normalizeText(record.displayName),
      description: normalizeText(record.description),
    };
  });
}

/** 自定义 scope 必须具备稳定标识，显示名称和描述可为空。 */
export function validateCustomScopes(customScopes: unknown): CustomScopeValidation {
  const scopes = normalizeCustomScopes(customScopes);

  return {
    ok: scopes.every(scope => scope.scope !== ""),
    scopes,
  };
}

/** 返回缺失的应用主标识字段，页面据此显示本地化错误并定位 Basic Tab。 */
export function getRequiredApplicationFieldNames(application: Pick<EditableApplicationRecord, "name" | "displayName">): Array<"name" | "displayName"> {
  const fields: Array<"name" | "displayName"> = [];

  if (normalizeText(application.name) === "") {
    fields.push("name");
  }
  if (normalizeText(application.displayName) === "") {
    fields.push("displayName");
  }

  return fields;
}

/** 仅提交仍存在于当前组织的 Provider 绑定，保留未加载字段的原始 undefined 语义。 */
export function filterProvidersForSave<T extends NamedRecord>(providers: T[] | undefined, availableProviderNames: readonly string[]): T[] | undefined {
  return providers?.filter(provider => availableProviderNames.includes(`${provider.name ?? ""}`));
}

/** 应用编辑页只允许提交平台支持的登录方式，避免旧配置残留无效类型。 */
export function filterSigninMethodsForSave<T extends NamedRecord>(signinMethods: T[] | undefined): T[] | undefined {
  const allowedSigninMethodNames = ["Password", "Verification code", "WebAuthn", "LDAP", "Face ID", "WeChat", "WeCom"];

  return signinMethods?.filter(signinMethod => allowedSigninMethodNames.includes(`${signinMethod.name ?? ""}`));
}

/** 构造当前应用的只读 SAML metadata 地址，应用名必须按 URL path segment 编码。 */
export function buildSamlMetadataUrl(origin: string, applicationName: string, enablePostBinding: boolean | undefined): string {
  return `${origin}/api/saml/metadata?application=admin/${encodeURIComponent(applicationName)}&enablePostBinding=${enablePostBinding === true}`;
}

/** 统一《使用条款》上传资源路径，避免页面和测试各自拼接 owner/name。 */
export function buildTermsOfUseResourcePath(owner: string | undefined, applicationName: string): string {
  return `termsOfUse/${owner ?? ""}/${applicationName}.html`;
}
