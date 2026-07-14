// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {Button, Card, Input, InputNumber, Modal, Popconfirm, Radio, Select, Switch, Tabs, Tooltip} from "antd";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as LdapBackend from "./backend/LdapBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as Obfuscator from "./auth/Obfuscator";
import i18nextRaw from "i18next";
import {CopyOutlined, EyeOutlined, LinkOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import LdapTable from "./table/LdapTable";
import AccountTable from "./table/AccountTable";
import ThemeEditor from "./common/theme/ThemeEditor";
import MfaTable from "./table/MfaTable";
import {NavItemTree} from "./common/NavItemTree";
import {WidgetItemTree, buildWidgetItemTreeData} from "./common/WidgetItemTree";
import TransactionTable from "./table/TransactionTable";
import * as TransactionBackend from "./backend/TransactionBackend";
import {getOrganizationNameTooltipKey, isOrganizationNameLocked} from "./OrganizationEditPageUtils";
import {buildEnterpriseNavigationConfigTreeData} from "./enterpriseNavigation";
import LargeEditShell from "./common/LargeEditShell";

const {Option} = Select;

type ThemeDataRecord = {
  isEnabled?: boolean;
  [key: string]: unknown;
};

interface AccountItemRecord {
  name?: string;
  [key: string]: unknown;
}

interface OrganizationRecord {
  owner?: string;
  name: string;
  displayName?: string;
  nameLocked?: boolean;
  enableDarkLogo?: boolean;
  logo?: string;
  logoDark?: string;
  favicon?: string;
  websiteUrl?: string;
  hasPrivilegeConsent?: boolean;
  passwordType?: string;
  passwordSalt?: string;
  passwordOptions?: string[];
  passwordObfuscatorType?: string;
  passwordObfuscatorKey?: string;
  passwordExpireDays?: number | null;
  countryCodes?: string[];
  languages?: string[];
  defaultAvatar?: string;
  defaultApplication?: string;
  userTypes?: string[];
  tags?: string[];
  masterPassword?: string;
  defaultPassword?: string;
  masterVerificationCode?: string;
  ipWhitelist?: string;
  initScore?: number | null;
  orgBalance?: number | null;
  userBalance?: number | null;
  balanceCredit?: number | null;
  balanceCurrency?: string;
  enableSoftDeletion?: boolean;
  isProfilePublic?: boolean;
  useEmailAsUsername?: boolean;
  enableTour?: boolean;
  disableSignin?: boolean;
  usePermanentAvatar?: boolean;
  navItems?: React.Key[];
  userNavItems?: React.Key[];
  widgetItems?: React.Key[];
  accountMenu?: string;
  accountItems?: AccountItemRecord[];
  mfaRememberInHours?: number | null;
  mfaItems?: unknown[];
  themeData?: ThemeDataRecord;
  ldapAttributes?: string[];
  kerberosRealm?: string;
  kerberosKdcHost?: string;
  kerberosKeytab?: string;
  kerberosServiceName?: string;
  [key: string]: unknown;
}

interface ApplicationRecord {
  name: string;
  [key: string]: unknown;
}

type LdapRecord = Record<string, unknown>;
type TransactionRecord = Record<string, unknown>;
type OrganizationEditTabKey = "basic" | "brand" | "security" | "navigation" | "accountFields" | "mfa" | "directory" | "transactions";

interface OrganizationEditTabItem {
  key: OrganizationEditTabKey;
  label: string;
}

interface OrganizationValidationErrors {
  name?: string;
  displayName?: string;
}

interface OrganizationEditPageProps {
  match: {
    params: {
      organizationName: string;
    };
  };
  location: {
    mode?: string;
    state?: {organization?: OrganizationRecord; mode?: string};
    [key: string]: unknown;
  };
  history: {
    push: (path: string | {pathname: string; state?: unknown}) => void;
  };
  account: {
    organization?: {
      name?: string;
    };
    [key: string]: unknown;
  };
  onChangeTheme: (themeData: unknown) => void;
}

interface OrganizationEditPageState {
  classes: OrganizationEditPageProps;
  organizationName: string;
  organization: OrganizationRecord;
  applications: ApplicationRecord[];
  ldaps: LdapRecord[] | null;
  mode: string;
  transactions: TransactionRecord[];
  activeTabKey: OrganizationEditTabKey;
  isDirty: boolean;
  validationErrors: OrganizationValidationErrors;
  submitting: boolean;
  assetPreviewErrors: Record<string, boolean>;
}

interface BackendResponse<T> {
  status?: string;
  data?: T | null;
  msg?: string;
}

// i18next returns a wide legacy type; this page only renders strings in JSX.
const i18next = {
  t: (key: string, options?: Record<string, unknown>): string => String(i18nextRaw.t(key, options)),
};

class OrganizationEditPage extends React.Component<OrganizationEditPageProps, OrganizationEditPageState> {
  constructor(props: OrganizationEditPageProps) {
    super(props);
    const draftOrganization = props.location.state?.organization;
    const requestedMode = props.location.state?.mode ?? props.location.mode ?? "edit";
    const mode = requestedMode === "add" && draftOrganization === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      organizationName: draftOrganization?.name ?? props.match.params.organizationName,
      // Preserve the legacy null loading state; render still guards before use.
      organization: draftOrganization ?? null as unknown as OrganizationRecord,
      applications: [],
      ldaps: null,
      mode,
      transactions: [],
      activeTabKey: this.getInitialTabKey(),
      isDirty: false,
      validationErrors: {},
      submitting: false,
      assetPreviewErrors: {},
    };
  }

  getInitialTabKey(): OrganizationEditTabKey {
    const hashKey = window.location.hash?.slice(1) as OrganizationEditTabKey;
    return this.isKnownTabKey(hashKey) ? hashKey : "basic";
  }

  isKnownTabKey(key: unknown): key is OrganizationEditTabKey {
    return ["basic", "brand", "security", "navigation", "accountFields", "mfa", "directory", "transactions"].includes(`${key}`);
  }

  getAvailableTabs(): OrganizationEditTabItem[] {
    const tabs: OrganizationEditTabItem[] = [
      {key: "basic", label: i18next.t("organization:Basic")},
      {key: "brand", label: i18next.t("organization:Brand")},
      {key: "security", label: i18next.t("organization:Login security")},
      {key: "navigation", label: i18next.t("organization:Navigation and menu")},
      {key: "accountFields", label: i18next.t("organization:Account fields")},
      {key: "mfa", label: i18next.t("organization:Multi-factor authentication")},
      {key: "directory", label: i18next.t("organization:Directory integration")},
    ];

    if (this.state.mode !== "add" && this.state.transactions.length > 0) {
      tabs.push({key: "transactions", label: i18next.t("general:Transactions")});
    }

    return tabs;
  }

  getActiveTabKey(): OrganizationEditTabKey {
    const availableKeys = this.getAvailableTabs().map(item => item.key);
    return availableKeys.includes(this.state.activeTabKey) ? this.state.activeTabKey : "basic";
  }

  setActiveTabKey(key: string): void {
    const nextKey = this.isKnownTabKey(key) ? key : "basic";
    this.setState({activeTabKey: nextKey});
    window.location.hash = nextKey;
  }

  UNSAFE_componentWillMount() {
    if (this.state.mode !== "add") {
      this.getOrganization();
    }
    this.getApplications();
    this.getLdaps();
    this.getOrganizationTransactions();
  }

  getOrganization(): void {
    OrganizationBackend.getOrganization("admin", this.state.organizationName)
      .then((res: BackendResponse<OrganizationRecord>) => {
        if (res.status === "ok") {
          const organization = res.data;
          if (organization === null || organization === undefined) {
            this.props.history.push("/404");
            return;
          }
          organization.enableDarkLogo = !!organization.logoDark;

          this.setState({
            organization: organization,
            isDirty: false,
            validationErrors: {},
            assetPreviewErrors: {},
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  getApplications(): void {
    ApplicationBackend.getApplicationsByOrganization("admin", this.state.organizationName)
      .then((res: BackendResponse<ApplicationRecord[]>) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          applications: res.data || [],
        });
      });
  }

  getLdaps(): void {
    LdapBackend.getLdaps(this.state.organizationName)
      .then((res: BackendResponse<LdapRecord[]>) => {
        let resdata: LdapRecord[] = [];
        if (res.status === "ok") {
          if (res.data !== null) {
            resdata = res.data ?? [];
          }
        }
        this.setState({
          ldaps: resdata,
        });
      });
  }

  getOrganizationTransactions(): void {
    TransactionBackend.getTransactions(this.state.organizationName)
      .then((res: BackendResponse<TransactionRecord[]>) => {
        if (res.status === "ok") {
          this.setState({
            transactions: res.data ?? [],
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  parseOrganizationField(key: string, value: unknown): unknown {
    // if ([].includes(key)) {
    //   value = Setting.myParseInt(value);
    // }
    return value;
  }

  updateOrganizationField(key: string, value: unknown): void {
    value = this.parseOrganizationField(key, value);
    const organization = this.state.organization;
    organization[key] = value;
    const validationErrors = {...this.state.validationErrors};
    if ((key === "name" || key === "displayName") && `${value ?? ""}`.trim() !== "") {
      delete validationErrors[key];
    }
    this.setState({
      organization: organization,
      isDirty: true,
      validationErrors: validationErrors,
    });
  }

  updatePasswordObfuscator(key: "type" | "key", value: string): void {
    const organization = this.state.organization;
    if (organization.passwordObfuscatorType === "") {
      organization.passwordObfuscatorType = "Plain";
    }
    if (key === "type") {
      organization.passwordObfuscatorType = value;
      organization.passwordObfuscatorKey = Obfuscator.getRandomKeyForObfuscator(value);
    } else if (key === "key") {
      organization.passwordObfuscatorKey = value;
    }
    this.setState({
      organization: organization,
      isDirty: true,
    });
  }

  renderLabel(label: string, tooltip: string, required = false): React.ReactNode {
    return (
      <span className="organization-edit-field-label-text">
        {required ? <span className="organization-edit-required-mark">*</span> : null}
        {Setting.getLabel(label, tooltip)}
        <span className="organization-edit-label-colon">:</span>
      </span>
    );
  }

  renderSectionTitle(title: string): React.ReactNode {
    return (
      <div className="organization-edit-section-title">
        <span>{title}</span>
      </div>
    );
  }

  renderFieldRow(
    label: string,
    tooltip: string,
    control: React.ReactNode,
    options: {required?: boolean; error?: string; wide?: boolean; className?: string} = {}
  ): React.ReactNode {
    const rowClassName = [
      "organization-edit-field-row",
      options.wide ? "organization-edit-field-row-wide" : "",
      options.className ?? "",
    ].filter(Boolean).join(" ");

    return (
      <div className={rowClassName}>
        <div className="organization-edit-field-label">
          {this.renderLabel(label, tooltip, options.required)}
        </div>
        <div className="organization-edit-field-control">
          {control}
          {options.error ? <div className="organization-edit-field-error">{options.error}</div> : null}
        </div>
      </div>
    );
  }

  renderFullWidthSection(label: string, tooltip: string, content: React.ReactNode): React.ReactNode {
    return (
      <div className="organization-edit-full-width-section">
        <div className="organization-edit-full-width-label">
          {this.renderLabel(label, tooltip)}
        </div>
        <div className="organization-edit-full-width-content">
          {content}
        </div>
      </div>
    );
  }

  renderContentSection(title: string, tooltip: string | undefined, content: React.ReactNode, options: {wide?: boolean} = {}): React.ReactNode {
    const sectionClassName = [
      "organization-edit-content-section",
      options.wide ? "organization-edit-content-section-wide" : "",
    ].filter(Boolean).join(" ");

    return (
      <div className={sectionClassName}>
        <div className="organization-edit-content-section-title">{tooltip === undefined ? title : Setting.getLabel(title, tooltip)}</div>
        <div className="organization-edit-content-section-body">
          {content}
        </div>
      </div>
    );
  }

  getTreeLeafKeys(nodes: unknown[]): React.Key[] {
    const keys: React.Key[] = [];
    (nodes as Array<{key?: React.Key; children?: unknown[]}>).forEach((node) => {
      if (Array.isArray(node.children) && node.children.length > 0) {
        keys.push(...this.getTreeLeafKeys(node.children));
        return;
      }
      if (node.key !== undefined) {
        keys.push(node.key);
      }
    });
    return keys;
  }

  getCheckedLeafCount(checkedKeys: unknown, leafKeys: React.Key[]): number {
    if (!Array.isArray(checkedKeys)) {
      return 0;
    }
    if (checkedKeys.includes("all")) {
      return leafKeys.length;
    }
    const leafKeySet = new Set(leafKeys.map(key => `${key}`));
    return checkedKeys.filter(key => leafKeySet.has(`${key}`)).length;
  }

  renderNavigationTreePanel(title: string, tooltip: string, checkedKeys: unknown, leafKeys: React.Key[], content: React.ReactNode): React.ReactNode {
    return (
      <div className="organization-edit-navigation-panel">
        <div className="organization-edit-navigation-panel-header">
          <span className="organization-edit-navigation-panel-title">{Setting.getLabel(title, tooltip)}</span>
          <span className="organization-edit-navigation-panel-count">
            {i18next.t("organization:Selected navigation items", {count: this.getCheckedLeafCount(checkedKeys, leafKeys), total: leafKeys.length})}
          </span>
        </div>
        <div className="organization-edit-navigation-tree">
          {content}
        </div>
      </div>
    );
  }

  renderSwitchItem(label: string, tooltip: string, control: React.ReactNode): React.ReactNode {
    return (
      <div className="organization-edit-switch-item">
        <div className="organization-edit-switch-label">
          {this.renderLabel(label, tooltip)}
        </div>
        <div className="organization-edit-switch-control">
          {control}
        </div>
      </div>
    );
  }

  getAssetViewLabel(label: string): string {
    return i18next.t("organization:View asset", {name: label.toLocaleLowerCase()});
  }

  renderAssetPreview(assetKey: string, label: string, value: string | undefined, fallbackSrc: string, background: string, defaultText: string): React.ReactNode {
    const hasCustomValue = `${value ?? ""}`.trim() !== "";
    const src = hasCustomValue ? value : fallbackSrc;
    const hasPreviewSource = `${src ?? ""}`.trim() !== "";
    const hasPreviewError = this.state.assetPreviewErrors[assetKey] === true;
    const statusText = hasPreviewError ? i18next.t("organization:Preview failed") : hasCustomValue ? i18next.t("organization:Configured") : hasPreviewSource ? defaultText : i18next.t("organization:Not configured");
    const viewLabel = this.getAssetViewLabel(label);
    return (
      <div className="organization-edit-asset-preview-card">
        <div className="organization-edit-asset-preview-frame" style={{background}}>
          {hasPreviewSource && !hasPreviewError ? (
            <img
              src={src}
              alt={i18next.t("organization:Asset preview", {name: label})}
              onError={() => {
                this.setState({assetPreviewErrors: {...this.state.assetPreviewErrors, [assetKey]: true}});
              }}
            />
          ) : (
            <span className="organization-edit-asset-preview-placeholder" aria-label={statusText}>{hasPreviewError ? "!" : statusText}</span>
          )}
        </div>
        <div className="organization-edit-asset-preview-meta">
          <span className="organization-edit-asset-preview-status">{statusText}</span>
          <Tooltip title={viewLabel}>
            <Button
              aria-label={viewLabel}
              disabled={!hasPreviewSource}
              href={hasPreviewSource ? src : undefined}
              icon={<EyeOutlined />}
              rel="noreferrer"
              size="small"
              target="_blank"
              type="link"
            >
              {i18next.t("general:View")}
            </Button>
          </Tooltip>
        </div>
      </div>
    );
  }

  renderAssetField(assetKey: string, label: string, tooltip: string, value: string | undefined, fallbackSrc: string, background: string, defaultText: string, onChange: (value: string) => void): React.ReactNode {
    return this.renderFieldRow(
      label,
      tooltip,
      <div className="organization-edit-asset-control">
        <div className="organization-edit-asset-input">
          <Input prefix={<LinkOutlined />} value={value} placeholder={i18next.t("organization:Asset URL placeholder")} onChange={e => {
            this.setState({assetPreviewErrors: {...this.state.assetPreviewErrors, [assetKey]: false}});
            onChange(e.target.value);
          }} />
        </div>
        {this.renderAssetPreview(assetKey, label, value, fallbackSrc, background, defaultText)}
      </div>,
      {wide: true, className: "organization-edit-asset-row"}
    );
  }

  copyTextToClipboard(text: string | undefined): void {
    const value = text ?? "";
    if (value.trim() === "") {
      return;
    }
    copy(value);
    Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
  }

  renderBasicTab(): React.ReactNode {
    const isNameLocked = isOrganizationNameLocked(this.state.organization, this.state.mode);
    const requiredMessage = i18next.t("provider:This field is required");
    const defaultApplicationOptions = this.state.applications?.map((item) => Setting.getOption(Setting.getApplicationDisplayName(item.name), item.name)) ?? [];
    const hasDefaultApplicationOptions = defaultApplicationOptions.length > 0;
    const defaultApplicationSelect = (
      <Select
        virtual={false}
        disabled={!hasDefaultApplicationOptions && !this.state.organization.defaultApplication}
        notFoundContent={i18next.t("organization:No default applications")}
        options={defaultApplicationOptions}
        placeholder={i18next.t(hasDefaultApplicationOptions ? "organization:Please select default application" : "organization:No default applications")}
        value={this.state.organization.defaultApplication}
        onChange={(value => {this.updateOrganizationField("defaultApplication", value);})}
      />
    );
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Basic information"))}
        <div className="organization-edit-field-grid organization-edit-field-grid-compact">
          {this.renderFieldRow(
            i18next.t("general:Name"),
            i18next.t(getOrganizationNameTooltipKey(this.state.organization, this.state.mode)),
            <Input
              status={this.state.validationErrors.name ? "error" : undefined}
              value={this.state.organization.name}
              disabled={this.state.organization.name === "built-in" || isNameLocked}
              onChange={e => {
                this.updateOrganizationField("name", e.target.value);
              }}
            />,
            {required: true, error: this.state.validationErrors.name ? requiredMessage : undefined}
          )}
          {this.renderFieldRow(
            i18next.t("general:Display name"),
            i18next.t("general:Display name - Tooltip"),
            <Input
              status={this.state.validationErrors.displayName ? "error" : undefined}
              value={this.state.organization.displayName}
              onChange={e => {
                this.updateOrganizationField("displayName", e.target.value);
              }}
            />,
            {required: true, error: this.state.validationErrors.displayName ? requiredMessage : undefined}
          )}
          {this.renderFieldRow(
            i18next.t("organization:Website URL"),
            i18next.t("organization:Website URL - Tooltip"),
            <Input
              prefix={<LinkOutlined />}
              title={this.state.organization.websiteUrl}
              value={this.state.organization.websiteUrl}
              suffix={
                <Tooltip title={i18next.t("organization:Copy website URL")}>
                  <Button
                    aria-label={i18next.t("organization:Copy website URL")}
                    disabled={`${this.state.organization.websiteUrl ?? ""}`.trim() === ""}
                    icon={<CopyOutlined />}
                    size="small"
                    type="text"
                    onClick={() => this.copyTextToClipboard(this.state.organization.websiteUrl)}
                  />
                </Tooltip>
              }
              onChange={e => {
                this.updateOrganizationField("websiteUrl", e.target.value);
              }} />,
            {wide: true}
          )}
        </div>

        {this.renderSectionTitle(i18next.t("organization:Default scope"))}
        <div className="organization-edit-field-grid organization-edit-default-scope-grid">
          {this.renderFieldRow(
            i18next.t("general:Default application"),
            i18next.t("general:Default application - Tooltip"),
            hasDefaultApplicationOptions || this.state.organization.defaultApplication
              ? defaultApplicationSelect
              : (
                <Tooltip title={i18next.t("organization:No default applications - Tooltip")}>
                  <span className="organization-edit-control-tooltip-wrapper">
                    {defaultApplicationSelect}
                  </span>
                </Tooltip>
              )
          )}
          {this.renderFieldRow(
            i18next.t("organization:User types"),
            i18next.t("organization:User types - Tooltip"),
            <Select virtual={false} mode="tags" placeholder={i18next.t("organization:Please enter user type")} value={this.state.organization.userTypes} onChange={(value => {this.updateOrganizationField("userTypes", value);})}>
              {
                this.state.organization.userTypes?.map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>
          )}
          {this.renderFieldRow(
            i18next.t("general:Supported country codes"),
            i18next.t("general:Supported country codes - Tooltip"),
            <Select virtual={false} mode={"multiple"} value={this.state.organization.countryCodes ?? []}
              onChange={value => {
                this.updateOrganizationField("countryCodes", value);
              }}
              filterOption={(input, option) => (option?.text ?? "").toLowerCase().includes(input.toLowerCase())}
            >
              {Setting.getCountryCodeOption({name: i18next.t("general:All"), code: "All", phone: 0})}
              {
                Setting.getCountryCodeData().map((country) => Setting.getCountryCodeOption(country))
              }
            </Select>
          )}
          {this.renderFieldRow(
            i18next.t("general:Languages"),
            i18next.t("general:Languages - Tooltip"),
            <Select virtual={false} mode="multiple"
              placeholder={i18next.t("organization:Please select languages")}
              options={Setting.Countries.map((item) => {
                return Setting.getOption(item.label, item.key);
              })}
              value={this.state.organization.languages ?? []}
              onChange={(value => {
                this.updateOrganizationField("languages", value);
              })} />,
            {wide: true}
          )}
          {this.renderFieldRow(
            i18next.t("organization:Tags"),
            i18next.t("application:Tags - Tooltip"),
            <Select virtual={false} mode="tags" value={this.state.organization.tags} onChange={(value => {this.updateOrganizationField("tags", value);})}>
              {
                this.state.organization.tags?.map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>,
            {wide: true}
          )}
        </div>

        {this.renderSectionTitle(i18next.t("organization:Balance and score"))}
        <div className="organization-edit-field-grid organization-edit-field-grid-compact">
          {this.renderFieldRow(
            i18next.t("organization:Init score"),
            i18next.t("organization:Init score - Tooltip"),
            <InputNumber className="organization-edit-number-input organization-edit-number-input-right" value={this.state.organization.initScore} onChange={value => {
              this.updateOrganizationField("initScore", value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("organization:Org balance"),
            i18next.t("organization:Org balance - Tooltip"),
            <InputNumber className="organization-edit-number-input organization-edit-number-input-right" value={this.state.organization.orgBalance ?? 0} onChange={value => {
              this.updateOrganizationField("orgBalance", value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("organization:User balance"),
            i18next.t("organization:User balance - Tooltip"),
            <Tooltip title={i18next.t("organization:User balance readonly - Tooltip")}>
              <span className="organization-edit-disabled-field-help">
                <InputNumber className="organization-edit-number-input organization-edit-number-input-right" value={this.state.organization.userBalance ?? 0} disabled />
              </span>
            </Tooltip>
          )}
          {this.renderFieldRow(
            i18next.t("organization:Balance credit"),
            i18next.t("organization:Balance credit - Tooltip"),
            <InputNumber className="organization-edit-number-input organization-edit-number-input-right" value={this.state.organization.balanceCredit ?? 0} max={0} onChange={value => {
              this.updateOrganizationField("balanceCredit", value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("organization:Balance currency"),
            i18next.t("organization:Balance currency - Tooltip"),
            <Select virtual={false} placeholder={i18next.t("organization:Please select balance currency")} value={this.state.organization.balanceCurrency || "USD"} onChange={(value => {
              this.updateOrganizationField("balanceCurrency", value);
            })}>
              {
                Setting.CurrencyOptions.map((item, index) => <Option key={index} value={item.id}>{Setting.getCurrencyWithFlag(item.id)}</Option>)
              }
            </Select>
          )}
        </div>
      </React.Fragment>
    );
  }

  renderBrandTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Brand assets"))}
        <div className="organization-edit-asset-list">
          {this.renderAssetField("logo", i18next.t("general:Logo"), i18next.t("general:Logo - Tooltip"), this.state.organization.logo, Setting.getLogo([""]), "white", i18next.t("organization:Use default asset"), value => {
            this.updateOrganizationField("logo", value);
          })}
          {this.renderFieldRow(
            i18next.t("general:Enable dark logo"),
            i18next.t("general:Enable dark logo - Tooltip"),
            <Switch checked={this.state.organization.enableDarkLogo} onChange={e => {
              this.updateOrganizationField("enableDarkLogo", e);
              if (!e) {
                this.updateOrganizationField("logoDark", "");
              }
            }} />,
            {wide: true}
          )}
          {
            !this.state.organization.enableDarkLogo ? null : this.renderAssetField("logoDark", i18next.t("general:Logo dark"), i18next.t("general:Logo dark - Tooltip"), this.state.organization.logoDark, Setting.getLogo(["dark"]), "#141414", i18next.t("organization:Use default asset"), value => {
              this.updateOrganizationField("logoDark", value);
            })
          }
          {this.renderAssetField("favicon", i18next.t("general:Favicon"), i18next.t("general:Favicon - Tooltip"), this.state.organization.favicon, "", "transparent", i18next.t("organization:Not configured"), value => {
            this.updateOrganizationField("favicon", value);
          })}
          {this.renderAssetField("defaultAvatar", i18next.t("general:Default avatar"), i18next.t("general:Default avatar - Tooltip"), this.state.organization.defaultAvatar, "", "transparent", i18next.t("organization:Not configured"), value => {
            this.updateOrganizationField("defaultAvatar", value);
          })}
        </div>

        {this.renderSectionTitle(i18next.t("theme:Theme"))}
        {this.renderFullWidthSection(
          i18next.t("organization:Theme mode"),
          i18next.t("theme:Theme - Tooltip"),
          <React.Fragment>
            <div className="organization-edit-theme-mode-control">
              <Radio.Group className="organization-edit-theme-mode-group" buttonStyle="solid" value={this.state.organization.themeData?.isEnabled ?? false} onChange={e => {
                const {_, ...theme} = this.state.organization.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                this.updateOrganizationField("themeData", {...theme, isEnabled: e.target.value});
              }} >
                <Radio.Button value={false}>{i18next.t("organization:Follow global theme")}</Radio.Button>
                <Radio.Button value={true}>{i18next.t("theme:Customize theme")}</Radio.Button>
              </Radio.Group>
              <div className="organization-edit-theme-summary">
                {this.state.organization.themeData?.isEnabled ? i18next.t("organization:Custom theme summary") : i18next.t("organization:Global theme summary")}
              </div>
            </div>
            {
              this.state.organization.themeData?.isEnabled ?
                <div className="organization-edit-theme-editor">
                  <ThemeEditor themeData={this.state.organization.themeData} onThemeChange={(_: unknown, nextThemeData: ThemeDataRecord) => {
                    const {isEnabled} = this.state.organization.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                    this.updateOrganizationField("themeData", {...nextThemeData, isEnabled});
                  }} />
                </div> : null
            }
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }

  renderSecurityTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Password policy"))}
        <div className="organization-edit-field-grid">
          {this.renderFieldRow(
            i18next.t("general:Password type"),
            i18next.t("general:Password type - Tooltip"),
            <Select virtual={false} value={this.state.organization.passwordType} onChange={(value => {this.updateOrganizationField("passwordType", value);})}
              options={["plain", "salt", "sha512-salt", "md5-salt", "bcrypt", "pbkdf2-salt", "argon2id", "pbkdf2-django"].map(item => Setting.getOption(item, item))}
            />
          )}
          {this.renderFieldRow(
            i18next.t("general:Password salt"),
            i18next.t("general:Password salt - Tooltip"),
            <Input.Password autoComplete="new-password" value={this.state.organization.passwordSalt} onChange={e => {
              this.updateOrganizationField("passwordSalt", e.target.value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("general:Password complexity options"),
            i18next.t("general:Password complexity options - Tooltip"),
            <Select
              virtual={false}
              mode="multiple"
              value={this.state.organization.passwordOptions}
              onChange={(value => {
                this.updateOrganizationField("passwordOptions", value);
              })}
              options={[
                {value: "AtLeast6", name: i18next.t("user:The password must have at least 6 characters")},
                {value: "AtLeast8", name: i18next.t("user:The password must have at least 8 characters")},
                {value: "Aa123", name: i18next.t("user:The password must contain at least one uppercase letter, one lowercase letter and one digit")},
                {value: "SpecialChar", name: i18next.t("user:The password must contain at least one special character")},
                {value: "NoRepeat", name: i18next.t("user:The password must not contain any repeated characters")},
              ].map((item) => Setting.getOption(item.name, item.value))}
            />,
            {wide: true}
          )}
          {this.renderFieldRow(
            i18next.t("general:Password obfuscator"),
            i18next.t("general:Password obfuscator - Tooltip"),
            <Select virtual={false}
              value={this.state.organization.passwordObfuscatorType}
              onChange={(value => {this.updatePasswordObfuscator("type", value);})}>
              {
                [
                  {id: "Plain", name: "Plain"},
                  {id: "AES", name: "AES"},
                  {id: "DES", name: "DES"},
                ].map((obfuscatorType, index) => <Option key={index} value={obfuscatorType.id}>{obfuscatorType.name}</Option>)
              }
            </Select>
          )}
          {
            (this.state.organization.passwordObfuscatorType === "Plain" || this.state.organization.passwordObfuscatorType === "") ? null : this.renderFieldRow(
              i18next.t("general:Password obf key"),
              i18next.t("general:Password obf key - Tooltip"),
              <Input.Password autoComplete="new-password" value={this.state.organization.passwordObfuscatorKey} onChange={(e) => {this.updatePasswordObfuscator("key", e.target.value);}} />
            )
          }
          {this.renderFieldRow(
            i18next.t("organization:Password expire days"),
            i18next.t("organization:Password expire days - Tooltip"),
            <InputNumber placeholder={i18next.t("organization:Password expire days zero placeholder")} value={this.state.organization.passwordExpireDays} onChange={value => {
              this.updateOrganizationField("passwordExpireDays", value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("general:Master password"),
            i18next.t("general:Master password - Tooltip"),
            <Input.Password autoComplete="new-password" value={this.state.organization.masterPassword} onChange={e => {
              this.updateOrganizationField("masterPassword", e.target.value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("general:Default password"),
            i18next.t("general:Default password - Tooltip"),
            <Input.Password autoComplete="new-password" value={this.state.organization.defaultPassword} onChange={e => {
              this.updateOrganizationField("defaultPassword", e.target.value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("general:Master verification code"),
            i18next.t("general:Master verification code - Tooltip"),
            <Input.Password autoComplete="new-password" value={this.state.organization.masterVerificationCode} onChange={e => {
              this.updateOrganizationField("masterVerificationCode", e.target.value);
            }} />
          )}
          {this.renderFieldRow(
            i18next.t("general:IP whitelist"),
            i18next.t("general:IP whitelist - Tooltip"),
            <Input.TextArea autoSize={{minRows: 2, maxRows: 4}} placeholder={i18next.t("general:IP whitelist placeholder")} value={this.state.organization.ipWhitelist} onChange={e => {
              this.updateOrganizationField("ipWhitelist", e.target.value);
            }} />,
            {wide: true}
          )}
        </div>

        {this.renderSectionTitle(i18next.t("organization:Access switches"))}
        <div className="organization-edit-switch-grid">
          {this.state.organization.name === "built-in" ? this.renderSwitchItem(
            i18next.t("organization:Has privilege consent"),
            i18next.t("organization:Has privilege consent - Tooltip"),
            !this.state.organization.hasPrivilegeConsent ? (
              <Popconfirm
                title={i18next.t("organization:Has privilege consent warning")}
                onConfirm={() => {this.updateOrganizationField("hasPrivilegeConsent", !this.state.organization.hasPrivilegeConsent);}}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                styles={{root: {width: "800px"}}}
              >
                <Switch checked={this.state.organization.hasPrivilegeConsent} />
              </Popconfirm>
            ) : <Switch checked={this.state.organization.hasPrivilegeConsent} onChange={() => {this.updateOrganizationField("hasPrivilegeConsent", !this.state.organization.hasPrivilegeConsent);}} />
          ) : null}
          {this.renderSwitchItem(
            i18next.t("organization:Soft deletion"),
            i18next.t("organization:Soft deletion - Tooltip"),
            <Switch checked={this.state.organization.enableSoftDeletion} onChange={checked => {
              this.updateOrganizationField("enableSoftDeletion", checked);
            }} />
          )}
          {this.renderSwitchItem(
            i18next.t("organization:Is profile public"),
            i18next.t("organization:Is profile public - Tooltip"),
            <Switch checked={this.state.organization.isProfilePublic} onChange={checked => {
              this.updateOrganizationField("isProfilePublic", checked);
            }} />
          )}
          {this.renderSwitchItem(
            i18next.t("organization:Use Email as username"),
            i18next.t("organization:Use Email as username - Tooltip"),
            <Switch checked={this.state.organization.useEmailAsUsername} onChange={checked => {
              this.updateOrganizationField("useEmailAsUsername", checked);
            }} />
          )}
          {this.renderSwitchItem(
            i18next.t("general:Enable tour"),
            i18next.t("general:Enable tour - Tooltip"),
            <Switch checked={this.state.organization.enableTour} onChange={checked => {
              this.updateOrganizationField("enableTour", checked);
            }} />
          )}
          {this.renderSwitchItem(
            i18next.t("application:Disable signin"),
            i18next.t("application:Disable signin - Tooltip"),
            <Switch checked={this.state.organization.disableSignin} onChange={checked => {
              this.updateOrganizationField("disableSignin", checked);
            }} />
          )}
          {this.renderSwitchItem(
            i18next.t("organization:Use permanent avatar"),
            i18next.t("organization:Use permanent avatar - Tooltip"),
            <Switch checked={this.state.organization.usePermanentAvatar} onChange={checked => {
              this.updateOrganizationField("usePermanentAvatar", checked);
            }} />
          )}
        </div>
      </React.Fragment>
    );
  }

  renderNavigationTab(): React.ReactNode {
    const navTreeData = buildEnterpriseNavigationConfigTreeData();
    const navLeafKeys = this.getTreeLeafKeys(navTreeData);
    const widgetTreeData = buildWidgetItemTreeData();
    const widgetLeafKeys = this.getTreeLeafKeys(widgetTreeData);
    const adminNavItems = this.state.organization.navItems ?? ["all"];
    const userNavItems = this.state.organization.userNavItems ?? [];
    const widgetItems = this.state.organization.widgetItems ?? ["all"];

    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Navigation and menu"))}
        <div className="organization-edit-navigation-tab">
          <div className="organization-edit-navigation-grid">
            {this.renderNavigationTreePanel(
              i18next.t("organization:Admin navigation"),
              i18next.t("organization:Admin navigation - Tooltip"),
              adminNavItems,
              navLeafKeys,
              <NavItemTree
                disabled={!Setting.isAdminUser(this.props.account)}
                checkedKeys={adminNavItems}
                defaultExpandedKeys={["all"]}
                onCheck={(checked: unknown, _: unknown) => {
                  this.updateOrganizationField("navItems", checked);
                }}
              />
            )}
            {this.renderNavigationTreePanel(
              i18next.t("organization:User navigation"),
              i18next.t("organization:User navigation - Tooltip"),
              userNavItems,
              navLeafKeys,
              <NavItemTree
                disabled={!Setting.isAdminUser(this.props.account)}
                checkedKeys={userNavItems}
                defaultExpandedKeys={["all"]}
                onCheck={(checked: unknown, _: unknown) => {
                  this.updateOrganizationField("userNavItems", checked);
                }}
              />
            )}
          </div>

          <div className="organization-edit-navigation-tools-section">
            {this.renderNavigationTreePanel(
              i18next.t("organization:Widget items"),
              i18next.t("organization:Widget items - Tooltip"),
              widgetItems,
              widgetLeafKeys,
              <WidgetItemTree
                disabled={!Setting.isAdminUser(this.props.account)}
                checkedKeys={widgetItems}
                defaultExpandedKeys={["all"]}
                onCheck={(checked: unknown, _: unknown) => {
                  this.updateOrganizationField("widgetItems", checked);
                }}
              />
            )}
            <div className="organization-edit-account-menu-row">
              {this.renderFieldRow(
                i18next.t("organization:Account menu display"),
                i18next.t("organization:Account menu display - Tooltip"),
                <Select virtual={false} value={this.state.organization.accountMenu || "Horizontal"} onChange={(value => {this.updateOrganizationField("accountMenu", value);})}
                  options={[{value: "Horizontal", label: i18next.t("application:Horizontal")}, {value: "Vertical", label: i18next.t("application:Vertical")}].map(item => Setting.getOption(item.label, item.value))}
                />
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  renderAccountFieldsTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Account fields"))}
        <div className="organization-edit-account-table-section">
          <AccountTable
            title={i18next.t("organization:Account items")}
            table={this.state.organization.accountItems}
            onUpdateTable={(value: unknown) => {this.updateOrganizationField("accountItems", value);}}
          />
        </div>
      </React.Fragment>
    );
  }

  renderMfaTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:Multi-factor authentication"))}
        <div className="organization-edit-tab-panel-narrow">
          <div className="organization-edit-field-grid">
            {this.renderFieldRow(
              i18next.t("organization:MFA remember duration"),
              i18next.t("organization:MFA remember duration - Tooltip"),
              <InputNumber className="organization-edit-number-input" value={this.state.organization.mfaRememberInHours} min={1} step={1} precision={0} addonAfter={i18next.t("organization:Hours")} onChange={value => {
                this.updateOrganizationField("mfaRememberInHours", value);
              }} />
            )}
          </div>
          <MfaTable
            title={i18next.t("organization:MFA methods")}
            table={this.state.organization.mfaItems ?? []}
            onUpdateTable={(value: unknown) => {this.updateOrganizationField("mfaItems", value);}}
          />
        </div>
      </React.Fragment>
    );
  }

  renderDirectoryTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("organization:LDAP configuration"))}
        <div className="organization-edit-field-grid">
          {this.renderFieldRow(
            i18next.t("organization:LDAP attributes"),
            i18next.t("organization:LDAP attributes - Tooltip"),
            <Select
              mode="multiple"
              allowClear
              value={this.state.organization.ldapAttributes ?? []}
              onChange={(value) => {
                this.updateOrganizationField("ldapAttributes", value);
              }}
              options={[
                {value: "uid", label: "uid"},
                {value: "cn", label: "cn"},
                {value: "mail", label: "mail"},
                {value: "email", label: "email"},
                {value: "mobile", label: "mobile"},
                {value: "displayName", label: "displayName"},
                {value: "givenName", label: "givenName"},
                {value: "sn", label: "sn"},
                {value: "uidNumber", label: "uidNumber"},
                {value: "gidNumber", label: "gidNumber"},
                {value: "homeDirectory", label: "homeDirectory"},
                {value: "loginShell", label: "loginShell"},
                {value: "gecos", label: "gecos"},
                {value: "sshPublicKey", label: "sshPublicKey"},
                {value: "memberOf", label: "memberOf"},
                {value: "title", label: "title"},
                {value: "userPassword", label: "userPassword"},
                {value: "c", label: "c"},
                {value: "co", label: "co"},
              ]}
            />,
            {wide: true, className: "organization-edit-ldap-attributes-row"}
          )}
        </div>
        <div className="organization-edit-content-section organization-edit-content-section-wide organization-edit-ldap-table-section">
          <LdapTable
            title={i18next.t("ldap:LDAP servers")}
            description={i18next.t("organization:LDAP changes apply immediately")}
            table={this.state.ldaps}
            organizationName={this.state.organizationName}
            onUpdateTable={(value: LdapRecord[]) => {
              this.setState({ldaps: value});
            }}
          />
        </div>
        <div className="organization-edit-directory-section organization-edit-directory-section-kerberos">
          {this.renderSectionTitle(i18next.t("organization:Kerberos configuration"))}
          <div className="organization-edit-field-grid">
            {this.renderFieldRow(
              i18next.t("organization:Kerberos realm"),
              i18next.t("organization:Kerberos realm - Tooltip"),
              <Input value={this.state.organization.kerberosRealm} onChange={e => {
                this.updateOrganizationField("kerberosRealm", e.target.value);
              }} />
            )}
            {this.renderFieldRow(
              i18next.t("organization:Kerberos KDC host"),
              i18next.t("organization:Kerberos KDC host - Tooltip"),
              <Input value={this.state.organization.kerberosKdcHost} onChange={e => {
                this.updateOrganizationField("kerberosKdcHost", e.target.value);
              }} />
            )}
            {this.renderFieldRow(
              i18next.t("organization:Kerberos keytab"),
              i18next.t("organization:Kerberos keytab - Tooltip"),
              <Input.TextArea rows={4} value={this.state.organization.kerberosKeytab} onChange={e => {
                this.updateOrganizationField("kerberosKeytab", e.target.value);
              }} />,
              {wide: true}
            )}
            {this.renderFieldRow(
              i18next.t("organization:Kerberos service name"),
              i18next.t("organization:Kerberos service name - Tooltip"),
              <Input value={this.state.organization.kerberosServiceName} placeholder="HTTP" onChange={e => {
                this.updateOrganizationField("kerberosServiceName", e.target.value);
              }} />
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }

  renderTransactionsTab(): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderSectionTitle(i18next.t("general:Transactions"))}
        <div className="organization-edit-full-width-content">
          <TransactionTable transactions={this.state.transactions} includeUser={true} />
        </div>
      </React.Fragment>
    );
  }

  renderActiveTabContent(): React.ReactNode {
    switch (this.getActiveTabKey()) {
    case "brand":
      return this.renderBrandTab();
    case "security":
      return this.renderSecurityTab();
    case "navigation":
      return this.renderNavigationTab();
    case "accountFields":
      return this.renderAccountFieldsTab();
    case "mfa":
      return this.renderMfaTab();
    case "directory":
      return this.renderDirectoryTab();
    case "transactions":
      return this.renderTransactionsTab();
    case "basic":
    default:
      return this.renderBasicTab();
    }
  }

  confirmLeave(onConfirm: () => void): void {
    if (!this.state.isDirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: i18next.t("organization:Unsaved changes"),
      content: i18next.t("organization:Discard unsaved changes confirmation"),
      okText: i18next.t("general:OK"),
      cancelText: i18next.t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  handleBack(): void {
    this.confirmLeave(() => {
      this.props.history.push("/organizations");
    });
  }

  handleCancel(): void {
    this.confirmLeave(() => {
      this.props.history.push("/organizations");
    });
  }

  getOrganizationEditTitle(): string {
    return this.state.mode === "add" ? i18next.t("organization:New Organization") : `${i18next.t("organization:Edit Organization")} (${this.state.organization.displayName || this.state.organization.name})`;
  }

  renderEditTabs(): React.ReactNode {
    return (
      <Tabs
        className="organization-edit-tabs"
        activeKey={this.getActiveTabKey()}
        onChange={(key) => this.setActiveTabKey(key)}
        items={this.getAvailableTabs().map(tab => ({key: tab.key, label: tab.label}))}
      />
    );
  }

  renderEditFooter(): React.ReactNode {
    return (
      <React.Fragment>
        <Button onClick={() => this.handleCancel()} disabled={this.state.submitting}>{i18next.t("general:Cancel")}</Button>
        <Button type="primary" loading={this.state.submitting} onClick={() => this.submitOrganizationEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button onClick={() => this.submitOrganizationEdit(true)} disabled={this.state.submitting}>{i18next.t("organization:Save and return")}</Button>
      </React.Fragment>
    );
  }

  renderOrganization(): React.ReactNode {
    return (
      <Card
        className="admin-large-edit-card organization-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="organization-edit"
          backLabel={i18next.t("general:Back")}
          breadcrumb={<React.Fragment>{i18next.t("general:Organization & Accounts")} / {i18next.t("general:Organizations")} /</React.Fragment>}
          title={this.getOrganizationEditTitle()}
          dirty={this.state.isDirty}
          dirtyLabel={i18next.t("organization:Unsaved changes")}
          tabs={this.renderEditTabs()}
          actions={this.renderEditFooter()}
          onBack={() => this.handleBack()}
        >
          {this.renderActiveTabContent()}
        </LargeEditShell>
      </Card>
    );
  }

  validateOrganizationBeforeSave(): OrganizationValidationErrors {
    const errors: OrganizationValidationErrors = {};
    if (`${this.state.organization.name ?? ""}`.trim() === "") {
      errors.name = i18next.t("provider:This field is required");
    }
    if (`${this.state.organization.displayName ?? ""}`.trim() === "") {
      errors.displayName = i18next.t("provider:This field is required");
    }
    return errors;
  }

  submitOrganizationEdit(exitAfterSave: boolean): void {
    if (this.state.submitting) {
      return;
    }
    const validationErrors = this.validateOrganizationBeforeSave();
    if (Object.keys(validationErrors).length > 0) {
      this.setState({
        validationErrors: validationErrors,
        activeTabKey: "basic",
      });
      window.location.hash = "basic";
      const firstErrorLabel = validationErrors.name !== undefined ? i18next.t("general:Name") : i18next.t("general:Display name");
      Setting.showMessage("error", `${firstErrorLabel}: ${i18next.t("provider:This field is required")}`);
      return;
    }

    const organization = Setting.deepCopy(this.state.organization) as OrganizationRecord;
    organization.accountItems = organization.accountItems?.filter((accountItem: AccountItemRecord) => accountItem.name !== "Please select an account item");

    const passwordObfuscatorErrorMessage = Obfuscator.checkPasswordObfuscator(organization.passwordObfuscatorType, organization.passwordObfuscatorKey);
    if (passwordObfuscatorErrorMessage.length > 0) {
      this.setState({activeTabKey: "security"});
      window.location.hash = "security";
      Setting.showMessage("error", passwordObfuscatorErrorMessage);
      return;
    }

    this.setState({submitting: true});
    const saveOrganization = this.state.mode === "add"
      ? OrganizationBackend.addOrganization(organization)
      : OrganizationBackend.updateOrganization(this.state.organization.owner!, this.state.organizationName, organization);
    saveOrganization
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));

          if (this.props.account.organization?.name === this.state.organizationName) {
            this.props.onChangeTheme(Setting.getThemeData(this.state.organization));
          }

          this.setState({
            organizationName: this.state.organization.name,
            mode: "edit",
            isDirty: false,
            validationErrors: {},
            submitting: false,
          });
          window.dispatchEvent(new Event("storageOrganizationsChanged"));

          if (exitAfterSave) {
            this.props.history.push("/organizations");
          } else {
            this.props.history.push(`/organizations/${this.state.organization.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode === "add") {
            this.setState({submitting: false});
          } else {
            this.setState(state => ({
              organization: {...state.organization, name: state.organizationName},
              submitting: false,
            }));
          }
        }
      })
      .catch((error: unknown) => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteOrganization(): void {
    OrganizationBackend.deleteOrganization(this.state.organization)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          this.props.history.push("/organizations");
          window.dispatchEvent(new Event("storageOrganizationsChanged"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="admin-large-edit-page organization-edit-page">
        {
          this.state.organization !== null ? this.renderOrganization() : null
        }
      </div>
    );
  }
}

export default OrganizationEditPage;
