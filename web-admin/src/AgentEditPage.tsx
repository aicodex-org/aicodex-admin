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
import * as AgentBackend from "./backend/AgentBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";

const {Option} = Select;

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

interface AgentRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
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

interface AgentEditPageProps {
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
      agentName: string;
    };
  };
}

interface AgentEditPageState {
  classes: AgentEditPageProps;
  agentName: string;
  owner: string;
  agent: AgentRecord | null;
  organizations: OrganizationRecord[];
  applications: ApplicationRecord[];
  mode: string;
}

function t(key: string): string {
  return String(i18next.t(key));
}

class AgentEditPage extends React.Component<AgentEditPageProps, AgentEditPageState> {
  constructor(props: AgentEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      agentName: props.match.params.agentName,
      owner: props.match.params.organizationName,
      agent: null,
      organizations: [],
      applications: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getAgent();
    this.getOrganizations();
    this.getApplications(this.state.owner);
  }

  getAgent(): void {
    AgentBackend.getAgent(this.state.agent?.owner || this.state.owner, this.state.agentName)
      .then((res: BackendResponse<AgentRecord>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "ok") {
          this.setState({
            agent: res.data ?? null,
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

  updateAgentField(key: string, value: unknown): void {
    const agent = this.state.agent;
    if (agent === null) {
      return;
    }

    if (key === "owner" && agent.owner !== value) {
      agent.application = "";
      this.getApplications(String(value));
    }

    agent[key] = value as string;
    this.setState({
      agent: agent,
    });
  }

  submitAgentEdit(willExit: boolean): void {
    if (this.state.agent === null) {
      return;
    }

    const agent = Setting.deepCopy(this.state.agent) as AgentRecord;
    AgentBackend.updateAgent(this.state.owner, this.state.agentName, agent)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully modified"));
          if (willExit) {
            this.props.history.push("/agents");
          } else {
            this.setState({
              mode: "edit",
              owner: agent.owner,
              agentName: agent.name,
            }, () => {this.getAgent();});
            this.props.history.push(`/agents/${agent.owner}/${agent.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to update")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteAgent(): void {
    if (this.state.agent === null) {
      return;
    }

    AgentBackend.deleteAgent(this.state.agent)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.props.history.push("/agents");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderAgent(): React.ReactNode {
    if (this.state.agent === null) {
      return null;
    }

    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("agent:New Agent") : t("agent:Edit Agent")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitAgentEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitAgentEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteAgent()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={this.state.agent.owner} onChange={(value => {this.updateAgentField("owner", value);})}>
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
            <Input value={this.state.agent.name} onChange={e => {
              this.updateAgentField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Display name")}:
          </Col>
          <Col span={22} >
            <Input value={this.state.agent.displayName} onChange={e => {
              this.updateAgentField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Listening URL"), t("general:Listening URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input prefix={<LinkOutlined />} value={this.state.agent.url} onChange={e => {
              this.updateAgentField("url", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("token:Access token"), t("token:Access token - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input.Password placeholder={"***"} value={this.state.agent.token} onChange={e => {
              this.updateAgentField("token", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Application"), t("general:Application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.agent.application} onChange={(value => {this.updateAgentField("application", value);})}>
              {
                this.state.applications.map((application, index) => <Option key={index} value={application.name}>{application.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
      </Card>
    );
  }

  render(): React.ReactNode {
    if (this.state.agent === null) {
      return null;
    }

    return (
      <div>
        {this.renderAgent()}
      </div>
    );
  }
}

export default AgentEditPage;
