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
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Result,
  Row,
  Tooltip
} from "antd";
import {CopyOutlined, LinkOutlined} from "@ant-design/icons";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as CertBackend from "./backend/CertBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ResourceBackend from "./backend/ResourceBackend";
import i18nextRaw from "i18next";
import copy from "copy-to-clipboard";

import LargeEditShell, {LargeEditTabs} from "./common/LargeEditShell";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";
import {
  buildTermsOfUseResourcePath,
  filterProvidersForSave,
  filterSigninMethodsForSave,
  getRequiredApplicationFieldNames,
  normalizeApplicationFieldValue,
  normalizeLoadedApplication,
  validateCustomScopes
} from "./applicationEditRules";
import {renderApplicationEditForm} from "./ApplicationEditForm";

type LegacyAny = any;

export type ApplicationEditTabKey = "basic" | "authentication" | "oidc-oauth" | "saml" | "providers" | "ui-customization" | "security" | "reverse-proxy";
export type ApplicationImageUrlField = "logo" | "favicon" | "formBackgroundUrl" | "formBackgroundUrlMobile";

interface ApplicationEditTabItem {
  key: ApplicationEditTabKey;
  label: React.ReactNode;
}

const applicationEditTabKeys: ApplicationEditTabKey[] = [
  "basic",
  "authentication",
  "oidc-oauth",
  "saml",
  "providers",
  "ui-customization",
  "security",
  "reverse-proxy",
];

interface RouteParams {
  organizationName: string;
  applicationName: string;
}

export interface ApplicationEditPageProps {
  match: {
    params: RouteParams;
  };
  location: {
    mode?: string;
    state?: {application?: ApplicationRecord; mode?: string};
    search?: string;
    [key: string]: LegacyAny;
  };
  history: {
    push: (path: string | {pathname: string; state?: unknown}) => void;
  };
  account: {
    owner: string;
    name: string;
    [key: string]: LegacyAny;
  };
  organizationName?: string;
  owner?: string;
}

interface NamedRecord {
  name: string;
  displayName?: string;
  [key: string]: LegacyAny;
}

interface ThemeDataRecord {
  isEnabled?: boolean;
  colorPrimary?: string;
  borderRadius?: number;
  [key: string]: LegacyAny;
}

interface ApplicationRecord {
  owner?: string;
  organization: string;
  organizationObj?: {
    ipWhitelist?: string;
    [key: string]: LegacyAny;
  };
  name: string;
  displayName?: string;
  category?: string;
  type?: string;
  isShared?: boolean;
  logo?: string;
  title?: string;
  favicon?: string;
  homepageUrl?: string;
  description?: string;
  tags?: string[];
  order?: number | null;
  cookieExpireInHours?: number | null;
  defaultGroup?: string;
  enableSignUp?: boolean;
  disableSignin?: boolean;
  enableExclusiveSignin?: boolean;
  enableSigninSession?: boolean;
  enableAutoSignin?: boolean;
  enableLinkWithEmail?: boolean;
  signupUrl?: string;
  signinUrl?: string;
  forgetUrl?: string;
  affiliationUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUris?: string[];
  forcedRedirectOrigin?: string;
  grantTypes?: string[];
  scopes?: LegacyAny[];
  customScopes?: LegacyAny[];
  tokenFormat?: string;
  tokenSigningMethod?: string;
  tokenFields?: string[];
  tokenAttributes?: LegacyAny[];
  expireInHours?: number | null;
  refreshExpireInHours?: number | null;
  samlReplyUrl?: string;
  enableSamlCompress?: boolean;
  enableSamlC14n10?: boolean;
  useEmailAsSamlNameId?: boolean;
  enableSamlPostBinding?: boolean;
  samlHashAlgorithm?: string;
  disableSamlAttributes?: boolean;
  enableSamlAssertionSignature?: boolean;
  samlAttributes?: LegacyAny[];
  providers?: LegacyAny[];
  orgChoiceMode?: string[];
  signinMethods?: LegacyAny[];
  signupHtml?: string;
  signinHtml?: string;
  signinItems?: LegacyAny[];
  signupItems?: LegacyAny[];
  formBackgroundUrl?: string;
  formBackgroundUrlMobile?: string;
  formCss?: string;
  formCssMobile?: string;
  formOffset?: number;
  formSideHtml?: string;
  themeData?: ThemeDataRecord;
  headerHtml?: string;
  footerHtml?: string;
  cert?: string;
  clientCert?: string;
  failedSigninLimit?: number | null;
  failedSigninFrozenTime?: number | null;
  codeResendTimeout?: number | null;
  ipWhitelist?: string;
  termsOfUse?: string;
  domain?: string;
  otherDomains?: string[];
  upstreamHost?: string;
  sslMode?: string;
  sslCert?: string;
  organizationResolutionMode?: string;
  allowedOrganizations?: string[];
  allowedOrganizationStatus?: string;
  apiMappingRequired?: boolean;
  [key: string]: LegacyAny;
}

export interface ApplicationEditPageState {
  classes: ApplicationEditPageProps;
  owner: string;
  applicationName: string;
  application: ApplicationRecord;
  organizations: NamedRecord[];
  certs: NamedRecord[];
  providers: NamedRecord[];
  providersLoaded: boolean;
  uploading: boolean;
  mode: string;
  tokenAttributes: LegacyAny[];
  samlAttributes: LegacyAny[];
  samlMetadata: LegacyAny;
  isAuthorized: boolean;
  activeMenuKey: ApplicationEditTabKey;
  menuMode: "horizontal" | "vertical" | string;
  dirty: boolean;
  submitting: boolean;
  postCreateReloadStatus: "idle" | "loading" | "error";
  fieldErrors: Record<string, string | undefined>;
  themeAlgorithm?: LegacyAny;
}

interface BackendResponse<T> {
  status?: string;
  data?: T | null;
  msg?: string;
}

// 历史页面依赖大量 JS backend 和未迁移子组件，先在页面边界封住动态字段，避免扩大迁移范围。
const i18next = {
  t: (key: string, options?: Record<string, LegacyAny>): string => String(i18nextRaw.t(key, options)),
};

const previewGrid = Setting.isMobile() ? 22 : 11;

class ApplicationEditPage extends React.Component<ApplicationEditPageProps, ApplicationEditPageState> {
  postCreateReloadRequestId = 0;
  isUnmounted = false;

  constructor(props: ApplicationEditPageProps) {
    super(props);
    const draftApplication = props.location.state?.application;
    const requestedMode = props.location.state?.mode ?? props.location.mode ?? "edit";
    const mode = requestedMode === "add" && draftApplication === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      owner: draftApplication?.organization ?? (props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName),
      applicationName: draftApplication?.name ?? props.match.params.applicationName,
      application: draftApplication ?? null as unknown as ApplicationRecord,
      organizations: [],
      certs: [],
      providers: [],
      providersLoaded: false,
      uploading: false,
      mode,
      tokenAttributes: [],
      samlAttributes: [],
      samlMetadata: null,
      isAuthorized: true,
      activeMenuKey: this.getInitialTabKey(),
      menuMode: "horizontal",
      dirty: false,
      submitting: false,
      postCreateReloadStatus: "idle",
      fieldErrors: {},
    };
  }

  UNSAFE_componentWillMount(): void {
    if (this.state.mode === "add") {
      this.getProviders(this.state.application);
      this.getCerts(this.state.application);
    } else {
      this.getApplication();
    }
    this.getOrganizations();
  }

  componentWillUnmount(): void {
    this.isUnmounted = true;
    this.postCreateReloadRequestId += 1;
  }

  getApplication(): void {
    ApplicationBackend.getApplication("admin", this.state.applicationName)
      .then((res: BackendResponse<ApplicationRecord>) => {
        if (res.data === null || res.data === undefined) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.applyLoadedApplication(res.data);
      });
  }

  applyLoadedApplication(application: ApplicationRecord): void {
    const normalizedApplication = normalizeLoadedApplication(application);

    this.setState({
      application: normalizedApplication,
      dirty: false,
      fieldErrors: {},
      postCreateReloadStatus: "idle",
    }, () => this.publishWorkspaceTabLabel(normalizedApplication));
    this.getProviders(normalizedApplication);
    this.getCerts(normalizedApplication);
    this.getSamlMetadata(normalizedApplication.enableSamlPostBinding);
  }

  reloadCreatedApplication(): void {
    const requestId = ++this.postCreateReloadRequestId;
    ApplicationBackend.getApplication("admin", this.state.applicationName)
      .then((res: BackendResponse<ApplicationRecord>) => {
        if (this.isUnmounted || requestId !== this.postCreateReloadRequestId) {
          return;
        }

        if (res.status !== "ok" || !res.data) {
          this.setState({postCreateReloadStatus: "error"});
          Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${res.msg || this.state.applicationName}`);
          return;
        }

        this.applyLoadedApplication(res.data);
      })
      .catch((error: LegacyAny) => {
        if (this.isUnmounted || requestId !== this.postCreateReloadRequestId) {
          return;
        }

        this.setState({postCreateReloadStatus: "error"});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getOrganizations(): void {
    OrganizationBackend.getOrganizations("admin")
      .then((res: BackendResponse<NamedRecord[]>) => {
        if (res.status === "error") {
          this.setState({
            isAuthorized: false,
          });
        } else {
          this.setState({
            organizations: res.data || [],
          });
        }
      });
  }

  getCerts(application: ApplicationRecord): void {
    let owner: string | undefined = application.organization;
    if (application.isShared) {
      owner = this.props.owner || owner;
    }
    CertBackend.getCerts(owner)
      .then((res: BackendResponse<NamedRecord[]>) => {
        this.setState({
          certs: res.data || [],
        });
      });
  }

  getProviders(application: ApplicationRecord): void {
    let owner = application.organization;
    if (application.isShared) {
      owner = this.props.account.owner;
    }
    this.setState({providersLoaded: false});
    ProviderBackend.getProviders(owner)
      .then((res: BackendResponse<NamedRecord[]>) => {
        if (res.status === "ok") {
          this.setState({
            providers: res.data || [],
            providersLoaded: true,
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  getSamlMetadata(checked: LegacyAny): void {
    ApplicationBackend.getSamlMetadata("admin", this.state.applicationName, checked)
      .then((data: LegacyAny) => {
        this.setState({
          samlMetadata: data,
        });
      });
  }

  updateApplicationField(key: string, value: LegacyAny): void {
    value = normalizeApplicationFieldValue(key, value, Setting.myParseInt);
    const application = {
      ...this.state.application,
      [key]: value,
    };
    const fieldErrors = {...this.state.fieldErrors};
    delete fieldErrors[key];
    this.setState({
      application: application,
      dirty: true,
      fieldErrors: fieldErrors,
    }, () => {
      if (key === "displayName") {
        this.publishWorkspaceTabLabel(application);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/applications/${this.props.match.params.organizationName}/${this.state.applicationName}`;
  }

  getApplicationWorkspaceTabLabel(application: ApplicationRecord): string {
    const displayName = `${application.displayName || application.name || this.state.applicationName}`.trim();
    const editLabel = String(i18next.t("application:Edit Application"));
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${displayName}`;
  }

  // 应用详情加载或显示名称变化后，只更新当前 workspace tab 的文字，不干预路由和标签顺序。
  publishWorkspaceTabLabel(application: ApplicationRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getApplicationWorkspaceTabLabel(application),
      },
    }));
  }

  isKnownTabKey(key: unknown): key is ApplicationEditTabKey {
    return applicationEditTabKeys.includes(`${key}` as ApplicationEditTabKey);
  }

  getInitialTabKey(): ApplicationEditTabKey {
    const hashKey = window.location.hash?.slice(1);
    return this.isKnownTabKey(hashKey) ? hashKey : "basic";
  }

  getActiveTabKey(): ApplicationEditTabKey {
    return this.isKnownTabKey(this.state.activeMenuKey) ? this.state.activeMenuKey : "basic";
  }

  setActiveTabKey(key: string): void {
    const nextKey = this.isKnownTabKey(key) ? key : "basic";
    this.setState({activeMenuKey: nextKey});
    window.location.hash = nextKey;
  }

  getApplicationEditTabDefinitions(): ApplicationEditTabItem[] {
    return [
      {label: i18next.t("application:Basic"), key: "basic"},
      {label: i18next.t("application:Authentication"), key: "authentication"},
      {label: "OIDC/OAuth", key: "oidc-oauth"},
      {label: <Tooltip title={i18next.t("application:SAML - Tooltip")}><span>SAML</span></Tooltip>, key: "saml"},
      {label: i18next.t("application:Providers"), key: "providers"},
      {label: i18next.t("application:UI Customization"), key: "ui-customization"},
      {label: i18next.t("application:Security"), key: "security"},
      {label: i18next.t("application:Reverse Proxy"), key: "reverse-proxy"},
    ];
  }

  renderEditTabs(): React.ReactNode {
    return (
      <LargeEditTabs
        classPrefix="application-edit"
        activeKey={this.getActiveTabKey()}
        onChange={(key) => this.setActiveTabKey(key)}
        items={this.getApplicationEditTabDefinitions().map(tab => ({
          label: tab.label,
          key: tab.key,
        }))}
      />
    );
  }

  renderApplicationSectionTitle(title: string): React.ReactNode {
    return (
      <div className="admin-large-edit-content-section-title application-edit-section-title">
        <span>{title}</span>
      </div>
    );
  }

  renderFullWidthContentRow(children: React.ReactNode, options: {className?: string; marginTop?: string} = {}): React.ReactNode {
    const className = [
      "admin-large-edit-full-width-row",
      "application-edit-full-width-row",
      options.className,
    ].filter(Boolean).join(" ");

    return (
      <Row className={className} style={{marginTop: options.marginTop ?? "20px"}} >
        <Col span={24}>
          {children}
        </Col>
      </Row>
    );
  }

  renderRequiredFieldLabel(label: string, tooltip: string): React.ReactNode {
    return (
      <span className="admin-large-edit-required-label application-edit-required-label">
        <span className="admin-large-edit-required-mark application-edit-required-mark">*</span>
        {Setting.getLabel(label, tooltip)}
      </span>
    );
  }

  renderFieldError(fieldName: string): React.ReactNode {
    const error = this.state.fieldErrors[fieldName];
    if (!error) {
      return null;
    }

    return <div className="admin-large-edit-field-error application-edit-field-error">{error}</div>;
  }

  renderApplicationAssetField(fieldName: ApplicationImageUrlField, label: string, tooltip: string): React.ReactNode {
    const value = this.state.application[fieldName] || "";
    const previewLabel = `${label} ${i18next.t("general:Preview")}`;

    return (
      <Row className="application-edit-control-row-medium application-edit-asset-row application-edit-image-url-row" style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
          {Setting.getLabel(label, tooltip)} :
        </Col>
        <Col span={21} >
          <div className="application-edit-asset-control">
            <Input prefix={<LinkOutlined />} value={value} onChange={e => {
              this.updateApplicationField(fieldName, e.target.value);
            }} />
            <div className="application-edit-asset-preview" aria-label={previewLabel}>
              {value ? (
                <a target="_blank" rel="noreferrer" href={value}>
                  <img src={value} alt={previewLabel} />
                </a>
              ) : (
                <span className="application-edit-asset-preview-placeholder">{i18next.t("application:Not configured")}</span>
              )}
            </div>
          </div>
        </Col>
      </Row>
    );
  }

  handleUpload(info: LegacyAny): void {
    if (info.file.type !== "text/html") {
      Setting.showMessage("error", i18next.t("application:Please select a HTML file"));
      return;
    }
    this.setState({uploading: true});
    const fullFilePath = buildTermsOfUseResourcePath(this.state.application.owner, this.state.application.name);
    ResourceBackend.uploadResource(this.props.account.owner, this.props.account.name, "termsOfUse", "ApplicationEditPage", fullFilePath, info.file)
      .then((res: BackendResponse<string>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("application:File uploaded successfully"));
          this.updateApplicationField("termsOfUse", res.data);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      }).finally(() => {
        this.setState({uploading: false});
      });
  }

  renderApplicationForm(): React.ReactNode {
    // Tab 展示层通过显式上下文读取草稿和回调，页面本体只负责状态与异步协调。
    return renderApplicationEditForm(this);
  }
  renderApplication(): React.ReactNode {
    return (
      <Card
        className="admin-large-edit-card application-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="application-edit"
          backLabel={i18next.t("general:Back")}
          breadcrumb={<React.Fragment>{i18next.t("general:Application Access")} / {i18next.t("general:Applications")} /</React.Fragment>}
          title={this.getApplicationEditTitle()}
          dirty={this.state.dirty}
          dirtyLabel={i18next.t("application:Unsaved changes")}
          tabs={this.renderEditTabs()}
          actions={this.renderEditFooter()}
          onBack={() => this.handleBack()}
        >
          <div className="admin-large-edit-form-content application-edit-form-content">
            {this.renderApplicationForm()}
          </div>
        </LargeEditShell>
      </Card>
    );
  }

  getPreviewThemeColor(): string {
    return this.state.application.themeData?.colorPrimary || Conf.ThemeDefault.colorPrimary || "#1677ff";
  }

  getPreviewLogoText(): string {
    const displayName = String(this.state.application.displayName || this.state.application.name || "A");
    return displayName.trim().slice(0, 2).toUpperCase();
  }

  getVisiblePreviewItemLabels(items: LegacyAny, fallbackLabels: string[]): string[] {
    if (!Array.isArray(items)) {
      return fallbackLabels;
    }

    const labels = items
      .filter((item: LegacyAny) => item?.visible !== false)
      .map((item: LegacyAny) => item?.displayName || item?.label || item?.name)
      .filter(Boolean)
      .map((item: LegacyAny) => String(item));

    return labels.length > 0 ? labels.slice(0, 4) : fallbackLabels;
  }

  renderStaticPreviewPanel(title: string, actionLabel: string, fields: string[], variant: string): React.ReactNode {
    const themeColor = this.getPreviewThemeColor();
    const backgroundUrl = this.state.application.formBackgroundUrl;
    const backgroundStyle: React.CSSProperties = backgroundUrl ? {
      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.54), rgba(15, 23, 42, 0.18)), url(${backgroundUrl})`,
    } : {};

    return (
      <div className={`application-edit-static-preview application-edit-static-preview-${variant}`} style={backgroundStyle}>
        <div className="application-edit-static-preview-card">
          <div className="application-edit-static-preview-logo" style={{backgroundColor: themeColor}}>
            {this.getPreviewLogoText()}
          </div>
          <div className="application-edit-static-preview-app-name">
            {this.state.application.displayName || this.state.application.name}
          </div>
          <div className="application-edit-static-preview-title">
            {title}
          </div>
          <div className="application-edit-static-preview-fields">
            {fields.map((field, index) => (
              <div className="application-edit-static-preview-field" key={`${variant}-${field}-${index}`}>
                {field}
              </div>
            ))}
          </div>
          <div className="application-edit-static-preview-action" style={{backgroundColor: themeColor}}>
            {actionLabel}
          </div>
        </div>
      </div>
    );
  }

  renderSignupSigninPreview(): React.ReactNode {
    let signUpUrl = `/signup/${this.state.application.name}`;

    const redirectUris = this.state.application.redirectUris || [];
    let redirectUri: string;
    if (redirectUris.length > 0) {
      redirectUri = redirectUris[0];
    } else {
      redirectUri = "\"ERROR: You must specify at least one Redirect URL in 'Redirect URLs'\"";
    }

    const clientId = this.state.application.clientId;
    const organizationQuery = this.state.application.isShared ? `&organization=${encodeURIComponent(this.props.account.owner)}` : "";
    const signInUrl = `/login/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=read&state=aicodex-admin${organizationQuery}`;
    if (!Setting.isPasswordEnabled(this.state.application)) {
      signUpUrl = signInUrl.replace("/login/oauth/authorize", "/signup/oauth/authorize");
    }
    const signupFields = this.getVisiblePreviewItemLabels(this.state.application.signupItems, [
      i18next.t("general:Email"),
      i18next.t("general:Display name"),
    ]);
    const signinFields = this.getVisiblePreviewItemLabels(this.state.application.signinItems, [
      i18next.t("general:Email"),
      i18next.t("general:Password"),
    ]);

    return (
      <React.Fragment>
        <Col className="application-edit-preview-column" span={previewGrid}>
          <Button style={{marginBottom: "10px"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
            copy(`${window.location.origin}${signUpUrl}`);
            Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
          }}
          >
            {i18next.t("application:Copy signup page URL")}
          </Button>
          <br />
          {this.renderStaticPreviewPanel(i18next.t("account:Sign Up"), i18next.t("account:Sign Up"), signupFields, "signup")}
        </Col>
        <Col className="application-edit-preview-column" span={previewGrid}>
          <Button style={{marginBottom: "10px", marginTop: Setting.isMobile() ? "15px" : "0"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
            copy(`${window.location.origin}${signInUrl}`);
            Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
          }}
          >
            {i18next.t("application:Copy signin page URL")}
          </Button>
          <br />
          {this.renderStaticPreviewPanel(i18next.t("login:Sign In"), i18next.t("login:Sign In"), signinFields, "signin")}
        </Col>
      </React.Fragment>
    );
  }

  renderPromptPreview(): React.ReactNode {
    const promptUrl = `/prompt/${this.state.application.name}`;
    const promptedProviders = (this.state.application.providers || [])
      .filter((providerItem: LegacyAny) => Setting.isProviderPrompted(providerItem))
      .map((providerItem: LegacyAny) => providerItem?.provider?.displayName || providerItem?.provider?.name || providerItem?.name)
      .filter(Boolean)
      .map((name: LegacyAny) => String(name));
    const fields = promptedProviders.length > 0 ? promptedProviders.slice(0, 4) : [
      i18next.t("application:Binding providers"),
    ];

    return (
      <Col className="application-edit-preview-column" span={previewGrid}>
        <Button style={{marginBottom: "10px"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
          copy(`${window.location.origin}${promptUrl}`);
          Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
        }}
        >
          {i18next.t("application:Copy prompt page URL")}
        </Button>
        <br />
        {this.renderStaticPreviewPanel(i18next.t("application:Binding providers"), i18next.t("code:Submit and complete"), fields, "prompt")}
      </Col>
    );
  }

  submitApplicationEdit(exitAfterSave: boolean): void {
    if (this.state.submitting || this.state.postCreateReloadStatus !== "idle") {
      return;
    }

    const application = Setting.deepCopy(this.state.application);
    if (!this.validateApplicationBeforeSave(application)) {
      return;
    }

    // Provider 选项异步加载完成前保留草稿绑定，避免快速保存把新增或复制来源静默过滤掉。
    if (this.state.providersLoaded) {
      application.providers = filterProvidersForSave(application.providers, this.state.providers.map(provider => provider.name));
    }
    application.signinMethods = filterSigninMethodsForSave(application.signinMethods);
    const customScopeValidation = validateCustomScopes(application.customScopes);
    application.customScopes = customScopeValidation.scopes;
    if (!customScopeValidation.ok) {
      this.setActiveTabKey("oidc-oauth");
      Setting.showMessage("error", `${i18next.t("general:Name")}: ${i18next.t("provider:This field is required")}`);
      return;
    }

    this.setState({submitting: true});
    const isAdding = this.state.mode === "add";
    const saveApplication = isAdding
      ? ApplicationBackend.addApplication(application)
      : ApplicationBackend.updateApplication("admin", this.state.applicationName, application);
    saveApplication
      .then((res: BackendResponse<ApplicationRecord>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          const completedSaveState = {
            applicationName: application.name,
            mode: "edit",
            dirty: false,
            submitting: false,
            fieldErrors: {},
          };

          if (exitAfterSave) {
            this.setState(completedSaveState);
            this.props.history.push("/applications");
          } else {
            const afterSave = () => {
              this.props.history.push(`/applications/${application.organization}/${application.name}`);
              if (isAdding) {
                this.reloadCreatedApplication();
              }
            };
            if (isAdding) {
              // 新增接口会生成凭据等服务端字段；回读成功前禁止用不完整草稿执行 update。
              this.setState({...completedSaveState, postCreateReloadStatus: "loading"}, afterSave);
            } else {
              this.setState(completedSaveState, afterSave);
            }
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode === "add") {
            this.setState({submitting: false});
          } else {
            this.setState(state => ({
              application: {
                ...state.application,
                name: state.applicationName,
              },
              submitting: false,
            }));
          }
        }
      })
      .catch((error: LegacyAny) => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  validateApplicationBeforeSave(application: ApplicationRecord): boolean {
    const requiredError = i18next.t("provider:This field is required");
    const fieldErrors: Record<string, string> = {};
    getRequiredApplicationFieldNames(application).forEach((fieldName) => {
      fieldErrors[fieldName] = requiredError;
    });

    if (Object.keys(fieldErrors).length === 0) {
      this.setState({fieldErrors: {}});
      return true;
    }

    this.setActiveTabKey("basic");
    this.setState({fieldErrors});
    const firstErrorLabel = fieldErrors.name ? i18next.t("general:Name") : i18next.t("general:Display name");
    Setting.showMessage("error", `${firstErrorLabel}: ${requiredError}`);
    return false;
  }

  confirmDiscardChanges(onConfirm: () => void): void {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: i18next.t("application:Unsaved changes"),
      content: i18next.t("application:Discard unsaved changes confirmation"),
      okText: i18next.t("general:OK"),
      cancelText: i18next.t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  returnToApplicationList(): void {
    this.props.history.push("/applications");
  }

  handleBack(): void {
    this.confirmDiscardChanges(() => {
      this.returnToApplicationList();
    });
  }

  handleCancel(): void {
    this.confirmDiscardChanges(() => {
      this.returnToApplicationList();
    });
  }

  getApplicationEditTitle(): string {
    return this.state.mode === "add" ? i18next.t("application:New Application") : i18next.t("application:Edit Application");
  }

  renderEditFooter(): React.ReactNode {
    const saveBlocked = this.state.submitting || this.state.postCreateReloadStatus !== "idle";
    return (
      <React.Fragment>
        <Button disabled={this.state.submitting} onClick={() => this.handleCancel()}>{i18next.t("general:Cancel")}</Button>
        <Button type="primary" disabled={saveBlocked} loading={this.state.submitting || this.state.postCreateReloadStatus === "loading"} onClick={() => this.submitApplicationEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button disabled={saveBlocked} onClick={() => this.submitApplicationEdit(true)}>{i18next.t("application:Save and return")}</Button>
      </React.Fragment>
    );
  }

  deleteApplication(): void {
    ApplicationBackend.deleteApplication(this.state.application)
      .then((res: BackendResponse<null>) => {
        if (res.status === "ok") {
          this.props.history.push("/applications");
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: LegacyAny) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    if (!this.state.isAuthorized) {
      return (
        <Result
          status="403"
          title="403 Unauthorized"
          subTitle={i18next.t("general:Sorry, you do not have permission to access this page or logged in status invalid.")}
          extra={<a href="/"><Button type="primary">{i18next.t("general:Back Home")}</Button></a>}
        />
      );
    }

    return (
      <div className="admin-large-edit-page application-edit-page">
        {
          this.state.application !== null ? this.renderApplication() : null
        }
      </div>
    );
  }
}

export default ApplicationEditPage;
