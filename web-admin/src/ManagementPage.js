// Copyright 2024 The Casdoor Authors. All Rights Reserved.
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

import * as Setting from "./Setting";
import {Avatar, Button, Card, Drawer, Dropdown, Layout, Menu, Result, Tooltip} from "antd";
import EnableMfaNotification from "./common/notifaction/EnableMfaNotification";
import {Link, Redirect, Route, Switch, withRouter} from "react-router-dom";
import React, {useEffect, useState} from "react";
import i18next from "i18next";
import {
  BarsOutlined, DeploymentUnitOutlined, DownOutlined,
  LogoutOutlined,
  SafetyCertificateTwoTone, SettingOutlined
} from "@ant-design/icons";
import IdentityConsoleOverview from "./IdentityConsoleOverview";
import AppListPage from "./basic/AppListPage";
import ShortcutsPage from "./basic/ShortcutsPage.tsx";
import AccountPage from "./account/AccountPage";
import OrganizationListPage from "./OrganizationListPage";
import OrganizationEditPage from "./OrganizationEditPage";
import UserListPage from "./UserListPage";
import GroupTreePage from "./GroupTreePage";
import GroupListPage from "./GroupListPage";
import GroupEditPage from "./GroupEditPage";
import UserEditPage from "./UserEditPage";
import InvitationListPage from "./InvitationListPage";
import InvitationEditPage from "./InvitationEditPage";
import ApplicationListPage from "./ApplicationListPage";
import ApplicationEditPage from "./ApplicationEditPage";
import ProviderListPage from "./ProviderListPage";
import ProviderEditPage from "./ProviderEditPage";
import RecordListPage from "./RecordListPage";
import ResourceListPage from "./ResourceListPage";
import CertListPage from "./CertListPage";
import CertEditPage from "./CertEditPage";
import KeyListPage from "./KeyListPage";
import KeyEditPage from "./KeyEditPage";
import RoleListPage from "./RoleListPage";
import RoleEditPage from "./RoleEditPage";
import PermissionListPage from "./PermissionListPage";
import PermissionEditPage from "./PermissionEditPage";
import ModelListPage from "./ModelListPage";
import ModelEditPage from "./ModelEditPage";
import AdapterListPage from "./AdapterListPage";
import AdapterEditPage from "./AdapterEditPage";
import EnforcerListPage from "./EnforcerListPage";
import EnforcerEditPage from "./EnforcerEditPage";
import SessionListPage from "./SessionListPage";
import TokenListPage from "./TokenListPage";
import TokenEditPage from "./TokenEditPage";
import ProductListPage from "./ProductListPage";
import ProductStorePage from "./ProductStorePage";
import ProductEditPage from "./ProductEditPage";
import ProductBuyPage from "./ProductBuyPage";
import CartListPage from "./CartListPage";
import OrderListPage from "./OrderListPage";
import OrderEditPage from "./OrderEditPage";
import OrderPayPage from "./OrderPayPage";
import PaymentListPage from "./PaymentListPage";
import PaymentEditPage from "./PaymentEditPage";
import PaymentResultPage from "./PaymentResultPage";
import PlanListPage from "./PlanListPage";
import PlanEditPage from "./PlanEditPage";
import PricingListPage from "./PricingListPage";
import PricingEditPage from "./PricingEditPage";
import SubscriptionListPage from "./SubscriptionListPage";
import SubscriptionEditPage from "./SubscriptionEditPage";
import SystemInfo from "./SystemInfo";
import FormListPage from "./FormListPage";
import FormEditPage from "./FormEditPage";
import SyncerListPage from "./SyncerListPage";
import SyncerEditPage from "./SyncerEditPage";
import WecomOrganizationSyncPage from "./WecomOrganizationSyncPage";
import FeishuOrganizationSyncPage from "./FeishuOrganizationSyncPage";
import OrganizationTreeOperationsPage from "./OrganizationTreeOperationsPage";
import OrganizationDirectoryQualityPage from "./OrganizationDirectoryQualityPage";
import PlatformApiMappingPage from "./PlatformApiMappingPage";
import WebhookListPage from "./WebhookListPage";
import WebhookEventListPage from "./WebhookEventListPage";
import WebhookEditPage from "./WebhookEditPage";
import LdapEditPage from "./LdapEditPage";
import LdapSyncPage from "./LdapSyncPage";
import MfaSetupPage from "./auth/MfaSetupPage";
import OdicDiscoveryPage from "./auth/OidcDiscoveryPage";
import * as Conf from "./Conf";
import LanguageSelect from "./common/select/LanguageSelect";
import ThemeSelect from "./common/select/ThemeSelect";
import OpenTour from "./common/OpenTour";
import OrganizationSelect from "./common/select/OrganizationSelect";
import AccountAvatar from "./account/AccountAvatar";
import * as AuthBackend from "./auth/AuthBackend";
import {clearWeb3AuthToken} from "./auth/Web3Auth";
import TransactionListPage from "./TransactionListPage";
import TransactionEditPage from "./TransactionEditPage";
import VerificationListPage from "./VerificationListPage";
import TicketListPage from "./TicketListPage";
import TicketEditPage from "./TicketEditPage";
import * as Cookie from "cookie";
import * as UserBackend from "./backend/UserBackend";
import AgentListPage from "./AgentListPage";
import AgentEditPage from "./AgentEditPage";
import ServerListPage from "./ServerListPage";
import ServerStorePage from "./ServerStorePage";
import ServerEditPage from "./ServerEditPage";
import EntryListPage from "./EntryListPage";
import EntryEditPage from "./EntryEditPage";
import SiteListPage from "./SiteListPage";
import SiteEditPage from "./SiteEditPage";
import RuleListPage from "./RuleListPage";
import RuleEditPage from "./RuleEditPage";
import {getAdminLoginRedirectPath} from "./adminLoginRouting";
import {buildEnterpriseNavigationGroups, findNavigationSelection} from "./enterpriseNavigation";
import GovernanceTaskCenter from "./GovernanceTaskCenter";

const {Content, Header, Sider} = Layout;

function ManagementPage(props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);
  const organization = props.account?.organization;
  const widgetItems = organization?.widgetItems;

  function logout() {
    AuthBackend.logout()
      .then((res) => {
        if (res.status === "ok") {
          const owner = props.account.owner;
          props.setLogoutState();
          clearWeb3AuthToken();
          Setting.showMessage("success", i18next.t("application:Logged out successfully"));
          const redirectUri = res.data2;
          if (redirectUri !== null && redirectUri !== undefined && redirectUri !== "") {
            Setting.goToLink(redirectUri);
          } else if (owner !== "built-in") {
            Setting.goToLink(`${window.location.origin}/login/${owner}`);
          } else {
            Setting.goToLinkSoft({props}, "/");
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to log out")}: ${res.msg}`);
        }
      });
  }

  function renderAvatar() {
    if (props.account.avatar === "") {
      return (
        <Avatar style={{backgroundColor: Setting.getAvatarColor(props.account.name), verticalAlign: "middle"}} size="large">
          {Setting.getShortName(props.account.name)}
        </Avatar>
      );
    } else {
      return (
        <Avatar src={props.account.avatar} style={{verticalAlign: "middle"}} size="large"
          icon={<AccountAvatar src={props.account.avatar} style={{verticalAlign: "middle"}} size={40} />}
        >
          {Setting.getShortName(props.account.name)}
        </Avatar>
      );
    }
  }

  function renderRightDropdown() {
    const items = [];
    if (props.requiredEnableMfa === false) {
      items.push(Setting.getItem(<><SettingOutlined />&nbsp;&nbsp;{i18next.t("account:My Account")}</>,
        "/account"
      ));
    }
    const curCookie = Cookie.parse(document.cookie);
    if (curCookie["impersonateUser"]) {
      items.push(Setting.getItem(<><LogoutOutlined />&nbsp;&nbsp;{i18next.t("account:Exit impersonation")}</>,
        "/exit-impersonation"));
    } else {
      items.push(Setting.getItem(<><LogoutOutlined />&nbsp;&nbsp;{i18next.t("account:Logout")}</>,
        "/logout"));
    }

    const onClick = (e) => {
      if (e.key === "/account") {
        props.history.push("/account");
      } else if (e.key === "/subscription") {
        props.history.push("/subscription");
      } else if (e.key === "/logout") {
        logout();
      } else if (e.key === "/exit-impersonation") {
        UserBackend.exitImpersonateUser().then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("account:Exit impersonation"));
            Setting.goToLinkSoft({props}, "/");
            window.location.reload();
          } else {
            Setting.showMessage("error", res.msg);
          }
        });
      }
    };

    return (
      <Dropdown key="/rightDropDown" menu={{items, onClick}} placement="bottomRight" >
        <div className="rightDropDown">
          {
            renderAvatar()
          }
          &nbsp;
          &nbsp;
          {Setting.isMobile() ? null : Setting.getShortText(Setting.getNameAtLeast(props.account.displayName), 30)} &nbsp; <DownOutlined />
          &nbsp;
          &nbsp;
          &nbsp;
        </div>
      </Dropdown>
    );
  }

  function widgetItemsIsAll() {
    return !Array.isArray(widgetItems) || !!widgetItems?.includes("all");
  }

  function renderWidgets() {
    const widgets = [
      Setting.getItem(<ThemeSelect themeAlgorithm={props.themeAlgorithm} onChange={props.setLogoAndThemeAlgorithm} />, "theme"),
      Setting.getItem(<LanguageSelect languages={props.account.organization.languages} />, "language"),
      Setting.getItem(Conf.AiAssistantUrl?.trim() && (
        <Tooltip title="Click to open AI assistant">
          <div className="select-box" onClick={props.openAiAssistant}>
            <DeploymentUnitOutlined style={{fontSize: "24px"}} />
          </div>
        </Tooltip>
      ), "ai-assistant"),
      Setting.getItem(<OpenTour />, "tour"),
    ];

    if (widgetItemsIsAll()) {
      return widgets.map(item => <React.Fragment key={item.key}>{item.label}</React.Fragment>);
    }

    return widgets
      .filter(item => widgetItems.includes(item.key))
      .map(item => <React.Fragment key={item.key}>{item.label}</React.Fragment>);
  }

  function renderAccountMenu() {
    if (props.account === undefined) {
      return null;
    } else if (props.account === null) {
      return (
        <React.Fragment>
          <LanguageSelect />
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {renderRightDropdown()}
          {renderWidgets()}
          {Setting.isAdminUser(props.account) && (props.uri.indexOf("/trees") === -1) &&
            <OrganizationSelect
              initValue={Setting.getOrganization()}
              withAll={true}
              className="org-select"
              style={{display: Setting.isMobile() ? "none" : "flex"}}
              onChange={(value) => {
                Setting.setOrganization(value);
              }}
            />
          }
        </React.Fragment>
      );
    }
  }

  function getBrandLogo() {
    if (!props.account?.organization) {
      return props.logo || Conf.BrandIcon;
    }

    if (props.themeAlgorithm.includes("dark") && props.account.organization.logoDark) {
      return Setting.getPreferredBrandAsset(props.account.organization.logoDark, Conf.BrandIcon);
    }

    return Setting.getPreferredBrandAsset(props.account.organization.logo, Conf.BrandIcon);
  }

  function getNavigationGroups() {
    return buildEnterpriseNavigationGroups({
      account: props.account,
      themeData: props.themeData,
    });
  }

  function getSidebarMenuItems(groups) {
    return groups.map((group) => Setting.getItem(group.label, group.key, group.icon, group.children.map((item) => {
      if (item.external) {
        return Setting.getItem(<a target="_blank" rel="noreferrer" href={item.href}>{item.label}</a>, item.key);
      }

      return Setting.getItem(<Link to={item.to}>{item.label}</Link>, item.key);
    })));
  }

  const navigationGroups = getNavigationGroups();
  const navigationSelection = findNavigationSelection(props.uri || window.location.pathname, navigationGroups);
  const sidebarMenuItems = getSidebarMenuItems(navigationGroups);

  useEffect(() => {
    if (navigationSelection.groupKey) {
      setOpenKeys([navigationSelection.groupKey]);
    }
  }, [navigationSelection.groupKey]);

  function renderLoginIfNotLoggedIn(component) {
    if (props.account === null) {
      sessionStorage.setItem("from", window.location.pathname);
      return <Redirect to={getAdminLoginRedirectPath()} />;
    } else if (props.account === undefined) {
      return null;
    } else if (props.account.needUpdatePassword) {
      if (window.location.pathname === "/account") {
        return component;
      } else {
        return <Redirect to="/account" />;
      }
    } else {
      return component;
    }
  }

  function renderRouter() {
    const account = props.account;
    const onChangeTheme = props.onChangeTheme;
    const onfinish = props.onfinish;
    return (
      <Switch>
        <Route exact path="/" render={(props) => renderLoginIfNotLoggedIn(<IdentityConsoleOverview account={account} {...props} />)} />
        <Route exact path="/governance-tasks" render={(props) => renderLoginIfNotLoggedIn(<GovernanceTaskCenter account={account} {...props} />)} />
        <Route exact path="/apps" render={(props) => renderLoginIfNotLoggedIn(<AppListPage account={account} {...props} />)} />
        <Route exact path="/shortcuts" render={(props) => renderLoginIfNotLoggedIn(<ShortcutsPage account={account} {...props} />)} />
        <Route exact path="/account" render={(routeProps) => renderLoginIfNotLoggedIn(<AccountPage account={account} onUpdateAccount={props.onUpdateAccount} {...routeProps} />)} />
        <Route exact path="/organizations" render={(props) => renderLoginIfNotLoggedIn(<OrganizationListPage account={account} {...props} />)} />
        <Route exact path="/organizations/:organizationName" render={(props) => renderLoginIfNotLoggedIn(<OrganizationEditPage account={account} onChangeTheme={onChangeTheme} {...props} />)} />
        <Route exact path="/organizations/:organizationName/users" render={(props) => renderLoginIfNotLoggedIn(<UserListPage account={account} {...props} />)} />
        <Route exact path="/trees/:organizationName" render={(props) => renderLoginIfNotLoggedIn(<GroupTreePage account={account} {...props} />)} />
        <Route exact path="/trees/:organizationName/:groupName" render={(props) => renderLoginIfNotLoggedIn(<GroupTreePage account={account} {...props} />)} />
        <Route exact path="/groups" render={(props) => renderLoginIfNotLoggedIn(<GroupListPage account={account} {...props} />)} />
        <Route exact path="/groups/:organizationName/:groupName" render={(props) => renderLoginIfNotLoggedIn(<GroupEditPage account={account} {...props} />)} />
        <Route exact path="/users" render={(props) => renderLoginIfNotLoggedIn(<UserListPage account={account} {...props} />)} />
        <Route exact path="/users/:organizationName/:userName" render={(props) => <UserEditPage account={account} {...props} />} />
        <Route exact path="/invitations" render={(props) => renderLoginIfNotLoggedIn(<InvitationListPage account={account} {...props} />)} />
        <Route exact path="/invitations/:organizationName/:invitationName" render={(props) => renderLoginIfNotLoggedIn(<InvitationEditPage account={account} {...props} />)} />
        <Route exact path="/applications" render={(props) => renderLoginIfNotLoggedIn(<ApplicationListPage account={account} {...props} />)} />
        <Route exact path="/applications/:organizationName/:applicationName" render={(props) => renderLoginIfNotLoggedIn(<ApplicationEditPage account={account} {...props} />)} />
        <Route exact path="/providers" render={(props) => renderLoginIfNotLoggedIn(<ProviderListPage account={account} {...props} />)} />
        <Route exact path="/providers/:organizationName/:providerName" render={(props) => renderLoginIfNotLoggedIn(<ProviderEditPage account={account} {...props} />)} />
        <Route exact path="/records" render={(props) => renderLoginIfNotLoggedIn(<RecordListPage account={account} {...props} />)} />
        <Route exact path="/resources" render={(props) => renderLoginIfNotLoggedIn(<ResourceListPage account={account} {...props} />)} />
        <Route exact path="/certs" render={(props) => renderLoginIfNotLoggedIn(<CertListPage account={account} {...props} />)} />
        <Route exact path="/certs/:organizationName/:certName" render={(props) => renderLoginIfNotLoggedIn(<CertEditPage account={account} {...props} />)} />
        <Route exact path="/keys" render={(props) => renderLoginIfNotLoggedIn(<KeyListPage account={account} {...props} />)} />
        <Route exact path="/keys/:organizationName/:keyName" render={(props) => renderLoginIfNotLoggedIn(<KeyEditPage account={account} {...props} />)} />
        <Route exact path="/agents" render={(props) => renderLoginIfNotLoggedIn(<AgentListPage account={account} {...props} />)} />
        <Route exact path="/agents/:organizationName/:agentName" render={(props) => renderLoginIfNotLoggedIn(<AgentEditPage account={account} {...props} />)} />
        <Route exact path="/servers" render={(props) => renderLoginIfNotLoggedIn(<ServerListPage account={account} {...props} />)} />
        <Route exact path="/server-store" render={(props) => renderLoginIfNotLoggedIn(<ServerStorePage account={account} {...props} />)} />
        <Route exact path="/servers/:organizationName/:serverName" render={(props) => renderLoginIfNotLoggedIn(<ServerEditPage account={account} {...props} />)} />
        <Route exact path="/entries" render={(props) => renderLoginIfNotLoggedIn(<EntryListPage account={account} {...props} />)} />
        <Route exact path="/entries/:organizationName/:entryName" render={(props) => renderLoginIfNotLoggedIn(<EntryEditPage account={account} {...props} />)} />
        <Route exact path="/sites" render={(props) => renderLoginIfNotLoggedIn(<SiteListPage account={account} {...props} />)} />
        <Route exact path="/sites/:organizationName/:siteName" render={(props) => renderLoginIfNotLoggedIn(<SiteEditPage account={account} {...props} />)} />
        <Route exact path="/rules" render={(props) => renderLoginIfNotLoggedIn(<RuleListPage account={account} {...props} />)} />
        <Route exact path="/rules/:organizationName/:ruleName" render={(props) => renderLoginIfNotLoggedIn(<RuleEditPage account={account} {...props} />)} />
        <Route exact path="/verifications" render={(props) => renderLoginIfNotLoggedIn(<VerificationListPage account={account} {...props} />)} />
        <Route exact path="/roles" render={(props) => renderLoginIfNotLoggedIn(<RoleListPage account={account} {...props} />)} />
        <Route exact path="/roles/:organizationName/:roleName" render={(props) => renderLoginIfNotLoggedIn(<RoleEditPage account={account} {...props} />)} />
        <Route exact path="/permissions" render={(props) => renderLoginIfNotLoggedIn(<PermissionListPage account={account} {...props} />)} />
        <Route exact path="/permissions/:organizationName/:permissionName" render={(props) => renderLoginIfNotLoggedIn(<PermissionEditPage account={account} {...props} />)} />
        <Route exact path="/models" render={(props) => renderLoginIfNotLoggedIn(<ModelListPage account={account} {...props} />)} />
        <Route exact path="/models/:organizationName/:modelName" render={(props) => renderLoginIfNotLoggedIn(<ModelEditPage account={account} {...props} />)} />
        <Route exact path="/adapters" render={(props) => renderLoginIfNotLoggedIn(<AdapterListPage account={account} {...props} />)} />
        <Route exact path="/adapters/:organizationName/:adapterName" render={(props) => renderLoginIfNotLoggedIn(<AdapterEditPage account={account} {...props} />)} />
        <Route exact path="/enforcers" render={(props) => renderLoginIfNotLoggedIn(<EnforcerListPage account={account} {...props} />)} />
        <Route exact path="/enforcers/:organizationName/:enforcerName" render={(props) => renderLoginIfNotLoggedIn(<EnforcerEditPage account={account} {...props} />)} />
        <Route exact path="/sessions" render={(props) => renderLoginIfNotLoggedIn(<SessionListPage account={account} {...props} />)} />
        <Route exact path="/tokens" render={(props) => renderLoginIfNotLoggedIn(<TokenListPage account={account} {...props} />)} />
        <Route exact path="/tokens/:tokenName" render={(props) => renderLoginIfNotLoggedIn(<TokenEditPage account={account} {...props} />)} />
        <Route exact path="/product-store" render={(props) => renderLoginIfNotLoggedIn(<ProductStorePage account={account} {...props} />)} />
        <Route exact path="/products" render={(props) => renderLoginIfNotLoggedIn(<ProductListPage account={account} {...props} />)} />
        <Route exact path="/products/:organizationName/:productName" render={(props) => renderLoginIfNotLoggedIn(<ProductEditPage account={account} {...props} />)} />
        <Route exact path="/products/:organizationName/:productName/buy" render={(props) => renderLoginIfNotLoggedIn(<ProductBuyPage account={account} {...props} />)} />
        <Route exact path="/cart" render={(props) => renderLoginIfNotLoggedIn(<CartListPage account={account} {...props} />)} />
        <Route exact path="/orders" render={(props) => renderLoginIfNotLoggedIn(<OrderListPage account={account} {...props} />)} />
        <Route exact path="/orders/:organizationName/:orderName" render={(props) => renderLoginIfNotLoggedIn(<OrderEditPage account={account} {...props} />)} />
        <Route exact path="/orders/:organizationName/:orderName/pay" render={(props) => renderLoginIfNotLoggedIn(<OrderPayPage account={account} {...props} />)} />
        <Route exact path="/payments" render={(props) => renderLoginIfNotLoggedIn(<PaymentListPage account={account} {...props} />)} />
        <Route exact path="/payments/:organizationName/:paymentName" render={(props) => renderLoginIfNotLoggedIn(<PaymentEditPage account={account} {...props} />)} />
        <Route exact path="/payments/:organizationName/:paymentName/result" render={(props) => renderLoginIfNotLoggedIn(<PaymentResultPage account={account} {...props} />)} />
        <Route exact path="/plans" render={(props) => renderLoginIfNotLoggedIn(<PlanListPage account={account} {...props} />)} />
        <Route exact path="/plans/:organizationName/:planName" render={(props) => renderLoginIfNotLoggedIn(<PlanEditPage account={account} {...props} />)} />
        <Route exact path="/pricings" render={(props) => renderLoginIfNotLoggedIn(<PricingListPage account={account} {...props} />)} />
        <Route exact path="/pricings/:organizationName/:pricingName" render={(props) => renderLoginIfNotLoggedIn(<PricingEditPage account={account} {...props} />)} />
        <Route exact path="/subscriptions" render={(props) => renderLoginIfNotLoggedIn(<SubscriptionListPage account={account} {...props} />)} />
        <Route exact path="/subscriptions/:organizationName/:subscriptionName" render={(props) => renderLoginIfNotLoggedIn(<SubscriptionEditPage account={account} {...props} />)} />
        <Route exact path="/sysinfo" render={(props) => renderLoginIfNotLoggedIn(<SystemInfo account={account} {...props} />)} />
        <Route exact path="/forms" render={(props) => renderLoginIfNotLoggedIn(<FormListPage account={account} {...props} />)} />
        <Route exact path="/forms/:formName" render={(props) => renderLoginIfNotLoggedIn(<FormEditPage account={account} {...props} />)} />
        <Route exact path="/syncers" render={(props) => renderLoginIfNotLoggedIn(<SyncerListPage account={account} {...props} />)} />
        <Route exact path="/syncers/:syncerName" render={(props) => renderLoginIfNotLoggedIn(<SyncerEditPage account={account} {...props} />)} />
        <Route exact path="/wecom-org-sync" render={(props) => renderLoginIfNotLoggedIn(<WecomOrganizationSyncPage account={account} {...props} />)} />
        <Route exact path="/feishu-org-sync" render={(props) => renderLoginIfNotLoggedIn(<FeishuOrganizationSyncPage account={account} {...props} />)} />
        <Route exact path="/organization-tree-operations" render={(props) => renderLoginIfNotLoggedIn(<OrganizationTreeOperationsPage account={account} {...props} />)} />
        <Route exact path="/organization-directory-quality" render={(props) => renderLoginIfNotLoggedIn(<OrganizationDirectoryQualityPage account={account} {...props} />)} />
        <Route exact path="/platform-api-mappings" render={(props) => renderLoginIfNotLoggedIn(<PlatformApiMappingPage account={account} {...props} />)} />
        <Route exact path="/transactions" render={(props) => renderLoginIfNotLoggedIn(<TransactionListPage account={account} {...props} />)} />
        <Route exact path="/transactions/:organizationName/:transactionName" render={(props) => renderLoginIfNotLoggedIn(<TransactionEditPage account={account} {...props} />)} />
        <Route exact path="/webhooks" render={(props) => renderLoginIfNotLoggedIn(<WebhookListPage account={account} {...props} />)} />
        <Route exact path="/webhook-events" render={(props) => renderLoginIfNotLoggedIn(<WebhookEventListPage account={account} {...props} />)} />
        <Route exact path="/webhooks/:webhookName" render={(props) => renderLoginIfNotLoggedIn(<WebhookEditPage account={account} {...props} />)} />
        <Route exact path="/tickets" render={(props) => renderLoginIfNotLoggedIn(<TicketListPage account={account} {...props} />)} />
        <Route exact path="/tickets/:organizationName/:ticketName" render={(props) => renderLoginIfNotLoggedIn(<TicketEditPage account={account} {...props} />)} />
        <Route exact path="/ldap/:organizationName/:ldapId" render={(props) => renderLoginIfNotLoggedIn(<LdapEditPage account={account} {...props} />)} />
        <Route exact path="/ldap/sync/:organizationName/:ldapId" render={(props) => renderLoginIfNotLoggedIn(<LdapSyncPage account={account} {...props} />)} />
        <Route exact path="/mfa/setup" render={(props) => renderLoginIfNotLoggedIn(<MfaSetupPage account={account} onfinish={onfinish} {...props} />)} />
        <Route exact path="/.well-known/openid-configuration" render={(props) => <OdicDiscoveryPage />} />
        <Route path="" render={() => <Result status="404" title="404 NOT FOUND" subTitle={i18next.t("general:Sorry, the page you visited does not exist.")}
          extra={<a href="/"><Button type="primary">{i18next.t("general:Back Home")}</Button></a>} />} />
      </Switch>
    );
  }

  function isWithoutCard() {
    const pathname = window.location.pathname;
    const organizationIdentityCenterPaths = [
      "/organizations",
      "/users",
      "/roles",
      "/permissions",
    ];

    return Setting.isMobile() ||
      pathname === "/" ||
      pathname === "/governance-tasks" ||
      pathname.startsWith("/trees") ||
      organizationIdentityCenterPaths.includes(pathname) ||
      /^\/organizations\/[^/]+\/users$/.test(pathname);
  }

  const onClose = () => {
    setMenuVisible(false);
  };

  const showMenu = () => {
    setMenuVisible(true);
  };

  return (
    <React.Fragment>
      <EnableMfaNotification account={props.account} />
      <Drawer title={Conf.AdminCenterName} placement="left" open={menuVisible} onClose={onClose}>
        <Menu
          items={sidebarMenuItems}
          mode="inline"
          selectedKeys={navigationSelection.itemKey ? [navigationSelection.itemKey] : []}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          onClick={onClose}
          style={{height: "100%", borderInlineEnd: 0}}
        />
      </Drawer>
      <Header className="admin-shell-header" style={{backgroundColor: props.themeAlgorithm.includes("dark") ? "black" : "white"}}>
        <div className="admin-shell-header-left">
          <Link to="/" className="admin-shell-brand">
            <img className="logo admin-shell-logo" src={getBrandLogo() ?? props.logo} alt={Conf.BrandName} />
          </Link>
          {!Setting.isMobile() && (
            <div className="admin-shell-entry">
              <SafetyCertificateTwoTone twoToneColor={props.themeData.colorPrimary} />
              <span>{Conf.AdminCenterName}</span>
            </div>
          )}
          {!props.requiredEnableMfa && Setting.isMobile() && (
            <Button icon={<BarsOutlined />} onClick={showMenu} type="text">
              {Conf.AdminCenterName}
            </Button>
          )}
        </div>
        <div className="admin-shell-header-right">
          {renderAccountMenu()}
        </div>
      </Header>
      <Layout className="admin-shell-body">
        {!props.requiredEnableMfa && !Setting.isMobile() && (
          <Sider width={264} theme="light" className="admin-shell-sider">
            <Menu
              mode="inline"
              items={sidebarMenuItems}
              selectedKeys={navigationSelection.itemKey ? [navigationSelection.itemKey] : []}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              style={{height: "100%", borderInlineEnd: 0}}
            />
          </Sider>
        )}
        <Content className="admin-shell-content">
          {isWithoutCard() ?
            renderRouter() :
            <Card className="content-warp-card">
              {renderRouter()}
            </Card>
          }
        </Content>
      </Layout>
    </React.Fragment>
  );
}

export default withRouter(ManagementPage);
