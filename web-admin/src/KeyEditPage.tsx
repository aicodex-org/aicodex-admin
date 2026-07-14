// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {Button, Card, Col, DatePicker, Input, Row, Select} from "antd";
import * as KeyBackend from "./backend/KeyBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as Setting from "./Setting";
import rawI18next from "i18next";
import moment from "moment";
import LargeEditShell from "./common/LargeEditShell";

const i18next = rawI18next as Omit<typeof rawI18next, "t"> & {
  t: (key: string, defaultValue?: string) => string;
};
type LegacyAny = any;
type AdminRouteProps = Record<string, LegacyAny>;

const {Option} = Select;

class KeyEditPage extends React.Component<AdminRouteProps, LegacyAny> {
  constructor(props: AdminRouteProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.match.params.organizationName,
      keyName: props.match.params.keyName,
      key: null,
      organizations: [],
      applications: [],
      users: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
      submitting: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getKey();
    this.getOrganizations();
  }

  getKey() {
    if (this.state.mode === "add" && this.props.location.keyDraft !== undefined) {
      const key = this.props.location.keyDraft;
      this.setState({key});
      this.getApplicationsByOrganization(key.organization || this.state.organizationName);
      this.getUsersByOrganization(key.organization || this.state.organizationName);
      return;
    }

    KeyBackend.getKey(this.state.organizationName, this.state.keyName)
      .then((res) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          key: res.data,
        });

        this.getApplicationsByOrganization(res.data.organization || this.state.organizationName);
        this.getUsersByOrganization(res.data.organization || this.state.organizationName);
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizations("admin")
      .then((res) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getApplicationsByOrganization(organizationName: string): void {
    ApplicationBackend.getApplicationsByOrganization("admin", organizationName)
      .then((res) => {
        this.setState({
          applications: res.data || [],
        });
      });
  }

  getUsersByOrganization(organizationName: string): void {
    UserBackend.getUsers(organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            users: res.data || [],
          });
        }
      });
  }

  parseKeyField(key: string, value: LegacyAny): LegacyAny {
    return value;
  }

  updateKeyField(key: string, value: LegacyAny): void {
    value = this.parseKeyField(key, value);

    const keyObj = this.state.key;
    keyObj[key] = value;
    this.setState({
      key: keyObj,
    });
  }

  getOrganizationDisplayName(organization: LegacyAny): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  renderOrganizationOptions(): React.ReactNode {
    return this.state.organizations.map((organization: LegacyAny) => {
      const displayName = this.getOrganizationDisplayName(organization);
      return (
        <Option key={organization.name} value={organization.name} label={displayName}>
          <div className="admin-large-edit-organization-option key-edit-organization-option">
            <span className="admin-large-edit-organization-option-name key-edit-organization-option-name">{displayName}</span>
            {displayName !== organization.name ? (
              <span className="admin-large-edit-organization-option-id key-edit-organization-option-id">{organization.name}</span>
            ) : null}
          </div>
        </Option>
      );
    });
  }

  renderKeyForm() {
    return (
      <div className="admin-large-edit-form-content key-edit-form-content">
        <h2 className="admin-large-edit-content-section-title key-edit-section-title">{i18next.t("general:Basic information")}</h2>
        <Row className="admin-access-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {i18next.t("general:Organization")} :
          </Col>
          <Col span={22} >
            <Select
              virtual={false}
              showSearch
              optionLabelProp="label"
              style={{width: "100%"}}
              disabled={!Setting.isAdminUser(this.props.account)}
              value={this.state.key.owner}
              filterOption={(input, option) => {
                const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                return optionText.includes(input.toLowerCase());
              }}
              onChange={(value => {
                this.updateKeyField("owner", value);
                this.updateKeyField("organization", value);
                this.getApplicationsByOrganization(value);
                this.getUsersByOrganization(value);
              })}
            >
              {this.renderOrganizationOptions()}
            </Select>
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("key:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.key.name} onChange={e => {
              this.updateKeyField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {i18next.t("general:Display name")} :
          </Col>
          <Col span={22} >
            <Input value={this.state.key.displayName} onChange={e => {
              this.updateKeyField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Type"), i18next.t("key:Type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.key.type} onChange={(value => {
              this.updateKeyField("type", value);
            })}>
              <Option value="Organization">{i18next.t("general:Organization")}</Option>
              <Option value="Application">{i18next.t("general:Application")}</Option>
              <Option value="User">{i18next.t("general:User")}</Option>
              <Option value="General">{i18next.t("general:General")}</Option>
            </Select>
          </Col>
        </Row>
        {
          this.state.key.type === "Application" ? (
            <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {i18next.t("general:Application")} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.key.application} onChange={(value => {
                  this.updateKeyField("application", value);
                })}>
                  {
                    this.state.applications.map((application: LegacyAny, index: number) => <Option key={index} value={application.name}>{application.name}</Option>)
                  }
                </Select>
              </Col>
            </Row>
          ) : null
        }
        {
          this.state.key.type === "User" ? (
            <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {i18next.t("general:User")} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.key.user} onChange={(value => {
                  this.updateKeyField("user", value);
                })}>
                  {
                    this.state.users.map((user: LegacyAny, index: number) => <Option key={index} value={user.name}>{user.name}</Option>)
                  }
                </Select>
              </Col>
            </Row>
          ) : null
        }
        <h2 className="admin-large-edit-content-section-title key-edit-section-title key-edit-credential-section-title">{i18next.t("key:Credentials and status", "Credentials and status")}</h2>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("key:Access key"), i18next.t("key:Access key - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.key.accessKey} readOnly={true} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("key:Access secret"), i18next.t("key:Access secret - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input.Password value={this.state.key.accessSecret} readOnly={true} />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {i18next.t("general:Expire time")} :
          </Col>
          <Col span={22} >
            <DatePicker
              showTime
              value={this.state.key.expireTime ? moment(this.state.key.expireTime) : null}
              onChange={(value, dateString) => {
                this.updateKeyField("expireTime", dateString);
              }}
            />
          </Col>
        </Row>
        <Row className="admin-access-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {i18next.t("general:State")} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.key.state} onChange={(value => {
              this.updateKeyField("state", value);
            })}>
              <Option value="Active">{i18next.t("subscription:Active")}</Option>
              <Option value="Inactive">{i18next.t("key:Inactive")}</Option>
            </Select>
          </Col>
        </Row>
      </div>
    );
  }

  handleBack(): void {
    this.props.history.push("/keys");
  }

  renderKey() {
    const title = this.state.mode === "add" ? i18next.t("key:New Key") : `${i18next.t("key:Edit Key")} (${this.state.key.name})`;
    return (
      <Card className="admin-large-edit-card key-edit-card admin-access-edit-card" size="small" variant="borderless" styles={{body: {height: "100%", padding: 0}}}>
        <LargeEditShell
          classPrefix="key-edit"
          backLabel={i18next.t("general:Back")}
          breadcrumb={<React.Fragment>{i18next.t("general:Application Access")} / {i18next.t("general:Keys")} /</React.Fragment>}
          title={title}
          actions={<React.Fragment>
            <Button onClick={() => this.handleBack()}>{i18next.t("general:Cancel")}</Button>
            <Button type="primary" loading={this.state.submitting} disabled={this.state.submitting} onClick={() => this.submitKeyEdit(false)}>{i18next.t("general:Save")}</Button>
            <Button disabled={this.state.submitting} onClick={() => this.submitKeyEdit(true)}>{i18next.t("general:Save and return")}</Button>
          </React.Fragment>}
          onBack={() => this.handleBack()}
        >
          {this.renderKeyForm()}
        </LargeEditShell>
      </Card>
    );
  }

  submitKeyEdit(exitAfterSave?: boolean): void {
    if (this.state.submitting) {
      return;
    }
    const key = Setting.deepCopy(this.state.key);
    this.setState({submitting: true});
    const request = this.state.mode === "add" ? KeyBackend.addKey(key) : KeyBackend.updateKey(this.state.organizationName, this.state.keyName, key);
    request
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", this.state.mode === "add" ? i18next.t("general:Successfully added") : i18next.t("general:Successfully saved"));
          this.setState({
            organizationName: this.state.key.owner,
            keyName: this.state.key.name,
            mode: "edit",
            submitting: false,
          }, () => {
            if (exitAfterSave) {
              this.props.history.push("/keys");
            } else {
              this.props.history.push(`/keys/${this.state.key.owner}/${this.state.key.name}`);
              this.getKey();
            }
          });
        } else {
          this.setState({submitting: false});
          Setting.showMessage("error", `${this.state.mode === "add" ? i18next.t("general:Failed to add") : i18next.t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode !== "add") {
            this.updateKeyField("owner", this.state.organizationName);
            this.updateKeyField("name", this.state.keyName);
          }
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteKey() {
    KeyBackend.deleteKey(this.state.key)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/keys");
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="admin-large-edit-page key-edit-page admin-access-edit-page">
        {
          this.state.key !== null ? this.renderKey() : null
        }
      </div>
    );
  }
}

export default KeyEditPage;
