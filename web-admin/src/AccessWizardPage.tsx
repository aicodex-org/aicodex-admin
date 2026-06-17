import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  DeploymentUnitOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {Alert, Button, Empty, Result, Space, Spin, Steps, Tag, Typography} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
import * as AgentBackend from "./backend/AgentBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";
import {getSourceScopeDisplay} from "./identityAssetRelationship";
import {
  type AccessWizardDomain,
  type AccessWizardPlan,
  type AccessWizardSourceDataset,
  buildAccessWizardPlans
} from "./identityAccessWizard";
import * as Setting from "./Setting";

const {Text, Title} = Typography;
const FIRST_PAGE = "1";
const PAGE_SIZE = "20";
const EMPTY_SOURCE_ERRORS: string[] = [];
type AccessWizardBlockerItem = AccessWizardPlan["blockers"][number];

interface AccessWizardPageProps {
  account?: {
    owner?: string;
    name?: string;
    isAdmin?: boolean;
    organization?: unknown;
  } | null;
  initialPlans?: AccessWizardPlan[];
  sourceErrors?: string[];
}

interface ListResponse {
  status?: string;
  data?: unknown;
  data2?: unknown;
  msg?: unknown;
}

interface AccessWizardLoadResult {
  dataset: AccessWizardSourceDataset;
  errorPath?: string;
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)), template);
}

function t(key: string, defaultValue: string, values?: Record<string, string | number>): string {
  const namespacedKey = `accessWizard:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue, ...(values ?? {})});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return interpolate(defaultValue, values);
  }

  return interpolate(String(translated), values);
}

function normalizeRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

async function readSource(pagePath: string, request: () => Promise<ListResponse>): Promise<AccessWizardLoadResult> {
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

async function loadWizardSources(account: AccessWizardPageProps["account"]): Promise<{plans: AccessWizardPlan[]; errors: string[]}> {
  const requestOrganization = Setting.getRequestOrganization(account);

  const [providers, applications, agents] = await Promise.all([
    readSource("/providers", () => (
      Setting.isDefaultOrganizationSelected(account)
        ? ProviderBackend.getGlobalProviders(FIRST_PAGE, PAGE_SIZE)
        : ProviderBackend.getProviders(requestOrganization, FIRST_PAGE, PAGE_SIZE)
    )),
    readSource("/applications", () => (
      Setting.isDefaultOrganizationSelected(account)
        ? ApplicationBackend.getApplications("admin", FIRST_PAGE, PAGE_SIZE)
        : ApplicationBackend.getApplicationsByOrganization("admin", requestOrganization, FIRST_PAGE, PAGE_SIZE)
    )),
    readSource("/agents", () => AgentBackend.getAgents(requestOrganization, FIRST_PAGE, PAGE_SIZE)),
  ]);

  return {
    plans: buildAccessWizardPlans({
      providers: providers.dataset,
      applications: applications.dataset,
      agents: agents.dataset,
    }),
    errors: [providers, applications, agents]
      .map(result => result.errorPath)
      .filter((path): path is string => Boolean(path)),
  };
}

function getDomainIcon(domain: AccessWizardDomain): React.ReactNode {
  if (domain === "application_access") {
    return <AppstoreOutlined />;
  }

  if (domain === "llm_ai_gateway") {
    return <DeploymentUnitOutlined />;
  }

  return <SafetyCertificateOutlined />;
}

function getStatusTone(status: AccessWizardPlan["resultStatus"]): "success" | "warning" | "default" {
  if (status === "ready") {
    return "success";
  }

  if (status === "cannot_infer") {
    return "default";
  }

  return "warning";
}

function getStatusLabel(status: AccessWizardPlan["resultStatus"]): string {
  if (status === "ready") {
    return t("statusReady", "可继续");
  }

  if (status === "cannot_infer") {
    return t("statusCannotInfer", "无法推断");
  }

  return t("statusBlocked", "存在缺口");
}

function getBlockerLabel(blocker: AccessWizardBlockerItem): string {
  return t(blocker.labelKey, blocker.defaultLabel);
}

function getBlockerDescription(blocker: AccessWizardBlockerItem): string {
  return t(blocker.descriptionKey, blocker.defaultDescription);
}

function getSourceOfTruthLabel(sourceOfTruth: string): string {
  const labels: Record<string, string> = {
    "provider.visible_row.configuration": t("sourceAuthSourceVisibleConfig", "当前认证源配置证据"),
    "provider.visible_scope.empty": t("sourceAuthSourceEmpty", "当前认证源范围"),
    "application.visible_row.client_callback_scope_provider": t("sourceApplicationVisibleConfig", "当前应用接入配置证据"),
    "application.visible_scope.empty": t("sourceApplicationEmpty", "当前应用接入范围"),
    "agent.visible_row.application_url_mapping": t("sourceGatewayVisibleConfig", "当前 LLM AI/Gateway 配置证据"),
    "agent.visible_scope.empty": t("sourceGatewayEmpty", "当前 LLM AI/Gateway 范围"),
    "source_unavailable": t("sourceUnavailableLabel", "证据入口暂不可用"),
  };

  return labels[sourceOfTruth] || sourceOfTruth;
}

const AccessWizardPage = ({account, initialPlans, sourceErrors = EMPTY_SOURCE_ERRORS}: AccessWizardPageProps): JSX.Element => {
  const [plans, setPlans] = React.useState<AccessWizardPlan[]>(initialPlans || []);
  const [loading, setLoading] = React.useState(initialPlans === undefined);
  const [loadErrors, setLoadErrors] = React.useState<string[]>(sourceErrors);
  const [selectedDomain, setSelectedDomain] = React.useState<AccessWizardDomain>("auth_source");
  const [currentStep, setCurrentStep] = React.useState(0);
  const [showResult, setShowResult] = React.useState(false);
  const isAllowed = Setting.isLocalAdminUser(account);

  React.useEffect(() => {
    setLoadErrors(sourceErrors);
  }, [sourceErrors]);

  React.useEffect(() => {
    if (initialPlans !== undefined || !isAllowed) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadWizardSources(account).then((result) => {
      if (cancelled) {
        return;
      }
      setPlans(result.plans);
      setLoadErrors(result.errors);
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [account, initialPlans, isAllowed]);

  React.useEffect(() => {
    if (plans.length === 0) {
      return;
    }

    if (!plans.some(plan => plan.domain === selectedDomain)) {
      setSelectedDomain(plans[0].domain);
    }
  }, [plans, selectedDomain]);

  if (!isAllowed) {
    return (
      <Result
        status="403"
        title={t("permissionDeniedTitle", "无权查看接入预检中心")}
        subTitle={t("permissionDeniedDescription", "隐藏的接入对象、配置缺口和证据入口不会为当前账号渲染。")}
      />
    );
  }

  const selectedPlan = plans.find(plan => plan.domain === selectedDomain) || plans[0];
  const selectedStep = selectedPlan?.steps[currentStep] || selectedPlan?.steps[0];
  const stepItems = selectedPlan?.steps.map(step => ({
    title: t(step.labelKey, step.defaultLabel),
    status: step.status,
  })) || [];
  const sourceDisplay = selectedPlan ? getSourceScopeDisplay(selectedPlan.source) : null;

  const selectPlan = (domain: AccessWizardDomain) => {
    setSelectedDomain(domain);
    setCurrentStep(0);
    setShowResult(false);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setShowResult(false);
  };

  return (
    <EnterpriseIdentityConsolePage
      className="access-wizard-page"
      eyebrow={t("eyebrow", "企业认证中心 / 接入预检")}
      title={t("title", "接入预检中心")}
      description={t("description", "按认证源、应用接入和 LLM AI/Gateway 三个接入域核对配置缺口、证据入口和发布前条件。")}
      actions={(
        <Space wrap>
          <Link to="/providers"><Button icon={<SafetyCertificateOutlined />}>{t("identitySources", "认证源")}</Button></Link>
          <Link to="/applications"><Button icon={<AppstoreOutlined />}>{t("applicationListEntry", "应用列表")}</Button></Link>
          <Link to="/platform-api-mappings"><Button type="primary" icon={<ApiOutlined />}>{t("gatewayMapping", "身份映射")}</Button></Link>
        </Space>
      )}
    >
      {loading && (
        <Alert
          className="enterprise-identity-console-alert"
          type="info"
          showIcon
          message={t("loading", "正在加载接入预检...")}
        />
      )}

      {loadErrors.length > 0 && (
        <Alert
          className="enterprise-identity-console-alert"
          type="warning"
          showIcon
          message={t("partialSourceUnavailable", "部分证据入口暂不可用")}
          description={(
            <Space wrap>
              {loadErrors.map(path => <Tag key={path}>{path}</Tag>)}
            </Space>
          )}
        />
      )}

      {plans.length === 0 && !loading && (
        <EnterpriseIdentitySection
          title={t("emptyTitle", "当前范围暂无可预检对象")}
          description={t("emptyDescription", "接入向导不会创建默认对象，请从既有列表选择或创建后再核对。")}
        >
          <Empty description={t("emptyTitle", "当前范围暂无可预检对象")}>
            <Space wrap>
              <Link to="/providers"><Button icon={<SafetyCertificateOutlined />}>{t("enterIdentitySources", "进入认证源")}</Button></Link>
              <Link to="/applications"><Button icon={<AppstoreOutlined />}>{t("enterApplications", "进入应用接入")}</Button></Link>
            </Space>
          </Empty>
        </EnterpriseIdentitySection>
      )}

      {plans.length > 0 && (
        <React.Fragment>
          <div className="access-wizard-domain-grid">
            {plans.map(plan => (
              <button
                type="button"
                className={`access-wizard-domain-card ${selectedDomain === plan.domain ? "access-wizard-domain-card-active" : ""}`}
                key={plan.domain}
                onClick={() => selectPlan(plan.domain)}
              >
                <span className="access-wizard-domain-icon">{getDomainIcon(plan.domain)}</span>
                <span className="access-wizard-domain-copy">
                  <Text strong>{t(plan.titleKey, plan.defaultTitle)}</Text>
                  <Text type="secondary">{t(plan.descriptionKey, plan.defaultDescription)}</Text>
                </span>
                <span className={`access-wizard-domain-status enterprise-identity-tone-${getStatusTone(plan.resultStatus)}`}>
                  {getStatusLabel(plan.resultStatus)}
                </span>
                <span className="access-wizard-domain-meta">
                  <Text type="secondary">{plan.object.displayName}</Text>
                  <Text type="secondary">{t("stepCount", "{{count}} 项步骤", {count: plan.steps.length})}</Text>
                </span>
              </button>
            ))}
          </div>

          {selectedPlan && (
            <div className="access-wizard-detail-grid">
              <EnterpriseIdentitySection
                title={`${t(selectedPlan.titleKey, selectedPlan.defaultTitle)}${t("flowSuffix", "流程")}`}
                description={sourceDisplay?.description}
                extra={<Tag className={`enterprise-identity-tone-${getStatusTone(selectedPlan.resultStatus)}`}>{getStatusLabel(selectedPlan.resultStatus)}</Tag>}
              >
                <Steps
                  current={currentStep}
                  size="small"
                  responsive
                  items={stepItems}
                  onChange={goToStep}
                />

                <div className="access-wizard-step-panel">
                  <Space direction="vertical" size={8}>
                    <Text type="secondary">{t("currentStep", "当前步骤")}</Text>
                    <Title level={5}>{selectedStep ? t(selectedStep.labelKey, selectedStep.defaultLabel) : "-"}</Title>
                    <Text>{selectedStep ? t(selectedStep.descriptionKey, selectedStep.defaultDescription) : ""}</Text>
                    <Space wrap>
                      <Tag>{t(selectedPlan.preflightSummary.scopeLabelKey, selectedPlan.preflightSummary.defaultScopeLabel)}</Tag>
                      <Tag>{t("checkedCount", "已检查 {{count}} 项", {count: selectedPlan.preflightSummary.checkedCount})}</Tag>
                      <Tag>{t("blockedCount", "阻塞 {{count}} 项", {count: selectedPlan.preflightSummary.blockedCount})}</Tag>
                      {selectedPlan.preflightSummary.cannotInferCount > 0 && (
                        <Tag>{t("cannotInferCount", "无法推断 {{count}} 项", {count: selectedPlan.preflightSummary.cannotInferCount})}</Tag>
                      )}
                    </Space>
                  </Space>
                </div>

                <Space wrap className="access-wizard-step-actions">
                  <Button disabled={currentStep === 0} onClick={() => goToStep(Math.max(0, currentStep - 1))}>
                    {t("previousStep", "上一步")}
                  </Button>
                  <Button disabled={currentStep >= selectedPlan.steps.length - 1} onClick={() => goToStep(Math.min(selectedPlan.steps.length - 1, currentStep + 1))}>
                    {t("nextStep", "下一步")}
                  </Button>
                  <Button onClick={() => goToStep(4)}>{t("viewEnableReview", "查看发布前核对")}</Button>
                  <Button type="primary" onClick={() => setShowResult(true)}>{t("resultSummary", "结果摘要")}</Button>
                  <Link to={selectedPlan.returnTo}>{t("cancelReturn", "取消并返回来源")}</Link>
                </Space>
              </EnterpriseIdentitySection>

              <EnterpriseIdentitySection
                title={t("configurationGaps", "配置缺口")}
                description={t("configurationGapsDescription", "缺口只用于发布前核对，不保存处理状态。")}
              >
                <div className="access-wizard-check-list">
                  {selectedPlan.blockers.length === 0 && (
                    <Alert type="success" showIcon message={t("noBlockingGaps", "当前范围未发现阻塞项")} />
                  )}
                  {selectedPlan.blockers.map(item => (
                    <article className="access-wizard-check-item" key={item.key}>
                      <Space wrap>
                        <Tag>{item.severity}</Tag>
                        <Tag>{item.kind === "cannot_infer" ? t("statusCannotInfer", "无法推断") : t("configurationGaps", "配置缺口")}</Tag>
                      </Space>
                      <Text strong>{getBlockerLabel(item)}</Text>
                      <Text type="secondary">{getBlockerDescription(item)}</Text>
                      <Link to={item.evidenceTo}>{t("viewEvidence", "查看证据")}</Link>
                    </article>
                  ))}
                </div>
              </EnterpriseIdentitySection>

              <EnterpriseIdentitySection
                title={t("evidenceEntries", "证据入口")}
                description={t("evidenceEntriesDescription", "仅跳转既有配置、审计或映射页面，不执行认证、同步或 Gateway 发布。")}
              >
                <div className="access-wizard-link-list">
                  {selectedPlan.evidenceEntries.map(item => (
                    <Link to={item.to} key={item.key}>
                      <AuditOutlined />
                      <span>
                        <Text>{t(item.labelKey, item.defaultLabel)}</Text>
                        <Text type="secondary">{t(item.descriptionKey, item.defaultDescription)}</Text>
                      </span>
                    </Link>
                  ))}
                </div>
              </EnterpriseIdentitySection>

              <EnterpriseIdentitySection
                title={t("safeNextActions", "下一步只读入口")}
                description={t(selectedPlan.safetyBoundary.labelKey, selectedPlan.safetyBoundary.defaultLabel)}
              >
                <Space wrap>
                  {selectedPlan.safeNextActions.map(item => (
                    <Link to={item.to} key={item.key}>
                      {t(item.labelKey, item.defaultLabel)}
                    </Link>
                  ))}
                </Space>
                <div className="access-wizard-safety-boundary">
                  {selectedPlan.safetyBoundary.forbiddenExecutions.map(item => <Tag key={item}>{t(`forbidden_${item}`, item)}</Tag>)}
                </div>
              </EnterpriseIdentitySection>

              {showResult && (
                <EnterpriseIdentitySection
                  title={t("resultSummary", "结果摘要")}
                  description={t("resultSummaryDescription", "结果只代表当前对象、当前视图或当前证据入口的只读预检。")}
                >
                  <div className="access-wizard-result-summary">
                    <Tag className={`enterprise-identity-tone-${getStatusTone(selectedPlan.resultStatus)}`}>{getStatusLabel(selectedPlan.resultStatus)}</Tag>
                    <Text strong>{t("redactedSummary", "脱敏摘要")}</Text>
                    <Text type="secondary">
                      {selectedPlan.redactionSummary.hiddenFields.length > 0
                        ? t("hiddenFields", "已隐藏 {{count}} 类敏感字段", {count: selectedPlan.redactionSummary.hiddenFields.length})
                        : t("noRawCredential", "未渲染原始凭据")}
                    </Text>
                    <Space wrap>
                      {selectedPlan.redactionSummary.hiddenFields.length > 0
                        ? selectedPlan.redactionSummary.hiddenFields.map(field => <Tag key={field}>{field}</Tag>)
                        : <Tag>{t("noRawCredential", "未渲染原始凭据")}</Tag>}
                    </Space>
                    <Text type="secondary">{t("sourceOfTruth", "证据口径")}: {getSourceOfTruthLabel(selectedPlan.sourceOfTruth)}</Text>
                  </div>
                </EnterpriseIdentitySection>
              )}
            </div>
          )}

          {loading && (
            <div className="governance-task-loading">
              <Spin />
            </div>
          )}
        </React.Fragment>
      )}
    </EnterpriseIdentityConsolePage>
  );
};

export default AccessWizardPage;
