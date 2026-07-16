import React from "react";
import {Alert, Select, Space, Table, Tag, Typography} from "antd";
import i18next from "i18next";
import * as Setting from "./Setting";
import {isRetiredWeb3WalletProvider} from "./auth/Web3WalletRetirement";

type ProviderCategory = "OAuth" | "SAML" | string;

export type IdentityProvider = {
  name?: string;
  category?: ProviderCategory;
  type?: string;
  displayName?: string;
};

export type ApplicationProviderBinding = {
  name?: string;
  targetOrganization?: string;
  provider?: IdentityProvider;
};

export type OrganizationOption = {
  name?: string;
  displayName?: string;
};

export type IdentitySourceApplication = {
  organization?: string;
  providers?: ApplicationProviderBinding[];
};

export type IdentitySourceBindingRow = ApplicationProviderBinding & {
  key: string;
  bindingIndex: number;
  provider?: IdentityProvider;
  effectiveOrganization: string;
  isTargetOrganizationMissing: boolean;
};

type Props = {
  application?: IdentitySourceApplication | null;
  providers?: IdentityProvider[];
  organizations?: OrganizationOption[];
  onChange: (providers: ApplicationProviderBinding[]) => void;
};

const loginProviderCategories = new Set(["OAuth", "SAML"]);

function normalizeText(value?: string): string {
  return (value || "").trim();
}

// 单测环境未初始化 i18next 时，显式使用默认文案，避免新 TSX 组件渲染出 undefined。
function t(key: string, defaultValue: string, options: Record<string, string> = {}): string {
  const translated = i18next.t(key, {defaultValue, ...options});
  if (translated === undefined || translated === null || translated === key) {
    return defaultValue;
  }
  return String(translated);
}

function resolveProvider(binding: ApplicationProviderBinding, providers: IdentityProvider[]): IdentityProvider | undefined {
  return binding.provider || providers.find(provider => normalizeText(provider.name) === normalizeText(binding.name));
}

function isLoginProvider(binding: ApplicationProviderBinding, providers: IdentityProvider[]): boolean {
  const provider = resolveProvider(binding, providers);
  return loginProviderCategories.has(normalizeText(provider?.category)) && !isRetiredWeb3WalletProvider(provider);
}

// buildIdentitySourceBindingRows 只展示未退役的 OAuth/SAML 登录身份源；targetOrganization 为空时登录链路会 fail closed。
export function buildIdentitySourceBindingRows(
  application?: IdentitySourceApplication | null,
  providers: IdentityProvider[] = []
): IdentitySourceBindingRow[] {
  return (application?.providers || [])
    .map((binding, index) => ({binding, index}))
    .filter(({binding}) => isLoginProvider(binding, providers))
    .map(({binding, index}) => {
      const targetOrganization = normalizeText(binding.targetOrganization);
      return {
        ...binding,
        key: `${binding.name || "provider"}-${index}`,
        bindingIndex: index,
        provider: resolveProvider(binding, providers),
        targetOrganization,
        effectiveOrganization: targetOrganization,
        isTargetOrganizationMissing: targetOrganization === "",
      };
    });
}

// Provider 表格会过滤非登录类 provider，更新时必须写回原 providers 数组中的原始下标。
export function updateIdentitySourceBindingTarget(
  bindings: ApplicationProviderBinding[] = [],
  index: number,
  targetOrganization: string
): ApplicationProviderBinding[] {
  return bindings.map((binding, currentIndex) => {
    if (currentIndex !== index) {
      return binding;
    }
    return {
      ...binding,
      targetOrganization: normalizeText(targetOrganization),
    };
  });
}

const ApplicationIdentitySourceBindings = ({application, providers = [], organizations = [], onChange}: Props): JSX.Element => {
  const bindings = application?.providers || [];
  const rows = buildIdentitySourceBindingRows(application, providers);
  const hasMissingTargetOrganization = rows.some(row => row.isTargetOrganizationMissing);

  if (rows.length === 0) {
    return (
      <Alert
        style={{marginTop: 12}}
        type="info"
        showIcon
        message={t("application:No configurable login identity sources", "暂无可配置的登录身份源")}
        description={t(
          "application:Enable OAuth or SAML providers to bind target organizations",
          "启用 OAuth 或 SAML Provider 后，可在这里为每个登录身份源指定目标组织。"
        )}
      />
    );
  }

  return (
    <div style={{marginTop: 16}}>
      <Space direction="vertical" size={8} style={{width: "100%"}}>
        <Typography.Text strong>{t("application:Provider identity source target organization", "Provider 身份源目标组织")}</Typography.Text>
        <Typography.Text type="secondary">
          {t(
            "application:Application organization is ownership and fallback while target organization controls provider user lookup",
            "应用组织仅用于应用归属；每个外部登录 Provider 必须显式绑定目标组织，否则扫码登录会失败。"
          )}
        </Typography.Text>
        {hasMissingTargetOrganization ? (
          <Alert
            type="warning"
            showIcon
            message={t("application:Provider target organization is required", "Provider 目标组织必填")}
            description={t(
              "application:Provider sign-in fails when target organization is missing",
              "企业微信、飞书/Lark、钉钉或 SAML 登录不会再沿用应用组织；请为每个登录 Provider 选择与同步配置一致的目标组织。"
            )}
          />
        ) : null}
        <Table
          size="small"
          rowKey="key"
          pagination={false}
          scroll={{x: "max-content"}}
          dataSource={rows}
          columns={[
            {
              title: t("general:Provider", "Provider"),
              dataIndex: "name",
              key: "name",
              width: 220,
              render: (_value: string, row: IdentitySourceBindingRow) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text style={{maxWidth: 280}} ellipsis={{tooltip: row.name}}>
                    {row.name}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {[row.provider?.type, row.provider?.displayName].filter(Boolean).join(" / ") ||
                      row.provider?.category ||
                      t("application:Login Provider", "登录 Provider")}
                  </Typography.Text>
                </Space>
              ),
            },
            {
              title: Setting.getLabel(
                t("application:Target organization", "目标组织"),
                t("application:Target organization - Tooltip", "显式指定该 Provider 登录时查找用户的组织。")
              ),
              dataIndex: "targetOrganization",
              key: "targetOrganization",
              width: 280,
              render: (_value: string, row: IdentitySourceBindingRow) => (
                <Select
                  virtual={false}
                  style={{width: "100%"}}
                  value={row.targetOrganization}
                  onChange={(value: string) => onChange(updateIdentitySourceBindingTarget(bindings, row.bindingIndex, value))}
                  options={[
                    {
                      value: "",
                      label: t("application:Provider target organization not configured", "目标组织未配置"),
                      disabled: true,
                    },
                    ...organizations
                      .filter(organization => normalizeText(organization.name) !== "")
                      .map(organization => ({
                        value: normalizeText(organization.name),
                        label: organization.displayName && organization.displayName !== organization.name
                          ? `${organization.name} (${organization.displayName})`
                          : organization.name,
                      })),
                  ]}
                />
              ),
            },
            {
              title: Setting.getLabel(
                t("application:Effective organization", "生效组织"),
                t("application:Effective organization - Tooltip", "实际用于匹配用户的组织；未配置时 Provider 登录会失败。")
              ),
              dataIndex: "effectiveOrganization",
              key: "effectiveOrganization",
              width: 220,
              render: (value: string, row: IdentitySourceBindingRow) => (
                <Space>
                  <Typography.Text type={row.isTargetOrganizationMissing ? "danger" : undefined}>
                    {value || t("application:Provider target organization not configured", "目标组织未配置")}
                  </Typography.Text>
                  {row.isTargetOrganizationMissing
                    ? <Tag color="warning">{t("application:Required", "必填")}</Tag>
                    : <Tag color="blue">{t("application:Explicit binding", "显式绑定")}</Tag>}
                </Space>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
};

export default ApplicationIdentitySourceBindings;
