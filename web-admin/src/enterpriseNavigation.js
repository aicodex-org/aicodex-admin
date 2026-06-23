import React from "react";
import i18next from "i18next";
import {
  ApiTwoTone,
  AppstoreTwoTone,
  CheckCircleTwoTone,
  DollarCircleTwoTone,
  HomeTwoTone,
  LockTwoTone,
  ProfileTwoTone,
  SecurityScanTwoTone,
  ToolTwoTone
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

// 身份总览组只有 `/` 一个叶子时，运行时侧栏直接显示一级入口，避免“身份总览 > 身份总览”的空层级。
export function shouldRenderNavigationGroupAsSingleLeaf(group) {
  return group?.key === "/overview" && group.children.length === 1 && group.children[0]?.key === "/";
}

function buildEnterpriseNavigationGroupDefinitions({isAdmin = true, isLocalAdmin = true, twoToneColor} = {}) {
  const groups = [
    {
      key: "/overview",
      label: i18next.t("general:Overview"),
      icon: <HomeTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/", label: i18next.t("general:Enterprise Identity Overview"), to: "/", matchPrefixes: ["/"]},
        {key: "/apps", label: i18next.t("general:Application Portal"), to: "/apps", matchPrefixes: ["/apps"], visible: !isLocalAdmin},
      ],
    },
    {
      key: "/organization-identity",
      label: i18next.t("general:Organization & Accounts"),
      icon: <AppstoreTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/organizations", label: i18next.t("general:Organizations"), to: "/organizations", matchPrefixes: ["/organizations"], matcher: (uri) => uri === "/organizations" || uri.startsWith("/organizations/") && !uri.includes("/users")},
        {key: "/groups", label: i18next.t("general:Groups"), to: "/groups", matchPrefixes: ["/groups", "/trees"]},
        {key: "/users", label: i18next.t("general:Users"), to: "/users", matchPrefixes: ["/users"], matcher: (uri) => uri === "/users" || uri.startsWith("/users/") || uri.includes("/users")},
        {key: "/invitations", label: i18next.t("general:Invitations"), to: "/invitations", matchPrefixes: ["/invitations"]},
        {key: "/organization-tree-operations", label: i18next.t("general:Organization Tree Operations"), to: "/organization-tree-operations", matchPrefixes: ["/organization-tree-operations"], visible: isAdmin},
        {key: "/organization-directory-quality", label: i18next.t("general:Organization Directory Quality"), to: "/organization-directory-quality", matchPrefixes: ["/organization-directory-quality"], visible: isAdmin},
      ],
    },
    {
      key: "/application-access",
      label: i18next.t("general:Application Access"),
      icon: <ApiTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/applications", label: i18next.t("general:Application Access Center"), to: "/applications", matchPrefixes: ["/applications"]},
        {key: "/application-usage-access", label: i18next.t("general:Usage Access"), to: "/application-usage-access", matchPrefixes: ["/application-usage-access"]},
        {key: "/access-wizard", label: i18next.t("general:Access Preflight"), to: "/access-wizard", matchPrefixes: ["/access-wizard"]},
        {key: "/resources", label: i18next.t("general:Resources"), to: "/resources", matchPrefixes: ["/resources"]},
        {key: "/certs", label: i18next.t("general:Certs"), to: "/certs", matchPrefixes: ["/certs"]},
        {key: "/keys", label: i18next.t("general:Keys"), to: "/keys", matchPrefixes: ["/keys"]},
        {key: "/platform-api-mappings", label: i18next.t("general:API Gateway Mappings"), to: "/platform-api-mappings", matchPrefixes: ["/platform-api-mappings"], visible: isAdmin},
        {key: "/webhooks", label: i18next.t("general:Webhooks"), to: "/webhooks", matchPrefixes: ["/webhooks"]},
        {key: "/webhook-events", label: i18next.t("general:Webhook Events"), to: "/webhook-events", matchPrefixes: ["/webhook-events"]},
      ],
    },
    {
      key: "/identity-sources",
      label: i18next.t("general:Identity Sources"),
      icon: <LockTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/providers", label: i18next.t("general:Authentication Source Center"), to: "/providers", matchPrefixes: ["/providers"]},
        {key: "/wecom-org-sync", label: i18next.t("general:WeCom Sync"), to: "/wecom-org-sync", matchPrefixes: ["/wecom-org-sync"]},
        {key: "/feishu-org-sync", label: i18next.t("general:Feishu Sync"), to: "/feishu-org-sync", matchPrefixes: ["/feishu-org-sync"]},
        {key: "/organization-sync-api-keys", label: i18next.t("general:Organization Sync API Keys"), to: "/organization-sync-api-keys", matchPrefixes: ["/organization-sync-api-keys"]},
        {key: "/syncers", label: i18next.t("general:Syncers"), to: "/syncers", matchPrefixes: ["/syncers"]},
      ],
    },
    {
      key: "/authorization-governance",
      label: i18next.t("general:Permissions & Roles"),
      icon: <SecurityScanTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/roles", label: i18next.t("general:Roles"), to: "/roles", matchPrefixes: ["/roles"]},
        {key: "/permissions", label: i18next.t("general:Permissions"), to: "/permissions", matchPrefixes: ["/permissions"]},
        {key: "/identity-assets", label: i18next.t("general:Relationship Evidence"), to: "/identity-assets", matchPrefixes: ["/identity-assets"]},
        {key: "/models", label: i18next.t("general:Models"), to: "/models", matchPrefixes: ["/models"], visible: isLocalAdmin},
        {key: "/adapters", label: i18next.t("general:Adapters"), to: "/adapters", matchPrefixes: ["/adapters"], visible: isLocalAdmin},
        {key: "/enforcers", label: i18next.t("general:Enforcers"), to: "/enforcers", matchPrefixes: ["/enforcers"], visible: isLocalAdmin},
      ],
    },
    {
      key: "/audit-operations",
      label: i18next.t("general:Audit & Operations"),
      icon: <ProfileTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/sessions", label: i18next.t("general:Session Review"), to: "/sessions", matchPrefixes: ["/sessions"]},
        {key: "/records", label: i18next.t("general:Audit Records"), to: "/records", matchPrefixes: ["/records"]},
        {key: "/tokens", label: i18next.t("general:Token Review"), to: "/tokens", matchPrefixes: ["/tokens"]},
        {key: "/verifications", label: i18next.t("general:Verification Review"), to: "/verifications", matchPrefixes: ["/verifications"]},
        {key: "/governance-tasks", label: i18next.t("general:Risk Actions"), to: "/governance-tasks", matchPrefixes: ["/governance-tasks"]},
      ],
    },
    {
      key: "/llm-ai-gateway",
      label: i18next.t("general:LLM AI/Gateway"),
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
      key: "/system-tools",
      label: i18next.t("general:System Tools"),
      icon: <ToolTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/sysinfo", label: i18next.t("general:System Info"), to: "/sysinfo", matchPrefixes: ["/sysinfo"], visible: isAdmin},
        {key: "/forms", label: i18next.t("general:Forms"), to: "/forms", matchPrefixes: ["/forms"]},
        {key: "/tickets", label: i18next.t("general:Tickets"), to: "/tickets", matchPrefixes: ["/tickets"]},
        {key: "/swagger", label: i18next.t("general:Swagger"), external: true, href: Setting.isLocalhost() ? `${Setting.ServerUrl}/swagger` : "/swagger", matchPrefixes: ["/swagger"], visible: isAdmin},
      ],
    },
    {
      key: "/commerce-billing",
      label: i18next.t("general:Business & Payments"),
      icon: <DollarCircleTwoTone twoToneColor={twoToneColor} />,
      children: [
        {key: "/product-store", label: i18next.t("general:Product Store"), to: "/product-store", matchPrefixes: ["/product-store"]},
        {key: "/products", label: i18next.t("general:Products"), to: "/products", matchPrefixes: ["/products"]},
        {key: "/cart", label: i18next.t("general:Cart"), to: "/cart", matchPrefixes: ["/cart"]},
        {key: "/orders", label: i18next.t("general:Orders"), to: "/orders", matchPrefixes: ["/orders"]},
        {key: "/payments", label: i18next.t("general:Payments"), to: "/payments", matchPrefixes: ["/payments"]},
        {key: "/plans", label: i18next.t("general:Plans"), to: "/plans", matchPrefixes: ["/plans"]},
        {key: "/pricings", label: i18next.t("general:Pricings"), to: "/pricings", matchPrefixes: ["/pricings"]},
        {key: "/subscriptions", label: i18next.t("general:Subscriptions"), to: "/subscriptions", matchPrefixes: ["/subscriptions"]},
        {key: "/transactions", label: i18next.t("general:Transactions"), to: "/transactions", matchPrefixes: ["/transactions"]},
      ],
    },
  ];

  return groups;
}

function isNavigationItemVisible(item) {
  return item.visible !== false;
}

export function buildEnterpriseNavigationConfigTreeData() {
  const groups = buildEnterpriseNavigationGroupDefinitions({isAdmin: true, isLocalAdmin: true});

  return [
    {
      title: i18next.t("general:All"),
      key: "all",
      children: groups.map((group) => ({
        title: group.label,
        key: `${group.key}-top`,
        children: group.children
          .filter(isNavigationItemVisible)
          .map((item) => ({
            title: item.label,
            key: item.key,
          })),
      })),
    },
  ];
}

// 导航分组只改变身份控制台的信息架构语义，叶子 key 保持兼容组织级 navItems 配置。
export function buildEnterpriseNavigationGroups({account, themeData}) {
  if (account === null || account === undefined) {
    return [];
  }

  const organization = account?.organization;
  const navItems = Setting.isLocalAdminUser(account) ? organization?.navItems : (organization?.userNavItems ?? []);
  const navItemsIsAll = !Array.isArray(navItems) || !!navItems?.includes("all");
  const groups = buildEnterpriseNavigationGroupDefinitions({
    isAdmin: Setting.isAdminUser(account),
    isLocalAdmin: Setting.isLocalAdminUser(account),
    twoToneColor: themeData?.colorPrimary,
  });
  const allowedItems = navItemsIsAll ? null : new Set(navItems);

  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => {
        if (!isNavigationItemVisible(item)) {
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
