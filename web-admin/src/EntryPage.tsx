// Copyright 2022 The Casdoor Authors. All Rights Reserved.
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
import * as ReactRouterDom from "react-router-dom";
import {Spin} from "antd";
import i18next from "i18next";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import PricingPage from "./pricing/PricingPage";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import SignupPage from "./auth/SignupPage";
import SelfLoginPage from "./auth/SelfLoginPage";
import LoginPage from "./auth/LoginPage";
import SelfForgetPage from "./auth/SelfForgetPage";
import ForgetPage from "./auth/ForgetPage";
import PromptPage from "./auth/PromptPage";
import ConsentPage from "./auth/ConsentPage";
import ResultPage from "./auth/ResultPage";
import CasLogout from "./auth/CasLogout";
import {authConfig} from "./auth/Auth";
import ProductBuyPage from "./ProductBuyPage";
import PaymentResultPage from "./PaymentResultPage";
import QrCodePage from "./QrCodePage";
import CaptchaPage from "./CaptchaPage";
import CustomHead from "./basic/CustomHead";
import * as Util from "./auth/Util";

// EntryPage 汇聚仍由其它并行批次迁移的 auth/pricing/shell 组件，宽松边界只保留在本文件内。
type LegacyAny = any;

interface EntryApplication {
  name?: string;
  headerHtml?: string;
  formBackgroundUrl?: string;
  formBackgroundUrlMobile?: string;
  ipRestriction?: string;
  organizationObj?: {
    ipRestriction?: string;
    [key: string]: LegacyAny;
  };
  [key: string]: LegacyAny;
}

interface EntryPricing {
  application?: string;
  [key: string]: LegacyAny;
}

interface EntryPageProps {
  account?: LegacyAny | null;
  themeAlgorithm: string | string[];
  updataThemeData: (themeData: LegacyAny, initThemeAlgorithm: boolean) => void;
  updateApplication: (application: EntryApplication | null) => void;
  [key: string]: LegacyAny;
}

interface EntryPageState {
  application?: EntryApplication | null;
  pricing?: EntryPricing | null;
}

type RouteRenderProps = Record<string, LegacyAny>;

const {Redirect, Route, Switch} = ReactRouterDom as unknown as {
  Redirect: React.ComponentType<LegacyAny>;
  Route: React.ComponentType<LegacyAny>;
  Switch: React.ComponentType<{children?: React.ReactNode}>;
};
const typedAuthConfig = authConfig as {appName?: string};
const t = (key: string): string => String(i18next.t(key));
const LoosePromptPage = PromptPage as React.ComponentType<LegacyAny>;
const LooseResultPage = ResultPage as React.ComponentType<LegacyAny>;
const LooseCasLogout = CasLogout as React.ComponentType<LegacyAny>;
const LoosePricingPage = PricingPage as React.ComponentType<LegacyAny>;
const LooseProductBuyPage = ProductBuyPage as React.ComponentType<LegacyAny>;
const LoosePaymentResultPage = PaymentResultPage as React.ComponentType<LegacyAny>;

class EntryPage extends React.Component<EntryPageProps, EntryPageState> {
  constructor(props: EntryPageProps) {
    super(props);
    this.state = {
      application: undefined,
      pricing: undefined,
    };
  }

  renderHomeIfLoggedIn(component: React.ReactNode): React.ReactNode {
    if (this.props.account !== null && this.props.account !== undefined) {
      return <Redirect to={{pathname: "/", state: {from: "/login"}}} />;
    } else {
      return component;
    }
  }

  renderLoginIfNotLoggedIn(component: React.ReactNode): React.ReactNode {
    if (this.props.account === null) {
      sessionStorage.setItem("from", window.location.pathname);
      return <Redirect to="/login" />;
    } else if (this.props.account === undefined) {
      return null;
    } else {
      return component;
    }
  }

  render() {
    const onUpdateApplication = (application: EntryApplication | null) => {
      this.setState({
        application: application,
      });
      const themeData = application !== null ? Setting.getThemeData(application.organizationObj, application) : Conf.ThemeDefault;
      this.props.updataThemeData(themeData, false);
      this.props.updateApplication(application);

      if (application) {
        localStorage.setItem("applicationName", application.name || "");
      }
    };

    const onUpdatePricing = (pricing: EntryPricing) => {
      this.setState({
        pricing: pricing,
      });

      ApplicationBackend.getApplication("admin", pricing.application)
        .then((res) => {
          if (res.status === "error") {
            Setting.showMessage("error", res.msg);
            return;
          }
          const application = res.data;
          const themeData = application !== null ? Setting.getThemeData(application.organizationObj, application) : Conf.ThemeDefault;
          this.props.updataThemeData(themeData, false);
        });
    };

    if (this.state.application?.ipRestriction) {
      return Util.renderMessageLarge(this, this.state.application.ipRestriction);
    }

    if (this.state.application?.organizationObj?.ipRestriction) {
      return Util.renderMessageLarge(this, this.state.application.organizationObj.ipRestriction);
    }

    const isDarkMode = this.props.themeAlgorithm.includes("dark");
    const backgroundImage = Setting.inIframe()
      ? undefined
      : (Setting.isMobile() ? `url(${this.state.application?.formBackgroundUrlMobile})` : `url(${this.state.application?.formBackgroundUrl})`);

    return (
      <React.Fragment>
        <CustomHead headerHtml={this.state.application?.headerHtml} />
        <div className={`${isDarkMode ? "loginBackgroundDark" : "loginBackground"}`}
          style={{backgroundImage}}>
          <Spin size="large" spinning={this.state.application === undefined && this.state.pricing === undefined} tip={t("login:Loading")}
            style={{width: "100%", margin: "0 auto", position: "absolute"}} />
          <Switch>
            <Route exact path="/signup" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<SignupPage {...this.props} application={this.state.application} applicationName={typedAuthConfig.appName || ""} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/signup/:applicationName" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<SignupPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/login" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<SelfLoginPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/login/:owner" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<SelfLoginPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/signup/oauth/authorize" render={(props: RouteRenderProps) => <SignupPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/login/oauth/authorize" render={(props: RouteRenderProps) => <LoginPage {...this.props} application={this.state.application} type={"code"} mode={"signin"} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/login/oauth/device/:userCode" render={(props: RouteRenderProps) => <LoginPage {...this.props} application={this.state.application} type={"device"} mode={"signin"} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/login/saml/authorize/:owner/:applicationName" render={(props: RouteRenderProps) => <LoginPage {...this.props} application={this.state.application} type={"saml"} mode={"signin"} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/forget" render={(props: RouteRenderProps) => <SelfForgetPage {...this.props} account={this.props.account} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/forget/:applicationName" render={(props: RouteRenderProps) => <ForgetPage {...this.props} account={this.props.account} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/prompt" render={(props: RouteRenderProps) => this.renderLoginIfNotLoggedIn(<LoosePromptPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/prompt/:applicationName" render={(props: RouteRenderProps) => this.renderLoginIfNotLoggedIn(<LoosePromptPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/consent/:applicationName" render={(props: RouteRenderProps) => this.renderLoginIfNotLoggedIn(<ConsentPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/result" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<LooseResultPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/result/:applicationName" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<LooseResultPage {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/cas/:owner/:casApplicationName/logout" render={(props: RouteRenderProps) => this.renderHomeIfLoggedIn(<LooseCasLogout {...this.props} application={this.state.application} onUpdateApplication={onUpdateApplication} {...props} />)} />
            <Route exact path="/cas/:owner/:casApplicationName/login" render={(props: RouteRenderProps) => {return (<LoginPage {...this.props} application={this.state.application} type={"cas"} mode={"signin"} onUpdateApplication={onUpdateApplication} {...props} />);}} />
            <Route exact path="/select-plan/:owner/:pricingName" render={(props: RouteRenderProps) => <LoosePricingPage {...this.props} pricing={this.state.pricing} onUpdatePricing={onUpdatePricing} {...props} />} />
            <Route exact path="/buy-plan/:owner/:pricingName" render={(props: RouteRenderProps) => <LooseProductBuyPage {...this.props} pricing={this.state.pricing} onUpdatePricing={onUpdatePricing} {...props} />} />
            <Route exact path="/buy-plan/:owner/:pricingName/result" render={(props: RouteRenderProps) => <LoosePaymentResultPage {...this.props} pricing={this.state.pricing} onUpdatePricing={onUpdatePricing} {...props} />} />
            <Route exact path="/qrcode/:owner/:paymentName" render={(props: RouteRenderProps) => <QrCodePage {...this.props} onUpdateApplication={onUpdateApplication} {...props} />} />
            <Route exact path="/captcha" render={(props: RouteRenderProps) => <CaptchaPage {...props} />} />
          </Switch>
        </div>

      </React.Fragment>
    );
  }
}

export default EntryPage;
