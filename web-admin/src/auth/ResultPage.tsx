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
import {Button, Card, Result, Spin} from "antd";
import i18next from "i18next";
import {authConfig} from "./Auth";
import * as ApplicationBackend from "../backend/ApplicationBackend";
import * as Setting from "../Setting";
import * as AuthBackend from "./AuthBackend";
import type {AuthApplication, HistoryLike, RouteMatch} from "./AuthTypes";

const t = (key: string): string => i18next.t(key) as string;

interface ResultPageProps {
  match: RouteMatch<{applicationName?: string}>;
  history: HistoryLike;
  onUpdateApplication: (application: AuthApplication) => void;
}

interface ResultPageState {
  classes: ResultPageProps;
  applicationName?: string;
  application: AuthApplication | null;
}

class ResultPage extends React.Component<ResultPageProps, ResultPageState> {
  constructor(props: ResultPageProps) {
    super(props);
    this.state = {
      classes: props,
      applicationName: props.match.params.applicationName !== undefined ? props.match.params.applicationName : (authConfig as {appName?: string}).appName,
      application: null,
    };
  }

  UNSAFE_componentWillMount(): void {
    if (this.state.applicationName !== undefined) {
      this.getApplication();
    } else {
      Setting.showMessage("error", `${t("general:Unknown application name")}: ${this.state.applicationName}`);
    }
  }

  getApplication(): void {
    if (this.state.applicationName === undefined) {
      return;
    }

    ApplicationBackend.getApplication("admin", this.state.applicationName)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.onUpdateApplication(res.data);
        this.setState({
          application: res.data,
        });
      });
  }

  onUpdateApplication(application: AuthApplication): void {
    this.props.onUpdateApplication(application);
  }

  handleSignIn = (): void => {
    AuthBackend.getAccount()
      .then((res) => {
        if (res.status === "ok" && res.data) {
          const linkInStorage = sessionStorage.getItem("signinUrl");
          if (linkInStorage !== null && linkInStorage !== "") {
            window.location.href = linkInStorage;
          } else {
            Setting.goToLink("/");
          }
        } else {
          Setting.redirectToLoginPage(this.state.application, this.props.history);
        }
      });
  };

  render(): React.ReactNode {
    const application = this.state.application;

    if (application === null) {
      return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          <Spin size="large" tip={t("login:Loading")} style={{paddingTop: "10%"}} />
        </div>
      );
    }

    return (
      <div style={{display: "flex", flex: "1", justifyContent: "center"}}>
        <Card>
          <div style={{marginTop: "30px", marginBottom: "30px", textAlign: "center"}}>
            {
              Setting.renderHelmet(application)
            }
            {
              Setting.renderLogo(application)
            }
            {
              Setting.renderHelmet(application)
            }
            <Result
              status="success"
              title={t("signup:Your account has been created!")}
              subTitle={t("signup:Please click the below button to sign in")}
              extra={[
                <Button type="primary" key="login" onClick={this.handleSignIn}>
                  {t("login:Sign In")}
                </Button>,
              ]}
            />
          </div>
        </Card>
      </div>
    );
  }
}

export default ResultPage;
