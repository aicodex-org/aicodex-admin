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
import {Button, Card, Col, Input, Row, Select, Switch} from "antd";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as RoleBackend from "./backend/RoleBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import PaginateSelect from "./common/PaginateSelect";

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

type Account = {
  owner?: string;
  name?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type RouteMatch = {
  params: {
    organizationName: string;
    roleName: string;
  };
};

type RoleEditPageProps = {
  account: Account;
  history: {
    push: (location: string) => void;
  };
  location?: {
    mode?: string;
  };
  match: RouteMatch;
  organizationName?: string;
};

type RoleRecord = {
  owner: string;
  name: string;
  createdTime?: string;
  displayName: string;
  description?: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  isEnabled: boolean;
  [key: string]: unknown;
};

type OrganizationRecord = {
  name: string;
};

type UserRecord = {
  owner: string;
  name: string;
};

type GroupRecord = {
  owner: string;
  name: string;
};

type PaginateFetchArgs = {
  page: number;
  pageSize: number;
  searchText?: string;
};

type BackendResponse<T> = {
  status: string;
  msg?: string;
  data?: T | null;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type RoleEditPageState = {
  classes: RoleEditPageProps;
  organizationName: string;
  roleName: string;
  role: RoleRecord | null;
  organizations: OrganizationRecord[];
  mode: string;
};

type RoleBackendApi = {
  getRole: (organizationName: string, roleName: string) => Promise<BackendResponse<RoleRecord>>;
  getRoles: (...args: unknown[]) => Promise<BackendResponse<RoleRecord[]>>;
  updateRole: (organizationName: string, roleName: string, role: RoleRecord) => Promise<MutationResponse>;
  deleteRole: (role: RoleRecord) => Promise<MutationResponse>;
};

type OrganizationBackendApi = {
  getOrganizations: (owner: string) => Promise<BackendResponse<OrganizationRecord[]>>;
};

type UserBackendApi = {
  getUsers: (...args: unknown[]) => Promise<BackendResponse<UserRecord[]>>;
};

type GroupBackendApi = {
  getGroups: (...args: unknown[]) => Promise<BackendResponse<GroupRecord[]>>;
};

const roleBackend = RoleBackend as unknown as RoleBackendApi;
const organizationBackend = OrganizationBackend as unknown as OrganizationBackendApi;
const userBackend = UserBackend as unknown as UserBackendApi;
const groupBackend = GroupBackend as unknown as GroupBackendApi;

class RoleEditPage extends React.Component<RoleEditPageProps, RoleEditPageState> {
  constructor(props: RoleEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      roleName: decodeURIComponent(props.match.params.roleName),
      role: null,
      organizations: [],
      mode: props.location?.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getRole();
    this.getOrganizations();
  }

  getRole(): void {
    roleBackend.getRole(this.state.organizationName, this.state.roleName)
      .then((res: BackendResponse<RoleRecord>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          role: res.data || null,
        });
      });
  }

  getOrganizations(): void {
    organizationBackend.getOrganizations("admin")
      .then((res: BackendResponse<OrganizationRecord[]>) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  parseRoleField(_key: keyof RoleRecord, value: unknown): unknown {
    return value;
  }

  updateRoleField(key: keyof RoleRecord, value: unknown): void {
    const parsedValue = this.parseRoleField(key, value);
    const role = this.state.role;
    if (role === null) {
      return;
    }

    this.setState({
      role: {
        ...role,
        [key]: parsedValue,
      },
    });
  }

  renderRole(): React.ReactNode {
    const {role} = this.state;
    if (role === null) {
      return null;
    }

    return (
      <Card className="admin-identity-object-edit-card role-edit-card" size="small" title={
        <div>
          {this.state.mode === "add" ? t("role:New Role") : t("role:Edit Role")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitRoleEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitRoleEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deleteRole()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={role.owner} onChange={(value: string) => {this.updateRoleField("owner", value);}}
              options={this.state.organizations.map((organization) => Setting.getOption(organization.name, organization.name))
              } />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={role.name} onChange={e => {
              this.updateRoleField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={role.displayName} onChange={e => {
              this.updateRoleField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Description"), t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={role.description} onChange={e => {
              this.updateRoleField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub users"), t("role:Sub users - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              virtual
              mode="multiple"
              style={{width: "100%"}}
              value={role.users}
              fetchPage={userBackend.getUsers}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [role.owner, page, pageSize, field, searchText];
              }}
              reloadKey={role.owner}
              optionMapper={(user: UserRecord) => Setting.getOption(`${user.owner}/${user.name}`, `${user.owner}/${user.name}`)}
              filterOption={false}
              onChange={(value: string[]) => {this.updateRoleField("users", value);}}
            />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub groups"), t("role:Sub groups - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              mode="multiple"
              style={{width: "100%"}}
              value={role.groups}
              fetchPage={groupBackend.getGroups}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [role.owner, false, page, pageSize, field, searchText, "", ""];
              }}
              reloadKey={role.owner}
              optionMapper={(group: GroupRecord) => Setting.getOption(`${group.owner}/${group.name}`, `${group.owner}/${group.name}`)}
              filterOption={false}
              onChange={(value: string[]) => {this.updateRoleField("groups", value);}}
            />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub roles"), t("role:Sub roles - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              mode="multiple"
              style={{width: "100%"}}
              value={role.roles}
              fetchPage={roleBackend.getRoles}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [role.owner, page, pageSize, field, searchText, "", ""];
              }}
              reloadKey={`${role.owner}/${role.name}`}
              optionMapper={(item: RoleRecord) => {
                if (item.owner === role.owner && item.name === role.name) {
                  return null;
                }
                return Setting.getOption(`${item.owner}/${item.name}`, `${item.owner}/${item.name}`);
              }}
              filterOption={false}
              onChange={(value: string[]) => {this.updateRoleField("roles", value);}}
            />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub domains"), t("role:Sub domains - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={role.domains} onChange={(value: string[]) => {
              this.updateRoleField("domains", value);
            }}
            options={role.domains?.map((domain) => Setting.getOption(domain, domain))
            } />
          </Col>
        </Row>
        <Row className="admin-identity-object-edit-field-row" style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(t("general:Is enabled"), t("general:Is enabled - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={role.isEnabled} onChange={(checked: boolean) => {
              this.updateRoleField("isEnabled", checked);
            }} />
          </Col>
        </Row>
      </Card>
    );
  }

  submitRoleEdit(exitAfterSave: boolean): void {
    if (this.state.role === null) {
      return;
    }
    const role = Setting.deepCopy(this.state.role) as RoleRecord;
    roleBackend.updateRole(this.state.organizationName, this.state.roleName, role)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            roleName: this.state.role?.name || this.state.roleName,
          });

          if (exitAfterSave) {
            this.props.history.push("/roles");
          } else if (this.state.role !== null) {
            this.props.history.push(`/roles/${this.state.role.owner}/${encodeURIComponent(this.state.role.name)}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updateRoleField("name", this.state.roleName);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteRole(): void {
    if (this.state.role === null) {
      return;
    }
    roleBackend.deleteRole(this.state.role)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push("/roles");
        } else {
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render(): React.ReactNode {
    return (
      <div className="admin-identity-object-edit-page role-edit-page">
        {
          this.state.role !== null ? this.renderRole() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitRoleEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitRoleEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deleteRole()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default RoleEditPage;
