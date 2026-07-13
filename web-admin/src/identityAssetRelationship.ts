import i18next from "i18next";

export type SourceScopeKind = "current_view" | "current_filter" | "current_object" | "read_only_review" | "global_aggregation";

export type RelationshipStatus = "ready" | "gap" | "cannot_infer" | "info";

export interface SourceScope {
  kind: SourceScopeKind;
  pagePath: string;
  filterSummary?: string;
  loadedRows?: number;
  totalRows?: number;
  objectType?: string;
  objectId?: string;
  sourceOfTruth?: string;
  generatedAt?: string;
}

export interface SourceScopeDisplay extends SourceScope {
  label: string;
  description: string;
}

export interface RedactionResult {
  text: string;
  hiddenFields: string[];
}

export interface RedactionSummary {
  hiddenFields: string[];
  note: string;
}

export interface SafeNextAction {
  key: string;
  label: string;
  to: string;
}

export interface CannotInferState {
  reason: string;
  message: string;
  safeNextAction?: SafeNextAction;
}

export interface ImpactObjectReference {
  type: string;
  id: string;
  displayName: string;
  owner?: string;
  organization?: string;
  status?: string;
  source: SourceScope;
}

export interface RelationshipItem {
  key: string;
  type: string;
  label: string;
  value: string;
  status: RelationshipStatus;
  source: SourceScope;
  to?: string;
  description?: string;
}

export interface EvidenceEntry {
  key: string;
  label: string;
  to: string;
  description: string;
  source: SourceScope;
}

export interface IdentityAssetDetail {
  object: ImpactObjectReference;
  source: SourceScope;
  relationships: RelationshipItem[];
  evidenceEntries: EvidenceEntry[];
  cannotInfer: CannotInferState[];
  redactionSummary: RedactionSummary;
  safeNextActions: SafeNextAction[];
  permission?: {
    allowed: boolean;
    reason?: string;
  };
}

export interface AggregatedIdentityAssetRelationshipResponse {
  object: {
    type: string;
    id: string;
    displayName: string;
    owner?: string;
    organization?: string;
    status?: string;
  };
  scope: {
    pagePath?: string;
    sourceOfTruth?: string;
    generatedAt?: string;
  };
  relationships?: Array<{
    key: string;
    type: string;
    label: string;
    value: string;
    status: RelationshipStatus;
    to?: string;
    description?: string;
  }>;
  evidenceEntries?: Array<{
    key: string;
    label: string;
    to: string;
    description: string;
  }>;
  cannotInfer?: CannotInferState[];
  redactionSummary?: Partial<RedactionSummary>;
  safeNextActions?: SafeNextAction[];
  permission?: {
    allowed: boolean;
    reason?: string;
  };
}

type UnknownRecord = Record<string, unknown>;
type I18nInterpolationValues = Record<string, string | number>;

export interface CurrentViewSourceContext {
  pagePath: string;
  filterSummary?: string;
  loadedRows?: number;
  totalRows?: number;
}

const sensitiveFieldPatterns: Array<{field: string; pattern: RegExp}> = [
  {field: "clientSecret", pattern: /\b(clientSecret|client_secret|secret)\s*[:=]\s*[^,\s;]+/gi},
  {field: "token", pattern: /\b(token|accessToken|refreshToken|idToken)\s*[:=]\s*[^,\s;]+/gi},
  {field: "cookie", pattern: /\b(cookie|set-cookie)\s*[:=]\s*[^,\s;]+/gi},
];

const privateUrlPattern = /https?:\/\/[^\s,;)]+/gi;

function interpolate(template: string, values?: I18nInterpolationValues): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)), template);
}

function t(key: string, defaultValue: string, values?: I18nInterpolationValues): string {
  const namespacedKey = `identityAssetRelationship:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue, ...(values ?? {})});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return interpolate(defaultValue, values);
  }

  return interpolate(String(translated), values);
}

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function getProviderSyncDiagnostics(providerSearchText: string): {label: string; to: string} {
  const normalized = providerSearchText.toLowerCase();
  if (normalized.includes("lark") || normalized.includes("feishu") || normalized.includes("飞书")) {
    return {label: t("Feishu diagnostics", "Feishu diagnostics"), to: "/feishu-org-sync"};
  }
  if (normalized.includes("wecom") || normalized.includes("wechat") || normalized.includes("企业微信")) {
    return {label: t("WeCom diagnostics", "WeCom diagnostics"), to: "/wecom-org-sync"};
  }
  if (normalized.includes("dingtalk") || normalized.includes("dingding") || normalized.includes("钉钉")) {
    return {label: t("DingTalk diagnostics", "DingTalk diagnostics"), to: "/dingtalk-org-sync"};
  }
  return {label: t("Audit records", "Audit records"), to: "/records"};
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [value];
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function getStringArray(value: unknown): string[] {
  return toArray(value)
    .map(item => {
      if (typeof item === "string") {
        return item;
      }

      const record = asRecord(item);
      return normalizeText(record.name ?? record.scope ?? record.value);
    })
    .filter(item => item !== "");
}

function buildSource(context: CurrentViewSourceContext, object?: {type: string; id: string}): SourceScope {
  return {
    kind: context.filterSummary ? "current_filter" : "current_view",
    pagePath: context.pagePath,
    filterSummary: context.filterSummary,
    loadedRows: context.loadedRows,
    totalRows: context.totalRows,
    objectType: object?.type,
    objectId: object?.id,
  };
}

function buildCurrentObjectSource(pagePath: string, objectType: string, objectId: string): SourceScope {
  return {
    kind: "current_object",
    pagePath,
    objectType,
    objectId,
  };
}

function buildGlobalAggregationSource(response: AggregatedIdentityAssetRelationshipResponse): SourceScope {
  return {
    kind: "global_aggregation",
    pagePath: response.scope.pagePath || "/identity-assets",
    objectType: response.object.type,
    objectId: response.object.id,
    sourceOfTruth: response.scope.sourceOfTruth || "admin-readonly-relationship-aggregation",
    generatedAt: response.scope.generatedAt,
  };
}

function summarizeCount(labelKey: string, defaultLabel: string, count: number): string {
  const label = t(labelKey, defaultLabel);
  return count > 0 ? t("Count format", "{{count}} {{label}}", {count, label}) : t("Not configured", "Not configured");
}

function buildRedactionSummary(record: UnknownRecord, additionalHiddenFields: string[] = []): RedactionSummary {
  const hiddenFields = new Set(additionalHiddenFields);
  ["clientSecret", "client_secret", "accessToken", "refreshToken", "idToken", "token", "cookie"].forEach(field => {
    if (normalizeText(record[field]) !== "") {
      hiddenFields.add(field);
    }
  });
  ["providerUrl", "redirectUris", "callbackUrl", "url"].forEach(field => {
    if (normalizeText(record[field]) !== "" || toArray(record[field]).length > 0) {
      hiddenFields.add("privateUrl");
    }
  });

  return {
    hiddenFields: Array.from(hiddenFields).sort(),
    note: hiddenFields.size > 0 ? t("Sensitive values are hidden", "Sensitive values are hidden") : t("No sensitive raw values rendered", "No sensitive raw values rendered"),
  };
}

function createEvidenceEntries(source: SourceScope): EvidenceEntry[] {
  return [
    {
      key: "records",
      label: t("Audit records", "Audit records"),
      to: "/records",
      description: t("Audit records evidence description", "Open the existing audit records page for read-only review."),
      source,
    },
    {
      key: "tokens",
      label: t("Token review", "Token Management"),
      to: "/tokens",
      description: t("Token review evidence description", "Open the token page to review visible token status without reading raw token values."),
      source,
    },
    {
      key: "verifications",
      label: t("Verification records", "Verification Code Records"),
      to: "/verifications",
      description: t("Verification records evidence description", "Open verification code records to review evidence related to the current object."),
      source,
    },
    {
      key: "gateway-mapping",
      label: t("API gateway mapping", "API gateway mapping"),
      to: "/platform-api-mappings",
      description: t("Gateway mapping evidence description", "Open the existing Gateway mapping page without triggering publish, cleanup, or receipt verification."),
      source,
    },
  ];
}

export function isGlobalFactScope(scope: Pick<SourceScope, "kind">): boolean {
  return scope.kind === "global_aggregation";
}

export function buildAggregatedIdentityAssetDetail(response: AggregatedIdentityAssetRelationshipResponse): IdentityAssetDetail {
  const source = buildGlobalAggregationSource(response);
  const hiddenFields = new Set(response.redactionSummary?.hiddenFields ?? []);

  const relationships: RelationshipItem[] = (response.relationships ?? []).map(item => {
    const value = redactSensitiveText(item.value);
    const description = redactSensitiveText(item.description);
    value.hiddenFields.forEach(field => hiddenFields.add(field));
    description.hiddenFields.forEach(field => hiddenFields.add(field));

    return {
      ...item,
      value: value.text,
      description: description.text,
      source,
    };
  });

  const evidenceEntries: EvidenceEntry[] = (response.evidenceEntries ?? []).map(entry => {
    const description = redactSensitiveText(entry.description);
    description.hiddenFields.forEach(field => hiddenFields.add(field));

    return {
      ...entry,
      description: description.text,
      source,
    };
  });

  return {
    object: {
      ...response.object,
      source,
    },
    source,
    relationships,
    evidenceEntries,
    cannotInfer: response.cannotInfer ?? [],
    redactionSummary: {
      hiddenFields: Array.from(hiddenFields).sort(),
      note: response.redactionSummary?.note || (hiddenFields.size > 0 ? t("Sensitive values are hidden", "Sensitive values are hidden") : t("No sensitive raw values rendered", "No sensitive raw values rendered")),
    },
    safeNextActions: response.safeNextActions ?? [],
    permission: response.permission,
  };
}

export function getSourceScopeDisplay(scope: SourceScope): SourceScopeDisplay {
  const loadedRows = typeof scope.loadedRows === "number" ? t("Loaded row count", "Loaded {{count}} rows", {count: scope.loadedRows}) : t("Loaded current page data", "Loaded current page data");
  const totalRows = typeof scope.totalRows === "number" ? t("Total row suffix", ", total {{total}}", {total: scope.totalRows}) : "";
  const filter = scope.filterSummary ? t("Filter suffix", ", filter {{filter}}", {filter: scope.filterSummary}) : "";

  switch (scope.kind) {
  case "current_filter":
    return {
      ...scope,
      label: t("Current filter", "Current filter"),
      description: t("Current filter source description", "{{pagePath}}{{filter}}: {{loadedRows}}{{totalRows}}.", {pagePath: scope.pagePath, filter, loadedRows, totalRows}),
    };
  case "current_object":
    return {
      ...scope,
      label: t("Current object context", "Current object context"),
      description: t("Current object source description", "{{objectType}} {{objectId}} current-row read-only context.", {objectType: scope.objectType || t("Object", "Object"), objectId: scope.objectId || ""}),
    };
  case "read_only_review":
    return {
      ...scope,
      label: t("Read-only review", "Read-only review"),
      description: t("Read-only review source description", "{{pagePath}} read-only review result.", {pagePath: scope.pagePath}),
    };
  case "global_aggregation":
    return {
      ...scope,
      label: t("Global aggregation fact", "Global aggregation fact"),
      description: `${scope.sourceOfTruth || t("Backend source of truth", "Backend source of truth")} ${scope.generatedAt || ""}`.trim(),
    };
  default:
    return {
      ...scope,
      label: t("Current view", "Current view"),
      description: t("Current view source description", "{{pagePath}}: {{loadedRows}}{{totalRows}}.", {pagePath: scope.pagePath, loadedRows, totalRows}),
    };
  }
}

export function redactSensitiveText(value: unknown): RedactionResult {
  let text = normalizeText(value);
  const hiddenFields = new Set<string>();

  sensitiveFieldPatterns.forEach(({field, pattern}) => {
    text = text.replace(pattern, (match) => {
      hiddenFields.add(field);
      const [name] = match.split(/[:=]/);
      return `${name}=${t("Redacted value", "[redacted]")}`;
    });
  });

  text = text.replace(privateUrlPattern, () => {
    hiddenFields.add("privateUrl");
    return t("Redacted URL", "[redacted URL]");
  });

  return {
    text,
    hiddenFields: Array.from(hiddenFields).sort(),
  };
}

export function buildApplicationIdentityAssetDetail(
  application: UnknownRecord,
  context: CurrentViewSourceContext
): IdentityAssetDetail {
  const objectId = `${normalizeText(application.organization || application.owner || "admin")}/${normalizeText(application.name || application.displayName || "unnamed")}`;
  const source = buildSource(context, {type: "Application", id: objectId});
  const objectSource = buildCurrentObjectSource(context.pagePath, "Application", objectId);
  const providers = toArray(application.providers).map(asRecord);
  const loginProviders = providers.filter(provider => ["OAuth", "Web3", "SAML"].includes(normalizeText(provider.category || asRecord(provider.provider).category)));
  const redirectUris = getStringArray(application.redirectUris);
  const scopes = getStringArray(application.scopes);
  const targetOrganizations = loginProviders
    .map(provider => normalizeText(provider.targetOrganization))
    .filter(value => value !== "");
  const hasLoginProviders = loginProviders.length > 0;
  const hasMissingTargetOrganization = loginProviders.some(provider => normalizeText(provider.targetOrganization) === "");
  const firstTargetOrganization = targetOrganizations[0] || "";

  const relationships: RelationshipItem[] = [
    {
      key: "provider-binding",
      type: "provider_binding",
      label: t("Provider binding", "Provider binding"),
      value: summarizeCount("Provider", "Provider", providers.length),
      status: providers.length > 0 ? "ready" : "gap",
      source: objectSource,
      to: "/providers",
      description: providers.length > 0 ? t("Application provider binding summary", "Provider binding summary from the current Application row.") : t("Application provider binding missing", "The current object does not show Provider binding."),
    },
    {
      key: "target-organization",
      type: "target_organization",
      label: t("Target organization", "Target organization"),
      value: firstTargetOrganization || t("Not configured", "Not configured"),
      status: hasLoginProviders && !hasMissingTargetOrganization && firstTargetOrganization !== "" ? "ready" : "gap",
      source: objectSource,
      to: firstTargetOrganization ? `/organizations/${firstTargetOrganization}` : "/applications",
      description: targetOrganizations.length > 0 && !hasMissingTargetOrganization ? t("Target organization from provider binding", "Uses targetOrganization from the Provider binding.") : t("Target organization missing from provider binding", "Provider sign-in requires an explicit targetOrganization; the application organization is not used as a fallback."),
    },
    {
      key: "callback",
      type: "callback",
      label: t("Callback configuration", "Callback configuration"),
      value: summarizeCount("Callback", "callback", redirectUris.length),
      status: redirectUris.length > 0 ? "ready" : "gap",
      source: objectSource,
      to: `/applications/${normalizeText(application.organization || application.owner || "admin")}/${normalizeText(application.name || "")}`,
      description: t("Callback count redaction description", "Only the callback count is shown; full private URLs are not rendered."),
    },
    {
      key: "authorization-scope",
      type: "authorization_scope",
      label: t("Authorization scopes", "Authorization scopes"),
      value: scopes.length > 0 ? scopes.join(", ") : t("Not configured", "Not configured"),
      status: scopes.length > 0 ? "ready" : "gap",
      source: objectSource,
      to: `/applications/${normalizeText(application.organization || application.owner || "admin")}/${normalizeText(application.name || "")}`,
      description: t("Application scopes current row description", "Uses the scopes field from the current Application row."),
    },
  ];

  return {
    object: {
      type: "Application",
      id: objectId,
      displayName: normalizeText(application.displayName || application.name || t("Unnamed application", "Unnamed application")),
      owner: normalizeText(application.owner || "admin"),
      organization: normalizeText(application.organization),
      status: application.disableSignin === true ? t("Disabled", "Disabled") : t("Current object reviewable", "Current object reviewable"),
      source,
    },
    source,
    relationships,
    evidenceEntries: createEvidenceEntries(source),
    cannotInfer: [
      {
        reason: "global_relationships_require_aggregation",
        message: t("Global relationships require read-only aggregation", "Global relationship evidence requires a later read-only aggregation API."),
        safeNextAction: {key: "records", label: t("View audit records", "View audit records"), to: "/records"},
      },
    ],
    redactionSummary: buildRedactionSummary(application),
    safeNextActions: [
      {key: "edit-application", label: t("Edit application", "Edit application"), to: `/applications/${normalizeText(application.organization || application.owner || "admin")}/${normalizeText(application.name || "")}`},
      {key: "providers", label: t("Review Provider", "Review Provider"), to: "/providers"},
      {key: "records", label: t("View audit records", "View audit records"), to: "/records"},
    ],
  };
}

export function buildProviderIdentityAssetDetail(
  provider: UnknownRecord,
  context: CurrentViewSourceContext
): IdentityAssetDetail {
  const objectId = `${normalizeText(provider.owner || "admin")}/${normalizeText(provider.name || provider.displayName || "unnamed")}`;
  const source = buildSource(context, {type: "Provider", id: objectId});
  const objectSource = buildCurrentObjectSource(context.pagePath, "Provider", objectId);
  const providerType = normalizeText(provider.type || provider.category || "Provider");
  const providerSearchText = [provider.type, provider.category, provider.name, provider.displayName, provider.providerUrl]
    .map(normalizeText)
    .join(" ");
  const diagnostics = getProviderSyncDiagnostics(providerSearchText || providerType);
  const configFields = [provider.clientId, provider.providerUrl].filter(value => normalizeText(value) !== "").length;

  const relationships: RelationshipItem[] = [
    {
      key: "auth-source",
      type: "auth_source",
      label: t("Auth source", "Auth source"),
      value: [normalizeText(provider.category), providerType].filter(Boolean).join(" / ") || t("Unmarked", "Unmarked"),
      status: "ready",
      source: objectSource,
      to: `/providers/${normalizeText(provider.owner || "admin")}/${normalizeText(provider.name || "")}`,
      description: t("Provider type current row description", "Uses the type and category from the current Provider row."),
    },
    {
      key: "sync-diagnostics",
      type: "sync_diagnostics",
      label: t("Sync diagnostics", "Sync diagnostics"),
      value: diagnostics.label,
      status: "info",
      source: objectSource,
      to: diagnostics.to,
      description: t("Provider diagnostics no execution description", "Open existing diagnostics or audit pages without executing sync or login."),
    },
    {
      key: "application-binding-lookup",
      type: "application_binding_lookup",
      label: t("Application binding", "Application binding"),
      value: t("Needs application-list review", "Needs application-list review"),
      status: "cannot_infer",
      source,
      to: "/applications",
      description: t("Provider application binding current-row limitation", "The current Provider row cannot represent global application binding facts."),
    },
    {
      key: "configuration",
      type: "configuration",
      label: t("Configuration completeness", "Configuration completeness"),
      value: `${configFields}/2`,
      status: configFields === 2 ? "ready" : "gap",
      source: objectSource,
      to: `/providers/${normalizeText(provider.owner || "admin")}/${normalizeText(provider.name || "")}`,
      description: t("Provider configuration redaction description", "Only visible fields on the current row are reviewed; client secrets and private URLs are not rendered."),
    },
  ];

  return {
    object: {
      type: "Provider",
      id: objectId,
      displayName: normalizeText(provider.displayName || provider.name || t("Unnamed Provider", "Unnamed Provider")),
      owner: normalizeText(provider.owner || "admin"),
      organization: normalizeText(provider.owner || "admin"),
      status: t("Current object reviewable", "Current object reviewable"),
      source,
    },
    source,
    relationships,
    evidenceEntries: [
      {
        key: "records",
        label: t("Audit records", "Audit records"),
        to: "/records",
        description: t("Provider audit evidence description", "Open audit records to review Provider configuration or login events."),
        source,
      },
      {
        key: "applications",
        label: t("Application list", "Application list"),
        to: "/applications",
        description: t("Application list evidence description", "Use the application list to review Provider binding and target organization."),
        source,
      },
      {
        key: "verifications",
        label: t("Verification records", "Verification Code Records"),
        to: "/verifications",
        description: t("Provider verification evidence description", "Review verification code send/use records without reading raw code values."),
        source,
      },
    ],
    cannotInfer: [
      {
        reason: "application_bindings_require_application_view",
        message: t("Application bindings require application list review", "Application bindings must be reviewed from the application list."),
        safeNextAction: {key: "applications", label: t("Open application list", "Open application list"), to: "/applications"},
      },
    ],
    redactionSummary: buildRedactionSummary(provider),
    safeNextActions: [
      {key: "edit-provider", label: t("Edit Provider", "Edit Provider"), to: `/providers/${normalizeText(provider.owner || "admin")}/${normalizeText(provider.name || "")}`},
      {key: "applications", label: t("Review application binding", "Review application binding"), to: "/applications"},
      {key: "records", label: t("View audit records", "View audit records"), to: "/records"},
    ],
  };
}
