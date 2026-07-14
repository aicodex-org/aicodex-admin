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
import * as ServerBackend from "./backend/ServerBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import ToolTable from "./ToolTable";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";

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

interface ToolRecord {
  name?: string;
  description?: string;
  isAllowed?: boolean;
  [key: string]: unknown;
}

interface ServerRecord {
  owner: string;
  name: string;
  displayName: string;
  url: string;
  token: string;
  application: string;
  tools?: ToolRecord[];
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

interface ServerEditPageProps {
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
      serverName: string;
    };
  };
}

interface ServerEditPageState {
  classes: ServerEditPageProps;
  serverName: string;
  owner: string;
  server: ServerRecord | null;
  organizations: OrganizationRecord[];
  applications: ApplicationRecord[];
  mode: string;
}

type ToolTableProps = {
  tools: ToolRecord[];
  onUpdateTable: (value: ToolRecord[]) => void;
};

// ToolTable 仍是 legacy JS；这里仅声明 MCP Server 编辑页传入的最小 props 面。
const TypedToolTable = ToolTable as React.ComponentType<ToolTableProps>;

function t(key: string): string {
  return String(i18next.t(key));
}

class ServerEditPage extends React.Component<ServerEditPageProps, ServerEditPageState> {
  constructor(props: ServerEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      serverName: props.match.params.serverName,
      owner: props.match.params.organizationName,
      server: null,
      organizations: [],
      applications: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getServer();
    this.getOrganizations();
    this.getApplications(this.state.owner);
  }

  getServer(): void {
    ServerBackend.getServer(this.state.server?.owner || this.state.owner, this.state.serverName)
      .then((res: BackendResponse<ServerRecord>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "ok") {
          const server = res.data ?? null;
          this.setState({
            server: server,
          }, () => {
            if (server !== null) {
              this.publishWorkspaceTabLabel(server);
            }
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

  updateServerField(key: string, value: unknown): void {
    const server = this.state.server;
    if (server === null) {
      return;
    }

    if (key === "owner" && server.owner !== value) {
      server.application = "";
      this.getApplications(String(value));
    }

    server[key] = value;
    this.setState({
      server: server,
    }, () => {
      if (key === "displayName") {
        this.publishWorkspaceTabLabel(server);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/servers/${this.state.owner}/${this.state.serverName}`;
  }

  getServerWorkspaceTabLabel(server: ServerRecord): string {
    const displayName = `${server.displayName ?? ""}`.trim();
    const technicalName = `${server.name || this.state.serverName}`.trim() || this.state.serverName;
    const editLabel = t("server:Edit MCP Server");
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${displayName || technicalName}`;
  }

  // Server 成功加载或顶层显示名称变化后，只更新当前工作页标签，不改变编辑路由与标签顺序。
  publishWorkspaceTabLabel(server: ServerRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getServerWorkspaceTabLabel(server),
      },
    }));
  }

  submitServerEdit(willExit: boolean): void {
    if (this.state.server === null) {
      return;
    }

    const server = Setting.deepCopy(this.state.server) as ServerRecord;
    ServerBackend.updateServer(this.state.owner, this.state.serverName, server)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully modified"));
          if (willExit) {
            this.props.history.push("/servers");
          } else {
            this.setState({
              mode: "edit",
              owner: server.owner,
              serverName: server.name,
            }, () => {this.getServer();});
            this.props.history.push(`/servers/${server.owner}/${server.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to update")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteServer(): void {
    if (this.state.server === null) {
      return;
    }

    ServerBackend.deleteServer(this.state.server)
      .then((res: BackendResponse<unknown>) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully deleted"));
          this.props.history.push("/servers");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderServer(): React.ReactNode {
    if (this.state.server === null) {
      return null;
    }

    const server = this.state.server;

    return (
      <Card className="admin-gateway-edit-card" size="small" title={
        <div>
          {this.state.mode === "add" ? t("server:New MCP Server") : t("server:Edit MCP Server")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitServerEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitServerEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteServer()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={server.owner} onChange={(value => {this.updateServerField("owner", value);})}>
              {
                this.state.organizations.map((organization, index) => <Option key={index} value={organization.name}>{organization.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Name")}:
          </Col>
          <Col span={22} >
            <Input value={server.name} onChange={e => {
              this.updateServerField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {t("general:Display name")}:
          </Col>
          <Col span={22} >
            <Input value={server.displayName} onChange={e => {
              this.updateServerField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:URL"), t("general:URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input prefix={<LinkOutlined />} value={server.url} onChange={e => {
              this.updateServerField("url", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("token:Access token"), t("token:Access token - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input.Password placeholder={"***"} value={server.token} onChange={e => {
              this.updateServerField("token", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Application"), t("general:Application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={server.application} onChange={(value => {this.updateServerField("application", value);})}>
              {
                this.state.applications.map((application, index) => <Option key={index} value={application.name}>{application.name}</Option>)
              }
            </Select>
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Tool"), t("general:Tool - Tooltip"))} :
          </Col>
          <Col span={22} >
            <TypedToolTable
              tools={server.tools || []}
              onUpdateTable={(value) => {this.updateServerField("tools", value);}}
            />
          </Col>
        </Row>
        <Row className="admin-gateway-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("provider:Base URL"), t("provider:Base URL - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input prefix={<LinkOutlined />} readOnly value={`${window.location.origin}/api/server/${server.owner}/${server.name}`} />
          </Col>
        </Row>
      </Card>
    );
  }

  render(): React.ReactNode {
    if (this.state.server === null) {
      return null;
    }

    return (
      <div className="admin-gateway-edit-page">
        {this.renderServer()}
      </div>
    );
  }
}

export default ServerEditPage;
