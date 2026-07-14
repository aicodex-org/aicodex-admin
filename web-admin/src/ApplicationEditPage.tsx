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
  InputNumber,
  Modal,
  Popover,
  Radio,
  Result,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
  Upload, message
} from "antd";
import {CopyOutlined, HolderOutlined, LinkOutlined, UploadOutlined, UsergroupAddOutlined} from "@ant-design/icons";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as CertBackend from "./backend/CertBackend";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ResourceBackend from "./backend/ResourceBackend";
import i18nextRaw from "i18next";
import UrlTable from "./table/UrlTable";
import ProviderTable from "./table/ProviderTable";
import ApplicationIdentitySourceBindings from "./ApplicationIdentitySourceBindings";
import SigninMethodTable from "./table/SigninMethodTable";
import SignupTable from "./table/SignupTable";
import SamlAttributeTable from "./table/SamlAttributeTable";
import ScopeTable from "./table/ScopeTable";
import copy from "copy-to-clipboard";
import ThemeEditor from "./common/theme/ThemeEditor";

import SigninTable from "./table/SigninTable";
import Editor from "./common/Editor";
import * as GroupBackend from "./backend/GroupBackend";
import TokenAttributeTable from "./table/TokenAttributeTable";
import PaginateSelect from "./common/PaginateSelect";
import LargeEditShell, {LargeEditTabs} from "./common/LargeEditShell";

const {Option} = Select;

type LegacyAny = any;

type ApplicationEditTabKey = "basic" | "authentication" | "oidc-oauth" | "saml" | "providers" | "ui-customization" | "security" | "reverse-proxy";
type ApplicationImageUrlField = "logo" | "favicon" | "formBackgroundUrl" | "formBackgroundUrlMobile";

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

interface ApplicationEditPageProps {
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

interface ApplicationEditPageState {
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

interface CustomScopeValidation {
  ok: boolean;
  scopes: LegacyAny[];
}

// 历史页面依赖大量 JS backend 和未迁移子组件，先在页面边界封住动态字段，避免扩大迁移范围。
const i18next = {
  t: (key: string, options?: Record<string, LegacyAny>): string => String(i18nextRaw.t(key, options)),
};

const template = `<style>
  .login-panel {
    padding: 40px 70px 0 70px;
    border-radius: 10px;
    background-color: #ffffff;
    box-shadow: 0 0 30px 20px rgba(0, 0, 0, 0.20);
  }
  .login-panel-dark {
    padding: 40px 70px 0 70px;
    border-radius: 10px;
    background-color: #333333;
    box-shadow: 0 0 30px 20px rgba(255, 255, 255, 0.20);
  }
  .forget-content {
    padding: 10px 100px 20px;
    margin: 30px auto;
    border: 2px solid #fff;
    border-radius: 7px;
    background-color: rgb(255 255 255);
    box-shadow: 0 0 20px rgb(0 0 0 / 20%);
  }
</style>`;

const previewGrid = Setting.isMobile() ? 22 : 11;

const sideTemplate = `<style>
  .left-model{
    text-align: center;
    padding: 30px;
    background-color: #8ca0ed;
    position: absolute;
    transform: none;
    width: 100%;
    height: 100%;
  }
  .side-logo{
    display: flex;
    align-items: center;
  }
  .side-logo span {
    font-family: Montserrat, sans-serif;
    font-weight: 900;
    font-size: 2.4rem;
    line-height: 1.3;
    margin-left: 16px;
    color: #404040;
  }
  .img{
    max-width: none;
    margin: 41px 0 13px;
  }
</style>
<div class="left-model">
  <span class="side-logo"> <img src="${Conf.BrandIcon}" alt="${Conf.BrandName}" style="width: 72px; height: 72px; object-fit: contain;">
    <span>SSO</span>
  </span>
  <div class="img">
    <img src="${Conf.BrandIcon}" alt="${Conf.BrandName}"/>
  </div>
</div>
`;

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
    if (application.grantTypes === null || application.grantTypes === undefined || application.grantTypes.length === 0) {
      application.grantTypes = ["authorization_code"];
    }

    if (application.tags === null || application.tags === undefined) {
      application.tags = [];
    }

    if (application.providers === null || application.providers === undefined) {
      // 后端空切片可能序列化为 null，编辑页统一按空数组处理，避免空表格操作崩溃。
      application.providers = [];
    }

    this.setState({
      application,
      dirty: false,
      fieldErrors: {},
      postCreateReloadStatus: "idle",
    });
    this.getProviders(application);
    this.getCerts(application);
    this.getSamlMetadata(application.enableSamlPostBinding);
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

  parseApplicationField(key: string, value: LegacyAny): LegacyAny {
    if (["offset"].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  trimCustomScopes(customScopes: LegacyAny): LegacyAny[] {
    if (!Array.isArray(customScopes)) {
      return [];
    }
    return customScopes.map((item) => {
      const scope = (item?.scope || "").trim();
      const displayName = (item?.displayName || "").trim();
      const description = (item?.description || "").trim();
      return {
        ...item,
        scope: scope,
        displayName: displayName,
        description: description,
      };
    });
  }

  validateCustomScopes(customScopes: LegacyAny): CustomScopeValidation {
    const trimmed = this.trimCustomScopes(customScopes);
    for (const item of trimmed) {
      if (!item || !item.scope || item.scope === "") {
        return {ok: false, scopes: trimmed};
      }
    }
    return {ok: true, scopes: trimmed};
  }

  updateApplicationField(key: string, value: LegacyAny): void {
    value = this.parseApplicationField(key, value);
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
    });
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
    const fullFilePath = `termsOfUse/${this.state.application.owner}/${this.state.application.name}.html`;
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
    const activeTabKey = this.getActiveTabKey();
    return <>
      {activeTabKey === "basic" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:Basic information"))}
          <Row className="application-edit-control-row-medium" style={{marginTop: "10px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {this.renderRequiredFieldLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input status={this.state.fieldErrors.name ? "error" : undefined} value={this.state.application.name} disabled={this.state.application.name === "app-built-in"} onChange={e => {
                const value = e.target.value;
                if (/[/?:@#&%=+;]/.test(value)) {
                  const invalidChars = "/ ? : @ # & % = + ;";
                  const messageText = i18next.t("application:Invalid characters in application name") + ":" + " " + invalidChars;
                  message.error(messageText);
                  return;
                }
                this.updateApplicationField("name", e.target.value);
              }} />
              {this.renderFieldError("name")}
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {this.renderRequiredFieldLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input status={this.state.fieldErrors.displayName ? "error" : undefined} value={this.state.application.displayName} onChange={e => {
                this.updateApplicationField("displayName", e.target.value);
              }} />
              {this.renderFieldError("displayName")}
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Category"), i18next.t("general:Category - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={this.state.application.category}
                onChange={(value) => {
                  this.updateApplicationField("category", value);
                  if (value === "Agent") {
                    this.updateApplicationField("type", "MCP");
                  } else {
                    this.updateApplicationField("type", "All");
                  }
                }}
              >
                <Option value="Default">Default</Option>
                <Option value="Agent">Agent</Option>
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={this.state.application.type}
                onChange={(value) => {
                  this.updateApplicationField("type", value);
                }}
              >
                {
                  (this.state.application.category === "Agent") ? (
                    <>
                      <Option value="MCP">MCP</Option>
                      <Option value="A2A">A2A</Option>
                    </>
                  ) : (
                    <>
                      <Option value="All">All</Option>
                      <Option value="OIDC">OIDC</Option>
                      <Option value="OAuth">OAuth</Option>
                      <Option value="SAML">SAML</Option>
                      <Option value="CAS">CAS</Option>
                    </>
                  )
                }
              </Select>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Is shared"), i18next.t("general:Is shared - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Switch disabled={Setting.isAdminUser()} checked={this.state.application.isShared} onChange={checked => {
                this.updateApplicationField("isShared", checked);
                this.updateApplicationField("organizationResolutionMode", checked ? "shared_application" : "organization_bound");
              }} />
            </Col>
          </Row>
          {this.renderApplicationAssetField("logo", i18next.t("general:Logo"), i18next.t("general:Logo - Tooltip"))}
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Title"), i18next.t("general:Title - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.title} onChange={e => {
                this.updateApplicationField("title", e.target.value);
              }} />
            </Col>
          </Row>
          {this.renderApplicationAssetField("favicon", i18next.t("general:Favicon"), i18next.t("general:Favicon - Tooltip"))}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Home"), i18next.t("general:Home - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.homepageUrl} onChange={e => {
                this.updateApplicationField("homepageUrl", e.target.value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Description"), i18next.t("general:Description - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.description} onChange={e => {
                this.updateApplicationField("description", e.target.value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Organization"), i18next.t("general:Organization - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={this.state.application.organization} onChange={(value => {this.updateApplicationField("organization", value);})}>
                {
                  this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("organization:Tags"), i18next.t("application:Tags - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} mode="tags" style={{width: "100%"}} value={this.state.application.tags} onChange={(value => {this.updateApplicationField("tags", value);})}>
                {
                  this.state.application.tags?.map((item, index) => <Option key={index} value={item}>{item}</Option>)
                }
              </Select>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Order"), i18next.t("application:Order - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.order} min={0} step={1} precision={0} addonAfter="" onChange={value => {
                this.updateApplicationField("order", value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Menu mode"), i18next.t("application:Menu mode - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Radio.Group value={this.state.menuMode} onChange={e => this.setState({menuMode: e.target.value})}>
                <Radio value="horizontal">{i18next.t("application:Horizontal")}</Radio>
                <Radio value="vertical">{i18next.t("application:Vertical")}</Radio>
              </Radio.Group>
            </Col>
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "authentication" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:Authentication settings"))}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Cookie expire"), i18next.t("application:Cookie expire - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.cookieExpireInHours || 720} min={1} step={1} precision={0} addonAfter={i18next.t("application:Hours")} onChange={value => {
                this.updateApplicationField("cookieExpireInHours", value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("ldap:Default group"), i18next.t("ldap:Default group - Tooltip"))} :
            </Col>
            <Col span={21}>
              <PaginateSelect
                virtual
                style={{width: "100%"}}
                allowClear
                placeholder={i18next.t("general:Default")}
                value={this.state.application.defaultGroup || undefined}
                fetchPage={GroupBackend.getGroups}
                buildFetchArgs={({page, pageSize, searchText}: {page: number; pageSize: number; searchText: string}) => {
                  const field = searchText ? "name" : "";
                  return [this.state.owner, false, page, pageSize, field, searchText, "", ""];
                }}
                reloadKey={this.state.owner}
                optionMapper={(group: LegacyAny) => Setting.getOption(
                  <Space>
                    {group.type === "Physical" ? <UsergroupAddOutlined /> : <HolderOutlined />}
                    {group.displayName}
                  </Space>,
                  `${group.owner}/${group.name}`
                )}
                filterOption={false}
                onChange={(value: LegacyAny) => {
                  this.updateApplicationField("defaultGroup", value || "");
                }}
              />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable signup"), i18next.t("application:Enable signup - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSignUp} onChange={checked => {
                this.updateApplicationField("enableSignUp", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Disable signin"), i18next.t("application:Disable signin - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.disableSignin} onChange={checked => {
                this.updateApplicationField("disableSignin", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable exclusive signin"), i18next.t("application:Enable exclusive signin - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableExclusiveSignin} onChange={checked => {
                this.updateApplicationField("enableExclusiveSignin", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Signin session"), i18next.t("application:Enable signin session - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSigninSession} onChange={checked => {
                if (!checked) {
                  this.updateApplicationField("enableAutoSignin", false);
                }

                this.updateApplicationField("enableSigninSession", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Auto signin"), i18next.t("application:Auto signin - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableAutoSignin} onChange={checked => {
                if (!this.state.application.enableSigninSession && checked) {
                  Setting.showMessage("error", i18next.t("application:Please enable \"Signin session\" first before enabling \"Auto signin\""));
                  return;
                }

                this.updateApplicationField("enableAutoSignin", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable Email linking"), i18next.t("application:Enable Email linking - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableLinkWithEmail} onChange={checked => {
                this.updateApplicationField("enableLinkWithEmail", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Signup URL"), i18next.t("general:Signup URL - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.signupUrl} onChange={e => {
                this.updateApplicationField("signupUrl", e.target.value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Signin URL"), i18next.t("general:Signin URL - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.signinUrl} onChange={e => {
                this.updateApplicationField("signinUrl", e.target.value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Forget URL"), i18next.t("general:Forget URL - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.forgetUrl} onChange={e => {
                this.updateApplicationField("forgetUrl", e.target.value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Affiliation URL"), i18next.t("general:Affiliation URL - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.affiliationUrl} onChange={e => {
                this.updateApplicationField("affiliationUrl", e.target.value);
              }} />
            </Col>
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "oidc-oauth" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:OIDC/OAuth settings"))}
          <Row style={{marginTop: "10px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:Client ID"), i18next.t("provider:Client ID - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.clientId} onChange={e => {
                this.updateApplicationField("clientId", e.target.value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Organization resolution mode"), i18next.t("application:Organization resolution mode - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}}
                value={this.state.application.organizationResolutionMode || (this.state.application.isShared ? "shared_application" : "organization_bound")}
                onChange={(value) => {
                  this.updateApplicationField("organizationResolutionMode", value);
                  this.updateApplicationField("isShared", value === "shared_application");
                }} >
                <Option value="organization_bound">{i18next.t("application:Organization bound")}</Option>
                <Option value="shared_application">{i18next.t("application:Shared application")}</Option>
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Allowed organizations"), i18next.t("application:Allowed organizations - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} mode="multiple" style={{width: "100%"}}
                disabled={(this.state.application.organizationResolutionMode || (this.state.application.isShared ? "shared_application" : "organization_bound")) !== "shared_application"}
                value={this.state.application.allowedOrganizations || []}
                onChange={(value) => this.updateApplicationField("allowedOrganizations", value)} >
                {this.state.organizations.map((organization) => (
                  <Option key={organization.name} value={organization.name}>{organization.displayName || organization.name}</Option>
                ))}
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Allowed organization policy"), i18next.t("application:Allowed organization policy - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}}
                value={this.state.application.allowedOrganizationStatus || "PENDING_REVIEW"}
                onChange={(value) => this.updateApplicationField("allowedOrganizationStatus", value)} >
                <Option value="CONFIRMED">{i18next.t("application:Confirmed")}</Option>
                <Option value="PENDING_REVIEW">{i18next.t("application:Pending review")}</Option>
                <Option value="CONFLICTED">{i18next.t("application:Conflicted")}</Option>
                <Option value="DISABLED">{i18next.t("application:Disabled")}</Option>
              </Select>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Require API mapping"), i18next.t("application:Require API mapping - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Switch checked={this.state.application.apiMappingRequired} onChange={checked => {
                this.updateApplicationField("apiMappingRequired", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "10px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:Client secret"), i18next.t("provider:Client secret - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.clientSecret} onChange={e => {
                this.updateApplicationField("clientSecret", e.target.value);
              }} />
            </Col>
          </Row>
          {this.renderFullWidthContentRow(
            <UrlTable
              title={i18next.t("application:Redirect URLs")}
              table={this.state.application.redirectUris}
              onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("redirectUris", value);}}
            />,
            {className: "application-edit-table-row"}
          )}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Forced redirect origin"), i18next.t("general:Forced redirect origin - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.forcedRedirectOrigin} onChange={e => {
                this.updateApplicationField("forcedRedirectOrigin", e.target.value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Grant types"), i18next.t("application:Grant types - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} mode="multiple" style={{width: "100%"}}
                value={this.state.application.grantTypes}
                onChange={(value => {
                  this.updateApplicationField("grantTypes", value);
                })} >
                {
                  [
                    {id: "authorization_code", name: "Authorization Code"},
                    {id: "password", name: "Password"},
                    {id: "client_credentials", name: "Client Credentials"},
                    {id: "token", name: "Token"},
                    {id: "id_token", name: "ID Token"},
                    {id: "refresh_token", name: "Refresh Token"},
                    {id: "urn:ietf:params:oauth:grant-type:device_code", name: "Device Code"},
                    {id: "urn:ietf:params:oauth:grant-type:jwt-bearer", name: "JWT Bearer"},
                  ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
          {
            (this.state.application.category === "Agent") ? (
              this.renderFullWidthContentRow(
                <ScopeTable
                  title={i18next.t("general:Scopes")}
                  table={this.state.application.scopes}
                  onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("scopes", value);}}
                />,
                {className: "application-edit-table-row"}
              )
            ) : null
          }
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Token format"), i18next.t("application:Token format - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.tokenFormat} onChange={(value => {this.updateApplicationField("tokenFormat", value);})}
                options={["JWT", "JWT-Empty", "JWT-Custom", "JWT-Standard"].map((item) => Setting.getOption(item, item))}
              />
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Token signing method"), i18next.t("application:Token signing method - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.tokenSigningMethod === "" ? "RS256" : this.state.application.tokenSigningMethod} onChange={(value => {this.updateApplicationField("tokenSigningMethod", value);})}
                options={["RS256", "RS512", "ES256", "ES512", "ES384"].map((item) => Setting.getOption(item, item))}
              />
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Token fields"), i18next.t("application:Token fields - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} disabled={this.state.application.tokenFormat !== "JWT-Custom"} mode="tags" showSearch style={{width: "100%"}} value={this.state.application.tokenFields} onChange={(value => {this.updateApplicationField("tokenFields", value);})}>
                <Option key={"signinMethod"} value={"signinMethod"}>{"SigninMethod"}</Option>
                <Option key={"provider"} value={"provider"}>{"Provider"}</Option>
                {
                  [...Setting.getUserCommonFields(), "permissionNames"].map((item, index) => <Option key={index} value={item}>{item}</Option>)
                }
              </Select>
            </Col>
          </Row>
          {
            this.state.application.tokenFormat === "JWT-Custom" ? this.renderFullWidthContentRow(
              <TokenAttributeTable
                title={i18next.t("general:Token attributes")}
                table={this.state.application.tokenAttributes}
                application={this.state.application}
                onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("tokenAttributes", value);}}
              />,
              {className: "application-edit-table-row"}
            ) : null
          }
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Token expire"), i18next.t("application:Token expire - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.expireInHours} min={0.01} step={1} precision={2} addonAfter={i18next.t("application:Hours")} onChange={value => {
                this.updateApplicationField("expireInHours", value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Refresh token expire"), i18next.t("application:Refresh token expire - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.refreshExpireInHours} min={0.01} step={1} precision={2} addonAfter={i18next.t("application:Hours")} onChange={value => {
                this.updateApplicationField("refreshExpireInHours", value);
              }} />
            </Col>
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "saml" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:SAML settings"))}
          <Row style={{marginTop: "10px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:SAML reply URL"), i18next.t("application:Redirect URL (Assertion Consumer Service POST Binding URL) - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.samlReplyUrl} onChange={e => {
                this.updateApplicationField("samlReplyUrl", e.target.value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable SAML compression"), i18next.t("application:Enable SAML compression - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSamlCompress} onChange={checked => {
                this.updateApplicationField("enableSamlCompress", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable SAML C14N10"), i18next.t("application:Enable SAML C14N10 - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSamlC14n10} onChange={checked => {
                this.updateApplicationField("enableSamlC14n10", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Use Email as NameID"), i18next.t("application:Use Email as NameID - Tooltip"))} :
            </Col>
            <Col span={1}>
              <Switch checked={this.state.application.useEmailAsSamlNameId} onChange={checked => {
                this.updateApplicationField("useEmailAsSamlNameId", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable SAML POST binding"), i18next.t("application:Enable SAML POST binding - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSamlPostBinding} onChange={checked => {
                this.updateApplicationField("enableSamlPostBinding", checked);
                this.getSamlMetadata(checked);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:SAML hash algorithm"), i18next.t("application:SAML hash algorithm - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}}
                value={this.state.application.samlHashAlgorithm}
                onChange={(value => {
                  this.updateApplicationField("samlHashAlgorithm", value);
                })} >
                {
                  [
                    {id: "SHA1", name: "SHA1"},
                    {id: "SHA256", name: "SHA256"},
                    {id: "SHA512", name: "SHA512"},
                  ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Disable SAML attributes"), i18next.t("application:Disable SAML attributes - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.disableSamlAttributes} onChange={checked => {
                this.updateApplicationField("disableSamlAttributes", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
              {Setting.getLabel(i18next.t("application:Enable SAML assertion signature"), i18next.t("application:Enable SAML assertion signature - Tooltip"))} :
            </Col>
            <Col span={1} >
              <Switch checked={this.state.application.enableSamlAssertionSignature} onChange={checked => {
                this.updateApplicationField("enableSamlAssertionSignature", checked);
              }} />
            </Col>
          </Row>
          {
            !this.state.application.disableSamlAttributes ? (
              this.renderFullWidthContentRow(
                <SamlAttributeTable
                  title={i18next.t("general:SAML attributes")}
                  table={this.state.application.samlAttributes}
                  application={this.state.application}
                  onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("samlAttributes", value);}}
                />,
                {className: "application-edit-table-row"}
              )
            ) : null
          }
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:SAML metadata"), i18next.t("application:SAML metadata - Tooltip"))} :
            </Col>
            <Col span={21}>
              <Editor value={this.state.samlMetadata?.toString() ?? ""} lang="xml" readOnly />
              <br />
              <Button style={{marginBottom: "10px"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
                copy(`${window.location.origin}/api/saml/metadata?application=admin/${encodeURIComponent(this.state.applicationName)}&enablePostBinding=${this.state.application.enableSamlPostBinding}`);
                Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
              }}
              >
                {i18next.t("application:Copy SAML metadata URL")}
              </Button>
            </Col>
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "providers" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:Provider bindings"))}
          {this.renderFullWidthContentRow(
            <>
              <ProviderTable
                title={i18next.t("application:Providers")}
                table={this.state.application.providers}
                providers={this.state.providers}
                application={this.state.application}
                onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("providers", value);}}
              />
              <ApplicationIdentitySourceBindings
                application={this.state.application}
                providers={this.state.providers}
                organizations={this.state.organizations}
                onChange={(value: LegacyAny) => {this.updateApplicationField("providers", value);}}
              />
            </>,
            {className: "application-edit-table-row", marginTop: "10px"}
          )}
        </React.Fragment>
      )}
      {activeTabKey === "ui-customization" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:UI customization settings"))}
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Org choice mode"), i18next.t("application:Org choice mode - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}}
                options={[
                  {label: i18next.t("general:None"), value: "None"},
                  {label: i18next.t("application:Select"), value: "Select"},
                  {label: i18next.t("application:Input"), value: "Input"},
                ].map((item) => {
                  return Setting.getOption(item.label, item.value);
                })}
                value={this.state.application.orgChoiceMode ?? []}
                onChange={(value => {
                  this.updateApplicationField("orgChoiceMode", value);
                })} >
              </Select>
            </Col>
          </Row>
          {this.renderFullWidthContentRow(
            <SigninMethodTable
              title={i18next.t("application:Signin methods")}
              table={this.state.application.signinMethods}
              onUpdateTable={(value: LegacyAny) => {
                this.updateApplicationField("signinMethods", value);
              }}
            />,
            {className: "application-edit-table-row"}
          )}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:Signup HTML"), i18next.t("provider:Signup HTML - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor value={this.state.application.signupHtml} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                    this.updateApplicationField("signupHtml", value);
                  }} />
                </div>
              } title={i18next.t("provider:Signup HTML - Edit")} trigger="click">
                <Input value={this.state.application.signupHtml} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("signupHtml", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:Signin HTML"), i18next.t("provider:Signin HTML - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor value={this.state.application.signinHtml} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                    this.updateApplicationField("signinHtml", value);
                  }} />
                </div>
              } title={i18next.t("provider:Signin HTML - Edit")} trigger="click">
                <Input value={this.state.application.signinHtml} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("signinHtml", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          {this.renderFullWidthContentRow(
            <SigninTable
              title={i18next.t("application:Signin items")}
              table={this.state.application.signinItems}
              themeAlgorithm={this.state.themeAlgorithm}
              onUpdateTable={(value: LegacyAny) => {
                this.updateApplicationField("signinItems", value);
              }}
            />,
            {className: "application-edit-table-row"}
          )}
          {
            !this.state.application.enableSignUp ? null : (
              <React.Fragment>
                {this.renderFullWidthContentRow(
                  <SignupTable
                    title={i18next.t("application:Signup items")}
                    table={this.state.application.signupItems}
                    onUpdateTable={(value: LegacyAny) => {
                      this.updateApplicationField("signupItems", value);
                    }}
                  />,
                  {className: "application-edit-table-row"}
                )}
              </React.Fragment>
            )
          }
          <Row className="admin-large-edit-full-width-row application-edit-full-width-row application-edit-preview-row" style={{marginTop: "10px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Preview"), i18next.t("general:Preview - Tooltip"))} :
            </Col>
            {
              this.renderSignupSigninPreview()
            }
          </Row>
          {this.renderApplicationAssetField("formBackgroundUrl", i18next.t("application:Background URL"), i18next.t("application:Background URL - Tooltip"))}
          {this.renderApplicationAssetField("formBackgroundUrlMobile", i18next.t("application:Background URL Mobile"), i18next.t("application:Background URL Mobile - Tooltip"))}
          <Row>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Custom CSS"), i18next.t("application:Custom CSS - Tooltip"))} :
            </Col>
            <Col span={21}>
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor
                    value={this.state.application.formCss === "" ? template : this.state.application.formCss}
                    lang="css"
                    fillHeight
                    dark
                    onChange={(value: LegacyAny) => {
                      this.updateApplicationField("formCss", value);
                    }}
                  />
                </div>
              } title={i18next.t("application:Custom CSS - Edit")} trigger="click">
                <Input value={this.state.application.formCss} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("formCss", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          <Row>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Custom CSS Mobile"), i18next.t("application:Custom CSS Mobile - Tooltip"))} :
            </Col>
            <Col span={21}>
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor
                    value={this.state.application.formCssMobile === "" ? template : this.state.application.formCssMobile}
                    lang="css"
                    fillHeight
                    dark
                    onChange={(value: LegacyAny) => {
                      this.updateApplicationField("formCssMobile", value);
                    }}
                  />
                </div>
              } title={i18next.t("application:Custom CSS Mobile - Edit")} trigger="click">
                <Input value={this.state.application.formCssMobile} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("formCssMobile", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Form position"), i18next.t("application:Form position - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Row style={{marginTop: "20px"}} >
                <Radio.Group buttonStyle="solid" onChange={e => {this.updateApplicationField("formOffset", e.target.value);}} value={this.state.application.formOffset}>
                  <Radio.Button value={1}>{i18next.t("application:Left")}</Radio.Button>
                  <Radio.Button value={2}>{i18next.t("application:Center")}</Radio.Button>
                  <Radio.Button value={3}>{i18next.t("application:Right")}</Radio.Button>
                  <Radio.Button value={4}>
                    {i18next.t("application:Enable side panel")}
                  </Radio.Button>
                </Radio.Group>
              </Row>
              {this.state.application.formOffset === 4 ?
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
                    {Setting.getLabel(i18next.t("application:Side panel HTML"), i18next.t("application:Side panel HTML - Tooltip"))} :
                  </Col>
                  <Col span={21} >
                    <Popover placement="right" content={
                      <div style={{width: "900px", height: "300px"}} >
                        <Editor
                          value={this.state.application.formSideHtml === "" ? sideTemplate : this.state.application.formSideHtml}
                          lang="html"
                          fillHeight
                          dark
                          onChange={(value: LegacyAny) => {
                            this.updateApplicationField("formSideHtml", value);
                          }}
                        />
                      </div>
                    } title={i18next.t("application:Side panel HTML - Edit")} trigger="click">
                      <Input value={this.state.application.formSideHtml} style={{marginBottom: "10px"}} onChange={e => {
                        this.updateApplicationField("formSideHtml", e.target.value);
                      }} />
                    </Popover>
                  </Col>
                </Row>
                : null}
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("theme:Theme"), i18next.t("theme:Theme - Tooltip"))} :
            </Col>
            <Col span={21} style={{marginTop: "5px"}}>
              <Row>
                <Radio.Group buttonStyle="solid" value={this.state.application.themeData?.isEnabled ?? false} onChange={e => {
                  const {_, ...theme} = this.state.application.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                  this.updateApplicationField("themeData", {...theme, isEnabled: e.target.value});
                }} >
                  <Radio.Button value={false}>{i18next.t("application:Follow organization theme")}</Radio.Button>
                  <Radio.Button value={true}>{i18next.t("theme:Customize theme")}</Radio.Button>
                </Radio.Group>
              </Row>
              {
                this.state.application.themeData?.isEnabled ?
                  <Row style={{marginTop: "20px"}}>
                    <ThemeEditor themeData={this.state.application.themeData} onThemeChange={(_: LegacyAny, nextThemeData: LegacyAny) => {
                      const {isEnabled} = this.state.application.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                      this.updateApplicationField("themeData", {...nextThemeData, isEnabled});
                    }} />
                  </Row> : null
              }
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Header HTML"), i18next.t("application:Header HTML - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor
                    value={this.state.application.headerHtml}
                    lang="html"
                    fillHeight
                    dark
                    onChange={(value: LegacyAny) => {
                      this.updateApplicationField("headerHtml", value);
                    }}
                  />
                </div>
              } title={i18next.t("application:Header HTML - Edit")} trigger="click">
                <Input value={this.state.application.headerHtml} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("headerHtml", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Footer HTML"), i18next.t("application:Footer HTML - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Popover placement="right" content={
                <div style={{width: "900px", height: "300px"}} >
                  <Editor
                    value={this.state.application.footerHtml}
                    lang="html"
                    fillHeight
                    dark
                    onChange={(value: LegacyAny) => {
                      this.updateApplicationField("footerHtml", value);
                    }}
                  />
                </div>
              } title={i18next.t("application:Footer HTML - Edit")} trigger="click">
                <Input value={this.state.application.footerHtml} style={{marginBottom: "10px"}} onChange={e => {
                  this.updateApplicationField("footerHtml", e.target.value);
                }} />
              </Popover>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            </Col>
            <Button style={{marginLeft: "10px", marginBottom: "5px"}} onClick={() => this.updateApplicationField("footerHtml", Setting.getDefaultFooterContent())} >
              {i18next.t("general:Reset to Default")}
            </Button>
            <Button style={{marginLeft: "10px", marginBottom: "5px"}} onClick={() => this.updateApplicationField("footerHtml", Setting.getEmptyFooterContent())} >
              {i18next.t("application:Reset to Empty")}
            </Button>
          </Row>
          <Row className="admin-large-edit-full-width-row application-edit-full-width-row application-edit-preview-row" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:Preview"), i18next.t("general:Preview - Tooltip"))} :
            </Col>
            {
              this.renderPromptPreview()
            }
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "security" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:Security settings"))}
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Token cert"), i18next.t("application:Token cert - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.cert} onChange={(value => {this.updateApplicationField("cert", value);})}>
                {
                  this.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Client cert"), i18next.t("application:Client cert - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.clientCert} onChange={(value => {this.updateApplicationField("clientCert", value);})}>
                {
                  this.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Failed signin limit"), i18next.t("application:Failed signin limit - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.failedSigninLimit} min={1} step={1} precision={0} addonAfter={i18next.t("application:Times")} onChange={value => {
                this.updateApplicationField("failedSigninLimit", value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Failed signin frozen time"), i18next.t("application:Failed signin frozen time - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.failedSigninFrozenTime} min={1} step={1} precision={0} addonAfter={i18next.t("application:Minutes")} onChange={value => {
                this.updateApplicationField("failedSigninFrozenTime", value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Code resend timeout"), i18next.t("application:Code resend timeout - Tooltip"))} :
            </Col>
            <Col span={21} >
              <InputNumber style={{width: "150px"}} value={this.state.application.codeResendTimeout} min={0} step={1} precision={0} addonAfter={i18next.t("application:Seconds")} onChange={value => {
                this.updateApplicationField("codeResendTimeout", value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("general:IP whitelist"), i18next.t("general:IP whitelist - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input placeholder={this.state.application.organizationObj?.ipWhitelist} value={this.state.application.ipWhitelist} onChange={e => {
                this.updateApplicationField("ipWhitelist", e.target.value);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("signup:Terms of Use"), i18next.t("signup:Terms of Use - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input prefix={<LinkOutlined />} value={this.state.application.termsOfUse} style={{marginBottom: "10px"}} onChange={e => {
                this.updateApplicationField("termsOfUse", e.target.value);
              }} />
              <Upload maxCount={1} accept=".html" showUploadList={false}
                beforeUpload={file => {return false;}} onChange={info => {this.handleUpload(info);}}>
                <Button icon={<UploadOutlined />} loading={this.state.uploading}>{i18next.t("general:Click to Upload")}</Button>
              </Upload>
            </Col>
          </Row>
        </React.Fragment>
      )}
      {activeTabKey === "reverse-proxy" && (
        <React.Fragment>
          {this.renderApplicationSectionTitle(i18next.t("application:Reverse Proxy settings"))}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:Domain"), i18next.t("provider:Domain - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.domain} placeholder="e.g., blog.example.com" onChange={e => {
                this.updateApplicationField("domain", e.target.value);
              }} />
            </Col>
          </Row>
          {this.renderFullWidthContentRow(
            <UrlTable
              title={i18next.t("application:Other domains")}
              columnTitle={i18next.t("application:Domain")}
              table={this.state.application.otherDomains}
              onUpdateTable={(value: LegacyAny) => {this.updateApplicationField("otherDomains", value);}}
            />,
            {className: "application-edit-table-row"}
          )}
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:Upstream host"), i18next.t("application:Upstream host - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Input value={this.state.application.upstreamHost} placeholder="e.g., localhost:8080 or 192.168.1.100:3000" onChange={e => {
                this.updateApplicationField("upstreamHost", e.target.value);
              }} />
            </Col>
          </Row>
          <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("provider:SSL mode"), i18next.t("provider:SSL mode - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.sslMode} onChange={(value => {this.updateApplicationField("sslMode", value);})}>
                <Option value="">{i18next.t("general:None")}</Option>
                <Option value="HTTP">HTTP</Option>
                <Option value="HTTPS and HTTP">HTTPS and HTTP</Option>
                <Option value="HTTPS Only">HTTPS Only</Option>
              </Select>
            </Col>
          </Row>
          <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
              {Setting.getLabel(i18next.t("application:SSL cert"), i18next.t("application:SSL cert - Tooltip"))} :
            </Col>
            <Col span={21} >
              <Select virtual={false} style={{width: "100%"}} value={this.state.application.sslCert} onChange={(value => {this.updateApplicationField("sslCert", value);})}>
                <Option value="">{i18next.t("general:None")}</Option>
                {
                  this.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
                }
              </Select>
            </Col>
          </Row>
        </React.Fragment>
      )}</>;
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
      application.providers = application.providers?.filter((provider: LegacyAny) => this.state.providers.map(provider => provider.name).includes(provider.name));
    }
    application.signinMethods = application.signinMethods?.filter((signinMethod: LegacyAny) => ["Password", "Verification code", "WebAuthn", "LDAP", "Face ID", "WeChat", "WeCom"].includes(signinMethod.name));
    const customScopeValidation = this.validateCustomScopes(application.customScopes);
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
    if (!`${application.name ?? ""}`.trim()) {
      fieldErrors.name = requiredError;
    }
    if (!`${application.displayName ?? ""}`.trim()) {
      fieldErrors.displayName = requiredError;
    }

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
