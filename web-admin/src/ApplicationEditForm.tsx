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
import {Button, Col, Input, InputNumber, Popover, Radio, Row, Select, Space, Switch, Upload, message} from "antd";
import {CopyOutlined, HolderOutlined, LinkOutlined, UploadOutlined, UsergroupAddOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
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
import {buildSamlMetadataUrl} from "./applicationEditRules";
import type {ApplicationEditPageProps, ApplicationEditPageState, ApplicationEditTabKey} from "./ApplicationEditPage";

const {Option} = Select;
type LegacyAny = any;
type ApplicationImageUrlField = "logo" | "favicon" | "formBackgroundUrl" | "formBackgroundUrlMobile";

const i18next = {
  t: (key: string, options?: Record<string, LegacyAny>): string => String(i18nextRaw.t(key, options)),
};

export interface ApplicationEditFormContext {
  state: ApplicationEditPageState;
  props: ApplicationEditPageProps;
  getActiveTabKey(): ApplicationEditTabKey;
  getSamlMetadata(checked: LegacyAny): void;
  handleUpload(info: LegacyAny): void;
  renderApplicationAssetField(fieldName: ApplicationImageUrlField, label: string, tooltip: string): React.ReactNode;
  renderApplicationSectionTitle(title: string): React.ReactNode;
  renderFieldError(fieldName: string): React.ReactNode;
  renderFullWidthContentRow(children: React.ReactNode, options?: {className?: string; marginTop?: string}): React.ReactNode;
  renderPromptPreview(): React.ReactNode;
  renderRequiredFieldLabel(label: string, tooltip: string): React.ReactNode;
  renderSignupSigninPreview(): React.ReactNode;
  setState: React.Component<ApplicationEditPageProps, ApplicationEditPageState>["setState"];
  updateApplicationField(key: string, value: LegacyAny): void;
}

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

export function renderApplicationEditForm(context: ApplicationEditFormContext): React.ReactNode {
  const activeTabKey = context.getActiveTabKey();
  return <>
    {activeTabKey === "basic" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:Basic information"))}
        <Row className="application-edit-control-row-medium" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {context.renderRequiredFieldLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input status={context.state.fieldErrors.name ? "error" : undefined} value={context.state.application.name} disabled={context.state.application.name === "app-built-in"} onChange={e => {
              const value = e.target.value;
              if (/[/?:@#&%=+;]/.test(value)) {
                const invalidChars = "/ ? : @ # & % = + ;";
                const messageText = i18next.t("application:Invalid characters in application name") + ":" + " " + invalidChars;
                message.error(messageText);
                return;
              }
              context.updateApplicationField("name", e.target.value);
            }} />
            {context.renderFieldError("name")}
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {context.renderRequiredFieldLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input status={context.state.fieldErrors.displayName ? "error" : undefined} value={context.state.application.displayName} onChange={e => {
              context.updateApplicationField("displayName", e.target.value);
            }} />
            {context.renderFieldError("displayName")}
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
              value={context.state.application.category}
              onChange={(value) => {
                context.updateApplicationField("category", value);
                if (value === "Agent") {
                  context.updateApplicationField("type", "MCP");
                } else {
                  context.updateApplicationField("type", "All");
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
              value={context.state.application.type}
              onChange={(value) => {
                context.updateApplicationField("type", value);
              }}
            >
              {
                (context.state.application.category === "Agent") ? (
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
            <Switch disabled={Setting.isAdminUser()} checked={context.state.application.isShared} onChange={checked => {
              context.updateApplicationField("isShared", checked);
              context.updateApplicationField("organizationResolutionMode", checked ? "shared_application" : "organization_bound");
            }} />
          </Col>
        </Row>
        {context.renderApplicationAssetField("logo", i18next.t("general:Logo"), i18next.t("general:Logo - Tooltip"))}
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Title"), i18next.t("general:Title - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.title} onChange={e => {
              context.updateApplicationField("title", e.target.value);
            }} />
          </Col>
        </Row>
        {context.renderApplicationAssetField("favicon", i18next.t("general:Favicon"), i18next.t("general:Favicon - Tooltip"))}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Home"), i18next.t("general:Home - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.homepageUrl} onChange={e => {
              context.updateApplicationField("homepageUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Description"), i18next.t("general:Description - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.description} onChange={e => {
              context.updateApplicationField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Organization"), i18next.t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(context.props.account)} value={context.state.application.organization} onChange={(value => {context.updateApplicationField("organization", value);})}>
              {
                context.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("organization:Tags"), i18next.t("application:Tags - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={context.state.application.tags} onChange={(value => {context.updateApplicationField("tags", value);})}>
              {
                context.state.application.tags?.map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Order"), i18next.t("application:Order - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.order} min={0} step={1} precision={0} onChange={value => {
              context.updateApplicationField("order", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Menu mode"), i18next.t("application:Menu mode - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Radio.Group value={context.state.menuMode} onChange={e => context.setState({menuMode: e.target.value})}>
              <Radio value="horizontal">{i18next.t("application:Horizontal")}</Radio>
              <Radio value="vertical">{i18next.t("application:Vertical")}</Radio>
            </Radio.Group>
          </Col>
        </Row>
      </React.Fragment>
    )}
    {activeTabKey === "authentication" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:Authentication settings"))}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Cookie expire"), i18next.t("application:Cookie expire - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.cookieExpireInHours || 720} min={1} step={1} precision={0} suffix={i18next.t("application:Hours")} onChange={value => {
              context.updateApplicationField("cookieExpireInHours", value);
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
              value={context.state.application.defaultGroup || undefined}
              fetchPage={GroupBackend.getGroups}
              buildFetchArgs={({page, pageSize, searchText}: {page: number; pageSize: number; searchText: string}) => {
                const field = searchText ? "name" : "";
                return [context.state.owner, false, page, pageSize, field, searchText, "", ""];
              }}
              reloadKey={context.state.owner}
              optionMapper={(group: LegacyAny) => Setting.getOption(
                <Space>
                  {group.type === "Physical" ? <UsergroupAddOutlined /> : <HolderOutlined />}
                  {group.displayName}
                </Space>,
                `${group.owner}/${group.name}`
              )}
              filterOption={false}
              onChange={(value: LegacyAny) => {
                context.updateApplicationField("defaultGroup", value || "");
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable signup"), i18next.t("application:Enable signup - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSignUp} onChange={checked => {
              context.updateApplicationField("enableSignUp", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Disable signin"), i18next.t("application:Disable signin - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.disableSignin} onChange={checked => {
              context.updateApplicationField("disableSignin", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable exclusive signin"), i18next.t("application:Enable exclusive signin - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableExclusiveSignin} onChange={checked => {
              context.updateApplicationField("enableExclusiveSignin", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Signin session"), i18next.t("application:Enable signin session - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSigninSession} onChange={checked => {
              if (!checked) {
                context.updateApplicationField("enableAutoSignin", false);
              }

              context.updateApplicationField("enableSigninSession", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Auto signin"), i18next.t("application:Auto signin - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableAutoSignin} onChange={checked => {
              if (!context.state.application.enableSigninSession && checked) {
                Setting.showMessage("error", i18next.t("application:Please enable \"Signin session\" first before enabling \"Auto signin\""));
                return;
              }

              context.updateApplicationField("enableAutoSignin", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable Email linking"), i18next.t("application:Enable Email linking - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableLinkWithEmail} onChange={checked => {
              context.updateApplicationField("enableLinkWithEmail", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Signup URL"), i18next.t("general:Signup URL - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.signupUrl} onChange={e => {
              context.updateApplicationField("signupUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Signin URL"), i18next.t("general:Signin URL - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.signinUrl} onChange={e => {
              context.updateApplicationField("signinUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Forget URL"), i18next.t("general:Forget URL - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.forgetUrl} onChange={e => {
              context.updateApplicationField("forgetUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Affiliation URL"), i18next.t("general:Affiliation URL - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.affiliationUrl} onChange={e => {
              context.updateApplicationField("affiliationUrl", e.target.value);
            }} />
          </Col>
        </Row>
      </React.Fragment>
    )}
    {activeTabKey === "oidc-oauth" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:OIDC/OAuth settings"))}
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("provider:Client ID"), i18next.t("provider:Client ID - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.clientId} onChange={e => {
              context.updateApplicationField("clientId", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Organization resolution mode"), i18next.t("application:Organization resolution mode - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}}
              value={context.state.application.organizationResolutionMode || (context.state.application.isShared ? "shared_application" : "organization_bound")}
              onChange={(value) => {
                context.updateApplicationField("organizationResolutionMode", value);
                context.updateApplicationField("isShared", value === "shared_application");
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
              disabled={(context.state.application.organizationResolutionMode || (context.state.application.isShared ? "shared_application" : "organization_bound")) !== "shared_application"}
              value={context.state.application.allowedOrganizations || []}
              onChange={(value) => context.updateApplicationField("allowedOrganizations", value)} >
              {context.state.organizations.map((organization) => (
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
              value={context.state.application.allowedOrganizationStatus || "PENDING_REVIEW"}
              onChange={(value) => context.updateApplicationField("allowedOrganizationStatus", value)} >
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
            <Switch checked={context.state.application.apiMappingRequired} onChange={checked => {
              context.updateApplicationField("apiMappingRequired", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("provider:Client secret"), i18next.t("provider:Client secret - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.clientSecret} onChange={e => {
              context.updateApplicationField("clientSecret", e.target.value);
            }} />
          </Col>
        </Row>
        {context.renderFullWidthContentRow(
          <UrlTable
            title={i18next.t("application:Redirect URLs")}
            table={context.state.application.redirectUris}
            onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("redirectUris", value);}}
          />,
          {className: "application-edit-table-row"}
        )}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Forced redirect origin"), i18next.t("general:Forced redirect origin - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.forcedRedirectOrigin} onChange={e => {
              context.updateApplicationField("forcedRedirectOrigin", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Grant types"), i18next.t("application:Grant types - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} mode="multiple" style={{width: "100%"}}
              value={context.state.application.grantTypes}
              onChange={(value => {
                context.updateApplicationField("grantTypes", value);
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
          (context.state.application.category === "Agent") ? (
            context.renderFullWidthContentRow(
              <ScopeTable
                title={i18next.t("general:Scopes")}
                table={context.state.application.scopes}
                onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("scopes", value);}}
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
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.tokenFormat} onChange={(value => {context.updateApplicationField("tokenFormat", value);})}
              options={["JWT", "JWT-Empty", "JWT-Custom", "JWT-Standard"].map((item) => Setting.getOption(item, item))}
            />
          </Col>
        </Row>
        <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Token signing method"), i18next.t("application:Token signing method - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.tokenSigningMethod === "" ? "RS256" : context.state.application.tokenSigningMethod} onChange={(value => {context.updateApplicationField("tokenSigningMethod", value);})}
              options={["RS256", "RS512", "ES256", "ES512", "ES384"].map((item) => Setting.getOption(item, item))}
            />
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Token fields"), i18next.t("application:Token fields - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} disabled={context.state.application.tokenFormat !== "JWT-Custom"} mode="tags" showSearch style={{width: "100%"}} value={context.state.application.tokenFields} onChange={(value => {context.updateApplicationField("tokenFields", value);})}>
              <Option key={"signinMethod"} value={"signinMethod"}>{"SigninMethod"}</Option>
              <Option key={"provider"} value={"provider"}>{"Provider"}</Option>
              {
                [...Setting.getUserCommonFields(), "permissionNames"].map((item, index) => <Option key={index} value={item}>{item}</Option>)
              }
            </Select>
          </Col>
        </Row>
        {
          context.state.application.tokenFormat === "JWT-Custom" ? context.renderFullWidthContentRow(
            <TokenAttributeTable
              title={i18next.t("general:Token attributes")}
              table={context.state.application.tokenAttributes}
              application={context.state.application}
              onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("tokenAttributes", value);}}
            />,
            {className: "application-edit-table-row"}
          ) : null
        }
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Token expire"), i18next.t("application:Token expire - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.expireInHours} min={0.01} step={1} precision={2} suffix={i18next.t("application:Hours")} onChange={value => {
              context.updateApplicationField("expireInHours", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Refresh token expire"), i18next.t("application:Refresh token expire - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.refreshExpireInHours} min={0.01} step={1} precision={2} suffix={i18next.t("application:Hours")} onChange={value => {
              context.updateApplicationField("refreshExpireInHours", value);
            }} />
          </Col>
        </Row>
      </React.Fragment>
    )}
    {activeTabKey === "saml" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:SAML settings"))}
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:SAML reply URL"), i18next.t("application:Redirect URL (Assertion Consumer Service POST Binding URL) - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.samlReplyUrl} onChange={e => {
              context.updateApplicationField("samlReplyUrl", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable SAML compression"), i18next.t("application:Enable SAML compression - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSamlCompress} onChange={checked => {
              context.updateApplicationField("enableSamlCompress", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable SAML C14N10"), i18next.t("application:Enable SAML C14N10 - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSamlC14n10} onChange={checked => {
              context.updateApplicationField("enableSamlC14n10", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Use Email as NameID"), i18next.t("application:Use Email as NameID - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={context.state.application.useEmailAsSamlNameId} onChange={checked => {
              context.updateApplicationField("useEmailAsSamlNameId", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable SAML POST binding"), i18next.t("application:Enable SAML POST binding - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSamlPostBinding} onChange={checked => {
              context.updateApplicationField("enableSamlPostBinding", checked);
              context.getSamlMetadata(checked);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:SAML hash algorithm"), i18next.t("application:SAML hash algorithm - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}}
              value={context.state.application.samlHashAlgorithm}
              onChange={(value => {
                context.updateApplicationField("samlHashAlgorithm", value);
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
            <Switch checked={context.state.application.disableSamlAttributes} onChange={checked => {
              context.updateApplicationField("disableSamlAttributes", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(i18next.t("application:Enable SAML assertion signature"), i18next.t("application:Enable SAML assertion signature - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={context.state.application.enableSamlAssertionSignature} onChange={checked => {
              context.updateApplicationField("enableSamlAssertionSignature", checked);
            }} />
          </Col>
        </Row>
        {
          !context.state.application.disableSamlAttributes ? (
            context.renderFullWidthContentRow(
              <SamlAttributeTable
                title={i18next.t("general:SAML attributes")}
                table={context.state.application.samlAttributes}
                application={context.state.application}
                onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("samlAttributes", value);}}
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
            <Editor value={context.state.samlMetadata?.toString() ?? ""} lang="xml" readOnly />
            <br />
            <Button style={{marginBottom: "10px"}} type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
              copy(buildSamlMetadataUrl(window.location.origin, context.state.applicationName, context.state.application.enableSamlPostBinding));
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
        {context.renderApplicationSectionTitle(i18next.t("application:Provider bindings"))}
        {context.renderFullWidthContentRow(
          <>
            <ProviderTable
              title={i18next.t("application:Providers")}
              table={context.state.application.providers}
              providers={context.state.providers}
              application={context.state.application}
              onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("providers", value);}}
            />
            <ApplicationIdentitySourceBindings
              application={context.state.application}
              providers={context.state.providers}
              organizations={context.state.organizations}
              onChange={(value: LegacyAny) => {context.updateApplicationField("providers", value);}}
            />
          </>,
          {className: "application-edit-table-row", marginTop: "10px"}
        )}
      </React.Fragment>
    )}
    {activeTabKey === "ui-customization" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:UI customization settings"))}
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
              value={context.state.application.orgChoiceMode ?? []}
              onChange={(value => {
                context.updateApplicationField("orgChoiceMode", value);
              })} >
            </Select>
          </Col>
        </Row>
        {context.renderFullWidthContentRow(
          <SigninMethodTable
            title={i18next.t("application:Signin methods")}
            table={context.state.application.signinMethods}
            onUpdateTable={(value: LegacyAny) => {
              context.updateApplicationField("signinMethods", value);
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
                <Editor value={context.state.application.signupHtml} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                  context.updateApplicationField("signupHtml", value);
                }} />
              </div>
            } title={i18next.t("provider:Signup HTML - Edit")} trigger="click">
              <Input value={context.state.application.signupHtml} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("signupHtml", e.target.value);
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
                <Editor value={context.state.application.signinHtml} lang="html" fillHeight dark onChange={(value: LegacyAny) => {
                  context.updateApplicationField("signinHtml", value);
                }} />
              </div>
            } title={i18next.t("provider:Signin HTML - Edit")} trigger="click">
              <Input value={context.state.application.signinHtml} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("signinHtml", e.target.value);
              }} />
            </Popover>
          </Col>
        </Row>
        {context.renderFullWidthContentRow(
          <SigninTable
            title={i18next.t("application:Signin items")}
            table={context.state.application.signinItems}
            themeAlgorithm={context.state.themeAlgorithm}
            onUpdateTable={(value: LegacyAny) => {
              context.updateApplicationField("signinItems", value);
            }}
          />,
          {className: "application-edit-table-row"}
        )}
        {
          !context.state.application.enableSignUp ? null : (
            <React.Fragment>
              {context.renderFullWidthContentRow(
                <SignupTable
                  title={i18next.t("application:Signup items")}
                  table={context.state.application.signupItems}
                  onUpdateTable={(value: LegacyAny) => {
                    context.updateApplicationField("signupItems", value);
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
            context.renderSignupSigninPreview()
          }
        </Row>
        {context.renderApplicationAssetField("formBackgroundUrl", i18next.t("application:Background URL"), i18next.t("application:Background URL - Tooltip"))}
        {context.renderApplicationAssetField("formBackgroundUrlMobile", i18next.t("application:Background URL Mobile"), i18next.t("application:Background URL Mobile - Tooltip"))}
        <Row>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Custom CSS"), i18next.t("application:Custom CSS - Tooltip"))} :
          </Col>
          <Col span={21}>
            <Popover placement="right" content={
              <div style={{width: "900px", height: "300px"}} >
                <Editor
                  value={context.state.application.formCss === "" ? template : context.state.application.formCss}
                  lang="css"
                  fillHeight
                  dark
                  onChange={(value: LegacyAny) => {
                    context.updateApplicationField("formCss", value);
                  }}
                />
              </div>
            } title={i18next.t("application:Custom CSS - Edit")} trigger="click">
              <Input value={context.state.application.formCss} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("formCss", e.target.value);
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
                  value={context.state.application.formCssMobile === "" ? template : context.state.application.formCssMobile}
                  lang="css"
                  fillHeight
                  dark
                  onChange={(value: LegacyAny) => {
                    context.updateApplicationField("formCssMobile", value);
                  }}
                />
              </div>
            } title={i18next.t("application:Custom CSS Mobile - Edit")} trigger="click">
              <Input value={context.state.application.formCssMobile} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("formCssMobile", e.target.value);
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
              <Radio.Group buttonStyle="solid" onChange={e => {context.updateApplicationField("formOffset", e.target.value);}} value={context.state.application.formOffset}>
                <Radio.Button value={1}>{i18next.t("application:Left")}</Radio.Button>
                <Radio.Button value={2}>{i18next.t("application:Center")}</Radio.Button>
                <Radio.Button value={3}>{i18next.t("application:Right")}</Radio.Button>
                <Radio.Button value={4}>
                  {i18next.t("application:Enable side panel")}
                </Radio.Button>
              </Radio.Group>
            </Row>
            {context.state.application.formOffset === 4 ?
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
                  {Setting.getLabel(i18next.t("application:Side panel HTML"), i18next.t("application:Side panel HTML - Tooltip"))} :
                </Col>
                <Col span={21} >
                  <Popover placement="right" content={
                    <div style={{width: "900px", height: "300px"}} >
                      <Editor
                        value={context.state.application.formSideHtml === "" ? sideTemplate : context.state.application.formSideHtml}
                        lang="html"
                        fillHeight
                        dark
                        onChange={(value: LegacyAny) => {
                          context.updateApplicationField("formSideHtml", value);
                        }}
                      />
                    </div>
                  } title={i18next.t("application:Side panel HTML - Edit")} trigger="click">
                    <Input value={context.state.application.formSideHtml} style={{marginBottom: "10px"}} onChange={e => {
                      context.updateApplicationField("formSideHtml", e.target.value);
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
              <Radio.Group buttonStyle="solid" value={context.state.application.themeData?.isEnabled ?? false} onChange={e => {
                const {_, ...theme} = context.state.application.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                context.updateApplicationField("themeData", {...theme, isEnabled: e.target.value});
              }} >
                <Radio.Button value={false}>{i18next.t("application:Follow organization theme")}</Radio.Button>
                <Radio.Button value={true}>{i18next.t("theme:Customize theme")}</Radio.Button>
              </Radio.Group>
            </Row>
            {
              context.state.application.themeData?.isEnabled ?
                <Row style={{marginTop: "20px"}}>
                  <ThemeEditor themeData={context.state.application.themeData} onThemeChange={(_: LegacyAny, nextThemeData: LegacyAny) => {
                    const {isEnabled} = context.state.application.themeData ?? {...Conf.ThemeDefault, isEnabled: false};
                    context.updateApplicationField("themeData", {...nextThemeData, isEnabled});
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
                  value={context.state.application.headerHtml}
                  lang="html"
                  fillHeight
                  dark
                  onChange={(value: LegacyAny) => {
                    context.updateApplicationField("headerHtml", value);
                  }}
                />
              </div>
            } title={i18next.t("application:Header HTML - Edit")} trigger="click">
              <Input value={context.state.application.headerHtml} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("headerHtml", e.target.value);
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
                  value={context.state.application.footerHtml}
                  lang="html"
                  fillHeight
                  dark
                  onChange={(value: LegacyAny) => {
                    context.updateApplicationField("footerHtml", value);
                  }}
                />
              </div>
            } title={i18next.t("application:Footer HTML - Edit")} trigger="click">
              <Input value={context.state.application.footerHtml} style={{marginBottom: "10px"}} onChange={e => {
                context.updateApplicationField("footerHtml", e.target.value);
              }} />
            </Popover>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
          </Col>
          <Button style={{marginLeft: "10px", marginBottom: "5px"}} onClick={() => context.updateApplicationField("footerHtml", Setting.getDefaultFooterContent())} >
            {i18next.t("general:Reset to Default")}
          </Button>
          <Button style={{marginLeft: "10px", marginBottom: "5px"}} onClick={() => context.updateApplicationField("footerHtml", Setting.getEmptyFooterContent())} >
            {i18next.t("application:Reset to Empty")}
          </Button>
        </Row>
        <Row className="admin-large-edit-full-width-row application-edit-full-width-row application-edit-preview-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:Preview"), i18next.t("general:Preview - Tooltip"))} :
          </Col>
          {
            context.renderPromptPreview()
          }
        </Row>
      </React.Fragment>
    )}
    {activeTabKey === "security" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:Security settings"))}
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Token cert"), i18next.t("application:Token cert - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.cert} onChange={(value => {context.updateApplicationField("cert", value);})}>
              {
                context.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row className="application-edit-control-row-medium" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Client cert"), i18next.t("application:Client cert - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.clientCert} onChange={(value => {context.updateApplicationField("clientCert", value);})}>
              {
                context.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Failed signin limit"), i18next.t("application:Failed signin limit - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.failedSigninLimit} min={1} step={1} precision={0} suffix={i18next.t("application:Times")} onChange={value => {
              context.updateApplicationField("failedSigninLimit", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Failed signin frozen time"), i18next.t("application:Failed signin frozen time - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.failedSigninFrozenTime} min={1} step={1} precision={0} suffix={i18next.t("application:Minutes")} onChange={value => {
              context.updateApplicationField("failedSigninFrozenTime", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Code resend timeout"), i18next.t("application:Code resend timeout - Tooltip"))} :
          </Col>
          <Col span={21} >
            <InputNumber style={{width: "150px"}} value={context.state.application.codeResendTimeout} min={0} step={1} precision={0} suffix={i18next.t("application:Seconds")} onChange={value => {
              context.updateApplicationField("codeResendTimeout", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("general:IP whitelist"), i18next.t("general:IP whitelist - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input placeholder={context.state.application.organizationObj?.ipWhitelist} value={context.state.application.ipWhitelist} onChange={e => {
              context.updateApplicationField("ipWhitelist", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("signup:Terms of Use"), i18next.t("signup:Terms of Use - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input prefix={<LinkOutlined />} value={context.state.application.termsOfUse} style={{marginBottom: "10px"}} onChange={e => {
              context.updateApplicationField("termsOfUse", e.target.value);
            }} />
            <Upload maxCount={1} accept=".html" showUploadList={false}
              beforeUpload={file => {return false;}} onChange={info => {context.handleUpload(info);}}>
              <Button icon={<UploadOutlined />} loading={context.state.uploading}>{i18next.t("general:Click to Upload")}</Button>
            </Upload>
          </Col>
        </Row>
      </React.Fragment>
    )}
    {activeTabKey === "reverse-proxy" && (
      <React.Fragment>
        {context.renderApplicationSectionTitle(i18next.t("application:Reverse Proxy settings"))}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("provider:Domain"), i18next.t("provider:Domain - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.domain} placeholder="e.g., blog.example.com" onChange={e => {
              context.updateApplicationField("domain", e.target.value);
            }} />
          </Col>
        </Row>
        {context.renderFullWidthContentRow(
          <UrlTable
            title={i18next.t("application:Other domains")}
            columnTitle={i18next.t("application:Domain")}
            table={context.state.application.otherDomains}
            onUpdateTable={(value: LegacyAny) => {context.updateApplicationField("otherDomains", value);}}
          />,
          {className: "application-edit-table-row"}
        )}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("application:Upstream host"), i18next.t("application:Upstream host - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Input value={context.state.application.upstreamHost} placeholder="e.g., localhost:8080 or 192.168.1.100:3000" onChange={e => {
              context.updateApplicationField("upstreamHost", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="application-edit-control-row-compact" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 3}>
            {Setting.getLabel(i18next.t("provider:SSL mode"), i18next.t("provider:SSL mode - Tooltip"))} :
          </Col>
          <Col span={21} >
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.sslMode} onChange={(value => {context.updateApplicationField("sslMode", value);})}>
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
            <Select virtual={false} style={{width: "100%"}} value={context.state.application.sslCert} onChange={(value => {context.updateApplicationField("sslCert", value);})}>
              <Option value="">{i18next.t("general:None")}</Option>
              {
                context.state.certs.map((cert, index) => <Option key={index} value={cert.name}>{cert.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
      </React.Fragment>
    )}</>;
}
