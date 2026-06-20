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
import PaginateSelect from "./common/PaginateSelect";
import * as PermissionBackend from "./backend/PermissionBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as RoleBackend from "./backend/RoleBackend";
import * as ModelBackend from "./backend/ModelBackend";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import moment from "moment/moment";

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

type Account = {
  owner?: string;
  name: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type RouteMatch = {
  params: {
    organizationName: string;
    permissionName: string;
  };
};

type PermissionEditPageProps = {
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

type RoleRecord = {
  owner: string;
  name: string;
};

type ModelRecord = {
  owner: string;
  name: string;
  modelText: string;
};

type ApplicationRecord = {
  name: string;
};

type PermissionRecord = {
  owner: string;
  name: string;
  displayName: string;
  description?: string;
  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  model: string;
  resourceType: string;
  resources: string[];
  actions: string[];
  effect: string;
  isEnabled: boolean;
  submitter: string;
  approver: string;
  approveTime: string;
  state: string;
  [key: string]: unknown;
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
  data2?: number | string;
};

type MutationResponse = {
  status: string;
  msg?: string;
};

type PermissionEditPageState = {
  classes: PermissionEditPageProps;
  organizationName: string;
  permissionName: string;
  permission: PermissionRecord | null;
  organizations: OrganizationRecord[];
  model: ModelRecord | null;
  users: UserRecord[];
  groups: GroupRecord[];
  roles: RoleRecord[];
  models: ModelRecord[];
  resources: ApplicationRecord[];
  mode: string;
};

type PermissionBackendApi = {
  getPermission: (organizationName: string, permissionName: string) => Promise<BackendResponse<PermissionRecord>>;
  updatePermission: (organizationName: string, permissionName: string, permission: PermissionRecord) => Promise<MutationResponse>;
  deletePermission: (permission: PermissionRecord) => Promise<MutationResponse>;
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

type RoleBackendApi = {
  getRoles: (...args: unknown[]) => Promise<BackendResponse<RoleRecord[]>>;
};

type ModelBackendApi = {
  getModels: (organizationName: string) => Promise<BackendResponse<ModelRecord[]>>;
  getModel: (organizationName: string, modelName: string) => Promise<BackendResponse<ModelRecord>>;
};

type ApplicationBackendApi = {
  getApplicationsByOrganization: (owner: string, organizationName: string) => Promise<BackendResponse<ApplicationRecord[]>>;
};

const permissionBackend = PermissionBackend as unknown as PermissionBackendApi;
const organizationBackend = OrganizationBackend as unknown as OrganizationBackendApi;
const userBackend = UserBackend as unknown as UserBackendApi;
const groupBackend = GroupBackend as unknown as GroupBackendApi;
const roleBackend = RoleBackend as unknown as RoleBackendApi;
const modelBackend = ModelBackend as unknown as ModelBackendApi;
const applicationBackend = ApplicationBackend as unknown as ApplicationBackendApi;

class PermissionEditPage extends React.Component<PermissionEditPageProps, PermissionEditPageState> {
  constructor(props: PermissionEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      permissionName: decodeURIComponent(props.match.params.permissionName),
      permission: null,
      organizations: [],
      model: null,
      users: [],
      groups: [],
      roles: [],
      models: [],
      resources: [],
      mode: props.location?.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getPermission();
    this.getOrganizations();
  }

  getPermission(): void {
    permissionBackend.getPermission(this.state.organizationName, this.state.permissionName)
      .then((res: BackendResponse<PermissionRecord>) => {
        const permission = res.data;

        if (permission === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        if (permission === undefined) {
          return;
        }

        this.setState({
          permission: permission,
        });

        this.getModels(permission.owner);
        this.getResources(permission.owner);
        this.getModel(permission.model);
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

  getModels(organizationName: string): void {
    modelBackend.getModels(organizationName)
      .then((res: BackendResponse<ModelRecord[]>) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          models: res.data || [],
        });
      });
  }

  getModel(modelId: string): void {
    if (modelId === "") {
      return;
    }

    const organizationName = modelId.split("/")[0];
    const modelName = modelId.split("/")[1];
    modelBackend.getModel(organizationName, modelName)
      .then((res: BackendResponse<ModelRecord>) => {
        this.setState({
          model: res.data || null,
        });
      });
  }

  getResources(organizationName: string): void {
    applicationBackend.getApplicationsByOrganization("admin", organizationName)
      .then((res: BackendResponse<ApplicationRecord[]>) => {
        this.setState({
          resources: res.data || [],
        });
      });
  }

  parsePermissionField(_key: keyof PermissionRecord, value: unknown): unknown {
    return value;
  }

  updatePermissionField(key: keyof PermissionRecord, value: unknown): void {
    if (key === "model" && typeof value === "string") {
      this.getModel(value);
    }

    const parsedValue = this.parsePermissionField(key, value);
    const permission = this.state.permission;
    if (permission === null) {
      return;
    }

    this.setState({
      permission: {
        ...permission,
        [key]: parsedValue,
      },
    });
  }

  hasRoleDefinition(model: ModelRecord | null): boolean {
    if (model !== null) {
      return model.modelText.includes("role_definition");
    }
    return false;
  }

  renderPermission(): React.ReactNode {
    const {permission} = this.state;
    if (permission === null) {
      return null;
    }

    return (
      <Card size="small" title={
        <div>
          {this.state.mode === "add" ? t("permission:New Permission") : t("permission:Edit Permission")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitPermissionEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitPermissionEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} onClick={() => this.deletePermission()}>{t("general:Cancel")}</Button> : null}
        </div>
      } style={(Setting.isMobile()) ? {margin: "5px"} : {}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={!Setting.isAdminUser(this.props.account)} value={permission.owner} onChange={(owner: string) => {
              this.updatePermissionField("owner", owner);
              this.getModels(owner);
              this.getResources(owner);
            }}
            options={this.state.organizations.map((organization) => Setting.getOption(organization.name, organization.name))
            } />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Name"), t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={permission.name} onChange={e => {
              this.updatePermissionField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={permission.displayName} onChange={e => {
              this.updatePermissionField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Description"), t("general:Description - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={permission.description} onChange={e => {
              this.updatePermissionField("description", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Model"), t("general:Model - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={permission.model} onChange={(selectedModel: string) => {
              this.updatePermissionField("model", selectedModel);
            }}
            options={this.state.models.map((model) => Setting.getOption(`${model.owner}/${model.name}`, `${model.owner}/${model.name}`))
            } />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub users"), t("role:Sub users - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              virtual
              mode="multiple"
              style={{width: "100%"}}
              value={permission.users}
              allowClear
              fetchPage={async(...args: unknown[]) => {
                const res = await userBackend.getUsers(...args);
                if (res.status !== "ok") {
                  return res;
                }
                const data = (res.data || []).map((user) => Setting.getOption(`${user.owner}/${user.name}`, `${user.owner}/${user.name}`));
                return {
                  ...res,
                  data: args?.[1] === 1 && Array.isArray(res?.data)
                    ? [Setting.getOption(t("general:All"), "*"), ...data]
                    : data,
                };
              }}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [permission.owner, page, pageSize, field, searchText];
              }}
              reloadKey={permission?.owner}
              filterOption={false}
              onChange={(value: string[]) => {this.updatePermissionField("users", value);}}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub groups"), t("role:Sub groups - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              virtual
              mode="multiple"
              style={{width: "100%"}}
              value={permission.groups}
              allowClear
              fetchPage={async(...args: unknown[]) => {
                const res = await groupBackend.getGroups(...args);
                if (res.status !== "ok") {
                  return res;
                }
                const data = (res.data || []).map((group) => Setting.getOption(`${group.owner}/${group.name}`, `${group.owner}/${group.name}`));
                return {
                  ...res,
                  data: args?.[2] === 1 && Array.isArray(res?.data)
                    ? [Setting.getOption(t("general:All"), "*"), ...data]
                    : data,
                };
              }}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [permission.owner, false, page, pageSize, field, searchText, "", ""];
              }}
              reloadKey={permission?.owner}
              filterOption={false}
              onChange={(value: string[]) => {this.updatePermissionField("groups", value);}}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub roles"), t("role:Sub roles - Tooltip"))} :
          </Col>
          <Col span={22} >
            <PaginateSelect
              virtual
              mode="multiple"
              style={{width: "100%"}}
              value={permission.roles}
              disabled={!this.hasRoleDefinition(this.state.model)}
              allowClear
              fetchPage={async(...args: unknown[]) => {
                const res = await roleBackend.getRoles(...args);
                if (res.status !== "ok") {
                  return res;
                }
                const data = (res.data || []).map((role) => Setting.getOption(`${role.owner}/${role.name}`, `${role.owner}/${role.name}`));
                return {
                  ...res,
                  data: args?.[1] === 1 && Array.isArray(res?.data)
                    ? [Setting.getOption(t("general:All"), "*"), ...data]
                    : data,
                };
              }}
              buildFetchArgs={({page, pageSize, searchText}: PaginateFetchArgs) => {
                const field = searchText ? "name" : "";
                return [permission.owner, page, pageSize, field, searchText, "", ""];
              }}
              reloadKey={permission?.owner}
              filterOption={false}
              onChange={(value: string[]) => {this.updatePermissionField("roles", value);}}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("role:Sub domains"), t("role:Sub domains - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={permission.domains}
              onChange={(value: string[]) => {
                this.updatePermissionField("domains", value);
              }}
              options={[
                Setting.getOption(t("general:All"), "*"),
                ...permission.domains.filter(domain => domain !== "*").map((domain) => Setting.getOption(domain, domain)),
              ]}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Resource type"), t("permission:Resource type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={permission.resourceType} onChange={(value: string) => {
              this.updatePermissionField("resourceType", value);
              this.updatePermissionField("resources", []);
            }}
            options={[
              {value: "Application", name: t("general:Application")},
              {value: "TreeNode", name: t("permission:TreeNode")},
              {value: "Custom", name: t("general:Custom")},
              {value: "API", name: "API"},
            ].map((item) => Setting.getOption(item.name, item.value))}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:Resources"), t("permission:Resources - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode={(permission.resourceType === "Custom") ? "tags" : "multiple"} style={{width: "100%"}} value={permission.resources}
              onChange={(value: string[]) => {this.updatePermissionField("resources", value);}}
              options={permission.resourceType === "API" ? Setting.getApiPaths().map((option) => {
                return Setting.getOption(option, option);
              }) : [
                Setting.getOption(t("general:All"), "*"),
                ...this.state.resources.map((resource) => Setting.getOption(`${resource.name}`, `${resource.name}`)),
              ]}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Actions"), t("permission:Actions - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode={(permission.resourceType === "Custom") ? "tags" : "multiple"} style={{width: "100%"}} value={permission.actions} onChange={(value: string[]) => {
              this.updatePermissionField("actions", value);
            }}
            options={(permission.resourceType === "API" ? [
              {value: "POST", name: "POST"},
              {value: "GET", name: "GET"},
            ] : [
              {value: "Read", name: t("permission:Read")},
              {value: "Write", name: t("permission:Write")},
              {value: "Admin", name: t("general:Admin")},
            ]).map((item) => Setting.getOption(item.name, item.value))}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Effect"), t("permission:Effect - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={permission.effect} onChange={(value: string) => {
              this.updatePermissionField("effect", value);
            }}
            options={[
              {value: "Allow", name: t("permission:Allow")},
              {value: "Deny", name: t("permission:Deny")},
            ].map((item) => Setting.getOption(item.name, item.value))}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 19 : 2}>
            {Setting.getLabel(t("general:Is enabled"), t("general:Is enabled - Tooltip"))} :
          </Col>
          <Col span={1} >
            <Switch checked={permission.isEnabled} onChange={(checked: boolean) => {
              this.updatePermissionField("isEnabled", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Submitter"), t("permission:Submitter - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={permission.submitter} onChange={e => {
              this.updatePermissionField("submitter", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Approver"), t("permission:Approver - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={permission.approver} onChange={e => {
              this.updatePermissionField("approver", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("permission:Approve time"), t("permission:Approve time - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input disabled={true} value={Setting.getFormattedDate(permission.approveTime) || ""} onChange={e => {
              this.updatePermissionField("approveTime", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(t("general:State"), t("general:State - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} disabled={!Setting.isLocalAdminUser(this.props.account)} style={{width: "100%"}} value={permission.state} onChange={(value: string) => {
              if (permission.state !== value) {
                if (value === "Approved") {
                  this.updatePermissionField("approver", this.props.account.name);
                  this.updatePermissionField("approveTime", moment().format());
                } else {
                  this.updatePermissionField("approver", "");
                  this.updatePermissionField("approveTime", "");
                }
              }

              this.updatePermissionField("state", value);
            }}
            options={[
              {value: "Approved", name: t("permission:Approved")},
              {value: "Pending", name: t("permission:Pending")},
            ].map((item) => Setting.getOption(item.name, item.value))}
            />
          </Col>
        </Row>
      </Card>
    );
  }

  submitPermissionEdit(exitAfterSave: boolean): void {
    const permission = this.state.permission;
    if (permission === null) {
      return;
    }
    if (permission.users.length === 0 && permission.roles.length === 0) {
      Setting.showMessage("error", t("general:The users and roles cannot be empty at the same time"));
      return;
    }
    // 保持 legacy domains 校验禁用状态；本迁移只保留当前校验语义。
    if (permission.resources.length === 0) {
      Setting.showMessage("error", t("general:The resources cannot be empty"));
      return;
    }
    if (permission.actions.length === 0) {
      Setting.showMessage("error", t("general:The actions cannot be empty"));
      return;
    }
    if (!Setting.isLocalAdminUser(this.props.account) && permission.submitter !== this.props.account.name) {
      Setting.showMessage("error", t("general:A normal user can only modify the permission submitted by itself"));
      return;
    }

    const permissionPayload = Setting.deepCopy(permission) as PermissionRecord;
    permissionBackend.updatePermission(this.state.organizationName, this.state.permissionName, permissionPayload)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            organizationName: permission.owner,
            permissionName: permission.name,
          });

          if (exitAfterSave) {
            this.props.history.push("/permissions");
          } else {
            this.props.history.push(`/permissions/${permission.owner}/${encodeURIComponent(permission.name)}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.updatePermissionField("name", this.state.permissionName);
        }
      })
      .catch((error: unknown) => {
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deletePermission(): void {
    if (this.state.permission === null) {
      return;
    }
    permissionBackend.deletePermission(this.state.permission)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.props.history.push("/permissions");
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
      <div>
        {
          this.state.permission !== null ? this.renderPermission() : null
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitPermissionEdit(false)}>{t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitPermissionEdit(true)}>{t("general:Save & Exit")}</Button>
          {this.state.mode === "add" ? <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.deletePermission()}>{t("general:Cancel")}</Button> : null}
        </div>
      </div>
    );
  }
}

export default PermissionEditPage;
