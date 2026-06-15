import React from "react";
import i18next from "i18next";
import {
  ApiTwoTone,
  AppstoreTwoTone,
  CheckCircleTwoTone,
  HomeTwoTone,
  LockTwoTone,
  WalletTwoTone
} from "@ant-design/icons";
import * as Setting from "./Setting";

function matchMenuItem(uri, item) {
  if (typeof item.matcher === "function") {
    return item.matcher(uri);
  }

  return item.matchPrefixes.some((prefix) => {
    if (prefix === "/") {
      return uri === "/";
    }

    return uri === prefix || uri.startsWith(`${prefix}/`);
  });
}

export function findNavigationSelection(uri, groups) {
  for (const group of groups) {
    for (const item of group.children) {
      if (matchMenuItem(uri, item)) {
        return {
          groupKey: group.key,
          itemKey: item.key,
        };
      }
    }
  }

  return {
    groupKey: undefined,
    itemKey: undefined,
  };
}

// 导航分组只改变企业认证中心的信息架构语义，叶子 key 保持兼容组织级 navItems 配置。
export function buildEnterpriseNavigationGroups({account, themeData}) {
  if (account === null || account === undefined) {
    return [];
  }

  const organization = account?.organization;
  const navItems = Setting.isLocalAdminUser(account) ? organization?.navItems : (organization?.userNavItems ?? []);
  const navItemsIsAll = !Array.isArray(navItems) || !!navItems?.includes("all");
  const twoToneColor = themeData?.colorPrimary;
  const isLocalAdmin = Setting.isLocalAdminUser(account);
  const isAdmin = Setting.isAdminUser(account);
  const groups = [
    {
      key: "/overview",
      label: "总览",
      icon: <HomeTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/", label: "身份治理总览", to: "/", matchPrefixes: ["/"]},
        {key: "/shortcuts", label: i18next.t("general:Shortcuts"), to: "/shortcuts", matchPrefixes: ["/shortcuts"]},
        {key: "/apps", label: i18next.t("general:Apps"), to: "/apps", matchPrefixes: ["/apps"]},
      ],
    },
    {
      key: "/organization-identity",
      label: "组织与身份",
      icon: <AppstoreTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/organizations", label: i18next.t("general:Organizations"), to: "/organizations", matchPrefixes: ["/organizations"], matcher: (uri) => uri === "/organizations" || uri.startsWith("/organizations/") && !uri.includes("/users")},
        {key: "/groups", label: i18next.t("general:Groups"), to: "/groups", matchPrefixes: ["/groups", "/trees"]},
        {key: "/users", label: i18next.t("general:Users"), to: "/users", matchPrefixes: ["/users"], matcher: (uri) => uri === "/users" || uri.startsWith("/users/") || uri.includes("/users")},
        {key: "/invitations", label: i18next.t("general:Invitations"), to: "/invitations", matchPrefixes: ["/invitations"]},
        {key: "/organization-tree-operations", label: "组织树运营", to: "/organization-tree-operations", matchPrefixes: ["/organization-tree-operations"], visible: isAdmin},
        {key: "/organization-directory-quality", label: "组织目录质量", to: "/organization-directory-quality", matchPrefixes: ["/organization-directory-quality"], visible: isAdmin},
      ],
    },
    {
      key: "/identity-sources",
      label: "认证源",
      icon: <LockTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/providers", label: "认证源中心", to: "/providers", matchPrefixes: ["/providers"]},
        {key: "/wecom-org-sync", label: "企业微信同步", to: "/wecom-org-sync", matchPrefixes: ["/wecom-org-sync"]},
        {key: "/feishu-org-sync", label: "飞书同步", to: "/feishu-org-sync", matchPrefixes: ["/feishu-org-sync"]},
        {key: "/syncers", label: i18next.t("general:Syncers"), to: "/syncers", matchPrefixes: ["/syncers"]},
      ],
    },
    {
      key: "/application-access",
      label: "应用接入",
      icon: <ApiTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/applications", label: i18next.t("general:Applications"), to: "/applications", matchPrefixes: ["/applications"]},
        {key: "/resources", label: i18next.t("general:Resources"), to: "/resources", matchPrefixes: ["/resources"]},
        {key: "/certs", label: i18next.t("general:Certs"), to: "/certs", matchPrefixes: ["/certs"]},
        {key: "/keys", label: i18next.t("general:Keys"), to: "/keys", matchPrefixes: ["/keys"]},
        {key: "/platform-api-mappings", label: "API 网关映射", to: "/platform-api-mappings", matchPrefixes: ["/platform-api-mappings"], visible: isAdmin},
        {key: "/webhooks", label: i18next.t("general:Webhooks"), to: "/webhooks", matchPrefixes: ["/webhooks"]},
        {key: "/webhook-events", label: i18next.t("general:Webhook Events"), to: "/webhook-events", matchPrefixes: ["/webhook-events"]},
      ],
    },
    {
      key: "/gateway-projection",
      label: "Gateway 投影",
      icon: <CheckCircleTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/agents", label: i18next.t("general:Agents"), to: "/agents", matchPrefixes: ["/agents"]},
        {key: "/servers", label: i18next.t("general:MCP Servers"), to: "/servers", matchPrefixes: ["/servers"]},
        {key: "/server-store", label: i18next.t("general:MCP Store"), to: "/server-store", matchPrefixes: ["/server-store"]},
        {key: "/entries", label: i18next.t("general:Entries"), to: "/entries", matchPrefixes: ["/entries"]},
        {key: "/sites", label: i18next.t("general:Sites"), to: "/sites", matchPrefixes: ["/sites"]},
        {key: "/rules", label: i18next.t("general:Rules"), to: "/rules", matchPrefixes: ["/rules"]},
      ],
    },
    {
      key: "/audit-operations",
      label: "审计与运维",
      icon: <WalletTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/sessions", label: i18next.t("general:Sessions"), to: "/sessions", matchPrefixes: ["/sessions"]},
        {key: "/records", label: i18next.t("general:Records"), to: "/records", matchPrefixes: ["/records"]},
        {key: "/tokens", label: i18next.t("general:Tokens"), to: "/tokens", matchPrefixes: ["/tokens"]},
        {key: "/verifications", label: i18next.t("general:Verifications"), to: "/verifications", matchPrefixes: ["/verifications"]},
        {key: "/roles", label: i18next.t("general:Roles"), to: "/roles", matchPrefixes: ["/roles"]},
        {key: "/permissions", label: i18next.t("general:Permissions"), to: "/permissions", matchPrefixes: ["/permissions"]},
        {key: "/models", label: i18next.t("general:Models"), to: "/models", matchPrefixes: ["/models"], visible: isLocalAdmin},
        {key: "/adapters", label: i18next.t("general:Adapters"), to: "/adapters", matchPrefixes: ["/adapters"], visible: isLocalAdmin},
        {key: "/enforcers", label: i18next.t("general:Enforcers"), to: "/enforcers", matchPrefixes: ["/enforcers"], visible: isLocalAdmin},
        {key: "/sysinfo", label: i18next.t("general:System Info"), to: "/sysinfo", matchPrefixes: ["/sysinfo"], visible: isAdmin},
        {key: "/forms", label: i18next.t("general:Forms"), to: "/forms", matchPrefixes: ["/forms"]},
        {key: "/tickets", label: i18next.t("general:Tickets"), to: "/tickets", matchPrefixes: ["/tickets"]},
        {key: "/product-store", label: i18next.t("general:Product Store"), to: "/product-store", matchPrefixes: ["/product-store"]},
        {key: "/products", label: i18next.t("general:Products"), to: "/products", matchPrefixes: ["/products"]},
        {key: "/cart", label: i18next.t("general:Cart"), to: "/cart", matchPrefixes: ["/cart"]},
        {key: "/orders", label: i18next.t("general:Orders"), to: "/orders", matchPrefixes: ["/orders"]},
        {key: "/payments", label: i18next.t("general:Payments"), to: "/payments", matchPrefixes: ["/payments"]},
        {key: "/plans", label: i18next.t("general:Plans"), to: "/plans", matchPrefixes: ["/plans"]},
        {key: "/pricings", label: i18next.t("general:Pricings"), to: "/pricings", matchPrefixes: ["/pricings"]},
        {key: "/subscriptions", label: i18next.t("general:Subscriptions"), to: "/subscriptions", matchPrefixes: ["/subscriptions"]},
        {key: "/transactions", label: i18next.t("general:Transactions"), to: "/transactions", matchPrefixes: ["/transactions"]},
        {key: "/swagger", label: i18next.t("general:Swagger"), external: true, href: Setting.isLocalhost() ? `${Setting.ServerUrl}/swagger` : "/swagger", matchPrefixes: ["/swagger"], visible: isAdmin},
      ],
    },
  ];

  const allowedItems = navItemsIsAll ? null : new Set(navItems);

  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => {
        if (item.visible === false) {
          return false;
        }

        if (allowedItems === null) {
          return true;
        }

        return allowedItems.has(item.key);
      }),
    }))
    .filter((group) => group.children.length > 0);
}
