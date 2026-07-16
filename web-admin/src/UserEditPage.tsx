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
import {
  Button, Card, Col, Empty, Form, Input, InputNumber, List, Modal,
  Result, Row, Select, Space, Spin, Switch, Tabs, Tag, Tooltip
} from "antd";
import * as ReactRouterDom from "react-router-dom";
import {EmailMfaType, PushMfaType, RadiusMfaType, SmsMfaType, TotpMfaType} from "./auth/MfaSetupPage";
import * as GroupBackend from "./backend/GroupBackend";
import * as UserBackend from "./backend/UserBackend";
import * as OrganizationBackend from "./backend/OrganizationBackend";
import * as AuthBackend from "./auth/AuthBackend";
import EnableMfaModal from "./common/modal/EnableMfaModal";
import * as Setting from "./Setting";
import i18nextRaw from "i18next";
import CropperDivModal from "./common/modal/CropperDivModal";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import PasswordModal from "./common/modal/PasswordModal";
import ResetModal from "./common/modal/ResetModal";
import AffiliationSelect from "./common/select/AffiliationSelect";
import moment from "moment";
import OAuthWidget from "./common/OAuthWidget";
import SamlWidget from "./common/SamlWidget";
import RegionSelect from "./common/select/RegionSelect";
import WebAuthnCredentialTable from "./table/WebauthnCredentialTable";
import ManagedAccountTable from "./table/ManagedAccountTable";
import AddressTable from "./table/AddressTable";
import PropertyTable from "./table/propertyTable";
import {CountryCodeSelect} from "./common/select/CountryCodeSelect";
import PopconfirmModal from "./common/modal/PopconfirmModal";
import {DeleteMfa} from "./backend/MfaBackend";
import {CheckCircleOutlined, HolderOutlined, InfoCircleOutlined, UsergroupAddOutlined} from "@ant-design/icons";
import * as MfaBackend from "./backend/MfaBackend";
import AccountAvatar from "./account/AccountAvatar";
import FaceIdTable from "./table/FaceIdTable";
import MfaAccountTable from "./table/MfaAccountTable";
import MfaTable from "./table/MfaTable";
import TransactionTable from "./table/TransactionTable";
import CartTable from "./table/CartTable";
import * as TransactionBackend from "./backend/TransactionBackend";
import WeComProfileSyncPanel from "./account/WeComProfileSyncPanel";
import ConsentTable from "./table/ConsentTable";
import LargeEditShell from "./common/LargeEditShell";
import {WORKSPACE_TAB_LABEL_UPDATE_EVENT} from "./common/workspaceTabState";
import {isRetiredWeb3WalletProvider} from "./auth/Web3WalletRetirement";

const {Option} = Select;

interface BackendResponse<T> {
  status?: string;
  data?: T | null;
  data2?: unknown;
  msg?: string;
}

interface OrganizationRecord {
  name: string;
  displayName?: string;
  accountMenu?: string;
  accountItems?: AccountItemRecord[];
  userTypes?: string[];
  tags?: string[];
  countryCodes?: string[];
  [key: string]: unknown;
}

interface ApplicationRecord {
  name: string;
  organizationObj?: OrganizationRecord;
  providers?: ProviderItemRecord[];
  [key: string]: unknown;
}

interface GroupRecord {
  owner: string;
  name: string;
  displayName?: string;
  type?: string;
  isDirectorySynced?: boolean;
  directorySyncSources?: string[];
  [key: string]: unknown;
}

interface ProviderRecord {
  name?: string;
  displayName?: string;
  category?: string;
  type?: string;
  [key: string]: unknown;
}

interface ProviderItemRecord {
  name?: string;
  provider: ProviderRecord;
  [key: string]: unknown;
}

interface AccountItemRecord {
  name?: string;
  visible?: boolean;
  modifyRule?: "Self" | "Admin" | "Immutable" | string;
  viewRule?: "Self" | "Admin" | string;
  tab?: string;
  regex?: string;
  rule?: string;
  [key: string]: unknown;
}

type UserEditTabKey = "basic" | "identity" | "access" | "security" | "connections" | "records";
type OrganizationContextStatus = "ready" | "loading" | "error";
type PostCreateReloadStatus = "idle" | "loading" | "error";

interface UserEditTabItem {
  key: UserEditTabKey;
  label: string;
  accountItemNames: string[];
}

interface UserEditSectionItem {
  key: string;
  title: string;
  accountItemNames: string[];
}

interface RoleRecord {
  name: string;
  [key: string]: unknown;
}

interface MfaPropsRecord {
  mfaType: string;
  enabled?: boolean;
  secret?: string;
  isPreferred?: boolean;
  [key: string]: unknown;
}

interface UserRecord {
  owner: string;
  name: string;
  id?: string;
  displayName?: string;
  avatar?: string;
  type?: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  region?: string;
  location?: string;
  address?: string[];
  addresses?: unknown[];
  title?: string;
  idCardType?: string;
  idCard?: string;
  realName?: string;
  homepage?: string;
  bio?: string;
  tag?: string;
  language?: string;
  gender?: string;
  birthday?: string;
  education?: string;
  balance?: number | null;
  balanceCredit?: number | null;
  balanceCurrency?: string;
  cart?: unknown;
  score?: number | string | null;
  karma?: number | string | null;
  ranking?: number | string | null;
  signupApplication?: string;
  registerType?: string;
  registerSource?: string;
  externalId?: string;
  dingtalk?: string;
  wecom?: string;
  lark?: string;
  groups?: string[];
  roles?: RoleRecord[];
  permissions?: RoleRecord[];
  properties?: Record<string, unknown> | null;
  isVerified?: boolean;
  isAdmin?: boolean;
  isForbidden?: boolean;
  isDeleted?: boolean;
  deletedTime?: string;
  mfaItems?: unknown[];
  multiFactorAuths?: MfaPropsRecord[];
  webauthnCredentials?: unknown[];
  lastChangePasswordTime?: string;
  managedAccounts?: unknown[];
  faceIds?: unknown[];
  mfaAccounts?: unknown[];
  mfaProps?: unknown;
  needUpdatePassword?: boolean;
  ipWhitelist?: string;
  firstName?: string;
  lastName?: string;
  applicationScopes?: unknown[];
  [key: string]: unknown;
}

interface AccountRecord extends UserRecord {
  isAdmin?: boolean;
  accessToken?: string;
  organization?: OrganizationRecord;
}

interface UserEditPageProps {
  account: AccountRecord | null;
  match: {
    params: {
      organizationName: string;
      userName: string;
    };
  };
  location: {
    mode?: string;
    state?: {user?: UserRecord; mode?: string};
    search?: string;
    [key: string]: unknown;
  };
  history: {
    push: (path: string) => void;
  };
  organizationName?: string;
  userName?: string;
  onUpdateAccount?: (account: AccountRecord) => void;
}

interface UserEditPageState {
  classes: UserEditPageProps;
  organizationName: string;
  userName: string;
  user: UserRecord;
  application: ApplicationRecord | null;
  userOrganization: OrganizationRecord | null;
  pendingUserApplicationError: string | null;
  groups: GroupRecord[] | null;
  organizations: OrganizationRecord[];
  applications: ApplicationRecord[];
  applicationsLoaded: boolean;
  mode: string;
  loading: boolean;
  returnUrl: string | null;
  idCardInfo: string[];
  openFaceRecognitionModal: boolean;
  transactions: Record<string, unknown>[];
  consents: unknown[];
  activeTabKey: UserEditTabKey;
  menuMode: "Horizontal" | "Vertical" | string;
  dirty: boolean;
  submitting: boolean;
  organizationContextStatus: OrganizationContextStatus;
  postCreateReloadStatus: PostCreateReloadStatus;
  multiFactorAuths?: MfaPropsRecord[];
  RemoveMfaLoading?: boolean;
  [key: string]: unknown;
}

interface RouterInjectedProps {
  history: UserEditPageProps["history"];
  location: UserEditPageProps["location"];
  match: UserEditPageProps["match"];
}

const withRouter = (ReactRouterDom as unknown as {
  withRouter: <P extends object>(component: React.ComponentType<P>) => React.ComponentType<Omit<P, keyof RouterInjectedProps> & Partial<RouterInjectedProps>>;
}).withRouter;

// i18next 的历史类型返回值偏宽；页面 JSX 和消息提示只消费字符串。
const i18next = {
  t: (key: string, options?: Record<string, unknown>): string => String(i18nextRaw.t(key, options)),
};

export class UserEditPage extends React.Component<UserEditPageProps, UserEditPageState> {
  organizationContextRequestId = 0;
  postCreateReloadRequestId = 0;
  isUnmounted = false;

  constructor(props: UserEditPageProps) {
    super(props);
    const draftUser = props.location.state?.user;
    const requestedMode = props.location.state?.mode ?? props.location.mode ?? "edit";
    const mode = requestedMode === "add" && draftUser === undefined ? "edit" : requestedMode;
    this.state = {
      classes: props,
      organizationName: draftUser?.owner ?? (props.organizationName !== undefined ? props.organizationName : props.match.params.organizationName),
      userName: draftUser?.name ?? (props.userName !== undefined ? props.userName : props.match.params.userName),
      // 保留历史 JS 行为：用户详情加载前为 null，render 中仍用 null guard 控制展示。
      user: draftUser ?? null as unknown as UserRecord,
      application: null,
      userOrganization: null,
      pendingUserApplicationError: null,
      groups: null,
      organizations: [],
      applications: [],
      applicationsLoaded: false,
      mode,
      loading: mode !== "add",
      returnUrl: null,
      idCardInfo: ["ID card front", "ID card back", "ID card with person"],
      openFaceRecognitionModal: false,
      transactions: [],
      consents: [],
      activeTabKey: this.getInitialTabKey(),
      menuMode: "Horizontal",
      dirty: false,
      submitting: false,
      organizationContextStatus: "loading",
      postCreateReloadStatus: "idle",
    };
  }

  UNSAFE_componentWillMount() {
    if (this.state.mode !== "add") {
      this.getUser();
    }
    if (Setting.isLocalAdminUser(this.props.account)) {
      this.getOrganizations();
    }
    this.loadOrganizationContext(this.state.organizationName, this.state.mode !== "add");
    this.setReturnUrl();
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    this.organizationContextRequestId += 1;
    this.postCreateReloadRequestId += 1;
  }

  getMfaMethodLabel(mfaType: string): string {
    switch (mfaType) {
    case SmsMfaType:
      return i18next.t("mfa:SMS");
    case EmailMfaType:
      return i18next.t("mfa:Email");
    case TotpMfaType:
      return i18next.t("mfa:Authenticator App");
    case RadiusMfaType:
      return i18next.t("mfa:Radius");
    case PushMfaType:
      return i18next.t("mfa:Push Notification");
    default:
      return mfaType;
    }
  }

  componentDidUpdate(prevProps: Readonly<UserEditPageProps>, prevState: Readonly<UserEditPageState>, snapshot?: unknown) {
    if ((prevState.application !== this.state.application || prevState.userOrganization !== this.state.userOrganization) &&
      this.state.groups === null && this.state.organizationContextStatus !== "loading") {
      this.getGroups(this.state.organizationName);
    }
  }

  getUser() {
    UserBackend.getUser(this.state.organizationName, this.state.userName)
      .then((res: BackendResponse<UserRecord>) => {
        if (res.data === null) {
          this.props.history.push("/404");
          return;
        }

        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        const user = res.data as UserRecord;
        this.setState({
          user: user,
          multiFactorAuths: user.multiFactorAuths ?? [],
          consents: user.applicationScopes ?? [],
          loading: false,
          dirty: false,
        }, () => {
          this.publishWorkspaceTabLabel(user);
          this.normalizeSignupApplication();
          this.resolvePendingUserApplicationError();
        });

        // Load user transactions
        this.getUserTransactions();
      });
  }

  getUserTransactions() {
    TransactionBackend.getTransactions(this.state.organizationName, "", "", "user", this.state.userName)
      .then((res: BackendResponse<Record<string, unknown>[]>) => {
        if (res.status === "ok") {
          this.setState({
            transactions: res.data ?? [],
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getOrganizations() {
    OrganizationBackend.getOrganizations("admin")
      .then((res: BackendResponse<OrganizationRecord[]>) => {
        this.setState({
          organizations: res.data || [],
        });
      });
  }

  getApplicationsByOrganization(organizationName: string) {
    const requestId = this.organizationContextRequestId;
    ApplicationBackend.getApplicationsByOrganization("admin", organizationName)
      .then((res: BackendResponse<ApplicationRecord[]>) => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        const applications = res.data ?? [];
        this.setState({
          applications: applications,
          applicationsLoaded: true,
        }, () => this.normalizeSignupApplication());
      });
  }

  isOrganizationContextRequestCurrent(requestId: number, organizationName: string) {
    const currentOwner = this.state.user?.owner ?? this.state.organizationName;
    return !this.isUnmounted && requestId === this.organizationContextRequestId && currentOwner === organizationName;
  }

  loadOrganizationContext(organizationName: string, includeUserApplication = false) {
    const requestId = ++this.organizationContextRequestId;
    this.setState({
      application: null,
      userOrganization: null,
      applications: [],
      applicationsLoaded: false,
      groups: null,
      menuMode: "Horizontal",
      organizationContextStatus: "loading",
    });

    const groupsRequest: Promise<BackendResponse<GroupRecord[]>> = Setting.isLocalAdminUser(this.props.account)
      ? GroupBackend.getGroups(organizationName)
      : Promise.resolve({status: "ok", data: []});
    const userApplicationRequest: Promise<BackendResponse<ApplicationRecord>> = includeUserApplication
      ? ApplicationBackend.getUserApplication(organizationName, this.state.userName)
      : Promise.resolve({status: "ok", data: null});

    Promise.all([
      OrganizationBackend.getOrganization("admin", organizationName) as Promise<BackendResponse<OrganizationRecord>>,
      ApplicationBackend.getApplicationsByOrganization("admin", organizationName) as Promise<BackendResponse<ApplicationRecord[]>>,
      groupsRequest,
      userApplicationRequest,
    ])
      .then(([organizationResponse, applicationsResponse, groupsResponse, userApplicationResponse]) => {
        // 组织上下文只允许最后一次且仍匹配当前 owner 的完整响应落地，任一关键请求失败都保持关闭。
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        const businessError = organizationResponse.status !== "ok" || !organizationResponse.data
          ? organizationResponse.msg || i18next.t("general:Failed to load")
          : applicationsResponse.status !== "ok"
            ? applicationsResponse.msg || i18next.t("general:Failed to load")
            : groupsResponse.status !== "ok"
              ? groupsResponse.msg || i18next.t("general:Failed to load")
              : userApplicationResponse.status === "error" && !this.isMissingUserApplicationError(userApplicationResponse.msg)
                ? userApplicationResponse.msg || i18next.t("general:Failed to load")
                : null;
        if (businessError !== null) {
          this.setState({organizationContextStatus: "error"});
          Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${businessError}`);
          return;
        }

        const organization = organizationResponse.data as OrganizationRecord;
        const userApplication = userApplicationResponse.status === "ok" && userApplicationResponse.data
          ? {...userApplicationResponse.data, organizationObj: organization}
          : null;
        this.setState({
          application: userApplication,
          userOrganization: organization,
          applications: applicationsResponse.data ?? [],
          applicationsLoaded: true,
          groups: groupsResponse.data ?? [],
          menuMode: organization.accountMenu ?? "Horizontal",
          organizationContextStatus: "ready",
        }, () => this.normalizeSignupApplication());
      })
      .catch(error => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        this.setState({organizationContextStatus: "error"});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  reloadPersistedUserAfterCreate(organizationName: string, userName: string) {
    const requestId = ++this.postCreateReloadRequestId;
    UserBackend.getUser(organizationName, userName)
      .then((res: BackendResponse<UserRecord>) => {
        if (this.isUnmounted || requestId !== this.postCreateReloadRequestId) {
          return;
        }

        if (res.status !== "ok" || !res.data) {
          this.setState({postCreateReloadStatus: "error"});
          Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${res.msg ?? i18next.t("general:Failed to load")}`);
          return;
        }

        // AddUser 会补齐或归一化多个字段；后续更新必须以持久化对象为基线。
        this.setState({
          user: res.data,
          postCreateReloadStatus: "idle",
        });
      })
      .catch(error => {
        if (this.isUnmounted || requestId !== this.postCreateReloadRequestId) {
          return;
        }

        this.setState({postCreateReloadStatus: "error"});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  normalizeSignupApplication() {
    if (!this.state.user || !this.state.applicationsLoaded) {
      return;
    }

    const applications = this.state.applications;
    if (this.state.user.signupApplication && applications.some(application => application.name === this.state.user.signupApplication)) {
      return;
    }

    const signupApplication = applications.length > 0 ? applications[0].name : "";
    if (this.state.user.signupApplication === signupApplication) {
      return;
    }

    this.updateUserField("signupApplication", signupApplication, undefined, {dirty: false});
  }

  isDirectorySyncedUser(user?: UserRecord | null) {
    if (!user) {
      return false;
    }

    return this.hasNonEmptyString(user.wecom) ||
      this.hasNonEmptyString(user.lark) ||
      this.hasNonEmptyString(user.dingtalk);
  }

  hasNonEmptyString(value: unknown) {
    return typeof value === "string" && value.trim() !== "";
  }

  getOrganizationDisplayName(organization: OrganizationRecord): string {
    const displayName = organization.displayName;
    return typeof displayName === "string" && displayName.trim() !== "" ? displayName.trim() : organization.name;
  }

  normalizeTooltipText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  isUsefulAccountItemTooltip(label: string, tooltip: string): boolean {
    const normalizedLabel = this.normalizeTooltipText(label);
    const normalizedTooltip = this.normalizeTooltipText(tooltip);

    if (normalizedTooltip === "" || normalizedTooltip === normalizedLabel) {
      return false;
    }

    return !/ - Tooltip$/i.test(normalizedTooltip);
  }

  renderAccountItemLabel(label: string, tooltip: string): React.ReactNode {
    if (!this.isUsefulAccountItemTooltip(label, tooltip)) {
      return <span className="user-edit-account-item-label-text">{label}</span>;
    }

    return (
      <span className="user-edit-account-item-label user-edit-account-item-label-with-help">
        <span className="user-edit-account-item-label-text">{label}</span>
        <Tooltip placement="top" title={tooltip}>
          <span
            aria-label={tooltip}
            className="user-edit-account-item-label-help-icon"
            role="img"
            tabIndex={0}
          >
            <InfoCircleOutlined />
          </span>
        </Tooltip>
      </span>
    );
  }

  renderAccountItemTags(tags: string[], keyPrefix: string): React.ReactNode {
    return Setting.getTags(tags).map((tag: React.ReactNode, index: number) => (
      <React.Fragment key={`${keyPrefix}-${tags[index]}-${index}`}>
        {tag}
      </React.Fragment>
    ));
  }

  renderAccountItemTableSection(content: React.ReactNode): React.ReactNode {
    return (
      <div className="user-edit-table-section">
        {content}
      </div>
    );
  }

  renderAccountItemContentSection(title: string, tooltip: string, content: React.ReactNode, className?: string, showTitle = true): React.ReactNode {
    return (
      <div className={["user-edit-content-section", className ?? ""].filter(Boolean).join(" ")}>
        {showTitle ? (
          <div className="user-edit-content-section-title">
            {this.renderAccountItemLabel(title, tooltip)}
          </div>
        ) : null}
        <div className="user-edit-content-section-body">
          {content}
        </div>
      </div>
    );
  }

  renderUserEditSectionTitle(title: string): React.ReactNode {
    return (
      <div className="user-edit-section-title">
        <span>{title}</span>
      </div>
    );
  }

  getVisibleApplicationProviders(): ProviderItemRecord[] {
    return (this.state.application?.providers ?? []).filter(providerItem => {
      if (Setting.isProviderVisible(providerItem)) {
        return true;
      }
      // 退役钱包 Provider 仅在用户已有非空历史值时展示，供通用 Unlink 清理；不得恢复 Link/Connect。
      if (!isRetiredWeb3WalletProvider(providerItem.provider)) {
        return false;
      }

      const providerType = providerItem.provider.type?.trim().toLowerCase();
      if (providerType !== "metamask" && providerType !== "web3onboard") {
        return false;
      }
      const linkedValue = this.state.user?.[providerType];
      return linkedValue !== null && linkedValue !== undefined && String(linkedValue).trim() !== "";
    });
  }

  renderThirdPartyLoginItems(): React.ReactNode {
    if (this.state.application === null || this.state.user === null) {
      return null;
    }

    const visibleProviders = this.getVisibleApplicationProviders();
    if (visibleProviders.length === 0) {
      return (
        <Empty
          className="user-edit-third-party-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={i18next.t("user:No third-party login providers")}
        />
      );
    }

    return visibleProviders.map((providerItem) =>
      (providerItem.provider.category === "OAuth" || isRetiredWeb3WalletProvider(providerItem.provider)) ? (
        <OAuthWidget
          key={providerItem.name}
          labelSpan={(Setting.isMobile()) ? 10 : 3}
          user={this.state.user}
          application={this.state.application as ApplicationRecord}
          providerItem={providerItem}
          account={this.props.account}
          onUnlinked={() => {return this.unlinked();}} />
      ) : (
        <SamlWidget
          key={providerItem.name}
          labelSpan={(Setting.isMobile()) ? 10 : 3}
          user={this.state.user}
          application={this.state.application as ApplicationRecord}
          providerItem={providerItem}
          onUnlinked={() => {return this.unlinked();}} />
      )
    );
  }

  getUserApplication() {
    const organizationName = this.state.organizationName;
    const requestId = this.organizationContextRequestId;
    ApplicationBackend.getUserApplication(organizationName, this.state.userName)
      .then((res) => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        if (res.status === "error") {
          this.handleUserApplicationError(res.msg);
          return;
        }

        const application = res.data as ApplicationRecord | null;
        if (!application?.organizationObj) {
          this.getUserOrganizationFallback();
          return;
        }

        this.setState({
          menuMode: application?.organizationObj?.accountMenu ?? "Horizontal",
          application: application,
          userOrganization: application?.organizationObj ?? null,
          pendingUserApplicationError: null,
          organizationContextStatus: "ready",
        });
      })
      .catch(error => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        this.setState({organizationContextStatus: "error"});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  isMissingUserApplicationError(message?: string) {
    const normalizedMessage = (message ?? "").toLowerCase();

    return normalizedMessage.includes("one application at least") ||
      normalizedMessage.includes("至少一个应用");
  }

  handleUserApplicationError(applicationError?: string) {
    if (this.isMissingUserApplicationError(applicationError) && !this.state.user) {
      this.setState({pendingUserApplicationError: applicationError ?? ""});
      return;
    }

    if (this.isMissingUserApplicationError(applicationError)) {
      this.getUserOrganizationFallback(applicationError);
      return;
    }

    Setting.showMessage("error", applicationError);
    this.setState({pendingUserApplicationError: null});
  }

  resolvePendingUserApplicationError() {
    if (this.state.pendingUserApplicationError === null) {
      return;
    }

    this.handleUserApplicationError(this.state.pendingUserApplicationError);
  }

  getUserOrganizationFallback(applicationError?: string) {
    const organizationName = this.state.organizationName;
    const requestId = this.organizationContextRequestId;
    this.setState({organizationContextStatus: "loading"});
    OrganizationBackend.getOrganization("admin", organizationName)
      .then((res: BackendResponse<OrganizationRecord>) => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        if (res.status === "error" || !res.data) {
          Setting.showMessage("error", res.msg || applicationError);
          this.setState({pendingUserApplicationError: null, organizationContextStatus: "error"});
          return;
        }

        this.setState({
          menuMode: res.data.accountMenu ?? "Horizontal",
          application: null,
          userOrganization: res.data,
          pendingUserApplicationError: null,
          organizationContextStatus: "ready",
        });
      })
      .catch(error => {
        if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
          return;
        }

        this.setState({pendingUserApplicationError: null, organizationContextStatus: "error"});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getUserOrganization() {
    return this.state.application?.organizationObj ?? this.state.userOrganization ?? undefined;
  }

  isGroupsVisible() {
    const organization = this.getUserOrganization();
    if (!organization) {
      return false;
    } else {
      return organization.accountItems?.some((item) => item.name === "Groups" && item.visible);
    }
  }

  getGroups(organizationName: string) {
    if (!Setting.isLocalAdminUser(this.props.account)) {
      return;
    }

    if (this.isGroupsVisible()) {
      const requestId = this.organizationContextRequestId;
      GroupBackend.getGroups(organizationName)
        .then((res: BackendResponse<GroupRecord[]>) => {
          if (!this.isOrganizationContextRequestCurrent(requestId, organizationName)) {
            return;
          }

          if (res.status === "ok") {
            this.setState({
              groups: res.data ?? [],
            });
          }
        });
    }
  }

  setReturnUrl() {
    const searchParams = new URLSearchParams(this.props.location.search);
    const returnUrl = searchParams.get("returnUrl");
    if (returnUrl !== null) {
      this.setState({
        returnUrl: returnUrl,
      });
    }
  }

  parseUserField(key: string, value: unknown): unknown {
    if (["score", "karma", "ranking"].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateUserField(key: string, value: unknown, idx?: number, options: {dirty?: boolean} = {}) {
    if (this.props.account === null) {
      return;
    }

    value = this.parseUserField(key, value);

    const user = this.state.user;
    if (key === "address") {
      if (!user.address) {
        user.address = ["", ""];
      }
      if (idx !== undefined) {
        user.address[idx] = String(value ?? "");
      }
    } else {
      user[key] = value;
    }

    this.setState({
      user: user,
      dirty: options.dirty === false ? this.state.dirty : true,
    }, () => {
      if (key === "displayName") {
        this.publishWorkspaceTabLabel(user);
      }
    });
  }

  getCurrentWorkspaceTabPath(): string {
    return `/users/${this.state.organizationName}/${this.state.userName}`;
  }

  getUserWorkspaceTabLabel(user: UserRecord): string {
    const displayName = `${user.displayName || user.name || this.state.userName}`.trim();
    const editLabel = i18next.t("user:Edit User");
    const separator = /[\u3400-\u9fff]/.test(editLabel) ? "：" : ": ";

    return `${editLabel}${separator}${displayName}`;
  }

  // 用户详情数据加载或显示名称变化后，只更新当前 workspace tab 文案，不改变路由和标签顺序。
  publishWorkspaceTabLabel(user: UserRecord): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(WORKSPACE_TAB_LABEL_UPDATE_EVENT, {
      detail: {
        path: this.getCurrentWorkspaceTabPath(),
        label: this.getUserWorkspaceTabLabel(user),
      },
    }));
  }

  getCanonicalGroupId(groupId: string, owner = this.state.user.owner): string {
    return groupId.includes("/") ? groupId : `${owner}/${groupId}`;
  }

  getGroupRecordId(group: GroupRecord): string {
    return `${group.owner}/${group.name}`;
  }

  isDirectorySyncedGroup(group?: GroupRecord | null): boolean {
    return Boolean(group?.isDirectorySynced || (group?.directorySyncSources ?? []).length > 0);
  }

  findGroupById(groupId: string): GroupRecord | null {
    const canonicalGroupId = this.getCanonicalGroupId(groupId);
    return (this.state.groups ?? []).find(group => this.getGroupRecordId(group) === canonicalGroupId) ?? null;
  }

  getDirectorySyncedGroupChange(previousGroups: string[], nextGroups: string[]): GroupRecord | null {
    const previousGroupIds = new Set(previousGroups.map(group => this.getCanonicalGroupId(group)));
    const nextGroupIds = new Set(nextGroups.map(group => this.getCanonicalGroupId(group)));
    const changedGroupIds = [
      ...previousGroups.map(group => this.getCanonicalGroupId(group)).filter(groupId => !nextGroupIds.has(groupId)),
      ...nextGroups.map(group => this.getCanonicalGroupId(group)).filter(groupId => !previousGroupIds.has(groupId)),
    ];

    for (const groupId of changedGroupIds) {
      const group = this.findGroupById(groupId);
      if (this.isDirectorySyncedGroup(group)) {
        return group;
      }
    }
    return null;
  }

  unlinked() {
    this.getUser();
  }

  isSelf() {
    if (!this.state.user || !this.props.account) {
      return false;
    }

    // Compare by id if available
    if (this.state.user.id && this.props.account.id) {
      return this.state.user.id === this.props.account.id;
    }

    // Fallback to comparing by owner and name
    return (this.state.user.owner === this.props.account.owner &&
      this.state.user.name === this.props.account.name);
  }

  isSelfOrAdmin() {
    return this.isSelf() || Setting.isLocalAdminUser(this.props.account);
  }

  getCountryCode() {
    return this.props.account?.countryCode;
  }

  deleteMfa = () => {
    this.setState({
      RemoveMfaLoading: true,
    });

    DeleteMfa({
      owner: this.state.user.owner,
      name: this.state.user.name,
    }).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully deleted"));
        this.setState({
          multiFactorAuths: res.data,
        });
      } else {
        Setting.showMessage("error", i18next.t("general:Failed to delete"));
      }
    }).finally(() => {
      this.setState({
        RemoveMfaLoading: false,
      });
    });
  };

  handleVerifyIdentification = () => {
    if (!this.state.user.idCard || !this.state.user.idCardType) {
      Setting.showMessage("error", i18next.t("user:Please fill in ID card information first"));
      return;
    }

    if (!this.state.user.realName) {
      Setting.showMessage("error", i18next.t("user:Please fill in your real name first"));
      return;
    }

    // For normal user verifying themselves, no need to pass user or provider parameters
    // Backend will use logged-in user and auto-select provider
    UserBackend.verifyIdentification(this.state.user.owner, this.state.user.name, "")
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("user:Identity verification successful"));
          this.getUser();
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  };

  handleWeComProfileSynced() {
    this.getUser();
    if (!this.props.onUpdateAccount) {
      return;
    }

    AuthBackend.getAccount()
      .then((res: BackendResponse<AccountRecord>) => {
        if (res.status !== "ok") {
          return;
        }
        const account = res.data;
        if (!account) {
          return;
        }
        account.organization = res.data2 as OrganizationRecord;
        this.props.onUpdateAccount?.(account);
      });
  }

  renderWeComProfileSyncPanel() {
    if (!this.isSelf() || this.state.mode === "add" || this.state.application === null) {
      return null;
    }

    return (
      <WeComProfileSyncPanel
        application={this.state.application}
        style={{marginLeft: "20px"}}
        onSynced={() => this.handleWeComProfileSynced()}
      />
    );
  }

  renderAccountItem(accountItem: AccountItemRecord): React.ReactNode {
    const isAdmin = Setting.isLocalAdminUser(this.props.account);

    let disabled = false;
    if (accountItem.modifyRule === "Self") {
      if (!this.isSelfOrAdmin()) {
        disabled = true;
      }
    } else if (accountItem.modifyRule === "Admin") {
      if (!isAdmin) {
        disabled = true;
      }
    } else if (accountItem.modifyRule === "Immutable") {
      disabled = true;
    }

    if (accountItem.name === "Organization" || accountItem.name === "Name") {
      if (this.state.user.owner === "built-in" && this.state.user.name === "admin") {
        disabled = true;
      }
    }

    if (accountItem.name === "ID card info" || accountItem.name === "ID card" || accountItem.name === "ID card type" || accountItem.name === "Real name") {
      if (this.state.user.isVerified) {
        disabled = true;
      }
    }

    if (accountItem.name === "Organization") {
      return (
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Organization"), i18next.t("general:Organization - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select
              virtual={false}
              showSearch
              optionLabelProp="label"
              style={{width: "100%"}}
              disabled={disabled}
              value={this.state.user.owner}
              filterOption={(input, option) => {
                const optionText = `${option?.label ?? ""} ${option?.value ?? ""}`.toLowerCase();
                return optionText.includes(input.toLowerCase());
              }}
              onChange={(value => {
                this.updateUserField("owner", value);
                this.loadOrganizationContext(value, this.state.mode !== "add");
              })}
            >
              {
                this.state.organizations.map((organization) => {
                  const displayName = this.getOrganizationDisplayName(organization);
                  return (
                    <Option key={organization.name} value={organization.name} label={displayName}>
                      <div className="user-edit-organization-option">
                        <span className="user-edit-organization-option-name">{displayName}</span>
                        {displayName !== organization.name ? (
                          <span className="user-edit-organization-option-id">{organization.name}</span>
                        ) : null}
                      </div>
                    </Option>
                  );
                })
              }
            </Select>
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Groups") {
      return (
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Groups"), i18next.t("general:Groups - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="multiple" style={{width: "100%"}} disabled={disabled} value={this.state.user.groups ?? []} onChange={((value: string[]) => {
              const directorySyncedGroup = this.getDirectorySyncedGroupChange(this.state.user.groups ?? [], value);
              if (directorySyncedGroup !== null) {
                Setting.showMessage("error", i18next.t("general:Directory synced group membership cannot be changed here"));
                return;
              }

              const selectedGroupIds = new Set(value.map(group => this.getCanonicalGroupId(group)));
              if ((this.state.groups ?? []).filter(group => selectedGroupIds.has(this.getGroupRecordId(group)))
                .filter(group => group.type === "Physical").length > 1) {
                Setting.showMessage("error", i18next.t("general:You can only select one physical group"));
                return;
              }

              this.updateUserField("groups", value);
            })}
            >
              {
                this.state.groups?.map((group) => <Option key={group.name} value={`${group.owner}/${group.name}`} disabled={this.isDirectorySyncedGroup(group)}>
                  <Space>
                    {group.type === "Physical" ? <UsergroupAddOutlined /> : <HolderOutlined />}
                    {group.displayName}
                    {this.isDirectorySyncedGroup(group) ? <Tag>{i18next.t("general:Directory synced")}</Tag> : null}
                  </Space>
                </Option>)
              }
            </Select>
          </Col>
        </Row>
      );
    } else if (accountItem.name === "ID") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel("ID", i18next.t("general:ID - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.id} disabled={disabled} onChange={e => {
              this.updateUserField("id", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Name") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.name} disabled={disabled} onChange={e => {
              this.updateUserField("name", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Display name") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.displayName} onChange={e => {
              this.updateUserField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Avatar") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Avatar"), i18next.t("general:Avatar - Tooltip"))} :
          </Col>
          {
            this.renderImage(this.state.user.avatar, i18next.t("user:Upload a photo"), i18next.t("user:Set new profile picture"), "avatar", false)
          }
        </Row>
      );
    } else if (accountItem.name === "User type") {
      let userTypes = ["normal-user", "paid-user"];
      const organization = this.getUserOrganization();
      if (organization && organization.userTypes && organization.userTypes.length > 0) {
        userTypes = organization.userTypes;
      }

      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:User type"), i18next.t("general:User type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.user.type} onChange={(value => {this.updateUserField("type", value);})}
              options={userTypes.map(item => Setting.getOption(item, item))}
            />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Password") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {this.renderAccountItemLabel(i18next.t("general:Password"), i18next.t("general:Password - Tooltip"))} :
          </Col>
          <Col span={22} >
            {
              (this.state.user.name === this.state.userName) ? (
                <PasswordModal user={this.state.user} userName={this.state.userName} organization={this.getUserOrganization()} account={this.props.account} disabled={disabled} />
              ) : (
                <Tooltip placement={"topLeft"} title={i18next.t("user:You have changed the username, please save your change first before modifying the password")}>
                  <span>
                    <PasswordModal user={this.state.user} userName={this.state.userName} organization={this.getUserOrganization()} account={this.props.account} disabled={true} />
                  </span>
                </Tooltip>
              )
            }
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Email") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Email"), i18next.t("general:Email - Tooltip"))} :
          </Col>
          <Col style={{paddingRight: "20px"}} span={5} >
            <Input
              value={this.state.user.email}
              style={{width: "280Px"}}
              disabled={!Setting.isLocalAdminUser(this.props.account) ? true : disabled}
              onChange={e => {
                this.updateUserField("email", e.target.value);
              }}
            />
          </Col>
          <Col span={Setting.isMobile() ? 22 : 5} >
            {/* backend auto get the current user, so admin can not edit. Just self can reset*/}
            {this.isSelf() ? <ResetModal application={this.state.application} disabled={disabled} buttonText={i18next.t("user:Reset Email...")} destType={"email"} /> : null}
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Phone") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Phone"), i18next.t("general:Phone - Tooltip"))} :
          </Col>
          <Col style={{paddingRight: "20px"}} span={5} >
            <Input.Group compact style={{width: "280Px"}}>
              <CountryCodeSelect
                style={{width: "30%"}}
                // disabled={!Setting.isLocalAdminUser(this.props.account) ? true : disabled}
                initValue={this.state.user.countryCode}
                onChange={(value: unknown) => {
                  this.updateUserField("countryCode", value);
                }}
                countryCodes={this.getUserOrganization()?.countryCodes}
              />
              <Input value={this.state.user.phone}
                style={{width: "70%"}}
                disabled={!Setting.isLocalAdminUser(this.props.account) ? true : disabled}
                onChange={e => {
                  this.updateUserField("phone", e.target.value);
                }} />
            </Input.Group>
          </Col>
          <Col span={Setting.isMobile() ? 24 : 5} >
            {this.isSelf() ? (<ResetModal application={this.state.application} countryCode={this.getCountryCode()} disabled={disabled} buttonText={i18next.t("user:Reset Phone...")} destType={"phone"} />) : null}
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Country/Region") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Country/Region"), i18next.t("user:Country/Region - Tooltip"))} :
          </Col>
          <Col span={22} >
            <RegionSelect defaultValue={this.state.user.region} onChange={(value: unknown) => {
              this.updateUserField("region", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Location") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Location"), i18next.t("user:Location - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.location} onChange={e => {
              this.updateUserField("location", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Address") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Address"), i18next.t("user:Address - Tooltip"))} :
          </Col>
          <Col span={22} >
            <div className="user-edit-address-lines">
              <div className="user-edit-address-line">
                <span className="user-edit-address-line-label">{i18next.t("user:Address line") + " 1"} :</span>
                <Input value={!this.state.user.address ? "" : this.state.user.address[0]} onChange={e => {
                  this.updateUserField("address", e.target.value, 0);
                }} />
              </div>
              <div className="user-edit-address-line">
                <span className="user-edit-address-line-label">{i18next.t("user:Address line") + " 2"} :</span>
                <Input value={!this.state.user.address ? "" : this.state.user.address[1]} onChange={e => {
                  this.updateUserField("address", e.target.value, 1);
                }} />
              </div>
            </div>
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Addresses") {
      return this.renderAccountItemTableSection(
        <AddressTable
          title={this.renderAccountItemLabel(i18next.t("user:Addresses"), i18next.t("user:Addresses"))}
          table={this.state.user.addresses}
          onUpdateTable={(value: unknown) => {
            this.updateUserField("addresses", value);
          }}
        />
      );
    } else if (accountItem.name === "Affiliation") {
      return (
        (this.state.application === null || this.state.user === null) ? null : (
          <AffiliationSelect labelSpan={(Setting.isMobile()) ? 22 : 2} application={this.state.application} user={this.state.user} onUpdateUserField={(key: string, value: unknown) => {return this.updateUserField(key, value);}} />
        )
      );
    } else if (accountItem.name === "Title") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Title"), i18next.t("general:Title - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.title} onChange={e => {
              this.updateUserField("title", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "ID card type") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:ID card type"), i18next.t("user:ID card type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.idCardType} onChange={e => {
              this.updateUserField("idCardType", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "ID card") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:ID card"), i18next.t("user:ID card - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.idCard} disabled={disabled} onChange={e => {
              this.updateUserField("idCard", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "ID card info") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:ID card info"), i18next.t("user:ID card info - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Row style={{marginTop: "20px"}} >
              {
                [
                  {name: "ID card front", value: "idCardFront"},
                  {name: "ID card back", value: "idCardBack"},
                  {name: "ID card with person", value: "idCardWithPerson"},
                ].map((entry) => {
                  return this.renderImage(this.state.user.properties === null ? "" : String(this.state.user.properties?.[entry.value] || ""), this.getIdCardType(entry.name), this.getIdCardText(entry.name), entry.value, disabled);
                })
              }
            </Row>
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Real name") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("application:Real name"), i18next.t("user:Real name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.realName} disabled={disabled} onChange={e => {
              this.updateUserField("realName", e.target.value);
            }} placeholder={i18next.t("user:Please enter your real name")} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "ID verification") {
      const isVerified = this.state.user.isVerified;
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:ID verification"), i18next.t("user:ID verification - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Button
              type="primary"
              disabled={isVerified || disabled}
              onClick={() => this.handleVerifyIdentification()}
            >
              {isVerified ? i18next.t("user:Verified") : i18next.t("user:Verify Identity")}
            </Button>
            {isVerified && <Tag color="success" style={{marginLeft: "10px"}}><CheckCircleOutlined /> {i18next.t("user:Identity verified")}</Tag>}
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Homepage") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Homepage"), i18next.t("user:Homepage - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.homepage} onChange={e => {
              this.updateUserField("homepage", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Bio") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Bio"), i18next.t("user:Bio - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.bio} onChange={e => {
              this.updateUserField("bio", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Tag") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Tag"), i18next.t("product:Tag - Tooltip"))} :
          </Col>
          <Col span={22} >
            {
              (this.getUserOrganization()?.tags ?? []).length > 0 ? (
                <Select virtual={false} style={{width: "100%"}} value={this.state.user.tag}
                  onChange={(value => {this.updateUserField("tag", value);})}
                  options={(this.getUserOrganization()?.tags ?? []).map((tag) => {
                    const tokens = tag.split("|");
                    const value = tokens[0];
                    const displayValue = Setting.getLanguage() !== "zh" ? tokens[0] : tokens[1];
                    return Setting.getOption(displayValue, value);
                  })} />
              ) : (
                <Input value={this.state.user.tag} onChange={e => {
                  this.updateUserField("tag", e.target.value);
                }} />
              )
            }
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Language") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Language"), i18next.t("user:Language - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.language} onChange={e => {
              this.updateUserField("language", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Gender") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Gender"), i18next.t("user:Gender - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.gender} onChange={e => {
              this.updateUserField("gender", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Birthday") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Birthday"), i18next.t("user:Birthday - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.birthday} onChange={e => {
              this.updateUserField("birthday", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Education") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Education"), i18next.t("user:Education - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.education} onChange={e => {
              this.updateUserField("education", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Balance") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Balance"), i18next.t("user:Balance - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.user.balance} onChange={value => {
              this.updateUserField("balance", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Balance credit") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("organization:Balance credit"), i18next.t("organization:Balance credit - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.user.balanceCredit ?? 0} onChange={value => {
              this.updateUserField("balanceCredit", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Balance currency") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("organization:Balance currency"), i18next.t("organization:Balance currency - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.user.balanceCurrency || "USD"} onChange={(value => {
              this.updateUserField("balanceCurrency", value);
            })}>
              {
                Setting.CurrencyOptions.map((item, index) => <Option key={index} value={item.id}>{Setting.getCurrencyWithFlag(item.id)}</Option>)
              }
            </Select>
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Cart") {
      return this.renderAccountItemTableSection(
        <CartTable
          title={this.renderAccountItemLabel(i18next.t("general:Cart"), i18next.t("general:Cart"))}
          cart={this.state.user.cart}
          embedded
        />
      );
    } else if (accountItem.name === "Transactions") {
      return this.renderAccountItemTableSection(
        <TransactionTable
          title={this.renderAccountItemLabel(i18next.t("general:Transactions"), i18next.t("general:Transactions"))}
          transactions={this.state.transactions}
          hideTag={true}
          embedded
        />
      );
    } else if (accountItem.name === "Score") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Score"), i18next.t("user:Score - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.user.score} onChange={value => {
              this.updateUserField("score", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Karma") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Karma"), i18next.t("user:Karma - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.user.karma} onChange={value => {
              this.updateUserField("karma", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Ranking") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Ranking"), i18next.t("user:Ranking - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber value={this.state.user.ranking} onChange={value => {
              this.updateUserField("ranking", value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Signup application") {
      const isDirectorySyncedUser = this.isDirectorySyncedUser(this.state.user);
      const signupApplication = this.hasNonEmptyString(this.state.user.signupApplication) ? this.state.user.signupApplication : undefined;

      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Signup application"), i18next.t("general:Signup application - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} disabled={disabled || isDirectorySyncedUser} value={signupApplication}
              placeholder={isDirectorySyncedUser ? i18next.t("general:Signup application not set") : undefined}
              onChange={(value => {this.updateUserField("signupApplication", value);})}
              options={this.state.applications.map((application) => Setting.getOption(application.name, application.name))
              } />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Register type") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Register type"), i18next.t("user:Register type - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.registerType} disabled={!this.props.account?.isAdmin}
              onChange={e => {this.updateUserField("registerType", e.target.value);}} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Register source") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Register source"), i18next.t("user:Register source - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.user.registerSource} disabled={!this.props.account?.isAdmin}
              onChange={e => {this.updateUserField("registerSource", e.target.value);}} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Roles") {
      const roleNames = (this.state.user.roles ?? []).map(role => role.name).filter(Boolean);
      if (roleNames.length === 0) {
        return null;
      }

      return (
        <Row style={{marginTop: "20px", alignItems: "center"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Roles"), i18next.t("general:Roles - Tooltip"))} :
          </Col>
          <Col span={22} >
            {
              this.renderAccountItemTags(roleNames, "role")
            }
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Permissions") {
      const permissionNames = (this.state.user.permissions ?? []).map(permission => permission.name).filter(Boolean);
      if (permissionNames.length === 0) {
        return null;
      }

      return (
        <Row style={{marginTop: "20px", alignItems: "center"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Permissions"), i18next.t("general:Permissions - Tooltip"))} :
          </Col>
          <Col span={22} >
            {
              this.renderAccountItemTags(permissionNames, "permission")
            }
          </Col>
        </Row>
      );
    } else if (accountItem.name === "3rd-party logins") {
      return (
        !this.isSelfOrAdmin() ? null : (
          this.renderAccountItemContentSection(
            i18next.t("user:3rd-party logins"),
            i18next.t("user:3rd-party logins - Tooltip"),
            (
              <div className="user-edit-third-party-login-list">
                {this.renderThirdPartyLoginItems()}
              </div>
            ),
            "user-edit-third-party-section",
            false
          )
        )
      );
    } else if (accountItem.name === "Properties") {
      return this.renderAccountItemTableSection(
        <PropertyTable
          title={this.renderAccountItemLabel(i18next.t("user:Properties"), i18next.t("user:Properties - Tooltip"))}
          properties={this.state.user.properties}
          onUpdateTable={(value: unknown) => {this.updateUserField("properties", value);}}
        />
      );
    } else if (accountItem.name === "Is admin") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Is admin"), i18next.t("user:Is admin - Tooltip"))} :
          </Col>
          <Col span={(Setting.isMobile()) ? 22 : 2} >
            <Switch disabled={disabled} checked={this.state.user.isAdmin} onChange={checked => {
              this.updateUserField("isAdmin", checked);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Is forbidden") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Is forbidden"), i18next.t("user:Is forbidden - Tooltip"))} :
          </Col>
          <Col span={(Setting.isMobile()) ? 22 : 2} >
            <Switch checked={this.state.user.isForbidden} onChange={checked => {
              this.updateUserField("isForbidden", checked);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Is deleted") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Is deleted"), i18next.t("user:Is deleted - Tooltip"))} :
          </Col>
          <Col span={(Setting.isMobile()) ? 22 : 2} >
            <Switch checked={this.state.user.isDeleted} onChange={checked => {
              this.updateUserField("isDeleted", checked);
              this.updateUserField("deletedTime", checked ? moment().format() : "");
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "MFA items") {
      return this.renderAccountItemTableSection(
        <MfaTable
          title={i18next.t("general:MFA items")}
          table={this.state.user.mfaItems ?? []}
          embedded
          onUpdateTable={(value: unknown) => {this.updateUserField("mfaItems", value);}}
        />
      );
    } else if (accountItem.name === "Consents") {
      return this.renderAccountItemTableSection(
        <ConsentTable
          title={null}
          table={this.state.consents}
          embedded
          onUpdateTable={() => this.getUser()}
        />
      );
    } else if (accountItem.name === "Multi-factor authentication") {
      return (
        !this.isSelfOrAdmin() ? null : (
          this.renderAccountItemContentSection(
            i18next.t("mfa:Multi-factor authentication"),
            i18next.t("mfa:Multi-factor authentication - Tooltip "),
            (
              <div className="user-edit-mfa-methods-panel">
                <div className="user-edit-table-toolbar">
                  <span className="user-edit-table-title">{i18next.t("mfa:Multi-factor methods")}</span>
                  <div className="user-edit-table-toolbar-actions">
                    {this.state.multiFactorAuths?.some(mfaProps => mfaProps.enabled) ?
                      <PopconfirmModal
                        text={i18next.t("general:Disable")}
                        title={i18next.t("general:Sure to disable") + "?"}
                        onConfirm={() => this.deleteMfa()}
                        size="small"
                      /> : null
                    }
                  </div>
                </div>
                <List
                  className="user-edit-mfa-methods-list"
                  size="small"
                  rowKey="mfaType"
                  itemLayout="horizontal"
                  dataSource={this.state.multiFactorAuths}
                  renderItem={(item) => {
                    const canAdminEnableMfa = item.mfaType !== TotpMfaType && Setting.isLocalAdminUser(this.props.account) && !this.isSelf();
                    const requiresSelfSetup = item.mfaType === TotpMfaType && Setting.isLocalAdminUser(this.props.account) && !this.isSelf();

                    return (
                      <List.Item>
                        <Space className="user-edit-mfa-method-info">
                          <span>{i18next.t("general:Type")}:</span>
                          <span className="user-edit-mfa-method-name">{this.getMfaMethodLabel(item.mfaType)}</span>
                          <span className="user-edit-mfa-method-code">{item.mfaType}</span>
                          {item.secret ? <span className="user-edit-mfa-method-secret">{item.secret}</span> : null}
                        </Space>
                        {item.enabled ? (
                          <Space>
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              {i18next.t("general:Enabled")}
                            </Tag>
                            {item.isPreferred ?
                              <Tag icon={<CheckCircleOutlined />} color="blue" style={{marginRight: 20}} >
                                {i18next.t("mfa:preferred")}
                              </Tag> :
                              <Button type="primary" style={{marginRight: 20}} onClick={() => {
                                const values = {
                                  owner: this.state.user.owner,
                                  name: this.state.user.name,
                                  mfaType: item.mfaType,
                                };
                                MfaBackend.SetPreferredMfa(values).then((res) => {
                                  if (res.status === "ok") {
                                    this.setState({
                                      multiFactorAuths: res.data,
                                    });
                                  }
                                });
                              }}>
                                {i18next.t("mfa:Set preferred")}
                              </Button>
                            }
                            {this.isSelf() ? <Button type={"default"} onClick={() => {
                              this.props.history.push(`/mfa/setup?mfaType=${item.mfaType}`);
                            }}>
                              {i18next.t("general:Edit")}
                            </Button> : null}
                          </Space>
                        ) :
                          <Space>
                            {canAdminEnableMfa ?
                              <EnableMfaModal user={this.state.user} mfaType={item.mfaType} onSuccess={() => {
                                this.getUser();
                              }} /> : null}
                            {this.isSelf() ? <Button type={"default"} onClick={() => {
                              this.props.history.push(`/mfa/setup?mfaType=${item.mfaType}`);
                            }}>
                              {i18next.t("mfa:Setup")}
                            </Button> : null}
                            {requiresSelfSetup ? <Tag>{i18next.t("mfa:User setup required")}</Tag> : null}
                          </Space>}
                      </List.Item>
                    );
                  }}
                />
              </div>
            ),
            "user-edit-mfa-methods-section",
            false
          )
        )
      );
    } else if (accountItem.name === "WebAuthn credentials") {
      return this.renderAccountItemTableSection(
        <WebAuthnCredentialTable
          title={this.renderAccountItemLabel(i18next.t("user:WebAuthn credentials"), i18next.t("user:WebAuthn credentials - Tooltip"))}
          isSelf={this.isSelf()}
          table={this.state.user.webauthnCredentials}
          embedded
          updateTable={(table: unknown) => {this.updateUserField("webauthnCredentials", table);}}
          refresh={this.getUser.bind(this)}
        />
      );
    } else if (accountItem.name === "Last change password time") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {this.renderAccountItemLabel(i18next.t("user:Last change password time"), i18next.t("user:Last change password time - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={this.state.user.lastChangePasswordTime} onChange={e => {
              this.updateUserField("lastChangePasswordTime", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Managed accounts") {
      return this.renderAccountItemTableSection(
        <ManagedAccountTable
          title={this.renderAccountItemLabel(i18next.t("user:Managed accounts"), i18next.t("user:Managed accounts - Tooltip"))}
          table={this.state.user.managedAccounts}
          embedded
          onUpdateTable={(table: unknown) => {this.updateUserField("managedAccounts", table);}}
          applications={this.state.applications}
        />
      );
    } else if (accountItem.name === "Face ID") {
      return this.renderAccountItemTableSection(
        <FaceIdTable
          title={this.renderAccountItemLabel(i18next.t("user:Face IDs"), i18next.t("user:Face IDs - Tooltip"))}
          table={this.state.user.faceIds}
          embedded
          {...this.props}
          onUpdateTable={(table: unknown) => {this.updateUserField("faceIds", table);}}
        />
      );
    } else if (accountItem.name === "MFA accounts") {
      return this.renderAccountItemTableSection(
        <MfaAccountTable
          title={this.renderAccountItemLabel(i18next.t("user:MFA accounts"), i18next.t("user:MFA accounts - Tooltip"))}
          table={this.state.user.mfaAccounts}
          accessToken={this.props.account?.accessToken}
          icon={this.state.user.avatar}
          embedded
          onUpdateTable={(table: unknown) => {this.updateUserField("mfaAccounts", table);}}
        />
      );
    } else if (accountItem.name === "Need update password") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("user:Need update password"), i18next.t("user:Need update password - Tooltip"))} :
          </Col>
          <Col span={(Setting.isMobile()) ? 22 : 2} >
            <Switch disabled={(!this.state.user.phone) && (!this.state.user.email) && (!this.state.user.mfaProps)} checked={this.state.user.needUpdatePassword} onChange={checked => {
              this.updateUserField("needUpdatePassword", checked);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "IP whitelist") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:IP whitelist"), i18next.t("general:IP whitelist - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={this.state.user.ipWhitelist} onChange={e => {
              this.updateUserField("ipWhitelist", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "First name") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:First name"), i18next.t("general:First name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={this.state.user.firstName} onChange={e => {
              this.updateUserField("firstName", e.target.value);
            }} />
          </Col>
        </Row>
      );
    } else if (accountItem.name === "Last name") {
      return (
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Last name"), i18next.t("general:Last name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={this.state.user.lastName} onChange={e => {
              this.updateUserField("lastName", e.target.value);
            }} />
          </Col>
        </Row>
      );
    }
  }

  renderImage(imgUrl: string | undefined, title: string, set: string, tag: string, disabled: boolean) {
    return (
      <Col span={4} style={{textAlign: "center", margin: "auto", marginLeft: "20px"}} key={tag}>
        {
          imgUrl ?
            <div style={{marginBottom: "10px"}}>
              <a target="_blank" rel="noreferrer" href={imgUrl} style={{marginBottom: "10px"}}>
                <AccountAvatar src={imgUrl} alt={imgUrl} height={150} />
              </a>
            </div>
            :
            <Col style={{height: "78%", border: "1px dotted grey", borderRadius: 3, marginBottom: "10px"}}>
              <div style={{fontSize: 30, margin: 10}}>+</div>
              <div style={{verticalAlign: "middle", marginBottom: 10}}>{`(${i18next.t("general:empty")})`}</div>
            </Col>
        }
        {
          (this.props.account === null) ? null : (
            <CropperDivModal disabled={disabled} tag={tag} setTitle={set} buttonText={`${title}...`} title={title} user={this.state.user} organization={this.getUserOrganization()} application={this.state.application} />
          )
        }
      </Col>
    );
  }

  isAccountItemVisible(item: AccountItemRecord) {
    if (!item.visible) {
      return false;
    }

    const isAdmin = Setting.isLocalAdminUser(this.props.account);
    if (item.viewRule === "Self") {
      if (!this.isSelfOrAdmin()) {
        return false;
      }
    } else if (item.viewRule === "Admin") {
      if (!isAdmin) {
        return false;
      }
    }

    return true;
  }

  getUserEditTabDefinitions(): UserEditTabItem[] {
    return [
      {
        key: "basic",
        label: i18next.t("user:Basic"),
        accountItemNames: [
          "Organization", "ID", "Name", "Display name", "Avatar", "User type", "Email", "Phone",
          "Country/Region", "Location", "Address", "Addresses", "Affiliation", "Title", "Homepage",
          "Bio", "Tag", "Language", "Gender", "Birthday", "Education", "First name", "Last name",
          "Properties",
        ],
      },
      {
        key: "identity",
        label: i18next.t("user:Identity"),
        accountItemNames: [
          "ID card type", "ID card", "ID card info", "Real name", "ID verification",
          "Signup application", "Register type", "Register source",
        ],
      },
      {
        key: "access",
        label: i18next.t("user:Authorization"),
        accountItemNames: [
          "Groups", "Roles", "Permissions", "Is admin", "Is forbidden", "Is deleted",
          "Need update password", "IP whitelist",
        ],
      },
      {
        key: "security",
        label: i18next.t("user:Security"),
        accountItemNames: [
          "Password", "MFA items", "Multi-factor authentication", "WebAuthn credentials",
          "Last change password time", "Managed accounts", "Face ID", "MFA accounts",
        ],
      },
      {
        key: "connections",
        label: i18next.t("user:3rd-party logins"),
        accountItemNames: ["3rd-party logins"],
      },
      {
        key: "records",
        label: i18next.t("user:Records"),
        accountItemNames: [
          "Balance", "Balance credit", "Balance currency", "Cart", "Transactions",
          "Score", "Karma", "Ranking", "Consents",
        ],
      },
    ];
  }

  getUserEditSectionDefinitions(tabKey: UserEditTabKey): UserEditSectionItem[] {
    const sectionDefinitions: Record<UserEditTabKey, UserEditSectionItem[]> = {
      basic: [
        {
          key: "basic-information",
          title: i18next.t("user:Basic information"),
          accountItemNames: ["Organization", "ID", "Name", "Display name", "First name", "Last name", "Avatar", "User type"],
        },
        {
          key: "contact-information",
          title: i18next.t("user:Contact information"),
          accountItemNames: ["Email", "Phone", "Country/Region", "Location", "Address", "Addresses"],
        },
        {
          key: "profile-information",
          title: i18next.t("user:Profile information"),
          accountItemNames: ["Affiliation", "Title", "Homepage", "Bio", "Tag", "Language", "Gender", "Birthday", "Education"],
        },
        {
          key: "extended-properties",
          title: i18next.t("user:Extended properties"),
          accountItemNames: ["Properties"],
        },
      ],
      identity: [
        {
          key: "identity-document",
          title: i18next.t("user:Identity document"),
          accountItemNames: ["ID card type", "ID card", "ID card info", "Real name", "ID verification"],
        },
        {
          key: "registration-information",
          title: i18next.t("user:Registration information"),
          accountItemNames: ["Signup application", "Register type", "Register source"],
        },
      ],
      access: [
        {
          key: "access-assignments",
          title: i18next.t("user:Access assignments"),
          accountItemNames: ["Groups", "Roles", "Permissions"],
        },
        {
          key: "account-state",
          title: i18next.t("user:Account state"),
          accountItemNames: ["Is admin", "Is forbidden", "Is deleted", "Need update password", "IP whitelist"],
        },
      ],
      security: [
        {
          key: "password-authentication",
          title: i18next.t("user:Password and authentication"),
          accountItemNames: ["Password", "Last change password time"],
        },
        {
          key: "mfa-settings",
          title: i18next.t("user:MFA settings"),
          accountItemNames: ["Multi-factor authentication", "MFA items"],
        },
        {
          key: "security-credentials",
          title: i18next.t("user:Security credentials"),
          accountItemNames: ["WebAuthn credentials", "Face ID"],
        },
        {
          key: "linked-accounts",
          title: i18next.t("user:Linked accounts"),
          accountItemNames: ["Managed accounts", "MFA accounts"],
        },
      ],
      connections: [
        {
          key: "linked-login-providers",
          title: i18next.t("user:Linked login providers"),
          accountItemNames: ["3rd-party logins"],
        },
      ],
      records: [
        {
          key: "balance-score",
          title: i18next.t("user:Balance and score"),
          accountItemNames: ["Balance", "Balance credit", "Balance currency", "Score", "Karma", "Ranking"],
        },
        {
          key: "payment-records",
          title: i18next.t("user:Payment records"),
          accountItemNames: ["Cart", "Transactions"],
        },
        {
          key: "consent-records",
          title: i18next.t("user:Consent records"),
          accountItemNames: ["Consents"],
        },
      ],
    };

    return sectionDefinitions[tabKey];
  }

  isKnownTabKey(key: unknown): key is UserEditTabKey {
    return ["basic", "identity", "access", "security", "connections", "records"].includes(`${key}`);
  }

  getInitialTabKey(): UserEditTabKey {
    const hashKey = window.location.hash?.slice(1);
    return this.isKnownTabKey(hashKey) ? hashKey : "basic";
  }

  getUserEditTabKeyForAccountItem(accountItem: AccountItemRecord): UserEditTabKey {
    const itemName = accountItem.name ?? "";
    return this.getUserEditTabDefinitions().find(tab => tab.accountItemNames.includes(itemName))?.key ?? "basic";
  }

  getAccountItemsByUserEditTab(tabKey: UserEditTabKey): AccountItemRecord[] {
    const accountItems = this.getUserOrganization()?.accountItems || [];
    return accountItems.filter(item => this.isAccountItemVisible(item) && this.getUserEditTabKeyForAccountItem(item) === tabKey);
  }

  getAvailableTabs(): UserEditTabItem[] {
    const tabs = this.getUserEditTabDefinitions().filter(tab => this.getAccountItemsByUserEditTab(tab.key).length > 0);
    return tabs.length > 0 ? tabs : [this.getUserEditTabDefinitions()[0]];
  }

  getActiveTabKey(): UserEditTabKey {
    const availableTabs = this.getAvailableTabs();
    const availableKeys = availableTabs.map(tab => tab.key);
    return availableKeys.includes(this.state.activeTabKey) ? this.state.activeTabKey : availableTabs[0]?.key ?? "basic";
  }

  setActiveTabKey(key: string) {
    const nextKey = this.isKnownTabKey(key) ? key : "basic";
    this.setState({activeTabKey: nextKey});
    window.location.hash = nextKey;
  }

  renderEditTabs(): React.ReactNode {
    const tabs = this.getAvailableTabs();
    if (tabs.length <= 1) {
      return null;
    }

    return (
      <Tabs
        className="user-edit-tabs"
        activeKey={this.getActiveTabKey()}
        onChange={(key) => this.setActiveTabKey(key)}
        items={tabs.map(tab => ({
          label: tab.label,
          key: tab.key,
        }))}
      />
    );
  }

  getAccountItemFormItemClassName(accountItem: AccountItemRecord): string {
    const itemName = accountItem.name ?? "unknown";
    const itemSlug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
    const wideItemNames = new Set([
      "Avatar", "Address", "Addresses", "ID card info", "Email", "Phone", "Groups", "Roles", "Permissions", "3rd-party logins",
      "Properties", "MFA items", "Multi-factor authentication", "WebAuthn credentials", "Managed accounts",
      "Face ID", "MFA accounts", "Cart", "Transactions", "Consents",
    ]);
    const tableItemNames = new Set([
      "Addresses", "Properties", "MFA items", "WebAuthn credentials", "Managed accounts",
      "Face ID", "MFA accounts", "Cart", "Transactions", "Consents",
    ]);

    return [
      "user-edit-form-item",
      `user-edit-form-item-${itemSlug}`,
      wideItemNames.has(itemName) ? "user-edit-form-item-wide" : "user-edit-form-item-compact",
      tableItemNames.has(itemName) ? "user-edit-form-item-table-section" : "",
    ].filter(Boolean).join(" ");
  }

  renderAccountItemFormItems(tabKey: UserEditTabKey): React.ReactNode {
    const accountItems = this.getAccountItemsByUserEditTab(tabKey);
    const sectionDefinitions = this.getUserEditSectionDefinitions(tabKey);
    const assignedItemNames = new Set(sectionDefinitions.flatMap(section => section.accountItemNames));
    const sections = [
      ...sectionDefinitions.map(section => ({
        ...section,
        accountItems: accountItems.filter(accountItem => section.accountItemNames.includes(accountItem.name ?? "")),
      })),
      {
        key: "other",
        title: i18next.t("user:Other information"),
        accountItemNames: [],
        accountItems: accountItems.filter(accountItem => !assignedItemNames.has(accountItem.name ?? "")),
      },
    ].filter(section => section.accountItems.length > 0);

    const renderItems = (items: AccountItemRecord[]) => items.map(accountItem => {
      const content = this.renderAccountItem(accountItem);
      if (content === null || content === undefined || content === false) {
        return null;
      }

      return (
        <React.Fragment key={accountItem.name}>
          <Form.Item name={accountItem.name}
            className={this.getAccountItemFormItemClassName(accountItem)}
            validateTrigger="onChange"
            rules={[
              {
                pattern: accountItem.regex ? new RegExp(accountItem.regex, "g") : undefined,
                message: i18next.t("user:This field value doesn't match the pattern rule"),
              },
            ]}
            style={{margin: 0}}>
            {content}
          </Form.Item>
        </React.Fragment>
      );
    }).filter((item): item is React.ReactElement => item !== null);

    return sections.map(section => {
      const renderedItems = renderItems(section.accountItems);
      if (renderedItems.length === 0) {
        return null;
      }

      return (
        <section className={["user-edit-section", `user-edit-section-${section.key}`].join(" ")} key={section.key}>
          {this.renderUserEditSectionTitle(section.title)}
          <div className="user-edit-section-body">
            {renderedItems}
          </div>
        </section>
      );
    });
  }

  renderUserForm() {
    return (
      <Form className="user-edit-form">
        {this.renderAccountItemFormItems(this.getActiveTabKey())}
      </Form>
    );
  }

  getUserListReturnPath(): string {
    const userListUrl = sessionStorage.getItem("userListUrl");
    if (userListUrl !== null) {
      return userListUrl;
    }

    if (Setting.isLocalAdminUser(this.props.account)) {
      return "/users";
    }

    return "/";
  }

  returnToUserList() {
    if (this.state.returnUrl) {
      window.location.href = this.state.returnUrl;
      return;
    }

    this.props.history.push(this.getUserListReturnPath());
  }

  confirmDiscardChanges(onConfirm: () => void) {
    if (!this.state.dirty) {
      onConfirm();
      return;
    }

    Modal.confirm({
      title: i18next.t("user:Discard unsaved changes confirmation"),
      okText: i18next.t("general:OK"),
      cancelText: i18next.t("general:Cancel"),
      onOk: onConfirm,
    });
  }

  handleBack() {
    this.confirmDiscardChanges(() => {
      this.returnToUserList();
    });
  }

  handleCancel() {
    this.confirmDiscardChanges(() => {
      this.returnToUserList();
    });
  }

  getUserEditTitle(): string {
    if (this.state.mode === "add") {
      return i18next.t("user:New User");
    }

    const title = this.state.user?.displayName || this.state.user?.name || this.state.userName;
    const actionTitle = this.isSelf() ? i18next.t("account:My Account") : i18next.t("user:Edit User");
    return `${actionTitle} (${title})`;
  }

  renderEditFooter(): React.ReactNode {
    const contextUnavailable = this.state.organizationContextStatus !== "ready" || this.state.postCreateReloadStatus !== "idle";
    return (
      <React.Fragment>
        <Button disabled={this.state.submitting} onClick={() => this.handleCancel()}>{i18next.t("general:Cancel")}</Button>
        <Button type="primary" disabled={this.state.submitting || contextUnavailable} loading={this.state.submitting} onClick={() => this.submitUserEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button disabled={this.state.submitting || contextUnavailable} onClick={() => this.submitUserEdit(true)}>{i18next.t("user:Save and return")}</Button>
      </React.Fragment>
    );
  }

  renderUser() {
    return (
      <div className="user-edit-card-wrap">
        <Card
          className="admin-large-edit-card user-edit-card"
          size="small"
          variant="borderless"
          style={(Setting.isMobile()) ? {margin: "5px"} : {}}
          styles={{body: {height: "100%", padding: 0}}}
          type="inner"
        >
          <LargeEditShell
            classPrefix="user-edit"
            backLabel={i18next.t("general:Back")}
            breadcrumb={<React.Fragment>{i18next.t("general:Organization & Accounts")} / {i18next.t("general:Users")} /</React.Fragment>}
            title={this.getUserEditTitle()}
            dirty={this.state.dirty}
            dirtyLabel={i18next.t("user:Unsaved changes")}
            extra={this.renderWeComProfileSyncPanel()}
            tabs={this.renderEditTabs()}
            actions={this.props.account === null ? null : this.renderEditFooter()}
            onBack={() => this.handleBack()}
          >
            {this.renderUserForm()}
          </LargeEditShell>
        </Card>
      </div>
    );
  }

  getIdCardType(key: string) {
    if (key === "ID card front") {
      return i18next.t("user:ID card front");
    } else if (key === "ID card back") {
      return i18next.t("user:ID card back");
    } else if (key === "ID card with person") {
      return i18next.t("user:ID card with person");
    } else {
      return "Unknown Id card name: " + key;
    }
  }

  getIdCardText(key: string) {
    if (key === "ID card front") {
      return i18next.t("user:Upload ID card front picture");
    } else if (key === "ID card back") {
      return i18next.t("user:Upload ID card back picture");
    } else if (key === "ID card with person") {
      return i18next.t("user:Upload ID card with person picture");
    } else {
      return "Unknown Id card name: " + key;
    }
  }

  submitUserEdit(exitAfterSave: boolean) {
    if (this.state.submitting || this.state.organizationContextStatus !== "ready" || this.state.postCreateReloadStatus !== "idle") {
      return;
    }

    const user = Setting.deepCopy(this.state.user);
    this.setState({submitting: true});
    const saveUser = this.state.mode === "add"
      ? UserBackend.addUser(user)
      : UserBackend.updateUser(this.state.organizationName, this.state.userName, user);
    saveUser
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          const wasAdding = this.state.mode === "add";
          this.setState({
            organizationName: user.owner,
            userName: user.name,
            mode: "edit",
            dirty: false,
            submitting: false,
            postCreateReloadStatus: wasAdding && !exitAfterSave ? "loading" : "idle",
          }, () => {
            if (wasAdding && !exitAfterSave) {
              // 两次读取相互独立，均完成前保存保持 fail-closed。
              this.reloadPersistedUserAfterCreate(user.owner, user.name);
              this.loadOrganizationContext(user.owner, true);
            }
          });
          if (exitAfterSave) {
            this.returnToUserList();
          } else {
            if (location.pathname !== "/account") {
              this.props.history.push(`/users/${user.owner}/${user.name}`);
            }
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          if (this.state.mode === "add") {
            this.setState({submitting: false});
          } else {
            this.setState(state => ({
              user: {
                ...state.user,
                owner: state.organizationName,
                name: state.userName,
              },
              submitting: false,
            }));
          }
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteUser() {
    if (this.state.submitting) {
      return;
    }

    this.setState({submitting: true});
    UserBackend.deleteUser(this.state.user)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({dirty: false, submitting: false});
          this.returnToUserList();
        } else {
          this.setState({submitting: false});
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({submitting: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div className="admin-large-edit-page user-edit-page">
        {
          this.state.loading ? <Spin size="large" style={{marginLeft: "50%", marginTop: "10%"}} /> : (
            this.state.user !== null ? this.renderUser() :
              <Result
                status="404"
                title="404 NOT FOUND"
                subTitle={i18next.t("general:Sorry, the user you visited does not exist or you are not authorized to access this user.")}
                extra={<a href="/"><Button type="primary">{i18next.t("general:Back Home")}</Button></a>}
              />
          )
        }
      </div>
    );
  }
}

export default withRouter(UserEditPage);
