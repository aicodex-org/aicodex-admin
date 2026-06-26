import i18next from "i18next";
import type {IdentityAssetDetail} from "./identityAssetRelationship";

type EvidenceChainTone = "success" | "warning" | "processing" | "default";
type EvidenceRelationshipItem = IdentityAssetDetail["relationships"][number];
type EvidenceSourceScope = IdentityAssetDetail["source"];

export interface IdentityEvidenceAsset extends IdentityAssetDetail {
  category: "application" | "auth_source" | "organization" | "user" | "role_permission" | "gateway" | "audit";
  summary: string;
  tone: EvidenceChainTone;
}

function t(key: string, defaultValue: string): string {
  const namespacedKey = `identityEvidenceChain:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return defaultValue;
  }

  return String(translated);
}

function createSource(pagePath: string, objectType: string, objectId: string): EvidenceSourceScope {
  return {
    kind: "read_only_review",
    pagePath,
    objectType,
    objectId,
  };
}

function relationship(
  key: string,
  type: string,
  label: string,
  value: string,
  status: EvidenceRelationshipItem["status"],
  source: EvidenceSourceScope,
  to: string,
  description: string
): EvidenceRelationshipItem {
  return {key, type, label, value, status, source, to, description};
}

function createAsset(params: {
  category: IdentityEvidenceAsset["category"];
  type: string;
  id: string;
  displayName: string;
  organization: string;
  status: string;
  pagePath: string;
  summary: string;
  tone: EvidenceChainTone;
  relationships: Array<Omit<EvidenceRelationshipItem, "source">>;
  evidence: Array<{key: string; label: string; to: string; description: string}>;
  riskMessage: string;
  safeNextTo: string;
  safeNextLabel: string;
}): IdentityEvidenceAsset {
  const source = createSource(params.pagePath, params.type, params.id);

  return {
    category: params.category,
    summary: params.summary,
    tone: params.tone,
    object: {
      type: params.type,
      id: params.id,
      displayName: params.displayName,
      organization: params.organization,
      status: params.status,
      source,
    },
    source,
    relationships: params.relationships.map(item => ({...item, source})),
    evidenceEntries: params.evidence.map(item => ({...item, source})),
    cannotInfer: [
      {
        reason: "requires_scoped_readonly_evidence",
        message: params.riskMessage,
        safeNextAction: {
          key: params.safeNextTo,
          label: params.safeNextLabel,
          to: params.safeNextTo,
        },
      },
    ],
    redactionSummary: {
      hiddenFields: [],
      note: t("No sensitive raw values rendered", "未展示敏感原值"),
    },
    safeNextActions: [
      {
        key: params.safeNextTo,
        label: params.safeNextLabel,
        to: params.safeNextTo,
      },
    ],
  };
}

export function buildIdentityEvidenceChainCatalog(): IdentityEvidenceAsset[] {
  const applicationSource = createSource("/applications", "Application", "application-access");
  const providerSource = createSource("/providers", "Provider", "auth-source");
  const organizationSource = createSource("/organizations", "Organization", "organization-identity");
  const userSource = createSource("/users", "User", "user-identity");
  const roleSource = createSource("/roles", "Role", "role-permission");
  const gatewaySource = createSource("/platform-api-mappings", "Gateway mapping", "gateway-llm-ai");
  const auditSource = createSource("/records", "Audit record", "audit-evidence");

  return [
    createAsset({
      category: "application",
      type: "Application",
      id: "application-access",
      displayName: t("Application access", "应用接入"),
      organization: t("Application access scope", "OAuth/OIDC client 与 API 映射"),
      status: t("Runtime health", "运行健康"),
      pagePath: "/applications",
      summary: t("Application access summary", "核对应用、回调、授权范围、Provider 绑定和 API 网关映射。"),
      tone: "success",
      relationships: [
        relationship("application-access", "application_access", t("Application access", "应用接入"), t("Applications and callbacks", "应用与回调"), "ready", applicationSource, "/applications", t("Application access relationship", "从应用接入中心核对 OAuth client、回调和授权范围。")),
        relationship("auth-source", "auth_source", t("Identity source", "身份源"), t("Provider binding", "Provider 绑定"), "ready", applicationSource, "/providers", t("Application provider relationship", "通过认证源中心核对登录身份源和目标组织。")),
        relationship("gateway-mapping", "gateway_mapping", t("Gateway identity mapping", "网关身份映射"), t("API gateway mapping", "API 网关映射"), "info", applicationSource, "/platform-api-mappings", t("Application gateway relationship", "打开 API 网关映射核对应用到 API 的接入契约。")),
      ],
      evidence: [
        {key: "applications", label: t("Application access", "应用接入"), to: "/applications", description: t("Open application evidence", "进入应用接入中心查看对象配置。")},
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
      ],
      riskMessage: t("Application risk message", "跨组织影响范围需要后续只读聚合接口，本页只提供当前对象证据入口。"),
      safeNextTo: "/applications",
      safeNextLabel: t("Review application access", "核对应用接入"),
    }),
    createAsset({
      category: "auth_source",
      type: "Provider",
      id: "auth-source",
      displayName: t("Identity source", "认证源"),
      organization: t("Identity source scope", "企业微信 / 飞书 / OIDC"),
      status: t("Sync diagnostics", "同步诊断"),
      pagePath: "/providers",
      summary: t("Identity source summary", "核对身份源配置、组织同步诊断、目标组织和应用绑定缺口。"),
      tone: "warning",
      relationships: [
        relationship("auth-source", "auth_source", t("Identity source", "身份源"), t("Provider configuration", "Provider 配置"), "ready", providerSource, "/providers", t("Provider relationship", "从认证源中心查看可见配置和绑定入口。")),
        relationship("organization-scope", "organization_scope", t("Organization scope", "组织/作用域"), t("Target organization", "目标组织"), "cannot_infer", providerSource, "/organizations", t("Provider organization relationship", "目标组织需结合应用绑定和组织主数据核对。")),
        relationship("audit-evidence", "audit_evidence", t("Audit evidence", "审计证据"), t("Login and sync evidence", "登录与同步证据"), "info", providerSource, "/records", t("Provider audit relationship", "进入审计记录查看登录、同步和配置变更证据。")),
      ],
      evidence: [
        {key: "providers", label: t("Identity source", "认证源"), to: "/providers", description: t("Open provider evidence", "进入认证源中心核对身份源配置。")},
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
        {key: "verifications", label: t("Verification records", "验证码记录"), to: "/verifications", description: t("Open verification evidence", "核对验证码发送/使用记录，不读取验证码原值。")},
      ],
      riskMessage: t("Provider risk message", "认证源的全量应用绑定需从应用列表或后续聚合接口核对。"),
      safeNextTo: "/providers",
      safeNextLabel: t("Review identity source", "核对认证源"),
    }),
    createAsset({
      category: "organization",
      type: "Organization",
      id: "organization-identity",
      displayName: t("Organization identity", "组织身份"),
      organization: t("Directory boundary", "目录边界"),
      status: t("Identity quality", "身份质量"),
      pagePath: "/organizations",
      summary: t("Organization summary", "核对组织主数据、部门边界、用户生命周期和目录质量。"),
      tone: "processing",
      relationships: [
        relationship("organization-scope", "organization_scope", t("Organization scope", "组织/作用域"), t("Directory boundary", "目录边界"), "ready", organizationSource, "/organizations", t("Organization relationship", "从组织列表进入组织主数据和用户范围。")),
        relationship("user-identity", "user_identity", t("User identity", "用户身份"), t("Users and groups", "用户与部门"), "ready", organizationSource, "/users", t("User organization relationship", "从用户和部门页面核对身份归属。")),
        relationship("audit-evidence", "audit_evidence", t("Sync diagnostics", "同步诊断"), t("Directory quality", "目录质量"), "info", organizationSource, "/organization-directory-quality", t("Directory quality relationship", "进入组织目录质量页面核对同步诊断和处理入口。")),
      ],
      evidence: [
        {key: "organizations", label: t("Organization identity", "组织身份"), to: "/organizations", description: t("Open organization evidence", "进入组织主数据页面核对对象边界。")},
        {key: "directory-quality", label: t("Directory quality", "目录质量"), to: "/organization-directory-quality", description: t("Open directory quality evidence", "进入目录质量页面核对同步诊断。")},
      ],
      riskMessage: t("Organization risk message", "跨组织用户影响范围需由后端只读聚合接口提供。"),
      safeNextTo: "/organization-directory-quality",
      safeNextLabel: t("Review directory quality", "核对目录质量"),
    }),
    createAsset({
      category: "user",
      type: "User",
      id: "user-identity",
      displayName: t("User identity", "用户身份"),
      organization: t("User lifecycle", "用户生命周期"),
      status: t("Authorization relationship", "授权关系"),
      pagePath: "/users",
      summary: t("User summary", "核对用户归属、外部身份、角色权限和登录审计入口。"),
      tone: "success",
      relationships: [
        relationship("user-identity", "user_identity", t("User identity", "用户身份"), t("Users and external identities", "用户与外部身份"), "ready", userSource, "/users", t("User relationship", "从用户列表核对账号状态、组织归属和外部身份入口。")),
        relationship("role-permission", "role_permission", t("Role permission", "角色权限"), t("Authorization relationship", "授权关系"), "ready", userSource, "/roles", t("User role relationship", "进入角色和权限页面核对授权关系。")),
        relationship("audit-evidence", "audit_evidence", t("Audit evidence", "审计证据"), t("Login evidence", "登录证据"), "info", userSource, "/records", t("User audit relationship", "进入审计记录核对登录、变更和异常证据。")),
      ],
      evidence: [
        {key: "users", label: t("User identity", "用户身份"), to: "/users", description: t("Open user evidence", "进入用户列表核对身份对象。")},
        {key: "tokens", label: t("Token review", "令牌管理"), to: "/tokens", description: t("Open token evidence", "核对可见令牌状态，不读取 token 原值。")},
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
      ],
      riskMessage: t("User risk message", "用户与角色的全量授权影响需结合后端权限事实源核对。"),
      safeNextTo: "/users",
      safeNextLabel: t("Review users", "核对用户"),
    }),
    createAsset({
      category: "role_permission",
      type: "Role",
      id: "role-permission",
      displayName: t("Role permission", "角色权限"),
      organization: t("Authorization governance", "权限治理"),
      status: t("Risk handling", "风险处理"),
      pagePath: "/roles",
      summary: t("Role summary", "核对角色、权限、敏感授权和治理待办入口。"),
      tone: "warning",
      relationships: [
        relationship("role-permission", "role_permission", t("Role permission", "角色权限"), t("Roles and permissions", "角色与权限"), "ready", roleSource, "/roles", t("Role relationship", "从角色权限页面核对授权关系和敏感权限。")),
        relationship("user-identity", "user_identity", t("User identity", "用户身份"), t("Granted users", "授权用户"), "cannot_infer", roleSource, "/users", t("Role user relationship", "授权用户影响范围需要当前用户视图或后续聚合接口。")),
        relationship("audit-evidence", "audit_evidence", t("Audit evidence", "审计证据"), t("Permission changes", "权限变更"), "info", roleSource, "/records", t("Role audit relationship", "进入审计记录核对授权变更证据。")),
      ],
      evidence: [
        {key: "roles", label: t("Roles", "角色"), to: "/roles", description: t("Open role evidence", "进入角色页面核对高权限角色。")},
        {key: "permissions", label: t("Permissions", "权限"), to: "/permissions", description: t("Open permission evidence", "进入权限页面核对敏感权限。")},
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
      ],
      riskMessage: t("Role risk message", "高权限影响范围不能由当前页面推断为全局事实。"),
      safeNextTo: "/roles",
      safeNextLabel: t("Review roles", "核对角色"),
    }),
    createAsset({
      category: "gateway",
      type: "Gateway mapping",
      id: "gateway-llm-ai",
      displayName: t("Gateway LLM AI", "Gateway / LLM AI"),
      organization: t("Gateway identity mapping", "网关身份映射"),
      status: t("Runtime health", "运行健康"),
      pagePath: "/platform-api-mappings",
      summary: t("Gateway summary", "核对 LLM AI 入口、MCP 资源、应用映射和网关身份证据。"),
      tone: "processing",
      relationships: [
        relationship("gateway-mapping", "gateway_mapping", t("Gateway identity mapping", "网关身份映射"), t("API gateway mapping", "API 网关映射"), "ready", gatewaySource, "/platform-api-mappings", t("Gateway mapping relationship", "进入 API 网关映射核对应用到 API 的接入契约。")),
        relationship("application-access", "application_access", t("Application access", "应用接入"), t("Bound applications", "绑定应用"), "info", gatewaySource, "/applications", t("Gateway application relationship", "从应用接入中心核对映射所依赖的应用对象。")),
        relationship("audit-evidence", "audit_evidence", t("Audit evidence", "审计证据"), t("Gateway readiness", "Gateway readiness"), "info", gatewaySource, "/records", t("Gateway audit relationship", "进入审计记录核对 AI 与网关相关变更。")),
      ],
      evidence: [
        {key: "mappings", label: t("API gateway mapping", "API 网关映射"), to: "/platform-api-mappings", description: t("Open gateway evidence", "进入 API 网关映射页面核对身份映射。")},
        {key: "agents", label: t("LLM AI gateway", "LLM AI 网关"), to: "/agents", description: t("Open agent evidence", "进入 LLM AI 网关中心核对 AI 入口。")},
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
        {key: "tokens", label: t("Token review", "令牌管理"), to: "/tokens", description: t("Open token evidence", "核对可见令牌状态，不读取 token 原值。")},
      ],
      riskMessage: t("Gateway risk message", "本页只提供只读映射和证据入口，不执行 Gateway 变更动作。"),
      safeNextTo: "/platform-api-mappings",
      safeNextLabel: t("Review gateway mappings", "核对网关映射"),
    }),
    createAsset({
      category: "audit",
      type: "Audit record",
      id: "audit-evidence",
      displayName: t("Audit evidence", "审计证据"),
      organization: t("Audit operations", "审计运维"),
      status: t("Evidence chain", "证据链"),
      pagePath: "/records",
      summary: t("Audit summary", "核对审计记录、令牌、验证码记录和对象变更证据入口。"),
      tone: "default",
      relationships: [
        relationship("audit-evidence", "audit_evidence", t("Audit evidence", "审计证据"), t("Records and verifications", "审计与验证"), "ready", auditSource, "/records", t("Audit relationship", "从审计记录页面核对变更、失败和运维证据。")),
        relationship("user-identity", "user_identity", t("User identity", "用户身份"), t("Actor and subject", "操作者与对象"), "cannot_infer", auditSource, "/users", t("Audit user relationship", "操作者和对象明细需结合审计详情或后续聚合接口。")),
        relationship("application-access", "application_access", t("Application access", "应用接入"), t("Application changes", "应用变更"), "info", auditSource, "/applications", t("Audit application relationship", "进入应用接入中心核对相关对象配置。")),
      ],
      evidence: [
        {key: "records", label: t("Audit records", "审计记录"), to: "/records", description: t("Open audit evidence", "进入审计记录核对变更证据。")},
        {key: "tokens", label: t("Token review", "令牌管理"), to: "/tokens", description: t("Open token evidence", "核对可见令牌状态，不读取 token 原值。")},
        {key: "verifications", label: t("Verification records", "验证码记录"), to: "/verifications", description: t("Open verification evidence", "核对验证码发送/使用记录，不读取验证码原值。")},
      ],
      riskMessage: t("Audit risk message", "跨域证据链需要后续只读聚合接口返回 sourceOfTruth 与 cannotInfer。"),
      safeNextTo: "/records",
      safeNextLabel: t("Review audit records", "核对审计记录"),
    }),
  ];
}
