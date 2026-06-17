import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {Alert, Button, Empty, Input, Result, Select, Space, Spin, Tag, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import * as AgentBackend from "./backend/AgentBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as RecordBackend from "./backend/RecordBackend";
import * as RoleBackend from "./backend/RoleBackend";
import * as TokenBackend from "./backend/TokenBackend";
import * as UserBackend from "./backend/UserBackend";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";
import {getSourceScopeDisplay} from "./identityAssetRelationship";
import {
  type GovernanceTask,
  type GovernanceTaskFilter,
  type GovernanceTaskSourceDataset,
  type GovernanceTaskStatus,
  buildGovernanceTasks,
  filterGovernanceTasks
} from "./identityGovernanceTasks";
import * as Setting from "./Setting";

const {Text, Title} = Typography;
const FIRST_PAGE = "1";
const PAGE_SIZE = "20";
const EMPTY_SOURCE_ERRORS: string[] = [];

interface GovernanceTaskCenterProps {
  account?: {
    owner?: string;
    name?: string;
    isAdmin?: boolean;
    organization?: unknown;
  } | null;
  initialTasks?: GovernanceTask[];
  sourceErrors?: string[];
}

interface ListResponse {
  status?: string;
  data?: unknown;
  data2?: unknown;
  msg?: unknown;
}

interface TaskLoadResult {
  dataset: GovernanceTaskSourceDataset;
  errorPath?: string;
}

type SessionStatusMap = Record<string, GovernanceTaskStatus>;

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)), template);
}

function t(key: string, defaultValue: string, values?: Record<string, string | number>): string {
  const namespacedKey = `governanceTaskCenter:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue, ...(values ?? {})});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return interpolate(defaultValue, values);
  }

  return interpolate(String(translated), values);
}

function getSeverityTone(severity: GovernanceTask["severity"]): "error" | "warning" | "processing" | "default" | "success" {
  switch (severity) {
  case "high":
    return "error";
  case "medium":
    return "warning";
  case "low":
    return "processing";
  case "info":
    return "default";
  default:
    return "default";
  }
}

function getStatusTone(status: GovernanceTaskStatus): "warning" | "processing" | "default" | "success" {
  switch (status) {
  case "pending_review":
    return "warning";
  case "viewed":
    return "processing";
  case "session_ignored":
    return "default";
  case "cannot_infer":
    return "default";
  default:
    return "default";
  }
}

function getSeverityLabel(severity: GovernanceTask["severity"]): string {
  const labels: Record<GovernanceTask["severity"], string> = {
    high: t("severityHigh", "High"),
    medium: t("severityMedium", "Medium"),
    low: t("severityLow", "Low"),
    info: t("severityInfo", "Info"),
  };
  return labels[severity];
}

function getStatusLabel(status: GovernanceTaskStatus): string {
  const labels: Record<GovernanceTaskStatus, string> = {
    pending_review: t("statusPendingReview", "Pending review"),
    viewed: t("statusViewed", "Viewed"),
    session_ignored: t("statusSessionIgnored", "Ignored in this session"),
    cannot_infer: t("statusCannotInfer", "Cannot infer"),
  };
  return labels[status];
}

function getTaskTypeLabel(type: GovernanceTask["taskType"]): string {
  const labels: Record<GovernanceTask["taskType"], string> = {
    sync_failed: t("taskSyncFailed", "Sync failure review"),
    orphan_account: t("taskOrphanAccount", "Orphan account review"),
    privileged_role: t("taskPrivilegedRole", "Privileged role review"),
    application_incomplete: t("taskApplicationIncomplete", "Application access incomplete"),
    abnormal_token: t("taskAbnormalToken", "Abnormal token review"),
    callback_missing: t("taskCallbackMissing", "Missing callback"),
    provider_binding_risk: t("taskProviderBindingRisk", "Provider binding risk"),
    gateway_mapping_gap: t("taskGatewayMappingGap", "Gateway mapping gap"),
  };
  return labels[type];
}

function getDomainLabel(domain: GovernanceTask["domain"]): string {
  const labels: Record<GovernanceTask["domain"], string> = {
    organization_identity: t("domainOrganizationIdentity", "Organization identity"),
    identity_sources: t("domainIdentitySources", "Identity sources"),
    application_access: t("domainApplicationAccess", "Application access"),
    audit_operations: t("domainAuditOperations", "Audit operations"),
    llm_ai_gateway: t("domainLlmGateway", "LLM AI Gateway"),
    authorization_governance: t("domainAuthorization", "Authorization governance"),
  };
  return labels[domain];
}

function getActionLabel(task: GovernanceTask): string {
  return t(task.suggestedAction.labelKey, task.suggestedAction.defaultLabel);
}

function getEvidenceLabel(task: GovernanceTask): string {
  return t(task.evidenceEntry.labelKey, task.evidenceEntry.defaultLabel);
}

function getSourceShortLabel(kind: GovernanceTask["source"]["kind"]): string {
  switch (kind) {
  case "current_object":
    return t("sourceCurrentObject", "Current object");
  case "current_filter":
    return t("sourceCurrentFilter", "Current filter");
  case "read_only_review":
    return t("sourceReadOnlyReview", "Evidence entry");
  case "global_aggregation":
    return t("sourceGlobalAggregation", "Global aggregation");
  default:
    return t("sourceCurrentView", "Current view");
  }
}

function getSafetyBoundary(task: GovernanceTask): string {
  return t(task.safetyBoundaryKey, task.defaultSafetyBoundary);
}

function normalizeRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

async function readSource(pagePath: string, request: () => Promise<ListResponse>): Promise<TaskLoadResult> {
  try {
    const response = await request();
    const ok = response?.status === "ok";
    return {
      dataset: {
        pagePath,
        rows: ok ? normalizeRows(response.data) : [],
        totalRows: Number.isFinite(Number(response?.data2)) ? Number(response.data2) : normalizeRows(response.data).length,
        errorMessage: ok ? undefined : "source_unavailable",
      },
      errorPath: ok ? undefined : pagePath,
    };
  } catch (_error) {
    return {
      dataset: {
        pagePath,
        rows: [],
        errorMessage: "source_unavailable",
      },
      errorPath: pagePath,
    };
  }
}

async function loadTaskSources(account: GovernanceTaskCenterProps["account"]): Promise<{tasks: GovernanceTask[]; errors: string[]}> {
  const requestOrganization = Setting.getRequestOrganization(account);
  const organization = Setting.isDefaultOrganizationSelected(account) ? "" : requestOrganization;

  const [
    applications,
    providers,
    users,
    roles,
    tokens,
    records,
    agents,
  ] = await Promise.all([
    readSource("/applications", () => (
      Setting.isDefaultOrganizationSelected(account)
        ? ApplicationBackend.getApplications("admin", FIRST_PAGE, PAGE_SIZE)
        : ApplicationBackend.getApplicationsByOrganization("admin", requestOrganization, FIRST_PAGE, PAGE_SIZE)
    )),
    readSource("/providers", () => (
      Setting.isDefaultOrganizationSelected(account)
        ? ProviderBackend.getGlobalProviders(FIRST_PAGE, PAGE_SIZE)
        : ProviderBackend.getProviders(requestOrganization, FIRST_PAGE, PAGE_SIZE)
    )),
    readSource("/users", () => (
      Setting.isDefaultOrganizationSelected(account)
        ? UserBackend.getGlobalUsers(FIRST_PAGE, PAGE_SIZE)
        : UserBackend.getUsers(requestOrganization, FIRST_PAGE, PAGE_SIZE)
    )),
    readSource("/roles", () => RoleBackend.getRoles(organization, FIRST_PAGE, PAGE_SIZE)),
    readSource("/tokens", () => TokenBackend.getTokens("admin", organization, FIRST_PAGE, PAGE_SIZE)),
    readSource("/records", () => RecordBackend.getRecords(organization, FIRST_PAGE, PAGE_SIZE)),
    readSource("/agents", () => AgentBackend.getAgents(requestOrganization, FIRST_PAGE, PAGE_SIZE)),
  ]);

  return {
    tasks: buildGovernanceTasks({
      applications: applications.dataset,
      providers: providers.dataset,
      users: users.dataset,
      roles: roles.dataset,
      tokens: tokens.dataset,
      records: records.dataset,
      agents: agents.dataset,
    }),
    errors: [applications, providers, users, roles, tokens, records, agents]
      .map(result => result.errorPath)
      .filter((path): path is string => Boolean(path)),
  };
}

function buildTaskFilterOptions(tasks: GovernanceTask[]) {
  const objectTypes = Array.from(new Set(tasks.map(task => task.impactObject.type))).sort();

  return {
    objectTypes,
    taskTypes: Array.from(new Set(tasks.map(task => task.taskType))).sort(),
  };
}

function applySessionStatus(tasks: GovernanceTask[], sessionStatuses: SessionStatusMap): GovernanceTask[] {
  return tasks.map(task => ({
    ...task,
    status: sessionStatuses[task.key] || task.status,
  }));
}

const GovernanceTaskCenter = ({account, initialTasks, sourceErrors = EMPTY_SOURCE_ERRORS}: GovernanceTaskCenterProps): JSX.Element => {
  const [tasks, setTasks] = React.useState<GovernanceTask[]>(initialTasks || []);
  const [loading, setLoading] = React.useState(initialTasks === undefined);
  const [loadErrors, setLoadErrors] = React.useState<string[]>(sourceErrors);
  const [filter, setFilter] = React.useState<GovernanceTaskFilter>({
    type: "all",
    severity: "all",
    status: "all",
    sourceScope: "all",
    impactObjectType: "all",
    keyword: "",
  });
  const [sessionStatuses, setSessionStatuses] = React.useState<SessionStatusMap>({});
  const isAllowed = Setting.isLocalAdminUser(account);

  React.useEffect(() => {
    setLoadErrors(sourceErrors);
  }, [sourceErrors]);

  React.useEffect(() => {
    if (initialTasks !== undefined || !isAllowed) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadTaskSources(account).then((result) => {
      if (cancelled) {
        return;
      }
      setTasks(result.tasks);
      setLoadErrors(result.errors);
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account, initialTasks, isAllowed]);

  if (!isAllowed) {
    return (
      <Result
        status="403"
        title={t("permissionDeniedTitle", "No permission to view governance task center")}
        subTitle={t("permissionDeniedDescription", "Hidden tasks, objects, and evidence are not rendered for this account.")}
      />
    );
  }

  const effectiveTasks = applySessionStatus(tasks, sessionStatuses);
  const filterOptions = buildTaskFilterOptions(effectiveTasks);
  const filteredTasks = filterGovernanceTasks(effectiveTasks, filter);

  const updateFilter = (patch: Partial<GovernanceTaskFilter>) => {
    setFilter(previous => ({...previous, ...patch}));
  };

  const setTaskStatus = (task: GovernanceTask, status: GovernanceTaskStatus) => {
    setSessionStatuses(previous => ({...previous, [task.key]: status}));
  };

  return (
    <EnterpriseIdentityConsolePage
      className="governance-task-center"
      eyebrow={t("eyebrow", "Enterprise Identity / Risk Closure")}
      title={t("title", "Governance Task Center")}
      description={t("description", "Review identity risks, configuration gaps, and audit evidence entries from visible read-only sources.")}
      actions={(
        <Space wrap>
          <Link to="/applications"><Button icon={<AppstoreOutlined />}>{t("applicationAccess", "Application access")}</Button></Link>
          <Link to="/providers"><Button icon={<SafetyCertificateOutlined />}>{t("identitySources", "Identity sources")}</Button></Link>
          <Link to="/records"><Button type="primary" icon={<AuditOutlined />}>{t("auditEvidence", "Audit evidence")}</Button></Link>
        </Space>
      )}
    >
      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message={t("loading", "Loading governance tasks...")}
        />
      )}

      {loadErrors.length > 0 && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message={t("partialSourceUnavailable", "Some evidence entries are temporarily unavailable")}
          description={(
            <Space wrap>
              {loadErrors.map(path => <Tag key={path}>{path}</Tag>)}
            </Space>
          )}
        />
      )}

      <EnterpriseIdentitySection
        title={t("filtersTitle", "Task filters")}
        description={t("filtersDescription", "Filter current evidence candidates without saving processing state.")}
      >
        <div className="governance-task-filter-bar">
          <Input.Search
            allowClear
            placeholder={t("searchPlaceholder", "Search tasks, objects, or evidence")}
            value={filter.keyword}
            onChange={event => updateFilter({keyword: event.target.value})}
          />
          <Select
            value={filter.type || "all"}
            onChange={(value) => updateFilter({type: value})}
            options={[
              {value: "all", label: t("allTypes", "All types")},
              ...filterOptions.taskTypes.map(type => ({value: type, label: getTaskTypeLabel(type)})),
            ]}
          />
          <Select
            value={filter.severity || "all"}
            onChange={(value) => updateFilter({severity: value})}
            options={[
              {value: "all", label: t("allSeverities", "All severities")},
              {value: "high", label: getSeverityLabel("high")},
              {value: "medium", label: getSeverityLabel("medium")},
              {value: "low", label: getSeverityLabel("low")},
              {value: "info", label: getSeverityLabel("info")},
            ]}
          />
          <Select
            value={filter.status || "all"}
            onChange={(value: GovernanceTaskStatus | "all") => updateFilter({status: value})}
            options={[
              {value: "all", label: t("allStatuses", "All statuses")},
              {value: "pending_review", label: getStatusLabel("pending_review")},
              {value: "viewed", label: getStatusLabel("viewed")},
              {value: "session_ignored", label: getStatusLabel("session_ignored")},
              {value: "cannot_infer", label: getStatusLabel("cannot_infer")},
            ]}
          />
          <Select
            value={filter.sourceScope || "all"}
            onChange={(value) => updateFilter({sourceScope: value})}
            options={[
              {value: "all", label: t("allSources", "All sources")},
              {value: "current_object", label: t("sourceCurrentObject", "Current object")},
              {value: "current_view", label: t("sourceCurrentView", "Current view")},
              {value: "current_filter", label: t("sourceCurrentFilter", "Current filter")},
              {value: "read_only_review", label: t("sourceReadOnlyReview", "Evidence entry")},
            ]}
          />
          <Select
            value={filter.impactObjectType || "all"}
            onChange={(value: string | "all") => updateFilter({impactObjectType: value})}
            options={[
              {value: "all", label: t("allObjects", "All objects")},
              ...filterOptions.objectTypes.map(type => ({value: type, label: type})),
            ]}
          />
        </div>
      </EnterpriseIdentitySection>

      <EnterpriseIdentitySection
        title={t("queueTitle", "Governance queue")}
        description={t("queueDescription", "Tasks open existing configuration, detail, or evidence pages only.")}
        extra={<Text type="secondary">{t("taskCount", "{{count}} tasks", {count: filteredTasks.length})}</Text>}
      >
        {loading && filteredTasks.length === 0 && (
          <div className="governance-task-loading">
            <Spin />
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <Empty
            description={t("emptyTitle", "No tasks found in the current scope")}
          >
            <Space wrap>
              <Link to="/applications"><Button icon={<ApiOutlined />}>{t("enterApplicationAccess", "Enter application access")}</Button></Link>
              <Link to="/records"><Button icon={<AuditOutlined />}>{t("viewAuditEvidence", "View audit evidence")}</Button></Link>
            </Space>
          </Empty>
        )}

        {filteredTasks.length > 0 && (
          <div className="governance-task-list">
            {filteredTasks.map(task => {
              const sourceDisplay = getSourceScopeDisplay(task.source);
              return (
                <article className="governance-task-item" key={task.key}>
                  <div className="governance-task-item-main">
                    <Space direction="vertical" size={6} className="governance-task-copy">
                      <Space wrap size={[6, 4]}>
                        <Tag className={`enterprise-identity-tone-${getSeverityTone(task.severity)}`}>{getSeverityLabel(task.severity)}</Tag>
                        <Tag className={`enterprise-identity-tone-${getStatusTone(task.status)}`}>{getStatusLabel(task.status)}</Tag>
                        <Tag>{getDomainLabel(task.domain)}</Tag>
                        <Tag>{getSourceShortLabel(task.source.kind)}</Tag>
                      </Space>
                      <Title level={5}>{getTaskTypeLabel(task.taskType)}</Title>
                      <Text>
                        {task.impactObject.displayName}
                        <Text type="secondary"> · {task.impactObject.type}</Text>
                      </Text>
                      <Text type="secondary">{sourceDisplay.description}</Text>
                      <Text type="secondary">{getSafetyBoundary(task)}</Text>
                      <Space wrap size={[6, 4]}>
                        {task.redactionSummary.hiddenFields.length > 0
                          ? task.redactionSummary.hiddenFields.map(field => <Tag key={field}>{field}</Tag>)
                          : <Tag>{t("noRawCredential", "No raw credentials rendered")}</Tag>}
                      </Space>
                    </Space>
                    <Space direction="vertical" size={8} className="governance-task-actions">
                      <Link to={task.suggestedAction.to}>{getActionLabel(task)}</Link>
                      <span>
                        <Text>{t("evidenceEntry", "Evidence entry")}</Text>
                        {": "}
                        <Link to={task.evidenceEntry.to}>{getEvidenceLabel(task)}</Link>
                      </span>
                      <Space wrap>
                        <Button size="small" onClick={() => setTaskStatus(task, "viewed")}>
                          {t("markViewed", "Mark viewed")}
                        </Button>
                        <Button size="small" onClick={() => setTaskStatus(task, "session_ignored")}>
                          {t("ignoreSession", "Ignore in this session")}
                        </Button>
                      </Space>
                    </Space>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </EnterpriseIdentitySection>
    </EnterpriseIdentityConsolePage>
  );
};

export default GovernanceTaskCenter;
