import React from "react";
import {Alert, Descriptions, Drawer, Empty, List, Result, Space, Tag, Typography} from "antd";
import {Link} from "react-router-dom";
import i18next from "i18next";
import type {IdentityAssetDetail} from "./identityAssetRelationship";
import {getSourceScopeDisplay} from "./identityAssetRelationship";

const {Text, Title} = Typography;

type RelationshipStatus = IdentityAssetDetail["relationships"][number]["status"];
type RelationshipSource = IdentityAssetDetail["source"];

type Props = {
  open: boolean;
  asset?: IdentityAssetDetail | null;
  onClose: () => void;
};

function t(key: string, defaultValue: string): string {
  const namespacedKey = `identityAssetRelationship:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  if (translated === undefined || translated === null || translated === namespacedKey || translated === key) {
    return defaultValue;
  }
  return String(translated);
}

function getStatusTone(status: RelationshipStatus): string {
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

function renderSourceTag(source: RelationshipSource): JSX.Element {
  const display = getSourceScopeDisplay(source);
  return <Tag className={`enterprise-identity-tone-${display.kind === "current_filter" ? "warning" : "processing"}`}>{display.label}</Tag>;
}

const IdentityAssetRelationshipDrawer = ({open, asset, onClose}: Props): JSX.Element => {
  const sourceDisplay = asset ? getSourceScopeDisplay(asset.source) : null;

  return (
    <Drawer
      className="identity-asset-relationship-drawer"
      title={t("Identity asset object context", "Identity asset object context")}
      width="min(640px, 100vw)"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {!asset && (
        <Empty description={t("No selected identity asset", "No selected identity asset")} />
      )}

      {asset?.permission?.allowed === false && (
        <Result
          status="403"
          title={t("No permission to view asset relationships", "No permission to view asset relationships")}
          subTitle={t("Hidden relationship details are not rendered", "Hidden object names, relationships, and evidence are not rendered here.")}
        />
      )}

      {asset && asset.permission?.allowed !== false && (
        <Space direction="vertical" size={16} style={{width: "100%"}}>
          <div>
            <Text type="secondary">{asset.object.type}</Text>
            <Title level={4} style={{marginTop: 4, marginBottom: 0}}>
              {asset.object.displayName}
            </Title>
          </div>

          {sourceDisplay && (
            <Alert
              type="info"
              showIcon
              message={sourceDisplay.label}
              description={sourceDisplay.description}
            />
          )}

          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label={t("Object type", "Object type")}>{asset.object.type}</Descriptions.Item>
            <Descriptions.Item label={t("Object id", "Object ID")}>{asset.object.id}</Descriptions.Item>
            <Descriptions.Item label={t("Organization scope", "Organization scope")}>{asset.object.organization || "-"}</Descriptions.Item>
            <Descriptions.Item label={t("Current status", "Current status")}>{asset.object.status || "-"}</Descriptions.Item>
            <Descriptions.Item label={t("Source page", "Source page")}>{asset.source.pagePath}</Descriptions.Item>
          </Descriptions>

          <section>
            <Space direction="vertical" size={8} style={{width: "100%"}}>
              <Text strong>{t("Relationship list", "Current-view relationships")}</Text>
              <List
                size="small"
                locale={{emptyText: t("No relationship in current view", "No relationship in current view")}}
                dataSource={asset.relationships}
                renderItem={item => (
                  <List.Item>
                    <Space direction="vertical" size={3} style={{width: "100%"}}>
                      <Space wrap size={[6, 4]}>
                        <Text strong>{item.label}</Text>
                        <Tag className={`enterprise-identity-tone-${getStatusTone(item.status)}`}>{item.value}</Tag>
                        {renderSourceTag(item.source)}
                      </Space>
                      {item.description && <Text type="secondary">{item.description}</Text>}
                      {item.to && <Link to={item.to}>{t("Open related page", "Open related page")}</Link>}
                    </Space>
                  </List.Item>
                )}
              />
            </Space>
          </section>

          <section>
            <Space direction="vertical" size={8} style={{width: "100%"}}>
              <Text strong>{t("Timeline and evidence", "Timeline / audit evidence entry")}</Text>
              <List
                size="small"
                dataSource={asset.evidenceEntries}
                renderItem={entry => (
                  <List.Item>
                    <Space direction="vertical" size={3}>
                      <Space wrap size={[6, 4]}>
                        <Link to={entry.to}>{entry.label}</Link>
                        {renderSourceTag(entry.source)}
                      </Space>
                      <Text type="secondary">{entry.description}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </Space>
          </section>

          {asset.cannotInfer.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={t("Current object information is insufficient", "Current object information is insufficient")}
              description={(
                <Space direction="vertical" size={4}>
                  {asset.cannotInfer.map(item => (
                    <span key={item.reason}>
                      {item.message}
                      {item.safeNextAction && <>: <Link to={item.safeNextAction.to}>{item.safeNextAction.label}</Link></>}
                    </span>
                  ))}
                </Space>
              )}
            />
          )}

          <Alert
            type="success"
            showIcon
            message={asset.redactionSummary.note || t("Sensitive values are hidden", "Sensitive values are hidden")}
            description={(
              <Space wrap>
                {(asset.redactionSummary.hiddenFields.length > 0 ? asset.redactionSummary.hiddenFields : ["none"]).map(field => (
                  <Tag key={field}>{field === "none" ? t("No raw credentials rendered", "No raw credentials rendered") : field}</Tag>
                ))}
              </Space>
            )}
          />
        </Space>
      )}
    </Drawer>
  );
};

export default IdentityAssetRelationshipDrawer;
