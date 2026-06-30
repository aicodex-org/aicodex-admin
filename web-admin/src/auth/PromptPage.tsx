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
import {Button, Card, Col, Result, Row} from "antd";
import * as ApplicationBackend from "../backend/ApplicationBackend";
import * as UserBackend from "../backend/UserBackend";
import * as Setting from "../Setting";
import i18next from "i18next";
import AffiliationSelect from "../common/select/AffiliationSelect";
import OAuthWidget from "../common/OAuthWidget";
import RegionSelect from "../common/select/RegionSelect";
import {withRouter} from "react-router-dom";
import * as AuthBackend from "./AuthBackend";
import type {AuthApplication, HistoryLike, LocationLike, RouteMatch} from "./AuthTypes";

const t = (key: string): string => i18next.t(key) as string;

interface PromptUser extends Record<string, unknown> {
  owner: string;
  name: string;
  region?: string;
}

interface PromptStep {
  content: React.ReactNode;
  name: string;
  title: string;
}

interface PromptPageProps {
  type?: string;
  applicationName?: string | null;
  application?: AuthApplication | null;
  account: PromptUser;
  match?: RouteMatch<{applicationName?: string}>;
  location: LocationLike;
  history: HistoryLike;
  onUpdateApplication: (application: AuthApplication) => void;
  onUpdateAccount: (account: PromptUser | null) => void;
}

interface PromptPageState {
  classes: PromptPageProps;
  type?: string;
  applicationName: string | null;
  application: AuthApplication | null;
  user: PromptUser | null;
  steps: PromptStep[] | null;
  current: number;
  finished: boolean;
}

class PromptPage extends React.Component<PromptPageProps, PromptPageState> {
  constructor(props: PromptPageProps) {
    super(props);
    this.state = {
      classes: props,
      type: props.type,
      applicationName: props.applicationName ?? (props.match === undefined ? null : props.match.params.applicationName ?? null),
      application: null,
      user: null,
      steps: null,
      current: 0,
      finished: false,
    };
  }

  UNSAFE_componentWillMount(): void {
    this.getUser();
    if (this.getApplicationObj() === null) {
      this.getApplication();
    }
  }

  componentDidUpdate(): void {
    if (this.state.user !== null && this.getApplicationObj() !== null && this.state.steps === null) {
      const application = this.getApplicationObj();
      if (application !== null) {
        this.initSteps(this.state.user, application);
      }
    }
  }

  getUser(): void {
    const organizationName = this.props.account.owner;
    const userName = this.props.account.name;
    UserBackend.getUser(organizationName, userName)
      .then((res) => {
        if (res.status === "error") {
          Setting.showMessage("error", res.msg);
          return;
        }

        this.setState({
          user: res.data as PromptUser,
        });
      });
  }

  getApplication(): void {
    if (this.state.applicationName === null) {
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

  getApplicationObj(): AuthApplication | null {
    return this.props.application ?? this.state.application;
  }

  onUpdateApplication(application: AuthApplication): void {
    this.props.onUpdateApplication(application);
  }

  parseUserField(key: string, value: unknown): unknown {
    // if ([].includes(key)) {
    //   value = Setting.myParseInt(value);
    // }
    return value;
  }

  updateUserField(key: string, value: unknown): void {
    value = this.parseUserField(key, value);

    const user = this.state.user;
    if (user === null) {
      return;
    }
    user[key] = value;
    this.setState({
      user: user,
    });

    this.submitUserEdit(false);
  }

  updateUserFieldWithoutSubmit(key: string, value: unknown): void {
    value = this.parseUserField(key, value);

    const user = this.state.user;
    if (user === null) {
      return;
    }
    user[key] = value;
    this.setState({
      user: user,
    });
  }

  renderAffiliation(application: AuthApplication | null): React.ReactNode {
    if (!Setting.isAffiliationPrompted(application)) {
      return null;
    }

    if (application === null || this.state.user === null) {
      return null;
    }

    return (
      <AffiliationSelect labelSpan={6} application={application} user={this.state.user} onUpdateUserField={(key: string, value: unknown) => {return this.updateUserField(key, value);}} />
    );
  }

  unlinked(): void {
    this.getUser();
  }

  renderContent(application: AuthApplication | null): React.ReactNode {
    const user = this.state.user;
    return (
      <div style={{width: "500px"}}>
        {
          this.renderAffiliation(application)
        }
        <div>
          {
            (application === null || user === null) ? null : (
              application?.providers?.filter(providerItem => Setting.isProviderPrompted(providerItem)).map((providerItem) => <OAuthWidget key={providerItem.name} labelSpan={6} user={user} application={application} providerItem={providerItem} account={this.props.account} onUnlinked={() => {return this.unlinked();}} />)
            )
          }
          {
            (application === null || user === null) ? null : (
              (application?.signupItems as Array<{name: string}> | undefined)?.filter(signupItem => Setting.isSignupItemPrompted(signupItem)).map((signupItem) => {
                if (signupItem.name !== "Country/Region") {
                  return null;
                }
                return (
                  <Row key={signupItem.name} style={{marginTop: "20px", justifyContent: "space-between"}} >
                    <Col style={{marginTop: "5px"}} >
                      <span style={{marginLeft: "5px"}}>
                        {
                          t("user:Country/Region")
                        }:
                      </span>
                    </Col>
                    <Col >
                      <RegionSelect defaultValue={user.region} onChange={(value: unknown) => {
                        this.updateUserFieldWithoutSubmit("region", value);
                      }} />
                    </Col>
                  </Row>
                );
              })
            )
          }
        </div>
      </div>
    );
  }

  onUpdateAccount(account: PromptUser | null): void {
    this.props.onUpdateAccount(account);
  }

  getRedirectUrl(): string | null {
    // "/prompt/app-example?redirectUri=http://localhost:2000/callback&code=8eb113b072296818f090&state=app-example"
    const params = new URLSearchParams(this.props.location.search);
    const redirectUri = params.get("redirectUri");
    const code = params.get("code");
    const state = params.get("state");
    const oauth = params.get("oauth");
    if (redirectUri === null || code === null || state === null) {
      const signInUrl = sessionStorage.getItem("signinUrl");
      return oauth === "true" ? signInUrl : "";
    }
    return `${redirectUri}?code=${code}&state=${state}`;
  }

  logout(): void {
    AuthBackend.logout()
      .then((res) => {
        if (res.status === "ok") {
          this.onUpdateAccount(null);
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  finishAndJump(): void {
    this.setState({
      finished: true,
    }, () => {
      const redirectUrl = this.getRedirectUrl();
      if (redirectUrl !== "" && redirectUrl !== null) {
        Setting.goToLink(redirectUrl);
      } else {
        Setting.redirectToLoginPage(this.getApplicationObj(), this.props.history);
      }
    });
  }

  submitUserEdit(isFinal: boolean): void {
    if (this.state.user === null) {
      return;
    }
    const user = Setting.deepCopy(this.state.user) as PromptUser;
    UserBackend.updateUser(this.state.user.owner, this.state.user.name, user)
      .then((res) => {
        if (res.status === "ok") {
          if (isFinal) {
            Setting.showMessage("success", t("general:Successfully saved"));
            this.finishAndJump();
          }
        } else {
          if (isFinal) {
            Setting.showMessage("error", res.msg);
          }
        }
      })
      .catch((error: unknown) => {
        if (isFinal) {
          Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
        }
      });
  }

  renderPromptProvider(application: AuthApplication | null): React.ReactNode {
    return (
      <div style={{display: "flex", alignItems: "center", flexDirection: "column"}}>
        {this.renderContent(application)}
        <Button style={{marginTop: "50px", width: "200px"}}
          disabled={!Setting.isPromptAnswered(this.state.user, application)}
          type="primary" size="large" onClick={() => {
            this.submitUserEdit(true);
          }}>
          {t("code:Submit and complete")}
        </Button>
      </div>);
  }

  initSteps(user: PromptUser, application: AuthApplication): void {
    const steps: PromptStep[] = [];
    if (Setting.hasPromptPage(application)) {
      steps.push({
        content: this.renderPromptProvider(application),
        name: "provider",
        title: t("application:Binding providers"),
      });
    }

    this.setState({
      steps: steps,
    });
  }

  renderSteps(): React.ReactNode {
    if (this.state.steps === null || this.state.steps?.length === 0) {
      return null;
    }

    return (
      <Card style={{marginTop: "20px", marginBottom: "20px"}}
        title={this.state.steps[this.state.current].title}
      >
        <div >{this.state.steps[this.state.current].content}</div>
      </Card>
    );
  }

  render(): React.ReactNode {
    const application = this.getApplicationObj();
    if (application === null) {
      return null;
    }

    if (this.state.steps?.length === 0) {
      return (
        <Result
          style={{display: "flex", flex: "1 1 0%", justifyContent: "center", flexDirection: "column"}}
          status="error"
          title={t("application:Sign Up Error")}
          subTitle={t("application:You are unexpected to see this prompt page")}
          extra={[
            <Button type="primary" key="signin" onClick={() => Setting.redirectToLoginPage(application, this.props.history)}>
              {
                t("login:Sign In")
              }
            </Button>,
          ]}
        >
        </Result>
      );
    }

    return (
      <div style={{display: "flex", flex: "1", justifyContent: "center"}}>
        {this.renderSteps()}
      </div>
    );
  }
}

export default withRouter(PromptPage);
