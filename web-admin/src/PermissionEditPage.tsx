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
import {Button, Card, Input, Modal, Select, Switch} from "antd";
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
import LargeEditShell, {LargeEditFieldRow, LargeEditSection, LargeEditTabs} from "./common/LargeEditShell";

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
    push: (location: string | {pathname: string; state?: unknown}) => void;
  };
  location?: {
    mode?: string;
    state?: {permission?: PermissionRecord; mode?: string};
  };
  match: RouteMatch;
  organizationName?: string;
};

type OrganizationRecord = {
  name: string;
  displayName?: string;
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
  displayName?: string;
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
  dirty: boolean;
  submitting: boolean;
  activeTabKey: PermissionTabKey;
  fieldErrors: PermissionFieldErrors;
};

type PermissionTabKey = "basic" | "rule";
type PermissionFieldErrors = Partial<Record<"name" | "displayName", string>>;

type PermissionBackendApi = {
  addPermission: (permission: PermissionRecord) => Promise<MutationResponse>;
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
const {Option} = Select;

class PermissionEditPage extends React.Component<PermissionEditPageProps, PermissionEditPageState> {
  constructor(props: PermissionEditPageProps) {
    super(props);
    const draftPermission = props.location?.state?.permission;
    const requestedMode = props.location?.state?.mode ?? props.location?.mode ?? "edit";
    const mode = requestedMode === "add" && draftPermission === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      permissionName: draftPermission?.name ?? decodeURIComponent(props.match.params.permissionName),
      permission: draftPermission ?? null,
      organizations: [],
      model: null,
      users: [],
      groups: [],
      roles: [],
      models: [],
      resources: [],
      mode,
      dirty: false,
      submitting: false,
      activeTabKey: "basic",
      fieldErrors: {},
    };
  }

  UNSAFE_componentWillMount(): void {
    if (this.state.mode === "add" && this.state.permission !== null) {
      this.getModels(this.state.permission.owner);
      this.getResources(this.state.permission.owner);
      this.getModel(this.state.permission.model);
    } else {
      this.getPermission();
    }
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

  getOrganizationDisplayName(organization: OrganizationRecord): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  renderOrganizationOptions(): React.ReactNode {
    return this.state.organizations.map((organization) => {
      const displayName = this.getOrganizationDisplayName(organization);
      return (
        <Option key={organization.name} value={organization.name} label={displayName}>
          <div className="admin-large-edit-organization-option permission-edit-organization-option">
            <span className="admin-large-edit-organization-option-name permission-edit-organization-option-name">{displayName}</span>
            {displayName !== organization.name ? (
              <span className="admin-large-edit-organization-option-id permission-edit-organization-option-id">{organization.name}</span>
            ) : null}
          </div>
        </Option>
      );
    });
  }

  getModelId(model: ModelRecord): string {
    return `${model.owner}/${model.name}`;
  }

  getModelDisplayName(model: ModelRecord): string {
    const displayName = model.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : model.name;
  }

  renderModelOptions(): React.ReactNode {
    return this.state.models.map((model) => {
      const modelId = this.getModelId(model);
      const displayName = this.getModelDisplayName(model);
      return (
        <Option key={modelId} value={modelId} label={displayName}>
          <div className="admin-large-edit-identity-option permission-edit-model-option">
            <span className="admin-large-edit-identity-option-name permission-edit-model-option-name">{displayName}</span>
            {displayName !== modelId ? (
              <span className="admin-large-edit-identity-option-id permission-edit-model-option-id">{modelId}</span>
            ) : null}
          </div>
        </Option>
      );
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

  getModel(modelId?: string): void {
    if (!modelId) {
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

    const fieldErrors = {...this.state.fieldErrors};
    if (key === "name" || key === "displayName") {
      delete fieldErrors[key];
    }

    this.setState({
      permission: {
        ...permission,
        [key]: parsedValue,
      },
      dirty: true,
      fieldErrors,
    });
  }

  updatePermissionFields(fields: Partial<PermissionRecord>): void {
    const fieldErrors = {...this.state.fieldErrors};
    if (fields.name !== undefined) {
      delete fieldErrors.name;
    }
    if (fields.displayName !== undefined) {
      delete fieldErrors.displayName;
    }

    this.setState(state => {
      if (state.permission === null) {
        return null;
      }

      return {
        permission: {
          ...state.permission,
          ...fields,
        },
        dirty: true,
        fieldErrors,
      };
    });
  }

  hasRoleDefinition(model: ModelRecord | null): boolean {
    if (model !== null) {
      return model.modelText.includes("role_definition");
    }
    return false;
  }

  returnToPermissionList(): void {
    this.props.history.push("/permissions");
  }

  confirmDiscardChanges(onConfirm: () => void): void {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: t("permission:Discard unsaved changes confirmation"),
      okText: t("general:OK"),
      cancelText: t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  handleBack(): void {
    this.confirmDiscardChanges(() => {
      this.returnToPermissionList();
    });
  }

  handleCancel(): void {
    this.handleBack();
  }

  validatePermissionRequiredFields(): boolean {
    const permission = this.state.permission;
    if (permission === null) {
      return false;
    }

    const fieldErrors: PermissionFieldErrors = {};
    const requiredMessage = t("permission:This field is required");
    if ((permission.name ?? "").trim() === "") {
      fieldErrors.name = requiredMessage;
    }
    if ((permission.displayName ?? "").trim() === "") {
      fieldErrors.displayName = requiredMessage;
    }

    if (Object.keys(fieldErrors).length > 0) {
      this.setState({fieldErrors, activeTabKey: "basic"});
      Setting.showMessage("error", t("permission:Please fill required permission fields"));
      return false;
    }

    this.setState({fieldErrors: {}});
    return true;
  }

  validatePermissionBusinessRules(): boolean {
    const permission = this.state.permission;
    if (permission === null) {
      return false;
    }

    if (permission.users.length === 0 && permission.roles.length === 0) {
      this.setState({activeTabKey: "basic"});
      Setting.showMessage("error", t("general:The users and roles cannot be empty at the same time"));
      return false;
    }
    // 保持 legacy domains 校验禁用状态；本迁移只保留当前校验语义。
    if (permission.resources.length === 0) {
      this.setState({activeTabKey: "rule"});
      Setting.showMessage("error", t("general:The resources cannot be empty"));
      return false;
    }
    if (permission.actions.length === 0) {
      this.setState({activeTabKey: "rule"});
      Setting.showMessage("error", t("general:The actions cannot be empty"));
      return false;
    }
    if (!Setting.isLocalAdminUser(this.props.account) && permission.submitter !== this.props.account.name) {
      Setting.showMessage("error", t("general:A normal user can only modify the permission submitted by itself"));
      return false;
    }

    return true;
  }

  validatePermission(): boolean {
    return this.validatePermissionRequiredFields() && this.validatePermissionBusinessRules();
  }

  renderFieldRow(label: React.ReactNode, control: React.ReactNode, options: {required?: boolean; error?: string; wide?: boolean} = {}): React.ReactNode {
    return LargeEditFieldRow({
      classPrefix: "permission-edit",
      label,
      required: options.required,
      error: options.error,
      wide: options.wide,
      children: control,
    });
  }

  renderSection(title: string, children: React.ReactNode): React.ReactNode {
    return LargeEditSection({
      classPrefix: "permission-edit",
      title,
      children,
    });
  }

  renderPermission(): React.ReactNode {
    const {permission} = this.state;
    if (permission === null) {
      return null;
    }

    return (
      <Card
        className="permission-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="permission-edit"
          backLabel={t("general:Back")}
          breadcrumb={<>{t("general:Organization & Accounts")} / {t("general:Permissions")} /</>}
          title={this.state.mode === "add" ? t("permission:New Permission") : `${t("permission:Edit Permission")} (${permission.displayName || permission.name})`}
          dirty={this.state.dirty}
          dirtyLabel={t("permission:Unsaved changes")}
          onBack={() => this.handleBack()}
          tabs={(
            LargeEditTabs({
              classPrefix: "permission-edit",
              activeKey: this.state.activeTabKey,
              onChange: (key) => this.setState({activeTabKey: key as PermissionTabKey}),
              items: [
                {key: "basic", label: t("permission:Basic"), children: null},
                {key: "rule", label: t("permission:Rule"), children: null},
              ],
            })
          )}
          actions={(
            <>
              <Button disabled={this.state.submitting} onClick={() => this.handleCancel()}>{t("general:Cancel")}</Button>
              <Button type="primary" loading={this.state.submitting} onClick={() => this.submitPermissionEdit(false)}>{t("general:Save")}</Button>
              <Button disabled={this.state.submitting} onClick={() => this.submitPermissionEdit(true)}>{t("permission:Save and return")}</Button>
            </>
          )}
        >
          {this.state.activeTabKey === "basic" ? this.renderBasicTab(permission) : this.renderRuleTab(permission)}
        </LargeEditShell>
      </Card>
    );
  }

  renderBasicTab(permission: PermissionRecord): React.ReactNode {
    return (
      <>
        {this.renderSection(t("permission:Basic information"), (
          <>
            {this.renderFieldRow(
              Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip")),
              <Select
                virtual={false}
                showSearch
                optionLabelProp="label"
                disabled={!Setting.isAdminUser(this.props.account)}
                value={permission.owner}
                filterOption={(input, option) => {
                  const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                  return optionText.includes(input.toLowerCase());
                }}
                onChange={(owner: string) => {
                  this.updatePermissionField("owner", owner);
                  this.getModels(owner);
                  this.getResources(owner);
                }}
              >
                {this.renderOrganizationOptions()}
              </Select>
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Name"), t("permission:Permission name - Tooltip")),
              <Input status={this.state.fieldErrors.name !== undefined ? "error" : undefined} value={permission.name} onChange={e => {
                this.updatePermissionField("name", e.target.value);
              }} />,
              {required: true, error: this.state.fieldErrors.name}
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Display name"), t("permission:Permission display name - Tooltip")),
              <Input status={this.state.fieldErrors.displayName !== undefined ? "error" : undefined} value={permission.displayName} onChange={e => {
                this.updatePermissionField("displayName", e.target.value);
              }} />,
              {required: true, error: this.state.fieldErrors.displayName}
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Description"), t("permission:Permission description - Tooltip")),
              <Input value={permission.description} onChange={e => {
                this.updatePermissionField("description", e.target.value);
              }} />,
              {wide: true}
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Model"), t("permission:Permission model - Tooltip")),
              <Select
                virtual={false}
                showSearch
                optionLabelProp="label"
                value={permission.model}
                filterOption={(input, option) => {
                  const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                  return optionText.includes(input.toLowerCase());
                }}
                onChange={(selectedModel: string) => {
                  this.updatePermissionField("model", selectedModel);
                }}
              >
                {this.renderModelOptions()}
              </Select>
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Is enabled"), t("permission:Permission enabled - Tooltip")),
              <Switch checked={permission.isEnabled} onChange={(checked: boolean) => {
                this.updatePermissionField("isEnabled", checked);
              }} />
            )}
          </>
        ))}

        {this.renderSection(t("permission:Authorization subject"), (
          <>
            {this.renderFieldRow(
              Setting.getLabel(t("role:Sub users"), t("role:Sub users - Tooltip")),
              <PaginateSelect
                virtual
                mode="multiple"
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
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("role:Sub groups"), t("role:Sub groups - Tooltip")),
              <PaginateSelect
                virtual
                mode="multiple"
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
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("role:Sub roles"), t("role:Sub roles - Tooltip")),
              <PaginateSelect
                virtual
                mode="multiple"
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
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("role:Sub domains"), t("role:Sub domains - Tooltip")),
              <Select virtual={false} mode="tags" value={permission.domains}
                onChange={(value: string[]) => {
                  this.updatePermissionField("domains", value);
                }}
                options={[
                  Setting.getOption(t("general:All"), "*"),
                  ...permission.domains.filter(domain => domain !== "*").map((domain) => Setting.getOption(domain, domain)),
                ]}
              />
            )}
          </>
        ))}
      </>
    );
  }

  renderRuleTab(permission: PermissionRecord): React.ReactNode {
    return (
      <>
        {this.renderSection(t("permission:Resource actions"), (
          <>
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Resource type"), t("permission:Resource type - Tooltip")),
              <Select virtual={false} value={permission.resourceType} onChange={(value: string) => {
                this.updatePermissionFields({resourceType: value, resources: []});
              }}
              options={[
                {value: "Application", name: t("general:Application")},
                {value: "TreeNode", name: t("permission:TreeNode")},
                {value: "Custom", name: t("general:Custom")},
                {value: "API", name: "API"},
              ].map((item) => Setting.getOption(item.name, item.value))} />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:Resources"), t("permission:Resources - Tooltip")),
              <Select virtual={false} mode={(permission.resourceType === "Custom") ? "tags" : "multiple"} value={permission.resources}
                onChange={(value: string[]) => {this.updatePermissionField("resources", value);}}
                options={permission.resourceType === "API" ? Setting.getApiPaths().map((option) => {
                  return Setting.getOption(option, option);
                }) : [
                  Setting.getOption(t("general:All"), "*"),
                  ...this.state.resources.map((resource) => Setting.getOption(`${resource.name}`, `${resource.name}`)),
                ]}
              />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Actions"), t("permission:Actions - Tooltip")),
              <Select virtual={false} mode={(permission.resourceType === "Custom") ? "tags" : "multiple"} value={permission.actions} onChange={(value: string[]) => {
                this.updatePermissionField("actions", value);
              }}
              options={(permission.resourceType === "API" ? [
                {value: "POST", name: "POST"},
                {value: "GET", name: "GET"},
              ] : [
                {value: "Read", name: t("permission:Read")},
                {value: "Write", name: t("permission:Write")},
                {value: "Admin", name: t("general:Admin")},
              ]).map((item) => Setting.getOption(item.name, item.value))} />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Effect"), t("permission:Effect - Tooltip")),
              <Select virtual={false} value={permission.effect} onChange={(value: string) => {
                this.updatePermissionField("effect", value);
              }}
              options={[
                {value: "Allow", name: t("permission:Allow")},
                {value: "Deny", name: t("permission:Deny")},
              ].map((item) => Setting.getOption(item.name, item.value))} />
            )}
          </>
        ))}

        {this.renderSection(t("permission:Approval information"), (
          <>
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Submitter"), t("permission:Submitter - Tooltip")),
              <Input disabled={true} value={permission.submitter} onChange={e => {
                this.updatePermissionField("submitter", e.target.value);
              }} />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Approver"), t("permission:Approver - Tooltip")),
              <Input disabled={true} value={permission.approver} onChange={e => {
                this.updatePermissionField("approver", e.target.value);
              }} />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("permission:Approve time"), t("permission:Approve time - Tooltip")),
              <Input disabled={true} value={Setting.getFormattedDate(permission.approveTime) || ""} onChange={e => {
                this.updatePermissionField("approveTime", e.target.value);
              }} />
            )}
            {this.renderFieldRow(
              Setting.getLabel(t("general:State"), t("permission:Permission state - Tooltip")),
              <Select virtual={false} disabled={!Setting.isLocalAdminUser(this.props.account)} value={permission.state} onChange={(value: string) => {
                const approvalFields: Partial<PermissionRecord> = {state: value};
                if (permission.state !== value) {
                  if (value === "Approved") {
                    approvalFields.approver = this.props.account.name;
                    approvalFields.approveTime = moment().format();
                  } else {
                    approvalFields.approver = "";
                    approvalFields.approveTime = "";
                  }
                }

                this.updatePermissionFields(approvalFields);
              }}
              options={[
                {value: "Approved", name: t("permission:Approved")},
                {value: "Pending", name: t("permission:Pending")},
              ].map((item) => Setting.getOption(item.name, item.value))} />
            )}
          </>
        ))}
      </>
    );
  }

  submitPermissionEdit(exitAfterSave: boolean): void {
    if (this.state.submitting || this.state.permission === null || !this.validatePermission()) {
      return;
    }

    const permission = this.state.permission;
    const permissionPayload = Setting.deepCopy(permission) as PermissionRecord;
    this.setState({submitting: true});
    const savePermission = this.state.mode === "add"
      ? permissionBackend.addPermission(permissionPayload)
      : permissionBackend.updatePermission(this.state.organizationName, this.state.permissionName, permissionPayload);
    savePermission
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            organizationName: permission.owner,
            permissionName: permission.name,
            mode: "edit",
            dirty: false,
            submitting: false,
          });

          if (exitAfterSave) {
            this.returnToPermissionList();
          } else {
            this.props.history.push(`/permissions/${permission.owner}/${encodeURIComponent(permission.name)}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode === "add") {
            this.setState({submitting: false});
          } else {
            this.setState(state => ({
              submitting: false,
              permission: state.permission === null ? state.permission : {...state.permission, name: state.permissionName},
            }));
          }
        }
      })
      .catch((error: unknown) => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deletePermission(): void {
    if (this.state.submitting || this.state.permission === null) {
      return;
    }
    this.setState({submitting: true});
    permissionBackend.deletePermission(this.state.permission)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.setState({dirty: false, submitting: false});
          this.returnToPermissionList();
        } else {
          this.setState({submitting: false});
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch((error: unknown) => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render(): React.ReactNode {
    return (
      <div className="admin-large-edit-page permission-edit-page">
        {
          this.state.permission !== null ? this.renderPermission() : null
        }
      </div>
    );
  }
}

export default PermissionEditPage;
