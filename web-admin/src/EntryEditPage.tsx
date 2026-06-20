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
import {Button, Card, Col, Input, Row, Select} from "antd";
import {LinkOutlined} from "@ant-design/icons";
import * as EntryBackend from "./backend/EntryBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";

const {Option} = Select;
const {TextArea} = Input;

interface BackendResponse<T> {
  status?: string;
  data?: T | null;
  msg?: string;
}

interface AccountRecord {
  owner?: string;
  tag?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

interface EntryRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  message: string;
  [key: string]: unknown;
}

interface OrganizationRecord {
  name: string;
  [key: string]: unknown;
}

interface ApplicationRecord {
  name: string;
  [key: string]: unknown;
}

interface EntryEditPageProps {
  account: AccountRecord;
  history: {
    push: (location: string) => void;
  };
  location: {
    mode?: string;
  };
  match: {
    params: {
      organizationName: string;
      entryName: string;
    };
  };
}

interface EntryEditPageState {
  classes: EntryEditPageProps;
  entryName: string;
  owner: string;
  entry: EntryRecord | null;
  organizations: OrganizationRecord[];
  applications: ApplicationRecord[];
  mode: string;
}

function t(key: string): string {
  return String(i18next.t(key));
}

class EntryEditPage extends React.Component<EntryEditPageProps, EntryEditPageState> {
  constructor(props: EntryEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      entryName: props.match.params.entryName,
      owner: props.match.params.organizationName,
      entry: null,
      organizations: [],
      applications: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getEntry();
    this.getOrganizations();
    this.getApplications(this.state.owner);
  }

  getEntry(): void {
    EntryBackend.getEntry(this.state.entry?.owner || this.state.owner, this.state.entryName)
      .then((res: BackendResponse<EntryRecord>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "ok") {
          this.setState({
            entry: res.data ?? null,
          });
        } else {
          Setting.showMessage("error", `${t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getOrganizations(): void {
    if (Setting.isAdminUser(this.props.account)) {
      OrganizationBackend.getOrganizations("admin")
        .then((res: BackendResponse<OrganizationRecord[]>) => {
          this.setState({
            organizations: res.data || [],
          });
        });
    }
  }

  getApplications(owner: string): void {
    ApplicationBackend.getApplicationsByOrganization("admin", owner)
      .then((res: BackendResponse<ApplicationRecord[]>) => {
        this.setState({
          applications: res.data || [],
        });
      });
  }

  updateEntryField(key: string, value: unknown): void {
    const entry = this.state.entry;
    if (entry === null) {
      return;
    }

    if (key === "owner" && entry.owner !== value) {
      entry.application = "";
      this.getApplications(String(value));
    }

    entry[key] = value as string;
    this.setState({
      entry: entry,
    });
  }

  submitEntryEdit(willExit: boolean): void {
    if (this.state.entry === null) {
      return;
    }

    const entry = Setting.deepCopy(this.state.entry) as EntryRecord;
    EntryBackend.updateEntry(this.state.owner, this.state.entryName, entry)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully modified"));
          if (willExit) {
            this.props.history.push("/entries");
          } else {
            this.setState({
              mode: "edit",
              owner: entry.owner,
              entryName: entry.name,
            }, () => {this.getEntry();});
            this.props.history.push(`/entries/${entry.owner}/${entry.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to update")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteEntry(): void {
    if (this.state.entry === null) {
      return;
    }

    EntryBackend.deleteEntry(this.state.entry)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.props.history.push("/entries");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderEntry(): React.ReactNode {
    if (this.state.entry === null) {
      return null;
    }

    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("entry:New Entry") : t("entry:Edit Entry")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitEntryEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitEntryEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteEntry()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={this.state.entry.owner} onChange={(value => {this.updateEntryField("owner", value);})}>
              {
                this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Name")}:
          </Col>
          <Col span={22} >
            <Input value={this.state.entry.name} onChange={e => {
              this.updateEntryField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Display name")}:
          </Col>
          <Col span={22} >
            <Input value={this.state.entry.displayName} onChange={e => {
              this.updateEntryField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Listening URL"), t("general:Listening URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input prefix={<LinkOutlined />} value={this.state.entry.url} onChange={e => {
              this.updateEntryField("url", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("token:Access token"), t("token:Access token - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input.Password placeholder={"***"} value={this.state.entry.token} onChange={e => {
              this.updateEntryField("token", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Application"), t("general:Application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.entry.application} onChange={(value => {this.updateEntryField("application", value);})}>
              {
                this.state.applications.map((application, index) => <Option key={index} value={application.name}>{application.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("payment:Message")}:
          </Col>
          <Col span={22} >
            <TextArea autoSize={{minRows: 8, maxRows: 20}} value={this.state.entry.message} onChange={e => {
              this.updateEntryField("message", e.target.value);
            }} />
          </Col>
        </Row>
      </Card>
    );
  }

  render(): React.ReactNode {
    if (this.state.entry === null) {
      return null;
    }

    return (
      <div>
        {this.renderEntry()}
      </div>
    );
  }
}

export default EntryEditPage;
