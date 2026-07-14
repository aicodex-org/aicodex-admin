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
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as GroupBackend from "./backend/GroupBackend";
import * as RoleBackend from "./backend/RoleBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import PaginateSelect from "./common/PaginateSelect";
import LargeEditShell from "./common/LargeEditShell";

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
    push: (location: string | {pathname: string; state?: unknown}) => void;
  };
  location?: {
    mode?: string;
    state?: {role?: RoleRecord; mode?: string};
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
  dirty: boolean;
  submitting: boolean;
  fieldErrors: RoleFieldErrors;
};

type RoleFieldErrors = Partial<Record<"name" | "displayName", string>>;

type RoleBackendApi = {
  addRole: (role: RoleRecord) => Promise<MutationResponse>;
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
const {Option} = Select;

class RoleEditPage extends React.Component<RoleEditPageProps, RoleEditPageState> {
  constructor(props: RoleEditPageProps) {
    super(props);
    const draftRole = props.location?.state?.role;
    const requestedMode = props.location?.state?.mode ?? props.location?.mode ?? "edit";
    const mode = requestedMode === "add" && draftRole === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      roleName: draftRole?.name ?? decodeURIComponent(props.match.params.roleName),
      role: draftRole ?? null,
      organizations: [],
      mode,
      dirty: false,
      submitting: false,
      fieldErrors: {},
    };
  }

  UNSAFE_componentWillMount(): void {
    if (this.state.mode !== "add") {
      this.getRole();
    }
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

  getOrganizationDisplayName(organization: OrganizationRecord): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  renderOrganizationOptions(): React.ReactNode {
    return this.state.organizations.map((organization) => {
      const displayName = this.getOrganizationDisplayName(organization);
      return (
        <Option key={organization.name} value={organization.name} label={displayName}>
          <div className="admin-large-edit-identity-option identity-object-edit-organization-option">
            <span className="admin-large-edit-identity-option-name identity-object-edit-organization-option-name">{displayName}</span>
            {displayName !== organization.name ? (
              <span className="admin-large-edit-identity-option-id identity-object-edit-organization-option-id">{organization.name}</span>
            ) : null}
          </div>
        </Option>
      );
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

    const fieldErrors = {...this.state.fieldErrors};
    if (key === "name" || key === "displayName") {
      delete fieldErrors[key];
    }

    this.setState({
      role: {
        ...role,
        [key]: parsedValue,
      },
      dirty: true,
      fieldErrors,
    });
  }

  returnToRoleList(): void {
    this.props.history.push("/roles");
  }

  confirmDiscardChanges(onConfirm: () => void): void {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: t("role:Discard unsaved changes confirmation"),
      okText: t("general:OK"),
      cancelText: t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  handleBack(): void {
    this.confirmDiscardChanges(() => {
      this.returnToRoleList();
    });
  }

  handleCancel(): void {
    this.handleBack();
  }

  validateRole(): boolean {
    const role = this.state.role;
    if (role === null) {
      return false;
    }

    const fieldErrors: RoleFieldErrors = {};
    const requiredMessage = t("role:This field is required");
    if ((role.name ?? "").trim() === "") {
      fieldErrors.name = requiredMessage;
    }
    if ((role.displayName ?? "").trim() === "") {
      fieldErrors.displayName = requiredMessage;
    }

    if (Object.keys(fieldErrors).length > 0) {
      this.setState({fieldErrors});
      Setting.showMessage("error", t("role:Please fill required role fields"));
      return false;
    }

    this.setState({fieldErrors: {}});
    return true;
  }

  renderRequiredLabel(label: React.ReactNode, required = false): React.ReactNode {
    return (
      <span className="identity-object-edit-field-label-text">
        {required ? <span className="identity-object-edit-required-mark" aria-hidden="true">*</span> : null}
        <span>{label}</span>
        <span className="identity-object-edit-label-colon">:</span>
      </span>
    );
  }

  renderFieldRow(label: React.ReactNode, control: React.ReactNode, options: {required?: boolean; error?: string; wide?: boolean} = {}): React.ReactNode {
    return (
      <div className={`identity-object-edit-field-row${options.wide === true ? " identity-object-edit-field-row-wide" : ""}`}>
        <div className="identity-object-edit-field-label">
          {this.renderRequiredLabel(label, options.required)}
        </div>
        <div className="identity-object-edit-field-control">
          {control}
          {options.error !== undefined ? <div className="identity-object-edit-field-error">{options.error}</div> : null}
        </div>
      </div>
    );
  }

  renderSection(title: string, children: React.ReactNode): React.ReactNode {
    return (
      <section className="identity-object-edit-section">
        <h2 className="identity-object-edit-section-title">{title}</h2>
        <div className="identity-object-edit-field-grid">
          {children}
        </div>
      </section>
    );
  }

  renderRole(): React.ReactNode {
    const {role} = this.state;
    if (role === null) {
      return null;
    }

    return (
      <Card
        className="identity-object-edit-card role-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="identity-object-edit"
          backLabel={t("general:Back")}
          breadcrumb={<>{t("general:Organization & Accounts")} / {t("general:Roles")} /</>}
          title={this.state.mode === "add" ? t("role:New Role") : `${t("role:Edit Role")} (${role.displayName || role.name})`}
          dirty={this.state.dirty}
          dirtyLabel={t("role:Unsaved changes")}
          onBack={() => this.handleBack()}
          actions={(
            <>
              <Button disabled={this.state.submitting} onClick={() => this.handleCancel()}>{t("general:Cancel")}</Button>
              <Button type="primary" loading={this.state.submitting} onClick={() => this.submitRoleEdit(false)}>{t("general:Save")}</Button>
              <Button disabled={this.state.submitting} onClick={() => this.submitRoleEdit(true)}>{t("role:Save and return")}</Button>
            </>
          )}
        >
          {this.renderSection(t("role:Basic information"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip")),
                <Select
                  virtual={false}
                  showSearch
                  optionLabelProp="label"
                  disabled={!Setting.isAdminUser(this.props.account)}
                  value={role.owner}
                  filterOption={(input, option) => {
                    const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                    return optionText.includes(input.toLowerCase());
                  }}
                  onChange={(value: string) => {this.updateRoleField("owner", value);}}
                >
                  {this.renderOrganizationOptions()}
                </Select>
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Name"), t("role:Role name - Tooltip")),
                <Input status={this.state.fieldErrors.name !== undefined ? "error" : undefined} value={role.name} onChange={e => {
                  this.updateRoleField("name", e.target.value);
                }} />,
                {required: true, error: this.state.fieldErrors.name}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Display name"), t("role:Role display name - Tooltip")),
                <Input status={this.state.fieldErrors.displayName !== undefined ? "error" : undefined} value={role.displayName} onChange={e => {
                  this.updateRoleField("displayName", e.target.value);
                }} />,
                {required: true, error: this.state.fieldErrors.displayName}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Description"), t("role:Role description - Tooltip")),
                <Input value={role.description} onChange={e => {
                  this.updateRoleField("description", e.target.value);
                }} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Is enabled"), t("role:Role enabled - Tooltip")),
                <Switch checked={role.isEnabled} onChange={(checked: boolean) => {
                  this.updateRoleField("isEnabled", checked);
                }} />
              )}
            </>
          ))}

          {this.renderSection(t("role:Authorization scope"), (
            <>
              {this.renderFieldRow(
                Setting.getLabel(t("role:Sub users"), t("role:Sub users - Tooltip")),
                <PaginateSelect
                  virtual
                  mode="multiple"
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
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("role:Sub groups"), t("role:Sub groups - Tooltip")),
                <PaginateSelect
                  mode="multiple"
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
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("role:Sub roles"), t("role:Sub roles - Tooltip")),
                <PaginateSelect
                  mode="multiple"
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
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("role:Sub domains"), t("role:Sub domains - Tooltip")),
                <Select virtual={false} mode="tags" value={role.domains} onChange={(value: string[]) => {
                  this.updateRoleField("domains", value);
                }}
                options={role.domains?.map((domain) => Setting.getOption(domain, domain))} />
              )}
            </>
          ))}
        </LargeEditShell>
      </Card>
    );
  }

  submitRoleEdit(exitAfterSave: boolean): void {
    if (this.state.submitting || this.state.role === null || !this.validateRole()) {
      return;
    }
    const role = Setting.deepCopy(this.state.role) as RoleRecord;
    this.setState({submitting: true});
    const saveRole = this.state.mode === "add"
      ? roleBackend.addRole(role)
      : roleBackend.updateRole(this.state.organizationName, this.state.roleName, role);
    saveRole
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            organizationName: role.owner,
            roleName: role.name || this.state.roleName,
            mode: "edit",
            dirty: false,
            submitting: false,
          });

          if (exitAfterSave) {
            this.returnToRoleList();
          } else {
            this.props.history.push(`/roles/${role.owner}/${encodeURIComponent(role.name)}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode === "add") {
            this.setState({submitting: false});
          } else {
            this.setState(state => ({
              submitting: false,
              role: state.role === null ? state.role : {...state.role, name: state.roleName},
            }));
          }
        }
      })
      .catch((error: unknown) => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteRole(): void {
    if (this.state.submitting || this.state.role === null) {
      return;
    }
    this.setState({submitting: true});
    roleBackend.deleteRole(this.state.role)
      .then((res: MutationResponse) => {
        if (res.status === "ok") {
          this.setState({dirty: false, submitting: false});
          this.returnToRoleList();
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
      <div className="identity-object-edit-page role-edit-page">
        {
          this.state.role !== null ? this.renderRole() : null
        }
      </div>
    );
  }
}

export default RoleEditPage;
