// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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
import {TeamOutlined} from "@ant-design/icons";
import {Alert, Button, Card, Input, Modal, Select, Switch, Tag, Tooltip} from "antd";
import type {SelectProps} from "antd";
import * as GroupBackend from "./backend/GroupBackend";
import type {GroupMutation, GroupRecord} from "./backend/GroupBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as UserBackend from "./backend/UserBackend";
import * as Setting from "./Setting";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";
import i18next from "i18next";
import LargeEditShell from "./common/LargeEditShell";

type HistoryLike = {
  push: (location: string | {pathname: string; mode?: string}) => void;
};

type GroupEditRouteParams = {
  organizationName: string;
  groupName: string;
};

type GroupEditPageProps = {
  account?: unknown;
  history: HistoryLike;
  location: {
    mode?: string;
    [key: string]: unknown;
  };
  match: {
    params: GroupEditRouteParams;
  };
  organizationName?: string;
};

type OrganizationSummary = {
  name: string;
  displayName?: string;
  [key: string]: unknown;
};

type GroupOption = NonNullable<SelectProps["options"]>[number];
type GroupFieldErrors = Partial<Record<"name" | "displayName", string>>;
type UserSummary = {
  owner?: string;
  name?: string;
  displayName?: string;
  realName?: string;
  [key: string]: unknown;
};
type BackendResponse<T = unknown> = {
  status: string;
  msg?: string;
  data?: T;
};

const VISIBLE_MEMBER_LIMIT = 10;

type GroupEditPageState = {
  classes: GroupEditPageProps;
  groupName: string;
  organizationName: string;
  group: GroupRecord | null;
  users: string[];
  groups: GroupRecord[];
  organizations: OrganizationSummary[];
  mode: string;
  dirty: boolean;
  submitting: boolean;
  fieldErrors: GroupFieldErrors;
  memberDisplayNames: Record<string, string>;
};

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function tFormat(key: string, values: Record<string, unknown>, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue, ...values}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

function isDirectorySyncedGroup(group?: GroupRecord | null): boolean {
  return Boolean(group?.isDirectorySynced || (group?.directorySyncSources ?? []).length > 0);
}

class GroupEditPage extends React.Component<GroupEditPageProps, GroupEditPageState> {
  constructor(props: GroupEditPageProps) {
    super(props);
    this.state = {
      classes: props,
      groupName: props.match.params.groupName,
      organizationName: props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName,
      group: null,
      users: [],
      groups: [],
      organizations: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
      dirty: false,
      submitting: false,
      fieldErrors: {},
      memberDisplayNames: {},
    };
  }

  UNSAFE_componentWillMount() {
    this.getGroup();
    this.getGroups(this.state.organizationName);
    this.getOrganizations();
  }

  getGroup() {
    GroupBackend.getGroup(this.state.organizationName, this.state.groupName)
      .then((res) => {
        if (res.status === "ok") {
          const group = res.data ?? null;
          this.setState({
            group: group,
          }, () => {
            if (group !== null) {
              this.publishWorkspaceTabLabel(group);
            }
          });
          if (group !== null) {
            this.loadMemberDisplayNames(group);
          }
        }
      });
  }

  loadMemberDisplayNames(group: GroupRecord) {
    const users = group.users ?? [];
    if (users.length === 0) {
      this.setState({memberDisplayNames: {}});
      return;
    }

    // 成员摘要是只读增强信息；profile 查询失败时清空映射并回退成员标识，不阻塞编辑页。
    UserBackend.getUsers(group.owner, 1, Math.max(users.length, 20), "", "", "", "", group.name)
      .then((res: BackendResponse<UserSummary[]>) => {
        if (res.status !== "ok") {
          this.setState({memberDisplayNames: {}});
          return;
        }

        this.setState({
          memberDisplayNames: this.buildMemberDisplayNameMap(users, res.data ?? []),
        });
      })
      .catch(() => {
        this.setState({memberDisplayNames: {}});
      });
  }

  getGroups(organizationName: string) {
    GroupBackend.getGroups(organizationName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            groups: (res.data ?? []) as GroupRecord[],
          });
        }
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizationNames("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            organizations: (res.data || []) as unknown as OrganizationSummary[],
          });
        }
      });
  }

  parseGroupField(key: keyof GroupRecord, value: unknown): unknown {
    if ([""].includes(String(key))) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateGroupField(key: keyof GroupRecord, value: unknown) {
    value = this.parseGroupField(key, value);

    const group = {...this.state.group!};
    group[key] = value as never;
    const fieldErrors = {...this.state.fieldErrors};
    if (key === "name" || key === "displayName") {
      delete fieldErrors[key];
    }
    this.setState({
      group: group,
      dirty: true,
      fieldErrors,
    }, () => {
      if (key === "displayName" && this.state.group !== null) {
        this.publishWorkspaceTabLabel(this.state.group);
      }
    });
  }

  getGroupListReturnPath(): string {
    const groupTreeUrl = sessionStorage.getItem("groupTreeUrl");
    if (groupTreeUrl !== null) {
      sessionStorage.removeItem("groupTreeUrl");
      return groupTreeUrl;
    }
    return "/groups";
  }

  returnToGroupList() {
    this.props.history.push(this.getGroupListReturnPath());
  }

  getCurrentWorkspaceTabPath(): string {
    return `/groups/${this.state.organizationName}/${this.state.groupName}`;
  }

  getGroupWorkspaceTabLabel(group: GroupRecord): string {
    const title = group.displayName || group.name;
    return tFormat("group:Group workspace tab title", {name: title}, `Group: ${title}`);
  }

  // 群组详情数据加载后再把 workspace tab 从路由标识更新为业务显示名，不改变路由和持久化格式。
  publishWorkspaceTabLabel(group: GroupRecord) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getGroupWorkspaceTabLabel(group),
      },
    }));
  }

  confirmDiscardChanges(onConfirm: () => void) {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: t("group:Discard unsaved changes confirmation"),
      okText: t("general:OK"),
      cancelText: t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  handleBack() {
    this.confirmDiscardChanges(() => {
      if (this.state.mode === "add") {
        this.deleteGroup();
      } else {
        this.returnToGroupList();
      }
    });
  }

  handleCancel() {
    this.confirmDiscardChanges(() => {
      if (this.state.mode === "add") {
        this.deleteGroup();
      } else {
        this.returnToGroupList();
      }
    });
  }

  validateGroup(): boolean {
    const group = this.state.group;
    if (group === null) {
      return false;
    }

    const fieldErrors: GroupFieldErrors = {};
    const requiredMessage = t("group:This field is required");
    if ((group.name ?? "").trim() === "") {
      fieldErrors.name = requiredMessage;
    }
    if ((group.displayName ?? "").trim() === "") {
      fieldErrors.displayName = requiredMessage;
    }

    if (Object.keys(fieldErrors).length > 0) {
      this.setState({fieldErrors});
      Setting.showMessage("error", t("group:Please fill required group fields"));
      return false;
    }

    this.setState({fieldErrors: {}});
    return true;
  }

  renderRequiredLabel(label: React.ReactNode, required = false): React.ReactNode {
    return (
      <span className="identity-object-edit-field-label-text group-edit-field-label-text">
        {required ? <span className="identity-object-edit-required-mark group-edit-required-mark" aria-hidden="true">*</span> : null}
        <span>{label}</span>
        <span className="identity-object-edit-label-colon group-edit-label-colon">:</span>
      </span>
    );
  }

  renderFieldRow(label: React.ReactNode, control: React.ReactNode, options: {required?: boolean; error?: string; wide?: boolean} = {}) {
    const wideClassName = options.wide === true ? " identity-object-edit-field-row-wide group-edit-field-row-wide" : "";
    return (
      <div className={`identity-object-edit-field-row group-edit-field-row${wideClassName}`}>
        <div className="identity-object-edit-field-label group-edit-field-label">
          {this.renderRequiredLabel(label, options.required)}
        </div>
        <div className="identity-object-edit-field-control group-edit-field-control">
          {control}
          {options.error !== undefined ? <div className="identity-object-edit-field-error group-edit-field-error">{options.error}</div> : null}
        </div>
      </div>
    );
  }

  getMemberDisplayName(member: string): string {
    const mappedName = this.state.memberDisplayNames[member] ?? this.state.memberDisplayNames[this.getMemberLeafName(member)];
    if (mappedName !== undefined && mappedName.trim() !== "") {
      return mappedName;
    }

    return this.getMemberFallbackName(member);
  }

  getMemberLeafName(member: string): string {
    return member.split("/").filter(Boolean).pop() ?? member;
  }

  getMemberFallbackName(member: string): string {
    const leafName = member.split("/").filter(Boolean).pop() ?? member;
    return leafName.replace(/^(wecom|ldap|dingtalk|lark|feishu|ad)-user-/i, "");
  }

  getUserDisplayName(user: UserSummary): string {
    return user.displayName || user.realName || user.name || "";
  }

  // 后端成员值可能是 name 或 owner/name；两种键都匹配，profile 查询失败时由调用方回退短标识。
  buildMemberDisplayNameMap(members: string[], users: UserSummary[]): Record<string, string> {
    const memberKeys = new Set<string>(members.flatMap(member => [member, this.getMemberLeafName(member)]));
    return users.reduce((displayNames, user) => {
      const displayName = this.getUserDisplayName(user);
      if (displayName.trim() === "") {
        return displayNames;
      }

      [user.name, user.owner !== undefined && user.name !== undefined ? `${user.owner}/${user.name}` : undefined].forEach((key) => {
        if (key !== undefined && memberKeys.has(key)) {
          displayNames[key] = displayName;
        }
      });
      return displayNames;
    }, {} as Record<string, string>);
  }

  handleManageMembers(group: GroupRecord) {
    this.confirmDiscardChanges(() => {
      // 成员关系仍由既有群组树/用户列表上下文维护，本页只负责只读摘要和跳转。
      this.props.history.push(`/trees/${group.owner}/${group.name}`);
    });
  }

  renderMemberSummary(group: GroupRecord): React.ReactNode {
    const users = group.users ?? [];
    if (users.length === 0) {
      return <span className="group-edit-empty-text">{t("group:No current members")}</span>;
    }

    const visibleUsers = users.slice(0, VISIBLE_MEMBER_LIMIT);
    const hiddenUsers = users.slice(VISIBLE_MEMBER_LIMIT);
    const hiddenCount = hiddenUsers.length;

    return (
      <div className="group-edit-member-summary">
        {visibleUsers.map((user) => (
          <Tooltip key={user} title={user}>
            <Tag className="group-edit-member-tag">{this.getMemberDisplayName(user)}</Tag>
          </Tooltip>
        ))}
        {hiddenCount > 0 ? (
          <Tooltip title={tFormat("group:Hidden current members", {count: hiddenCount, members: hiddenUsers.join(", ")})}>
            <Tag className="group-edit-member-tag group-edit-member-more-tag">+{hiddenCount}</Tag>
          </Tooltip>
        ) : null}
      </div>
    );
  }

  renderMemberControl(group: GroupRecord): React.ReactNode {
    const isDirectorySynced = isDirectorySyncedGroup(group);

    return (
      <div className="group-edit-member-control">
        {this.renderMemberSummary(group)}
        {!isDirectorySynced ? (
          <Button className="group-edit-member-action" size="small" icon={<TeamOutlined />} onClick={() => this.handleManageMembers(group)}>
            {t("group:Manage members")}
          </Button>
        ) : null}
      </div>
    );
  }

  getParentIdOptions(): GroupOption[] {
    const currentGroup = this.state.group;
    if (currentGroup === null) {
      return [];
    }

    const groups: Array<Pick<GroupRecord, "name" | "displayName">> = this.state.groups.filter((group) => group.name !== currentGroup.name);
    const organization = this.state.organizations.find((organization) => organization.name === currentGroup.owner);
    if (organization !== undefined) {
      groups.push({name: organization.name, displayName: organization.displayName});
    }
    return groups.map((group) => ({label: group.displayName, value: group.name}));
  }

  renderGroup() {
    const group = this.state.group;
    if (group === null) {
      return null;
    }
    const isDirectorySynced = isDirectorySyncedGroup(group);
    const sourceManagedFieldsDisabled = isDirectorySynced;
    const title = this.state.mode === "add" ? t("group:New Group") : `${t("group:Edit Group")} (${group.displayName || group.name})`;

    return (
      <Card
        className="identity-object-edit-card group-edit-card"
        size="small"
        variant="borderless"
        style={(Setting.isMobile()) ? {margin: "5px"} : {}}
        styles={{body: {height: "100%", padding: 0}}}
        type="inner"
      >
        <LargeEditShell
          classPrefix="group-edit"
          backLabel={t("general:Back")}
          breadcrumb={<React.Fragment>{t("general:Organization & Accounts")} / {t("general:Groups")} /</React.Fragment>}
          title={title}
          dirty={this.state.dirty}
          dirtyLabel={t("group:Unsaved changes")}
          actions={(
            <React.Fragment>
              <Button disabled={this.state.submitting} onClick={() => this.handleCancel()}>{t("general:Cancel")}</Button>
              <Button type="primary" loading={this.state.submitting} onClick={() => this.submitGroupEdit(false)}>{t("general:Save")}</Button>
              <Button disabled={this.state.submitting} onClick={() => this.submitGroupEdit(true)}>{t("group:Save and return")}</Button>
            </React.Fragment>
          )}
          onBack={() => this.handleBack()}
        >
          <section className="identity-object-edit-section group-edit-section">
            <h2 className="identity-object-edit-section-title group-edit-section-title">{t("group:Basic information")}</h2>
            <div className="identity-object-edit-field-grid group-edit-field-grid">
              {this.renderFieldRow(
                Setting.getLabel(t("general:Organization"), t("general:Organization - Tooltip")),
                <Select virtual={false} disabled={sourceManagedFieldsDisabled || !Setting.isAdminUser(this.props.account)} value={group.owner}
                  onChange={(value => {
                    this.updateGroupField("owner", value);
                    this.getGroups(value);
                  })}
                  options={this.state.organizations.map((organization) => Setting.getOption(organization.displayName, organization.name))} />
              )}
              {this.renderFieldRow(
                isDirectorySynced
                  ? Setting.getLabel(t("group:Sync identifier"), t("group:Sync identifier - Tooltip"))
                  : Setting.getLabel(t("group:Group identifier"), t("group:Group name - Tooltip")),
                <Input disabled={sourceManagedFieldsDisabled} status={this.state.fieldErrors.name !== undefined ? "error" : undefined} value={group.name} onChange={e => {
                  this.updateGroupField("name", e.target.value);
                }} />,
                {required: !sourceManagedFieldsDisabled, error: this.state.fieldErrors.name}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Display name"), t("general:Display name - Tooltip")),
                <Input status={this.state.fieldErrors.displayName !== undefined ? "error" : undefined} value={group.displayName} onChange={e => {
                  this.updateGroupField("displayName", e.target.value);
                }} />,
                {required: true, error: this.state.fieldErrors.displayName}
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Type"), t("group:Group type - Tooltip")),
                <Select
                  disabled={sourceManagedFieldsDisabled}
                  options={[
                    {label: t("group:Virtual"), value: "Virtual"},
                    {label: t("group:Physical"), value: "Physical"},
                  ]}
                  value={group.type} onChange={(value => {
                    this.updateGroupField("type", value);
                  })} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("group:Parent group"), t("group:Parent group - Tooltip")),
                <Select
                  disabled={sourceManagedFieldsDisabled}
                  options={this.getParentIdOptions()}
                  value={group.parentId} onChange={(value => {
                    this.updateGroupField("parentId", value);
                  })} />
              )}
              {this.renderFieldRow(
                Setting.getLabel(t("general:Is enabled"), t("group:Group enabled - Tooltip")),
                <Switch checked={group.isEnabled} onChange={checked => {
                  this.updateGroupField("isEnabled", checked);
                }} />
              )}
              {isDirectorySynced ? (
                <div className="identity-object-edit-field-row-wide group-edit-field-row-wide group-edit-directory-alert">
                  <Alert
                    type="info"
                    showIcon
                    message={t("group:Directory synced group has source-managed fields")}
                    description={t("group:Directory synced group fields are managed by source system")}
                  />
                </div>
              ) : null}
              {this.renderFieldRow(
                Setting.getLabel(t("group:Current members"), t("group:Current members - Tooltip")),
                this.renderMemberControl(group),
                {wide: true}
              )}
            </div>
          </section>
        </LargeEditShell>
      </Card>
    );
  }

  submitGroupEdit(exitAfterSave: boolean) {
    if (this.state.submitting || !this.validateGroup()) {
      return;
    }

    const group = Setting.deepCopy(this.state.group) as GroupMutation;
    group["isTopGroup"] = this.state.organizations.some((organization) => organization.name === group.parentId);

    this.setState({submitting: true});
    GroupBackend.updateGroup(this.state.organizationName, this.state.groupName, group)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", t("general:Successfully saved"));
          this.setState({
            groupName: group.name,
            dirty: false,
            submitting: false,
          });

          if (exitAfterSave) {
            this.returnToGroupList();
          } else {
            this.props.history.push(`/groups/${group.owner}/${group.name}`);
          }
        } else {
          Setting.showMessage("error", `${t("general:Failed to save")}: ${res.msg}`);
          this.setState(state => ({
            submitting: false,
            group: state.group === null ? state.group : {...state.group, name: state.groupName},
          }));
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteGroup() {
    if (this.state.submitting) {
      return;
    }

    this.setState({submitting: true});
    GroupBackend.deleteGroup(this.state.group!)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({dirty: false, submitting: false});
          this.returnToGroupList();
        } else {
          this.setState({submitting: false});
          Setting.showMessage("error", `${t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="identity-object-edit-page group-edit-page">
        {
          this.state.group !== null ? this.renderGroup() : null
        }
      </div>
    );
  }
}

export default GroupEditPage;
