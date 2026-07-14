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
import {Alert, Button, Card, Col, Input, Modal, Row, Select, Switch} from "antd";
import {LinkOutlined} from "@ant-design/icons";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as CertBackend from "./backend/CertBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import {renderNotificationProviderFields} from "./provider/NotificationProviderFields";
import {renderEmailProviderFields} from "./provider/EmailProviderFields";
import {renderSmsProviderFields} from "./provider/SmsProviderFields";
import {renderMfaProviderFields} from "./provider/MfaProviderFields";
import {renderSamlProviderFields} from "./provider/SamlProviderFields";
import {renderOAuthProviderFields} from "./provider/OAuthProviderFields";
import {renderCaptchaProviderFields} from "./provider/CaptchaProviderFields";
import {renderPaymentProviderFields} from "./provider/PaymentProviderFields";
import {renderWeb3ProviderFields} from "./provider/Web3ProviderFields";
import {renderStorageProviderFields} from "./provider/StorageProviderFields";
import {renderFaceIdProviderFields} from "./provider/FaceIDProviderFields";
import {renderIDVerificationProviderFields} from "./provider/IDVerificationProviderFields";
import {getWeComRequiredFields, validateWeComProviderFields} from "./provider/WeComProviderUtils";
import {renderLarkProviderGuide} from "./provider/LarkProviderGuide";
import {validateLarkProviderFields} from "./provider/LarkProviderUtils";
import LargeEditShell, {LargeEditFieldRow, LargeEditSection} from "./common/LargeEditShell";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {AccountConfig, CertConfig, ProviderConfig, ProviderFieldName, ProviderFieldValue} from "./provider/ProviderFieldTypes";

const t = i18next.t.bind(i18next) as (key: string) => string;

const {Option} = Select;

const {TextArea} = Input;

const defaultUserMapping = {
  id: "id",
  username: "username",
  displayName: "displayName",
  email: "email",
  avatarUrl: "avatarUrl",
  phone: "phone",
  countryCode: "country_code",
  firstName: "given_name",
  lastName: "family_name",
  region: "region",
  location: "location",
  affiliation: "affiliation",
  title: "title",
};

const defaultEmailMapping = {
  fromName: "fromName",
  fromAddress: "fromAddress",
  toAddress: "toAddress",
  subject: "subject",
  content: "content",
};

const defaultSmsMapping = {
  phoneNumber: "phoneNumber",
  content: "content",
};

interface ProviderEditPageProps {
  account: AccountConfig;
  history: {
    push: (path: string | {pathname: string; state?: unknown}) => void;
  };
  location: {
    mode?: "add" | "edit";
    state?: {provider?: EditableProviderConfig; mode?: "add" | "edit"};
  };
  match: {
    params: {
      organizationName: string;
      providerName: string;
    };
  };
  organizationName?: string;
}

interface OrganizationConfig {
  name: string;
  displayName?: string;
  [key: string]: unknown;
}

interface ProviderEditPageState {
  classes: ProviderEditPageProps;
  providerName: string;
  owner: string;
  provider: EditableProviderConfig;
  certs: CertConfig[];
  organizations: OrganizationConfig[];
  mode: "add" | "edit";
  dirty: boolean;
  submitting: boolean;
  requestUrl: string;
  metadataLoading: boolean;
}

interface EditableProviderConfig extends ProviderConfig {
  category: string;
  name: string;
  owner: string;
  type: string;
  userMapping: Record<string, string>;
}

interface ProviderSubTypeOption {
  id: string;
  name: string;
}

// 默认映射和路由草稿都必须复制，避免一个编辑实例污染后续新建草稿。
function normalizeProviderUserMapping(provider: EditableProviderConfig): EditableProviderConfig {
  let userMapping: Record<string, string>;
  if (provider.type === "Custom HTTP Email") {
    userMapping = provider.userMapping?.fromName ? provider.userMapping : defaultEmailMapping;
  } else if (provider.type === "Custom HTTP SMS") {
    userMapping = provider.userMapping?.phoneNumber ? provider.userMapping : defaultSmsMapping;
  } else {
    userMapping = provider.userMapping || defaultUserMapping;
  }
  return {...provider, userMapping: {...userMapping}};
}

class ProviderEditPage extends React.Component<ProviderEditPageProps, ProviderEditPageState> {
  constructor(props: ProviderEditPageProps) {
    super(props);
    const draftProvider = props.location.state?.provider
      ? normalizeProviderUserMapping({...props.location.state.provider})
      : undefined;
    const requestedMode = props.location.state?.mode ?? props.location.mode ?? "edit";
    const mode = requestedMode === "add" && draftProvider === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      providerName: draftProvider?.name ?? props.match.params.providerName,
      owner: draftProvider?.owner ?? (props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName),
      provider: draftProvider ?? null as unknown as EditableProviderConfig,
      certs: [],
      organizations: [],
      mode,
      dirty: false,
      submitting: false,
      requestUrl: "",
      metadataLoading: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getOrganizations();
    if (this.state.mode !== "add") {
      this.getProvider();
    }
    this.getCerts(this.state.owner);
  }

  getProvider() {
    ProviderBackend.getProvider(this.state.owner, this.state.providerName)
      .then((res) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "ok") {
          const provider = normalizeProviderUserMapping(res.data as EditableProviderConfig);
          this.setState({
            provider: provider,
            dirty: false,
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  getOrganizations() {
    if (Setting.isAdminUser(this.props.account)) {
      OrganizationBackend.getOrganizations("admin")
        .then((res) => {
          this.setState({
            organizations: res.data || [],
          });
        });
    }
  }

  getCerts(owner: string) {
    CertBackend.getCerts(owner)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            certs: res.data || [],
          });
        }
      });
  }

  parseProviderField(key: ProviderFieldName, value: ProviderFieldValue): ProviderFieldValue {
    if (["port"].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateProviderField(key: ProviderFieldName, value: ProviderFieldValue) {
    value = this.parseProviderField(key, value);

    const provider: EditableProviderConfig = {
      ...this.state.provider,
      userMapping: {...this.state.provider.userMapping},
    };
    if (key === "owner" && provider["owner"] !== value) {
      // the provider change the owner, reset the cert
      provider["cert"] = "";
      this.getCerts(String(value));
    }

    provider[key] = value;

    if (provider["type"] === "WeChat") {
      if (!provider["clientId"]) {
        provider["signName"] = "media";
        provider["disableSsl"] = true;
      }
      if (!provider["clientId2"]) {
        provider["signName"] = "open";
        provider["disableSsl"] = false;
      }
      if (!provider["disableSsl"]) {
        provider["signName"] = "open";
      }
    }

    if (provider["type"] === "WeCom") {
      if (!provider["subType"]) {
        provider["subType"] = "Internal";
      }
      if (!provider["method"]) {
        provider["method"] = "Normal";
      }
      if (!provider["scopes"]) {
        provider["scopes"] = "snsapi_privateinfo";
      }
    }

    this.setState({
      provider: provider,
      dirty: true,
    });
  }

  getWeComCallbackUrl(): string {
    return `${window.location.origin}/callback`;
  }

  getWeComRequiredFields(provider: ProviderConfig) {
    return getWeComRequiredFields(provider);
  }

  validateWeComProvider(provider: ProviderConfig): string {
    return validateWeComProviderFields(provider);
  }

  validateLarkProvider(provider: ProviderConfig): string {
    return validateLarkProviderFields(provider);
  }

  getProviderEditTitle(provider: ProviderConfig): string {
    if (this.state.mode === "add") {
      return t("provider:New Provider");
    }

    const displayName = provider.displayName || provider.name;
    return `${t("provider:Edit Provider")} (${displayName})`;
  }

  returnToProviderList(): void {
    this.props.history.push("/providers");
  }

  handleBack(): void {
    this.confirmDiscardChanges(() => {
      this.returnToProviderList();
    });
  }

  confirmDiscardChanges(onConfirm: () => void): void {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: t("provider:Unsaved changes"),
      content: t("provider:Discard unsaved changes confirmation"),
      okText: t("general:OK"),
      cancelText: t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  renderEditFooter(): React.ReactNode {
    return (
      <React.Fragment>
        <Button disabled={this.state.submitting} onClick={() => this.handleBack()}>{t("general:Cancel")}</Button>
        <Button type="primary" loading={this.state.submitting} onClick={() => this.submitProviderEdit(false)}>{t("general:Save")}</Button>
        <Button disabled={this.state.submitting} onClick={() => this.submitProviderEdit(true)}>{t("provider:Save and return")}</Button>
      </React.Fragment>
    );
  }

  renderFieldRow(label: React.ReactNode, control: React.ReactNode, options: {wide?: boolean} = {}): React.ReactNode {
    return (
      <LargeEditFieldRow
        classPrefix="provider-edit"
        label={label}
        wide={options.wide}
      >
        {control}
      </LargeEditFieldRow>
    );
  }

  renderSection(title: string, children: React.ReactNode): React.ReactNode {
    return (
      <LargeEditSection classPrefix="provider-edit" title={title}>
        {children}
      </LargeEditSection>
    );
  }

  renderLegacySection(title: string, children: React.ReactNode): React.ReactNode {
    return (
      <section className="admin-large-edit-section provider-edit-section">
        <h2 className="admin-large-edit-section-title provider-edit-section-title">{title}</h2>
        <div className="admin-large-edit-form-content provider-edit-form-content">
          {children}
        </div>
      </section>
    );
  }

  getOrganizationDisplayName(organization: OrganizationConfig): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  renderOrganizationOptions(): React.ReactNode {
    const options: React.ReactNode[] = [];

    options.push(
      <Option key="admin" value="admin" label={t("provider:admin (Shared)")}>
        <div className="admin-large-edit-identity-option provider-edit-organization-option">
          <span className="admin-large-edit-identity-option-name provider-edit-organization-option-name">{t("provider:admin (Shared)")}</span>
        </div>
      </Option>
    );

    this.state.organizations
      .filter((organization) => organization.name !== "admin")
      .forEach((organization) => {
        const displayName = this.getOrganizationDisplayName(organization);
        options.push(
          <Option key={organization.name} value={organization.name} label={displayName}>
            <div className="admin-large-edit-identity-option provider-edit-organization-option">
              <span className="admin-large-edit-identity-option-name provider-edit-organization-option-name">{displayName}</span>
              {displayName !== organization.name ? (
                <span className="admin-large-edit-identity-option-id provider-edit-organization-option-id">{organization.name}</span>
              ) : null}
            </div>
          </Option>
        );
      });

    return options;
  }

  renderLarkGuide(provider: ProviderConfig): React.ReactNode {
    return renderLarkProviderGuide(provider);
  }

  renderWeComGuide(provider: ProviderConfig): React.ReactNode {
    if (provider.type !== "WeCom") {
      return null;
    }

    const recommendedMode = provider.subType === "Internal"
      ? "Internal + Normal"
      : `${provider.subType} + ${provider.method}`;

    return (
      <React.Fragment>
        <Row className="admin-large-edit-full-width-row provider-edit-guide-row" style={{marginTop: "20px"}}>
          <Col span={24}>
            <Alert
              type="info"
              showIcon
              message={t("provider:WeCom web login setup")}
              description={(
                <div>
                  <div>{t("provider:Homepage QR login currently targets Internal + Normal mode first")}</div>
                  <div>{t("provider:Recommended mode")}: {recommendedMode}</div>
                  <div>{t("provider:Configure the callback URL and trusted domain in WeCom admin before testing")}</div>
                </div>
              )}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("provider:Callback URL"), t("provider:Callback URL - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input readOnly value={this.getWeComCallbackUrl()} />
          </Col>
        </Row>
      </React.Fragment>
    );
  }

  updateUserMappingField(key: string, value: string) {
    const requiredKeys = ["id", "username", "displayName"];
    const provider: EditableProviderConfig = {
      ...this.state.provider,
      userMapping: {...this.state.provider.userMapping},
    };

    if (provider.type === "Custom HTTP Email") {
      if (value === "") {
        Setting.showMessage("error", t("provider:This field is required"));
        return;
      }
    } else {
      if (value === "" && requiredKeys.includes(key)) {
        Setting.showMessage("error", t("provider:This field is required"));
        return;
      }
    }

    if (value === "") {
      delete provider.userMapping[key];
    } else {
      provider.userMapping[key] = value;
    }

    this.setState({
      provider: provider,
      dirty: true,
    });
  }

  renderUserMappingInput(): React.ReactNode {
    return (
      <React.Fragment>
        {Setting.getLabel(t("general:ID"), t("general:ID - Tooltip"))} :
        <Input value={this.state.provider.userMapping.id} onChange={e => {
          this.updateUserMappingField("id", e.target.value);
        }} />
        {Setting.getLabel(t("signup:Username"), t("signup:Username - Tooltip"))} :
        <Input value={this.state.provider.userMapping.username} onChange={e => {
          this.updateUserMappingField("username", e.target.value);
        }} />
        {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
        <Input value={this.state.provider.userMapping.displayName} onChange={e => {
          this.updateUserMappingField("displayName", e.target.value);
        }} />
        {Setting.getLabel(t("general:Email"), t("general:Email - Tooltip"))} :
        <Input value={this.state.provider.userMapping.email} onChange={e => {
          this.updateUserMappingField("email", e.target.value);
        }} />
        {Setting.getLabel(t("general:Avatar"), t("general:Avatar - Tooltip"))} :
        <Input value={this.state.provider.userMapping.avatarUrl} onChange={e => {
          this.updateUserMappingField("avatarUrl", e.target.value);
        }} />
        {Setting.getLabel(t("general:Phone"), t("general:Phone - Tooltip"))} :
        <Input value={this.state.provider.userMapping.phone} onChange={e => {
          this.updateUserMappingField("phone", e.target.value);
        }} />
        {Setting.getLabel(t("user:Country code"), t("user:Country code - Tooltip"))} :
        <Input value={this.state.provider.userMapping.countryCode} onChange={e => {
          this.updateUserMappingField("countryCode", e.target.value);
        }} />
        {Setting.getLabel(t("general:First name"), t("general:First name - Tooltip"))} :
        <Input value={this.state.provider.userMapping.firstName} onChange={e => {
          this.updateUserMappingField("firstName", e.target.value);
        }} />
        {Setting.getLabel(t("general:Last name"), t("general:Last name - Tooltip"))} :
        <Input value={this.state.provider.userMapping.lastName} onChange={e => {
          this.updateUserMappingField("lastName", e.target.value);
        }} />
        {Setting.getLabel(t("provider:Region"), t("provider:Region - Tooltip"))} :
        <Input value={this.state.provider.userMapping.region} onChange={e => {
          this.updateUserMappingField("region", e.target.value);
        }} />
        {Setting.getLabel(t("user:Location"), t("user:Location - Tooltip"))} :
        <Input value={this.state.provider.userMapping.location} onChange={e => {
          this.updateUserMappingField("location", e.target.value);
        }} />
        {Setting.getLabel(t("user:Affiliation"), t("user:Affiliation - Tooltip"))} :
        <Input value={this.state.provider.userMapping.affiliation} onChange={e => {
          this.updateUserMappingField("affiliation", e.target.value);
        }} />
        {Setting.getLabel(t("general:Title"), t("general:Title - Tooltip"))} :
        <Input value={this.state.provider.userMapping.title} onChange={e => {
          this.updateUserMappingField("title", e.target.value);
        }} />
      </React.Fragment>
    );
  }

  renderEmailMappingInput(): React.ReactNode {
    return (
      <React.Fragment>
        {Setting.getLabel(t("provider:From name"), t("provider:From name - Tooltip"))} :
        <Input value={this.state.provider.userMapping.fromName} onChange={e => {
          this.updateUserMappingField("fromName", e.target.value);
        }} />
        {Setting.getLabel(t("provider:From address"), t("provider:From address - Tooltip"))} :
        <Input value={this.state.provider.userMapping.fromAddress} onChange={e => {
          this.updateUserMappingField("fromAddress", e.target.value);
        }} />
        {Setting.getLabel(t("provider:To address"), t("provider:To address - Tooltip"))} :
        <Input value={this.state.provider.userMapping.toAddress} onChange={e => {
          this.updateUserMappingField("toAddress", e.target.value);
        }} />
        {Setting.getLabel(t("provider:Subject"), t("provider:Subject - Tooltip"))} :
        <Input value={this.state.provider.userMapping.subject} onChange={e => {
          this.updateUserMappingField("subject", e.target.value);
        }} />
        {Setting.getLabel(t("provider:Email content"), t("provider:Email content - Tooltip"))} :
        <Input value={this.state.provider.userMapping.content} onChange={e => {
          this.updateUserMappingField("content", e.target.value);
        }} />
      </React.Fragment>
    );
  }

  renderSmsMappingInput(): React.ReactNode {
    return (
      <React.Fragment>
        {Setting.getLabel(t("general:Phone"), t("general:Phone - Tooltip"))} :
        <Input value={this.state.provider.userMapping.phoneNumber} onChange={e => {
          this.updateUserMappingField("phoneNumber", e.target.value);
        }} />
        {Setting.getLabel(t("provider:Content"), t("provider:Content - Tooltip"))} :
        <Input value={this.state.provider.userMapping.content} onChange={e => {
          this.updateUserMappingField("content", e.target.value);
        }} />
      </React.Fragment>
    );
  }

  getClientIdLabel(provider: ProviderConfig): React.ReactNode {
    switch (provider.category) {
    case "OAuth":
      if (provider.type === "Apple") {
        return Setting.getLabel(t("provider:Service ID identifier"), t("provider:Service ID identifier - Tooltip"));
      } else if (provider.type === "DingTalk") {
        return Setting.getLabel(t("provider:DingTalk AppKey"), t("provider:DingTalk AppKey - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID"), t("provider:Client ID - Tooltip"));
      }
    case "Email":
      return Setting.getLabel(t("signup:Username"), t("signup:Username - Tooltip"));
    case "SMS":
      if (provider.type === "Volc Engine SMS" || provider.type === "Amazon SNS" || provider.type === "Baidu Cloud SMS") {
        return Setting.getLabel(t("general:Access key"), t("general:Access key - Tooltip"));
      } else if (provider.type === "Huawei Cloud SMS") {
        return Setting.getLabel(t("provider:App key"), t("provider:App key - Tooltip"));
      } else if (provider.type === "UCloud SMS") {
        return Setting.getLabel(t("provider:Public key"), t("provider:Public key - Tooltip"));
      } else if (provider.type === "Msg91 SMS" || provider.type === "Infobip SMS" || provider.type === "OSON SMS") {
        return Setting.getLabel(t("provider:Sender Id"), t("provider:Sender Id - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID"), t("provider:Client ID - Tooltip"));
      }
    case "Captcha":
      if (provider.type === "Aliyun Captcha") {
        return Setting.getLabel(t("general:Access key"), t("general:Access key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Site key"), t("provider:Site key - Tooltip"));
      }
    case "Notification":
      if (provider.type === "DingTalk") {
        return Setting.getLabel(t("general:Access key"), t("general:Access key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID"), t("provider:Client ID - Tooltip"));
      }
    case "ID Verification":
      if (provider.type === "Alibaba Cloud") {
        return Setting.getLabel(t("general:Access key"), t("general:Access key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID"), t("provider:Client ID - Tooltip"));
      }
    default:
      return Setting.getLabel(t("provider:Client ID"), t("provider:Client ID - Tooltip"));
    }
  }

  getClientSecretLabel(provider: ProviderConfig): React.ReactNode {
    switch (provider.category) {
    case "OAuth":
      if (provider.type === "Apple") {
        return Setting.getLabel(t("provider:Team ID"), t("provider:Team ID - Tooltip"));
      } else if (provider.type === "DingTalk") {
        return Setting.getLabel(t("provider:DingTalk AppSecret"), t("provider:DingTalk AppSecret - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
      }
    case "Storage":
      if (provider.type === "Google Cloud Storage") {
        return Setting.getLabel(t("provider:Service account JSON"), t("provider:Service account JSON - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
      }
    case "Email":
      if (provider.type === "Azure ACS" || provider.type === "SendGrid" || provider.type === "Resend") {
        return Setting.getLabel(t("provider:Secret key"), t("provider:Secret key - Tooltip"));
      } else {
        return Setting.getLabel(t("general:Password"), t("general:Password - Tooltip"));
      }
    case "SMS":
      if (provider.type === "Volc Engine SMS" || provider.type === "Amazon SNS" || provider.type === "Baidu Cloud SMS" || provider.type === "OSON SMS") {
        return Setting.getLabel(t("provider:Secret access key"), t("provider:Secret access key - Tooltip"));
      } else if (provider.type === "Huawei Cloud SMS") {
        return Setting.getLabel(t("provider:App secret"), t("provider:AppSecret - Tooltip"));
      } else if (provider.type === "UCloud SMS") {
        return Setting.getLabel(t("provider:Private Key"), t("provider:Private Key - Tooltip"));
      } else if (provider.type === "Msg91 SMS") {
        return Setting.getLabel(t("provider:Auth Key"), t("provider:Auth Key - Tooltip"));
      } else if (provider.type === "Infobip SMS") {
        return Setting.getLabel(t("provider:Api Key"), t("provider:Api Key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
      }
    case "Captcha":
      if (provider.type === "Aliyun Captcha") {
        return Setting.getLabel(t("provider:Secret access key"), t("provider:Secret access key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Secret key"), t("provider:Secret key - Tooltip"));
      }
    case "Notification":
      if (provider.type === "Line" || provider.type === "Telegram" || provider.type === "Bark" || provider.type === "DingTalk" || provider.type === "Discord" || provider.type === "Slack" || provider.type === "Pushover" || provider.type === "Pushbullet") {
        return Setting.getLabel(t("provider:Secret key"), t("provider:Secret key - Tooltip"));
      } else if (provider.type === "Lark" || provider.type === "Microsoft Teams" || provider.type === "WeCom") {
        return Setting.getLabel(t("provider:Endpoint"), t("provider:Endpoint - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
      }
    case "ID Verification":
      if (provider.type === "Alibaba Cloud") {
        return Setting.getLabel(t("provider:Secret access key"), t("provider:Secret access key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
      }
    default:
      return Setting.getLabel(t("provider:Client secret"), t("provider:Client secret - Tooltip"));
    }
  }

  getClientId2Label(provider: ProviderConfig): React.ReactNode {
    switch (provider.category) {
    case "OAuth":
      if (provider.type === "Apple") {
        return Setting.getLabel(t("provider:Key ID"), t("provider:Key ID - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID 2"), t("provider:Client ID 2 - Tooltip"));
      }
    case "Email":
      return Setting.getLabel(t("provider:From address"), t("provider:From address - Tooltip"));
    default:
      if (provider.type === "Aliyun Captcha") {
        return Setting.getLabel(t("provider:Scene"), t("provider:Scene - Tooltip"));
      } else if (provider.type === "WeChat Pay" || provider.type === "CUCloud") {
        return Setting.getLabel(t("provider:App ID"), t("provider:App ID - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client ID 2"), t("provider:Client ID 2 - Tooltip"));
      }
    }
  }

  getClientSecret2Label(provider: ProviderConfig): React.ReactNode {
    switch (provider.category) {
    case "OAuth":
      if (provider.type === "Apple") {
        return Setting.getLabel(t("provider:Key text"), t("provider:Key text - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret 2"), t("provider:Client secret 2 - Tooltip"));
      }
    case "Email":
      return Setting.getLabel(t("provider:From name"), t("provider:From name - Tooltip"));
    default:
      if (provider.type === "Aliyun Captcha") {
        return Setting.getLabel(t("provider:App key"), t("provider:App key - Tooltip"));
      } else {
        return Setting.getLabel(t("provider:Client secret 2"), t("provider:Client secret 2 - Tooltip"));
      }
    }
  }

  getProviderSubTypeOptions(type?: string): ProviderSubTypeOption[] {
    if (type === "WeCom" || type === "Infoflow") {
      return (
        [
          {id: "Internal", name: t("provider:Internal")},
          {id: "Third-party", name: t("provider:Third-party")},
        ]
      );
    } else if (type === "WeChat") {
      return (
        [
          {id: "Web", name: t("provider:Web")},
          {id: "Mobile", name: t("provider:Mobile")},
        ]
      );
    } else {
      return [];
    }
  }

  getAppIdRow(provider: ProviderConfig): React.ReactNode {
    let text = "";
    let tooltip = "";

    if (provider.category === "OAuth") {
      if (provider.type === "WeCom" && provider.subType === "Internal") {
        text = t("provider:Agent ID");
        tooltip = t("provider:Agent ID - Tooltip");
      } else if (provider.type === "Infoflow") {
        text = t("provider:Agent ID");
        tooltip = t("provider:Agent ID - Tooltip");
      } else if (provider.type === "AzureADB2C") {
        text = t("provider:User flow");
        tooltip = t("provider:User flow - Tooltip");
      }
    } else if (provider.category === "SMS") {
      if (provider.type === "Twilio SMS" || provider.type === "Azure ACS") {
        text = t("provider:Sender number");
        tooltip = t("provider:Sender number - Tooltip");
      } else if (provider.type === "Tencent Cloud SMS") {
        text = t("provider:App ID");
        tooltip = t("provider:App ID - Tooltip");
      } else if (provider.type === "Volc Engine SMS") {
        text = t("provider:SMS account");
        tooltip = t("provider:SMS account - Tooltip");
      } else if (provider.type === "Huawei Cloud SMS") {
        text = t("provider:Channel No.");
        tooltip = t("provider:Channel No. - Tooltip");
      } else if (provider.type === "Amazon SNS") {
        text = t("provider:Region");
        tooltip = t("provider:Region - Tooltip");
      } else if (provider.type === "Baidu Cloud SMS") {
        text = t("provider:Endpoint");
        tooltip = t("provider:Endpoint - Tooltip");
      } else if (provider.type === "Infobip SMS") {
        text = t("provider:Base URL");
        tooltip = t("provider:Base URL - Tooltip");
      } else if (provider.type === "UCloud SMS") {
        text = t("provider:Project Id");
        tooltip = t("provider:Project Id - Tooltip");
      }
    } else if (provider.category === "Email") {
      if (provider.type === "SUBMAIL") {
        text = t("provider:App ID");
        tooltip = t("provider:App ID - Tooltip");
      }
    } else if (provider.category === "Notification") {
      if (provider.type === "Viber") {
        text = t("provider:Domain");
        tooltip = t("provider:Domain - Tooltip");
      } else if (provider.type === "Line" || provider.type === "Matrix" || provider.type === "Rocket Chat") {
        text = t("provider:App Key");
        tooltip = t("provider:App Key - Tooltip");
      } else if (provider.type === "CUCloud") {
        text = "Topic name";
        tooltip = "Topic name - Tooltip";
      }
    }

    if (text === "" && tooltip === "") {
      return null;
    } else {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(text, tooltip)} :
          </Col>
          <Col span={22} >
            <Input value={provider.appId} onChange={e => {
              this.updateProviderField("appId", e.target.value);
            }} />
          </Col>
        </Row>
      );
    }
  }

  getReceiverRow(provider: ProviderConfig): React.ReactNode {
    let text = "";
    let tooltip = "";

    if (provider.type === "Telegram" || provider.type === "Pushover" || provider.type === "Pushbullet" || provider.type === "Slack" || provider.type === "Discord" || provider.type === "Line" || provider.type === "Twitter" || provider.type === "Reddit" || provider.type === "Rocket Chat" || provider.type === "Viber") {
      text = t("provider:Chat ID");
      tooltip = t("provider:Chat ID - Tooltip");
    } else if (provider.type === "Custom HTTP" || provider.type === "Webpush" || provider.type === "Matrix") {
      text = t("provider:Endpoint");
      tooltip = t("provider:Endpoint - Tooltip");
    }

    if (text === "" && tooltip === "") {
      return (
        <React.Fragment>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel("Test Notification", "Test Notification")} :
          </Col>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(text, tooltip)} :
          </Col>
          <Col span={6} >
            <Input value={provider.receiver} onChange={e => {
              this.updateProviderField("receiver", e.target.value);
            }} />
          </Col>
        </React.Fragment>
      );
    }
  }

  loadSamlConfiguration() {
    const parser = new DOMParser();
    const rawXml = (this.state.provider.metadata ?? "").replace("\n", "");
    const xmlDoc = parser.parseFromString(rawXml, "text/xml");
    const cert = xmlDoc.querySelector("X509Certificate")?.childNodes[0]?.nodeValue?.replace(" ", "") ?? "";
    const endpoint = xmlDoc.querySelector("SingleSignOnService")?.getAttribute("Location") ?? "";
    const issuerUrl = xmlDoc.querySelector("EntityDescriptor")?.getAttribute("entityID") ?? "";
    this.updateProviderField("idP", cert);
    this.updateProviderField("endpoint", endpoint);
    this.updateProviderField("issuerUrl", issuerUrl);
  }

  fetchSamlMetadata() {
    this.setState({
      metadataLoading: true,
    });
    fetch(this.state.requestUrl, {
      method: "GET",
    }).then(res => {
      if (!res.ok) {
        return Promise.reject("error");
      }
      return res.text();
    }).then(text => {
      this.updateProviderField("metadata", text);
      this.parseSamlMetadata();
      Setting.showMessage("success", t("general:Successfully added"));
    }).catch(err => {
      Setting.showMessage("error", err.message);
    }).finally(() => {
      this.setState({
        metadataLoading: false,
      });
    });
  }

  parseSamlMetadata() {
    try {
      this.loadSamlConfiguration();
      Setting.showMessage("success", t("provider:Parse metadata successfully"));
    } catch (err) {
      Setting.showMessage("error", t("provider:Can not parse metadata"));
    }
  }

  renderProviderCategoryOptions(): React.ReactNode {
    return [
      {id: "Captcha", name: "Captcha"},
      {id: "Email", name: "Email"},
      {id: "ID Verification", name: "ID Verification"},
      {id: "MFA", name: "MFA"},
      {id: "Notification", name: "Notification"},
      {id: "OAuth", name: "OAuth"},
      {id: "Payment", name: "Payment"},
      {id: "SAML", name: "SAML"},
      {id: "SMS", name: "SMS"},
      {id: "Storage", name: "Storage"},
      {id: "Web3", name: "Web3"},
      {id: "Face ID", name: "Face ID"},
    ]
      .sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name))
      .map((providerCategory) => <Option key={providerCategory.id} value={providerCategory.id}>{providerCategory.name}</Option>);
  }

  updateProviderCategory(value: string): void {
    this.updateProviderField("category", value);
    if (value === "OAuth") {
      this.updateProviderField("type", "Google");
    } else if (value === "Email") {
      this.updateProviderField("type", "Default");
      this.updateProviderField("host", "smtp.example.com");
      this.updateProviderField("port", 465);
      this.updateProviderField("sslMode", "Auto");
      this.updateProviderField("title", "aicodex-admin Verification Code");
      this.updateProviderField("content", Setting.getDefaultHtmlEmailContent());
      this.updateProviderField("metadata", Setting.getDefaultInvitationHtmlEmailContent());
      this.updateProviderField("receiver", this.props.account.email);
    } else if (value === "SMS") {
      this.updateProviderField("type", "Twilio SMS");
    } else if (value === "Storage") {
      this.updateProviderField("type", "AWS S3");
    } else if (value === "SAML") {
      this.updateProviderField("type", "Keycloak");
    } else if (value === "Payment") {
      this.updateProviderField("type", "PayPal");
    } else if (value === "Captcha") {
      this.updateProviderField("type", "Default");
    } else if (value === "Web3") {
      this.updateProviderField("type", "MetaMask");
    } else if (value === "Notification") {
      this.updateProviderField("type", "Telegram");
    } else if (value === "Face ID") {
      this.updateProviderField("type", "Alibaba Cloud Facebody");
    } else if (value === "MFA") {
      this.updateProviderField("type", "RADIUS");
      this.updateProviderField("host", "");
      this.updateProviderField("port", 1812);
    } else if (value === "ID Verification") {
      this.updateProviderField("type", "Jumio");
      this.updateProviderField("endpoint", "");
    }
  }

  updateProviderType(value: string): void {
    this.updateProviderField("type", value);
    if (value === "Local File System") {
      this.updateProviderField("domain", Setting.getFullServerUrl());
    } else if (String(value).startsWith("Custom") && this.state.provider.category === "OAuth") {
      const serverUrl = Setting.getFullServerUrl();
      this.updateProviderField("customAuthUrl", `${serverUrl}/login/oauth/authorize`);
      this.updateProviderField("scopes", "openid profile email");
      this.updateProviderField("customTokenUrl", `${serverUrl}/api/login/oauth/access_token`);
      this.updateProviderField("customUserInfoUrl", `${serverUrl}/api/userinfo`);
    } else if (value === "Custom HTTP SMS") {
      this.updateProviderField("endpoint", "https://example.com/send-custom-http-sms");
      this.updateProviderField("method", "GET");
      this.updateProviderField("title", "code");
    } else if (value === "Custom HTTP Email") {
      this.updateProviderField("endpoint", "https://example.com/send-custom-http-email");
      this.updateProviderField("method", "POST");
    } else if (value === "WeCom") {
      this.updateProviderField("subType", "Internal");
      this.updateProviderField("method", "Normal");
      this.updateProviderField("scopes", "snsapi_privateinfo");
    } else if (value === "Custom HTTP") {
      this.updateProviderField("method", "GET");
      this.updateProviderField("title", "");
    }
  }

  renderProviderBasicSection(provider: EditableProviderConfig): React.ReactNode {
    return this.renderSection(t("provider:Basic information"), (
      <React.Fragment>
        {this.renderFieldRow(
          Setting.getLabel(t("general:Name"), t("provider:Provider name - Tooltip")),
          <Input value={provider.name} onChange={e => {
            this.updateProviderField("name", e.target.value);
          }} />
        )}
        {this.renderFieldRow(
          Setting.getLabel(t("general:Display name"), t("provider:Provider display name - Tooltip")),
          <Input value={provider.displayName} onChange={e => {
            this.updateProviderField("displayName", e.target.value);
          }} />
        )}
        {this.renderFieldRow(
          Setting.getLabel(t("general:Organization"), t("provider:Provider organization - Tooltip")),
          <Select
            virtual={false}
            showSearch
            optionLabelProp="label"
            disabled={!Setting.isAdminUser(this.props.account)}
            value={provider.owner}
            filterOption={(input, option) => {
              const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
              return optionText.includes(input.toLowerCase());
            }}
            onChange={(value => {this.updateProviderField("owner", value);})}
          >
            {this.renderOrganizationOptions()}
          </Select>
        )}
        {this.renderFieldRow(
          Setting.getLabel(t("general:Category"), t("provider:Provider category - Tooltip")),
          <Select virtual={false} value={provider.category} onChange={(value: string) => this.updateProviderCategory(value)}>
            {this.renderProviderCategoryOptions()}
          </Select>
        )}
        {this.renderFieldRow(
          Setting.getLabel(t("general:Type"), t("provider:Provider type - Tooltip")),
          <Select virtual={false} showSearch value={provider.type} onChange={(value: string) => this.updateProviderType(value)}>
            {
              Setting.getProviderTypeOptions(provider.category)
                .sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name))
                .map((providerType: {id: string; name: string}) => <Option key={providerType.id} value={providerType.id}>
                  <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}} src={Setting.getProviderLogoURL({category: provider.category, type: providerType.id})} alt={providerType.id} />
                  {providerType.name}
                </Option>)
            }
          </Select>
        )}
        {
          provider.type !== "WeCom" && provider.type !== "Infoflow" && provider.type !== "WeChat" ? null : this.renderFieldRow(
            Setting.getLabel(t("provider:Sub type"), t("provider:Sub type - Tooltip")),
            <Select virtual={false} value={provider.subType} onChange={value => {
              this.updateProviderField("subType", value);
            }}>
              {
                this.getProviderSubTypeOptions(provider.type).map((providerSubType) => <Option key={providerSubType.id} value={providerSubType.id}>{providerSubType.name}</Option>)
              }
            </Select>
          )
        }
        {
          provider.type !== "WeCom" ? null : this.renderFieldRow(
            Setting.getLabel(t("general:Method"), t("provider:Method - Tooltip")),
            <Select virtual={false} value={provider.method} onChange={value => {
              this.updateProviderField("method", value);
            }}>
              {
                [
                  {id: "Normal", name: t("application:Normal")},
                  {id: "Silent", name: t("provider:Silent")},
                ].map((method) => <Option key={method.id} value={method.id}>{method.name}</Option>)
              }
            </Select>
          )
        }
        {
          provider.type !== "WeCom" ? null : this.renderFieldRow(
            Setting.getLabel(t("provider:Scope"), t("provider:Scope - Tooltip")),
            <Select virtual={false} value={provider.scopes} onChange={value => {
              this.updateProviderField("scopes", value);
            }}>
              <Option key="snsapi_userinfo" value="snsapi_userinfo">snsapi_userinfo</Option>
              <Option key="snsapi_privateinfo" value="snsapi_privateinfo">snsapi_privateinfo</Option>
            </Select>
          )
        }
        {
          provider.type !== "WeCom" ? null : this.renderFieldRow(
            Setting.getLabel(t("provider:Use id as name"), t("provider:Use id as name - Tooltip")),
            <Switch checked={provider.disableSsl} onChange={checked => {
              this.updateProviderField("disableSsl", checked);
            }} />
          )
        }
        {this.renderFieldRow(
          Setting.getLabel(t("provider:Provider URL"), t("provider:Provider URL - Tooltip")),
          <Input prefix={<LinkOutlined />} value={provider.providerUrl} onChange={e => {
            this.updateProviderField("providerUrl", e.target.value);
          }} />,
          {wide: true}
        )}
      </React.Fragment>
    ));
  }

  renderProviderConfigurationContent(provider: EditableProviderConfig): React.ReactNode {
    return (
      <React.Fragment>
        {this.renderWeComGuide(provider)}
        {this.renderLarkGuide(provider)}
        {
          provider.category === "OAuth" ? renderOAuthProviderFields(
            provider,
            this.updateProviderField.bind(this),
            this.renderUserMappingInput.bind(this)
          ) : null
        }
        {
          (provider.category === "Captcha" && provider.type === "Default") ||
          (provider.category === "Web3") ||
          (provider.category === "MFA") ||
          (provider.category === "Storage" && provider.type === "Local File System") ||
          (provider.category === "SMS" && provider.type === "Custom HTTP SMS") ||
          (provider.category === "Email" && provider.type === "Custom HTTP Email") ||
          (provider.category === "Notification" && (provider.type === "Google Chat" || provider.type === "Custom HTTP" || provider.type === "Balance")) ? null : (
              <React.Fragment>
                {
                  (provider.category === "Storage" && provider.type === "Google Cloud Storage") ||
                  (provider.category === "Email" && (provider.type === "Azure ACS" || provider.type === "SendGrid" || provider.type === "Resend")) ||
                  (provider.category === "Notification" && (provider.type === "Line" || provider.type === "Telegram" || provider.type === "Bark" || provider.type === "Discord" || provider.type === "Slack" || provider.type === "Pushbullet" || provider.type === "Pushover" || provider.type === "Lark" || provider.type === "Microsoft Teams" || provider.type === "WeCom")) ? null : (
                      <Row style={{marginTop: "20px"}} >
                        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                          {this.getClientIdLabel(provider)} :
                        </Col>
                        <Col span={22} >
                          <Input value={provider.clientId} onChange={e => {
                            this.updateProviderField("clientId", e.target.value);
                          }} />
                        </Col>
                      </Row>
                    )
                }
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {this.getClientSecretLabel(provider)} :
                  </Col>
                  <Col span={22} >
                    <Input value={provider.clientSecret} onChange={e => {
                      this.updateProviderField("clientSecret", e.target.value);
                    }} />
                  </Col>
                </Row>
              </React.Fragment>
            )
        }
        {
          provider.category !== "Email" && provider.type !== "WeChat" && provider.type !== "Apple" && provider.type !== "Aliyun Captcha" && provider.type !== "WeChat Pay" && provider.type !== "Twitter" && provider.type !== "Reddit" && provider.type !== "CUCloud" ? null : (
            <React.Fragment>
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getClientId2Label(provider)} :
                </Col>
                <Col span={22} >
                  <Input value={provider.clientId2} onChange={e => {
                    this.updateProviderField("clientId2", e.target.value);
                  }} />
                </Col>
              </Row>
              {
                (provider.type === "WeChat Pay" || provider.type === "CUCloud") || (provider.category === "Email" && (provider.type === "Azure ACS")) ? null : (
                  <Row style={{marginTop: "20px"}} >
                    <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                      {this.getClientSecret2Label(provider)} :
                    </Col>
                    <Col span={22} >
                      {
                        (provider.category === "OAuth" && provider.type === "Apple") ? (
                          <TextArea autoSize={{minRows: 1, maxRows: 20}} value={provider.clientSecret2} onChange={e => {
                            this.updateProviderField("clientSecret2", e.target.value);
                          }} />
                        ) : (
                          <Input value={provider.clientSecret2} onChange={e => {
                            this.updateProviderField("clientSecret2", e.target.value);
                          }} />
                        )
                      }
                    </Col>
                  </Row>
                )
              }
            </React.Fragment>
          )
        }
        {this.getAppIdRow(provider)}
        {
          provider.category === "Notification" ? renderNotificationProviderFields(
            provider,
            this.updateProviderField.bind(this),
            this.getReceiverRow.bind(this)
          ) : provider.category === "Email" ? renderEmailProviderFields(
            provider,
            this.updateProviderField.bind(this),
            this.renderEmailMappingInput.bind(this),
            this.props.account
          ) : ["SMS"].includes(provider.category) ? renderSmsProviderFields(
            provider,
            this.updateProviderField.bind(this),
            this.renderSmsMappingInput.bind(this),
            this.props.account
          ) : provider.category === "MFA" ? renderMfaProviderFields(
            provider,
            this.updateProviderField.bind(this)
          ) : provider.category === "SAML" ? renderSamlProviderFields(
            provider,
            this.updateProviderField.bind(this),
            {
              requestUrl: this.state.requestUrl,
              setRequestUrl: (value: string) => this.setState({requestUrl: value}),
              metadataLoading: this.state.metadataLoading,
              fetchSamlMetadata: this.fetchSamlMetadata.bind(this),
              parseSamlMetadata: this.parseSamlMetadata.bind(this),
            }
          ) : null
        }
        {provider.category === "Payment" ? renderPaymentProviderFields(
          provider,
          this.updateProviderField.bind(this),
          this.state.certs
        ) : null}
        {provider.category === "Web3" ? renderWeb3ProviderFields(
          provider,
          this.updateProviderField.bind(this)
        ) : null}
        {provider.category === "Storage" ? renderStorageProviderFields(
          provider,
          this.updateProviderField.bind(this)
        ) : null}
        {provider.category === "Face ID" ? renderFaceIdProviderFields(
          provider,
          this.updateProviderField.bind(this)
        ) : null}
        {provider.category === "ID Verification" ? renderIDVerificationProviderFields(
          provider,
          this.updateProviderField.bind(this)
        ) : null}
        {
          provider.category === "Captcha" ? renderCaptchaProviderFields(
            provider,
            this.state.providerName
          ) : null
        }
      </React.Fragment>
    );
  }

  renderProvider(): React.ReactNode {
    const provider = this.state.provider;

    return (
      <Card
        className="admin-large-edit-card provider-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="provider-edit"
          backLabel={t("general:Back")}
          breadcrumb={<React.Fragment>{t("general:Authentication Source Center")} / {t("provider:Providers")} /</React.Fragment>}
          title={this.getProviderEditTitle(provider)}
          dirty={this.state.dirty}
          dirtyLabel={t("provider:Unsaved changes")}
          actions={this.renderEditFooter()}
          onBack={() => this.handleBack()}
        >
          {this.renderProviderBasicSection(provider)}
          {this.renderLegacySection(t("provider:Provider configuration"), this.renderProviderConfigurationContent(provider))}
        </LargeEditShell>
      </Card>
    );
  }

  submitProviderEdit(exitAfterSave: boolean) {
    if (this.state.submitting) {
      return;
    }
    const provider = Setting.deepCopy(this.state.provider);
    const validationError = this.validateWeComProvider(provider) || this.validateLarkProvider(provider);
    if (validationError) {
      Setting.showMessage("error", validationError);
      return;
    }
    this.setState({submitting: true});
    const saveProvider = this.state.mode === "add"
      ? ProviderBackend.addProvider(provider)
      : ProviderBackend.updateProvider(this.state.owner, this.state.providerName, provider);
    saveProvider
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            owner: this.state.provider.owner,
            providerName: this.state.provider.name,
            mode: "edit",
            dirty: false,
            submitting: false,
          });

          if (exitAfterSave) {
            this.props.history.push("/providers");
          } else {
            this.props.history.push(`/providers/${this.state.provider.owner}/${this.state.provider.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode !== "add") {
            this.updateProviderField("name", this.state.providerName);
          }
          this.setState({submitting: false});
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteProvider() {
    ProviderBackend.deleteProvider(this.state.provider)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/providers");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="admin-large-edit-page provider-edit-page">
        {
          this.state.provider !== null ? this.renderProvider() : null
        }
      </div>
    );
  }
}

export default ProviderEditPage;
