import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  ClusterOutlined,
  DeploymentUnitOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import {Alert, Button, Descriptions, Empty, List, Result, Space, Tag, Typography} from "antd";
import React from "react";
import {Link} from "react-router-dom";
import i18next from "i18next";
import {
  EnterpriseIdentityConsolePage,
  EnterpriseIdentitySection
} from "./common/EnterpriseIdentityConsoleLayout";
import type {IdentityEvidenceAsset} from "./identityEvidenceChain";
import {buildIdentityEvidenceChainCatalog} from "./identityEvidenceChain";
import {getSourceScopeDisplay} from "./identityAssetRelationship";
import * as Setting from "./Setting";

const {Text, Title} = Typography;

interface IdentityEvidenceChainPageProps {
  account?: unknown;
  initialAssets?: IdentityEvidenceAsset[];
}

function t(key: string, defaultValue: string): string {
  const namespacedKey = `identityEvidenceChain:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return defaultValue;
  }

  return String(translated);
}

function getStatusTone(status: IdentityEvidenceAsset["relationships"][number]["status"]): string {
  switch (status) {
  case "ready":
    return "success";
  case "gap":
    return "warning";
  case "cannot_infer":
    return "default";
  default:
    return "processing";
  }
}

function getAssetIcon(category: IdentityEvidenceAsset["category"]): React.ReactNode {
  switch (category) {
  case "application":
    return <AppstoreOutlined />;
  case "auth_source":
    return <SafetyCertificateOutlined />;
  case "organization":
    return <TeamOutlined />;
  case "user":
    return <UserOutlined />;
  case "role_permission":
    return <ClusterOutlined />;
  case "gateway":
    return <DeploymentUnitOutlined />;
  default:
    return <AuditOutlined />;
  }
}

function renderSourceTag(asset: IdentityEvidenceAsset): JSX.Element {
  const display = getSourceScopeDisplay(asset.source);
  return <Tag className="enterprise-identity-tone-processing">{display.label}</Tag>;
}

const IdentityEvidenceChainPage = ({account, initialAssets}: IdentityEvidenceChainPageProps): JSX.Element => {
  if (!Setting.isLocalAdminUser(account)) {
    return (
      <Result
        status="403"
        title={t("No permission title", "无权查看身份资产关系")}
        subTitle={t("No permission description", "隐藏的身份资产、关系和证据入口不会为当前账号渲染。")}
      />
    );
  }

  const assets = initialAssets ?? buildIdentityEvidenceChainCatalog();
  const [selectedKey, setSelectedKey] = React.useState<string>(assets[0]?.object.id ?? "");
  const selectedAsset = assets.find(item => item.object.id === selectedKey) ?? assets[0];

  React.useEffect(() => {
    if (!assets.some(item => item.object.id === selectedKey)) {
      setSelectedKey(assets[0]?.object.id ?? "");
    }
  }, [assets, selectedKey]);

  return (
    <EnterpriseIdentityConsolePage
      className="identity-evidence-chain-page"
      eyebrow={t("Eyebrow", "企业认证中心 / 审计证据链")}
      title={t("Title", "身份资产关系")}
      description={t("Description", "从对象视角核对应用、认证源、组织身份、角色权限、Gateway/LLM AI 与审计证据入口。")}
      actions={(
        <Space wrap>
          <Link to="/governance-tasks"><Button icon={<AuditOutlined />}>{t("Governance tasks", "治理任务")}</Button></Link>
          <Link to="/access-wizard"><Button icon={<ApiOutlined />}>{t("Access preflight", "接入预检")}</Button></Link>
          <Link to="/records"><Button type="primary" icon={<AuditOutlined />}>{t("Audit records", "审计记录")}</Button></Link>
        </Space>
      )}
    >
      <Alert
        type="info"
        showIcon
        className="enterprise-identity-console-alert"
        message={t("Readonly boundary title", "只读证据链入口")}
        description={t("Readonly boundary description", "所有动作只跳转既有配置、诊断或审计页面，不执行认证、同步、授权刷新或 Gateway 变更动作。")}
      />

      {assets.length === 0 && (
        <Empty
          className="identity-evidence-chain-empty"
          description={t("Empty title", "当前范围暂无身份资产")}
        />
      )}

      {assets.length > 0 && selectedAsset && (
        <div className="identity-evidence-chain-layout">
          <aside className="identity-evidence-chain-selector" aria-label={t("Asset selector", "身份资产选择")}>
            {assets.map(asset => (
              <button
                type="button"
                className={`identity-evidence-chain-selector-item ${asset.object.id === selectedAsset.object.id ? "identity-evidence-chain-selector-item-active" : ""}`}
                key={asset.object.id}
                onClick={() => setSelectedKey(asset.object.id)}
              >
                <span className={`identity-evidence-chain-selector-icon enterprise-identity-tone-${asset.tone}`}>{getAssetIcon(asset.category)}</span>
                <span className="identity-evidence-chain-selector-copy">
                  <span>{asset.object.displayName}</span>
                  <Text type="secondary">{asset.summary}</Text>
                </span>
              </button>
            ))}
          </aside>

          <main className="identity-evidence-chain-detail">
            <EnterpriseIdentitySection
              title={t("Object detail", "对象详情")}
              description={t("Object detail description", "标明对象类型、作用域、来源和当前风险处理入口。")}
              extra={renderSourceTag(selectedAsset)}
            >
              <div className="identity-evidence-chain-object-header">
                <span className={`identity-evidence-chain-object-icon enterprise-identity-tone-${selectedAsset.tone}`}>
                  {getAssetIcon(selectedAsset.category)}
                </span>
                <Space direction="vertical" size={2}>
                  <Text type="secondary">{selectedAsset.object.type}</Text>
                  <Title level={4}>{selectedAsset.object.displayName}</Title>
                  <Text type="secondary">{selectedAsset.summary}</Text>
                </Space>
              </div>
              <Descriptions size="small" bordered column={1}>
                <Descriptions.Item label={t("Object id", "对象标识")}>{selectedAsset.object.id}</Descriptions.Item>
                <Descriptions.Item label={t("Organization scope", "组织/作用域")}>{selectedAsset.object.organization}</Descriptions.Item>
                <Descriptions.Item label={t("Current status", "当前状态")}>{selectedAsset.object.status}</Descriptions.Item>
                <Descriptions.Item label={t("Source page", "来源页面")}>{selectedAsset.source.pagePath}</Descriptions.Item>
              </Descriptions>
            </EnterpriseIdentitySection>

            <div className="identity-evidence-chain-detail-grid">
              <EnterpriseIdentitySection
                title={t("Relationship evidence chain", "关系与证据链")}
                description={t("Relationship evidence description", "按对象展示当前可核对的绑定关系、授权关系和运行健康。")}
              >
                <List
                  size="small"
                  dataSource={selectedAsset.relationships}
                  renderItem={item => (
                    <List.Item>
                      <Space direction="vertical" size={4} className="identity-evidence-chain-list-item">
                        <Space wrap size={[6, 4]}>
                          <Text strong>{item.label}</Text>
                          <Tag className={`enterprise-identity-tone-${getStatusTone(item.status)}`}>{item.value}</Tag>
                          <Tag>{getSourceScopeDisplay(item.source).label}</Tag>
                        </Space>
                        <Text type="secondary">{item.description}</Text>
                        {item.to && <Link to={item.to}>{t("Open related page", "进入相关页面")}</Link>}
                      </Space>
                    </List.Item>
                  )}
                />
              </EnterpriseIdentitySection>

              <EnterpriseIdentitySection
                title={t("Audit evidence entry", "审计证据入口")}
                description={t("Audit evidence description", "只跳转现有审计、令牌、验证、同步诊断或网关映射页面。")}
              >
                <List
                  size="small"
                  dataSource={selectedAsset.evidenceEntries}
                  renderItem={entry => (
                    <List.Item>
                      <Space direction="vertical" size={4} className="identity-evidence-chain-list-item">
                        <Space wrap size={[6, 4]}>
                          <Link to={entry.to}>{entry.label}</Link>
                          <Tag>{getSourceScopeDisplay(entry.source).label}</Tag>
                        </Space>
                        <Text type="secondary">{entry.description}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </EnterpriseIdentitySection>
            </div>

            <EnterpriseIdentitySection
              title={t("Risk handling", "风险处理")}
              description={t("Risk handling description", "信息不足时给出可执行的核对入口，不把当前视图推断为全局事实。")}
            >
              <Space direction="vertical" size={8} className="identity-evidence-chain-list-item">
                {selectedAsset.cannotInfer.map(item => (
                  <Alert
                    key={item.reason}
                    type="warning"
                    showIcon
                    message={t("Current object information is insufficient", "当前对象信息不足")}
                    description={(
                      <span>
                        {item.message}
                        {item.safeNextAction && <> <Link to={item.safeNextAction.to}>{item.safeNextAction.label}</Link></>}
                      </span>
                    )}
                  />
                ))}
                <Alert
                  type="success"
                  showIcon
                  message={selectedAsset.redactionSummary.note}
                  description={t("Redaction description", "页面不展示 token、Cookie、client secret、私钥、完整连接串或完整私有 URL。")}
                />
              </Space>
            </EnterpriseIdentitySection>
          </main>
        </div>
      )}
    </EnterpriseIdentityConsolePage>
  );
};

export default IdentityEvidenceChainPage;
