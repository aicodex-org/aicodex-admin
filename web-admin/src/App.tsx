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

import React, {Component, Suspense, lazy} from "react";
import "./App.less";
import {Helmet} from "react-helmet";
import * as Setting from "./Setting";
import {setOrgIsTourVisible, setTourLogo} from "./TourConfig";
import {StyleProvider, legacyLogicalPropertiesTransformer} from "@ant-design/cssinjs";
import {GithubOutlined, InfoCircleFilled, ShareAltOutlined} from "@ant-design/icons";
import {Alert, Button, ConfigProvider, Drawer, FloatButton, Layout, Result, Tooltip} from "antd";
import {Route, Switch, withRouter} from "react-router-dom";
import CustomGithubCorner from "./common/CustomGithubCorner";
import * as Conf from "./Conf";

import * as Auth from "./auth/Auth";
import EntryPage from "./EntryPage";
import * as AuthBackend from "./auth/AuthBackend";
import AuthCallback from "./auth/AuthCallback";
import SamlCallback from "./auth/SamlCallback";
import TelegramLogin from "./auth/TelegramLogin";
import i18next from "i18next";
import {withTranslation} from "react-i18next";
const ManagementPage = lazy(() => import("./ManagementPage"));
const {Footer, Content} = Layout;

import {setTwoToneColor} from "@ant-design/icons";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import * as Cookie from "cookie";
import type {LegacyAny} from "./types/legacyPage";
import {getRuntimePathname, runtimeEnv} from "./config/runtimeEnv";

// Ant Design locale imports
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import esES from "antd/locale/es_ES";
import frFR from "antd/locale/fr_FR";
import deDE from "antd/locale/de_DE";
import idID from "antd/locale/id_ID";
import jaJP from "antd/locale/ja_JP";
import koKR from "antd/locale/ko_KR";
import ruRU from "antd/locale/ru_RU";
import viVN from "antd/locale/vi_VN";
import ptBR from "antd/locale/pt_BR";
import itIT from "antd/locale/it_IT";
import msMY from "antd/locale/ms_MY";
import trTR from "antd/locale/tr_TR";
import arEG from "antd/locale/ar_EG";
import heIL from "antd/locale/he_IL";
import nlNL from "antd/locale/nl_NL";
import plPL from "antd/locale/pl_PL";
import fiFI from "antd/locale/fi_FI";
import svSE from "antd/locale/sv_SE";
import ukUA from "antd/locale/uk_UA";
import faIR from "antd/locale/fa_IR";
import csCZ from "antd/locale/cs_CZ";
import skSK from "antd/locale/sk_SK";

setTwoToneColor("rgb(87,52,211)");

type ThemeData = {
  colorPrimary: string;
  borderRadius: number;
  [key: string]: LegacyAny;
};

interface AppProps {
  history: {
    push: (path: string, state?: LegacyAny) => void;
  };
  location: {
    search: string;
  };
  [key: string]: LegacyAny;
}

interface AppState {
  classes: AppProps;
  selectedMenuKey: string | number;
  account?: LegacyAny;
  accessToken?: string | null;
  uri: string | null;
  themeAlgorithm: string[];
  themeData: ThemeData;
  logo: string;
  requiredEnableMfa: boolean;
  isAiAssistantOpen: boolean;
  application?: LegacyAny;
  menuVisible?: boolean;
  organization?: LegacyAny;
}

function getAntdLocale(language: string) {
  const localeMap = {
    "en": enUS,
    "zh": zhCN,
    "zh-tw": zhTW,
    "es": esES,
    "fr": frFR,
    "de": deDE,
    "id": idID,
    "ja": jaJP,
    "ko": koKR,
    "ru": ruRU,
    "vi": viVN,
    "pt": ptBR,
    "it": itIT,
    "ms": msMY,
    "tr": trTR,
    "ar": arEG,
    "he": heIL,
    "nl": nlNL,
    "pl": plPL,
    "fi": fiFI,
    "sv": svSE,
    "uk": ukUA,
    "fa": faIR,
    "cs": csCZ,
    "sk": skSK,
    "kk": ruRU, // Use Russian for Kazakh as antd doesn't have Kazakh
    "az": trTR, // Use Turkish for Azerbaijani as they're similar
  };
  return (localeMap as Record<string, LegacyAny>)[language] || enUS;
}

export function getAdminDocumentTitle(_account?: LegacyAny) {
  return `${String(i18next.t("general:AICodex Admin"))} · ${String(i18next.t("general:Authentication Center"))}`;
}

class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.setThemeAlgorithm();
    let storageThemeAlgorithm: string[] = [];
    try {
      const rawThemeAlgorithm = localStorage.getItem("themeAlgorithm");
      storageThemeAlgorithm = rawThemeAlgorithm ? JSON.parse(rawThemeAlgorithm) : ["default"];
    } catch {
      storageThemeAlgorithm = ["default"];
    }
    this.state = {
      classes: props,
      selectedMenuKey: 0,
      account: undefined,
      accessToken: undefined,
      uri: null,
      themeAlgorithm: storageThemeAlgorithm,
      themeData: Conf.ThemeDefault,
      logo: this.getLogo(storageThemeAlgorithm),
      requiredEnableMfa: false,
      isAiAssistantOpen: false,
      application: undefined,
    };
    Setting.initServerUrl();
    Setting.initWebConfig();
    Auth.initAuthWithConfig({
      serverUrl: Setting.ServerUrl,
      appName: Conf.DefaultApplication, // the application used in aicodex-admin root path: "/"
    });
  }

  componentDidMount() {
    this.syncAdminShellBodyThemeClass();
  }

  UNSAFE_componentWillMount() {
    this.updateMenuKey();
    this.getAccount();
    this.getApplication();
  }

  componentDidUpdate(prevProps: AppProps, prevState: AppState, snapshot: LegacyAny) {
    this.syncAdminShellBodyThemeClass();
    const uri = getRuntimePathname(location.pathname, runtimeEnv.routerBasename);
    if (this.state.uri !== uri) {
      this.updateMenuKey();
    }

    if (this.state.account !== prevState.account) {
      const requiredEnableMfa = Setting.isRequiredEnableMfa(this.state.account, this.state.account?.organization);
      this.setState({
        requiredEnableMfa: requiredEnableMfa,
      });

      if (requiredEnableMfa === true) {
        const mfaType = (Setting.getMfaItemsByRules(this.state.account, this.state.account?.organization, [Setting.MfaRuleRequired]) as LegacyAny[])
          .find((item: LegacyAny) => item.rule === Setting.MfaRuleRequired)?.name;
        if (mfaType !== undefined) {
          this.props.history.push(`/mfa/setup?mfaType=${mfaType}`, {from: "/login"});
        }
      }
    }
  }

  componentWillUnmount() {
    this.clearAdminShellBodyThemeClass();
  }

  clearAdminShellBodyThemeClass() {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.remove("admin-shell-theme-light", "admin-shell-theme-dark");
  }

  syncAdminShellBodyThemeClass() {
    this.clearAdminShellBodyThemeClass();

    if (typeof document === "undefined" || this.isDoorPages()) {
      return;
    }

    document.body.classList.add(this.state.themeAlgorithm.includes("dark") ? "admin-shell-theme-dark" : "admin-shell-theme-light");
  }

  shouldFlattenMenu() {
    const organization = this.state.account?.organization;
    const navItems = Setting.isLocalAdminUser(this.state.account) ? organization?.navItems : (organization?.userNavItems ?? []);

    // If navItems is "all" or not configured, don't flatten
    if (!Array.isArray(navItems) || navItems?.includes("all")) {
      return false;
    }

    // Count how many valid menu items would be visible
    // Filter out any invalid or non-existent menu items
    const validMenuItems = [
      "/", "/shortcuts", "/apps", // Home group
      "/organizations", "/groups", "/users", "/invitations", // User Management
      "/applications", "/application-usage-access", "/providers", "/resources", "/certs", "/keys", // Identity
      "/roles", "/permissions", "/models", "/adapters", "/enforcers", // Authorization
      "/agents", "/servers", "/server-store", "/entries", "/sites", "/rules", // LLM AI
      "/sessions", "/records", "/tokens", "/verifications", // Logging & Auditing
      "/products", "/orders", "/payments", "/plans", "/pricings", "/subscriptions", "/transactions", // Business
      "/sysinfo", "/forms", "/syncers", "/wecom-org-sync", "/feishu-org-sync", "/dingtalk-org-sync", "/organization-sync-api-keys", "/webhooks", "/webhook-events", "/tickets", "/swagger", // Admin
    ];

    const count = navItems.filter(item => validMenuItems.includes(item)).length;
    return count <= Conf.MaxItemsForFlatMenu;
  }

  getSelectedMenuKeyForFlatMenu(uri: string) {
    // For flattened menu, return the actual child path instead of parent group
    if (uri === "/" || uri.includes("/shortcuts") || uri.includes("/apps")) {
      if (uri === "/") {
        return "/";
      } else if (uri.includes("/shortcuts")) {
        return "/shortcuts";
      } else if (uri.includes("/apps")) {
        return "/apps";
      }
    } else if (uri.includes("/organizations") || uri.includes("/trees") || uri.includes("/groups") || uri.includes("/users") || uri.includes("/invitations")) {
      if (uri.includes("/organizations")) {
        return "/organizations";
      } else if (uri.includes("/groups")) {
        return "/groups";
      } else if (uri.includes("/users")) {
        return "/users";
      } else if (uri.includes("/invitations")) {
        return "/invitations";
      }
    } else if (uri.includes("/applications") || uri.includes("/application-usage-access") || uri.includes("/providers") || uri.includes("/resources") || uri.includes("/certs")) {
      if (uri.includes("/applications")) {
        return "/applications";
      } else if (uri.includes("/application-usage-access")) {
        return "/application-usage-access";
      } else if (uri.includes("/providers")) {
        return "/providers";
      } else if (uri.includes("/resources")) {
        return "/resources";
      } else if (uri.includes("/certs")) {
        return "/certs";
      }
    } else if (uri.includes("/keys")) {
      return "/keys";
    } else if (uri.includes("/agents") || uri.includes("/servers") || uri.includes("/entries") || uri.includes("/sites") || uri.includes("/rules")) {
      if (uri.includes("/agents")) {
        return "/agents";
      } else if (uri.includes("/servers")) {
        return "/servers";
      } else if (uri.includes("/server-store")) {
        return "/server-store";
      } else if (uri.includes("/entries")) {
        return "/entries";
      } else if (uri.includes("/sites")) {
        return "/sites";
      } else if (uri.includes("/rules")) {
        return "/rules";
      }
    } else if (uri.includes("/roles") || uri.includes("/permissions") || uri.includes("/models") || uri.includes("/adapters") || uri.includes("/enforcers")) {
      if (uri.includes("/roles")) {
        return "/roles";
      } else if (uri.includes("/permissions")) {
        return "/permissions";
      } else if (uri.includes("/models")) {
        return "/models";
      } else if (uri.includes("/adapters")) {
        return "/adapters";
      } else if (uri.includes("/enforcers")) {
        return "/enforcers";
      }
    } else if (uri.includes("/records") || uri.includes("/tokens") || uri.includes("/sessions") || uri.includes("/verifications")) {
      if (uri.includes("/sessions")) {
        return "/sessions";
      } else if (uri.includes("/records")) {
        return "/records";
      } else if (uri.includes("/tokens")) {
        return "/tokens";
      } else if (uri.includes("/verifications")) {
        return "/verifications";
      }
    } else if (uri.includes("/products") || uri.includes("/orders") || uri.includes("/payments") || uri.includes("/plans") || uri.includes("/pricings") || uri.includes("/subscriptions") || uri.includes("/transactions")) {
      if (uri.includes("/products")) {
        return "/products";
      } else if (uri.includes("/orders")) {
        return "/orders";
      } else if (uri.includes("/payments")) {
        return "/payments";
      } else if (uri.includes("/plans")) {
        return "/plans";
      } else if (uri.includes("/pricings")) {
        return "/pricings";
      } else if (uri.includes("/subscriptions")) {
        return "/subscriptions";
      } else if (uri.includes("/transactions")) {
        return "/transactions";
      }
    } else if (uri.includes("/sysinfo") || uri.includes("/forms") || uri.includes("/syncers") || uri.includes("/wecom-org-sync") || uri.includes("/feishu-org-sync") || uri.includes("/dingtalk-org-sync") || uri.includes("/organization-sync-api-keys") || uri.includes("/webhooks") || uri.includes("/webhook-events") || uri.includes("/tickets")) {
      if (uri.includes("/sysinfo")) {
        return "/sysinfo";
      } else if (uri.includes("/forms")) {
        return "/forms";
      } else if (uri.includes("/syncers")) {
        return "/syncers";
      } else if (uri.includes("/wecom-org-sync")) {
        return "/wecom-org-sync";
      } else if (uri.includes("/feishu-org-sync")) {
        return "/feishu-org-sync";
      } else if (uri.includes("/dingtalk-org-sync")) {
        return "/dingtalk-org-sync";
      } else if (uri.includes("/organization-sync-api-keys")) {
        return "/organization-sync-api-keys";
      } else if (uri.includes("/webhook-events")) {
        return "/webhook-events";
      } else if (uri.includes("/webhooks") || uri.includes("/webhook-events")) {
        return "/webhooks";
      } else if (uri.includes("/tickets")) {
        return "/tickets";
      }
    } else if (uri.includes("/signup")) {
      return "/signup";
    } else if (uri.includes("/login")) {
      return "/login";
    } else if (uri.includes("/result")) {
      return "/result";
    }
    return -1;
  }

  updateMenuKey() {
    const uri = getRuntimePathname(location.pathname, runtimeEnv.routerBasename);
    this.setState({
      uri: uri,
    });

    // Check if menu should be flattened and use appropriate key selection
    if (this.shouldFlattenMenu()) {
      const selectedKey = this.getSelectedMenuKeyForFlatMenu(uri);
      this.setState({selectedMenuKey: selectedKey});
      return;
    }

    // Original logic for grouped menu
    if (uri === "/" || uri.includes("/shortcuts") || uri.includes("/apps")) {
      this.setState({selectedMenuKey: "/home"});
    } else if (uri.includes("/organizations") || uri.includes("/trees") || uri.includes("/groups") || uri.includes("/users") || uri.includes("/invitations")) {
      this.setState({selectedMenuKey: "/orgs"});
    } else if (uri.includes("/applications") || uri.includes("/application-usage-access") || uri.includes("/providers") || uri.includes("/resources") || uri.includes("/certs") || uri.includes("/keys")) {
      this.setState({selectedMenuKey: "/identity"});
    } else if (uri.includes("/agents") || uri.includes("/servers") || uri.includes("/server-store") || uri.includes("/entries") || uri.includes("/sites") || uri.includes("/rules")) {
      this.setState({selectedMenuKey: "/gateway"});
    } else if (uri.includes("/roles") || uri.includes("/permissions") || uri.includes("/models") || uri.includes("/adapters") || uri.includes("/enforcers")) {
      this.setState({selectedMenuKey: "/auth"});
    } else if (uri.includes("/records") || uri.includes("/tokens") || uri.includes("/sessions") || uri.includes("/verifications")) {
      this.setState({selectedMenuKey: "/logs"});
    } else if (uri.includes("/product-store") || uri.includes("/products") || uri.includes("/orders") || uri.includes("/payments") || uri.includes("/plans") || uri.includes("/pricings") || uri.includes("/subscriptions") || uri.includes("/transactions")) {
      this.setState({selectedMenuKey: "/business"});
    } else if (uri.includes("/sysinfo") || uri.includes("/forms") || uri.includes("/syncers") || uri.includes("/wecom-org-sync") || uri.includes("/feishu-org-sync") || uri.includes("/dingtalk-org-sync") || uri.includes("/organization-sync-api-keys") || uri.includes("/webhooks") || uri.includes("/webhook-events") || uri.includes("/tickets")) {
      this.setState({selectedMenuKey: "/admin"});
    } else if (uri.includes("/signup")) {
      this.setState({selectedMenuKey: "/signup"});
    } else if (uri.includes("/login")) {
      this.setState({selectedMenuKey: "/login"});
    } else if (uri.includes("/result")) {
      this.setState({selectedMenuKey: "/result"});
    } else {
      this.setState({selectedMenuKey: -1});
    }
  }

  getAccessTokenParam(params: URLSearchParams) {
    // "/page?access_token=123"
    const accessToken = params.get("access_token");
    return accessToken === null ? "" : `?accessToken=${accessToken}`;
  }

  getCredentialParams(params: URLSearchParams) {
    // "/page?username=abc&password=123"
    if (params.get("username") === null || params.get("password") === null) {
      return "";
    }
    return `?username=${params.get("username")}&password=${params.get("password")}`;
  }

  getUrlWithoutQuery() {
    return window.location.toString().replace(window.location.search, "");
  }

  getLanguageParam(params: URLSearchParams) {
    // "/page?language=en"
    const language = params.get("language");
    if (language !== null) {
      Setting.setLanguage(language);
      return `language=${language}`;
    }
    return "";
  }

  getLogo(themes: string[]) {
    return Setting.getLogo(themes);
  }

  setThemeAlgorithm() {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const themeType = url.searchParams.get("theme");
    if (themeType === "dark" || themeType === "default") {
      localStorage.setItem("themeAlgorithm", JSON.stringify([themeType]));
    }
  }

  setLanguage(account: LegacyAny) {
    const language = account?.language;
    if (language !== null && language !== "" && language !== i18next.language) {
      Setting.setLanguage(language);
    }
  }

  setTheme = (theme: ThemeData, initThemeAlgorithm: boolean) => {
    this.setState({
      themeData: theme,
    });

    if (initThemeAlgorithm) {
      if (localStorage.getItem("themeAlgorithm")) {
        let storageThemeAlgorithm: string[] = [];
        try {
          storageThemeAlgorithm = JSON.parse(localStorage.getItem("themeAlgorithm") || "[\"default\"]");
        } catch {
          storageThemeAlgorithm = ["default"];
        }
        this.setState({
          logo: this.getLogo(storageThemeAlgorithm),
          themeAlgorithm: storageThemeAlgorithm,
        });
        return;
      }
      this.setState({
        logo: this.getLogo(Setting.getAlgorithmNames(theme)),
        themeAlgorithm: Setting.getAlgorithmNames(theme),
      });
    }
  };

  getApplication() {
    const applicationName = localStorage.getItem("applicationName");
    if (!applicationName) {
      return;
    }
    ApplicationBackend.getApplication("admin", applicationName)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          application: res.data,
        });
      });
  }

  getAccount() {
    const params = new URLSearchParams(this.props.location.search);

    let query = this.getAccessTokenParam(params);
    if (query === "") {
      query = this.getCredentialParams(params);
    }

    const query2 = this.getLanguageParam(params);
    if (query2 !== "") {
      const url = window.location.toString().replace(new RegExp(`[?&]${query2}`), "");
      window.history.replaceState({}, document.title, url);
    }

    if (query !== "") {
      const returnUrl = params.get("returnUrl");

      let newUrl;
      if (returnUrl) {
        const newParams = new URLSearchParams();
        newParams.set("returnUrl", returnUrl);
        newUrl = window.location.pathname + "?" + newParams.toString();
      } else {
        newUrl = this.getUrlWithoutQuery();
      }
      window.history.replaceState({}, document.title, newUrl);
    }

    AuthBackend.getAccount(query)
      .then((res) => {
        let account = null;
        let accessToken = null;
        if (res.status === "ok") {
          account = res.data;
          account.organization = res.data2;
          accessToken = res.data.accessToken;
          this.setTheme(Setting.getThemeData(account.organization), Conf.InitThemeAlgorithm);
          setTourLogo(Setting.getPreferredBrandAsset(account.organization.logo, Conf.BrandIcon));
          setOrgIsTourVisible(account.organization.enableTour);
        } else {
          if (res.data !== "Please login first") {
            Setting.showMessage("error", `${i18next.t("application:Failed to sign in")}: ${res.msg}`);
          }
        }

        this.setState({
          account: account,
          accessToken: accessToken,
        });
      });
  }

  onUpdateAccount(account: LegacyAny) {
    this.setState({
      account: account,
    });
  }

  renderFooter(logo?: string | null, footerHtml?: string | null) {
    logo = logo ?? this.state.logo;
    logo = Setting.getPreferredBrandAsset(logo, Conf.BrandIcon);
    footerHtml = footerHtml ?? this.state.application?.footerHtml;
    return (
      <React.Fragment>
        {this.renderAccountBridge()}
        <Footer id="footer" style={
          {
            textAlign: "center",
          }
        }>
          {
            footerHtml && footerHtml !== "" ?
              <React.Fragment>
                <div dangerouslySetInnerHTML={{__html: footerHtml}} />
              </React.Fragment>
              : (
                Conf.CustomFooter !== null ? Conf.CustomFooter : (
                  <React.Fragment>
                    Powered by <a href={Conf.BrandUrl}><img style={{paddingBottom: "3px"}} height={"18px"} alt={Conf.BrandName} src={logo ?? undefined} /></a>
                  </React.Fragment>
                )
              )
          }
        </Footer>
      </React.Fragment>
    );
  }

  renderAccountBridge() {
    return (
      <React.Fragment>
        {!this.state.account ? null : <div {...({style: {display: "none"}, id: "CasdoorApplicationName", value: this.state.account.signupApplication} as LegacyAny)} />}
        {!this.state.account ? null : <div {...({style: {display: "none"}, id: "CasdoorAccessToken", value: this.state.accessToken} as LegacyAny)} />}
      </React.Fragment>
    );
  }

  renderAiAssistant() {
    if (!Conf.AiAssistantUrl) {
      return null;
    }

    return (
      <Drawer
        title={
          <React.Fragment>
            <Tooltip title="Want to deploy your own AI assistant? Click to learn more!">
              <a target="_blank" rel="noreferrer" href={Conf.BrandUrl}>
                <img style={{width: "20px", marginRight: "10px", marginBottom: "2px"}} alt={Conf.BrandName} src={Conf.BrandIcon} />
                AI Assistant
              </a>
            </Tooltip>
            <a className="custom-link" style={{float: "right", marginTop: "2px"}} target="_blank" rel="noreferrer" href={`${Conf.AiAssistantUrl}`}>
              <ShareAltOutlined className="custom-link" style={{fontSize: "20px", color: "rgb(140,140,140)"}} />
            </a>
            <a className="custom-link" style={{float: "right", marginRight: "30px", marginTop: "2px"}} target="_blank" rel="noreferrer" href={"https://github.com/casibase/casibase"}>
              <GithubOutlined className="custom-link" style={{fontSize: "20px", color: "rgb(140,140,140)"}} />
            </a>
          </React.Fragment>
        }
        placement="right"
        width={500}
        mask={false}
        onClose={() => {
          this.setState({
            isAiAssistantOpen: false,
          });
        }}
        open={this.state.isAiAssistantOpen}
      >
        <iframe id="iframeHelper" title={"iframeHelper"} src={`${Conf.AiAssistantUrl}/?isRaw=1`} width="100%" height="100%" scrolling="no" frameBorder="no" />
      </Drawer>
    );
  }

  isDoorPages() {
    const pathname = getRuntimePathname(window.location.pathname, runtimeEnv.routerBasename);
    return this.isEntryPages() ||
      pathname.startsWith("/callback") ||
      pathname.startsWith("/telegram-login");
  }

  isEntryPages() {
    const pathname = getRuntimePathname(window.location.pathname, runtimeEnv.routerBasename);
    return pathname.startsWith("/signup") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/forget") ||
      pathname.startsWith("/prompt") ||
      pathname.startsWith("/result") ||
      pathname.startsWith("/cas") ||
      pathname.startsWith("/select-plan") ||
      pathname.startsWith("/buy-plan") ||
      pathname.startsWith("/qrcode") ||
      pathname.startsWith("/consent") ||
      pathname.startsWith("/captcha");
  }

  onClick = ({key}: {key: string}) => {
    if (key !== "/swagger" && key !== "/records") {
      if (this.state.requiredEnableMfa) {
        Setting.showMessage("info", "Please enable MFA first!");
      } else {
        this.props.history.push(key);
      }
    }
  };

  onLoginSuccess(redirectUrl?: string) {
    window.google?.accounts?.id?.cancel();
    if (redirectUrl) {
      localStorage.setItem("mfaRedirectUrl", redirectUrl);
    }
    this.getAccount();
  }

  renderPage() {
    if (this.isDoorPages()) {
      let themeData = this.state.themeData;
      let logo = this.state.logo;
      let footerHtml = null;
      if (this.state.organization === undefined) {
        const curCookie = Cookie.parse(document.cookie);
        if (curCookie["organizationTheme"] && curCookie["organizationTheme"] !== "null") {
          themeData = JSON.parse(curCookie["organizationTheme"]);
        }
        if (curCookie["organizationLogo"] && curCookie["organizationLogo"] !== "") {
          logo = curCookie["organizationLogo"];
        }
        if (curCookie["organizationFootHtml"] && curCookie["organizationFootHtml"] !== "") {
          footerHtml = curCookie["organizationFootHtml"];
        }
      }

      return (
        <ConfigProvider
          locale={getAntdLocale(Setting.getLanguage())}
          theme={{
            token: {
              colorPrimary: themeData.colorPrimary,
              borderRadius: themeData.borderRadius,
            },
            algorithm: Setting.getAlgorithm(this.state.themeAlgorithm),
          }}>
          <StyleProvider hashPriority="high" transformers={[legacyLogicalPropertiesTransformer]}>
            <Layout id="parent-area">
              <Content style={{display: "flex", justifyContent: "center"}}>
                {
                  this.isEntryPages() ?
                    <EntryPage
                      account={this.state.account}
                      theme={this.state.themeData}
                      themeAlgorithm={this.state.themeAlgorithm}
                      requiredEnableMfa={this.state.requiredEnableMfa}
                      updateApplication={(application: LegacyAny) => {
                        this.setState({
                          application: application,
                        });
                      }}
                      onLoginSuccess={(redirectUrl: string) => {this.onLoginSuccess(redirectUrl);}}
                      onUpdateAccount={(account: LegacyAny) => this.onUpdateAccount(account)}
                      updataThemeData={this.setTheme}
                    /> :
                    <Switch>
                      <Route exact path="/callback" render={(props: LegacyAny) => <AuthCallback {...props} {...this.props} application={this.state.application} onLoginSuccess={(redirectUrl: string) => {this.onLoginSuccess(redirectUrl);}} />} />
                      <Route exact path="/callback/saml" render={(props: LegacyAny) => <SamlCallback {...props} {...this.props} application={this.state.application} onLoginSuccess={(redirectUrl: string) => {this.onLoginSuccess(redirectUrl);}} />} />
                      <Route exact path="/telegram-login" render={(props: LegacyAny) => <TelegramLogin {...props} {...this.props} />} />
                      <Route path="" render={() => <Result status="404" title="404 NOT FOUND" subTitle={String(i18next.t("general:Sorry, the page you visited does not exist."))}
                        extra={<a href="/"><Button type="primary">{String(i18next.t("general:Back Home"))}</Button></a>} />} />
                    </Switch>
                }
              </Content>
              {
                this.renderFooter(logo, footerHtml)
              }
              {
                this.renderAiAssistant()
              }
            </Layout>
          </StyleProvider>
        </ConfigProvider>
      );
    }
    return (
      <React.Fragment>
        {/* { */}
        {/*   this.renderBanner() */}
        {/* } */}
        <FloatButton.BackTop />
        <CustomGithubCorner />
        {
          <Suspense fallback={null}>
            <Layout id="parent-area" className={`admin-shell-root ${this.state.themeAlgorithm.includes("dark") ? "admin-shell-theme-dark" : "admin-shell-theme-light"}`}>
              <ManagementPage
                account={this.state.account}
                application={this.state.application}
                uri={this.state.uri}
                themeData={this.state.themeData}
                themeAlgorithm={this.state.themeAlgorithm}
                selectedMenuKey={this.state.selectedMenuKey}
                requiredEnableMfa={this.state.requiredEnableMfa}
                menuVisible={this.state.menuVisible}
                logo={this.state.logo}
                onChangeTheme={this.setTheme}
                onClick={this.onClick}
                onUpdateAccount={(account: LegacyAny) => this.onUpdateAccount(account)}
                onfinish={() => {
                  this.setState({requiredEnableMfa: false});
                }}
                openAiAssistant={() => {
                  this.setState({
                    isAiAssistantOpen: true,
                  });
                }}
                setLogoAndThemeAlgorithm={(nextThemeAlgorithm: string[]) => {
                  this.setState({
                    themeAlgorithm: nextThemeAlgorithm,
                    logo: this.getLogo(nextThemeAlgorithm),
                  });
                  localStorage.setItem("themeAlgorithm", JSON.stringify(nextThemeAlgorithm));
                }}
                setLogoutState={() => {
                  this.setState({
                    account: null,
                  });
                }}
              />
              {
                this.renderAccountBridge()
              }
              {
                this.renderAiAssistant()
              }
            </Layout>
          </Suspense>
        }
      </React.Fragment>
    );
  }

  renderBanner() {
    if (!Conf.IsDemoMode) {
      return null;
    }

    const language = Setting.getLanguage();
    if (language === "en" || language === "zh") {
      return null;
    }

    return (
      <Alert type="info" banner showIcon={false} closable message={
        <div style={{textAlign: "center"}}>
          <InfoCircleFilled style={{color: "rgb(87,52,211)"}} />
          &nbsp;&nbsp;
          {String(i18next.t("general:Found some texts still not translated? Please help us translate at"))}
          &nbsp;
          <a target="_blank" rel="noreferrer" href={"https://git.leagsoft.com/aicodex/aicodex-admin"}>
            aicodex-admin
          </a>
          &nbsp;!&nbsp;🙏
        </div>
      } />
    );
  }

  render() {
    return (
      <React.Fragment>
        {(this.state.account === undefined || this.state.account === null) ?
          <Helmet>
            <title>{getAdminDocumentTitle()}</title>
            <link rel="icon" href={Conf.BrandFavicon} />
            <link rel="apple-touch-icon" href={Conf.BrandTouchIcon} />
          </Helmet> :
          <Helmet>
            <title>{getAdminDocumentTitle(this.state.account)}</title>
            <link rel="icon" href={Setting.getPreferredBrandAsset(this.state.account.organization?.favicon, Conf.BrandFavicon)} />
            <link rel="apple-touch-icon" href={Conf.BrandTouchIcon} />
          </Helmet>
        }
        <ConfigProvider
          locale={getAntdLocale(Setting.getLanguage())}
          theme={{
            token: {
              colorPrimary: this.state.themeData.colorPrimary,
              colorInfo: this.state.themeData.colorPrimary,
              borderRadius: this.state.themeData.borderRadius,
            },
            algorithm: Setting.getAlgorithm(this.state.themeAlgorithm),
          }}>
          <StyleProvider hashPriority="high" transformers={[legacyLogicalPropertiesTransformer]}>
            {
              this.renderPage()
            }
          </StyleProvider>
        </ConfigProvider>
      </React.Fragment>
    );
  }
}

export default withRouter(withTranslation()(App));
