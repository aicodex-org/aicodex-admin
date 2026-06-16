import React from "react";
import {Alert, Select, Space, Table, Tag, Typography} from "antd";
import i18next from "i18next";

type ProviderCategory = "OAuth" | "Web3" | "SAML" | string;

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
  usesFallback: boolean;
};

type Props = {
  application?: IdentitySourceApplication | null;
  providers?: IdentityProvider[];
  organizations?: OrganizationOption[];
  onChange: (providers: ApplicationProviderBinding[]) => void;
};

const loginProviderCategories = new Set(["OAuth", "Web3", "SAML"]);

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
  return loginProviderCategories.has(normalizeText(provider?.category));
}

// buildIdentitySourceBindingRows 只展示 OAuth/Web3/SAML 登录身份源，并计算空 targetOrganization 的默认组织回退。
export function buildIdentitySourceBindingRows(
  application?: IdentitySourceApplication | null,
  providers: IdentityProvider[] = []
): IdentitySourceBindingRow[] {
  const defaultOrganization = normalizeText(application?.organization);
  return (application?.providers || [])
    .map((binding, index) => ({binding, index}))
    .filter(({binding}) => isLoginProvider(binding, providers))
    .map(({binding, index}) => {
      const targetOrganization = normalizeText(binding.targetOrganization);
      const effectiveOrganization = targetOrganization || defaultOrganization;
      return {
        ...binding,
        key: `${binding.name || "provider"}-${index}`,
        bindingIndex: index,
        provider: resolveProvider(binding, providers),
        targetOrganization,
        effectiveOrganization,
        usesFallback: targetOrganization === "",
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
  const defaultOrganization = normalizeText(application?.organization);

  if (rows.length === 0) {
    return (
      <Alert
        style={{marginTop: 12}}
        type="info"
        showIcon
        message={t("application:No configurable login identity sources", "暂无可配置的登录身份源")}
        description={t(
          "application:Enable OAuth SAML or Web3 providers to bind target organizations",
          "启用 OAuth、SAML 或 Web3 Provider 后，可在这里为每个登录身份源指定目标组织。"
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
            "应用组织用于归属和默认回退；这里的目标组织决定该 Provider 登录时在哪里匹配用户。"
          )}
        </Typography.Text>
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
              title: t("application:Target organization", "目标组织"),
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
                      label: defaultOrganization
                        ? t("application:Use application default organization with name", "使用应用默认组织 ({{organization}})", {organization: defaultOrganization})
                        : t("application:Use application default organization", "使用应用默认组织"),
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
              title: t("application:Effective organization", "生效组织"),
              dataIndex: "effectiveOrganization",
              key: "effectiveOrganization",
              width: 220,
              render: (value: string, row: IdentitySourceBindingRow) => (
                <Space>
                  <Typography.Text>{value || t("application:Not configured", "未配置")}</Typography.Text>
                  {row.usesFallback
                    ? <Tag>{t("application:Use application default organization", "使用应用默认组织")}</Tag>
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
