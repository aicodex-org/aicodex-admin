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
import {Card, Spin} from "antd";
import {withRouter} from "react-router-dom";
import * as AuthBackend from "./AuthBackend";
import * as Setting from "../Setting";
import i18next from "i18next";

const t = (key: string): string => i18next.t(key) as string;

interface CasLogoutProps {
  match?: {
    params: {
      owner?: string;
      casApplicationName?: string;
    };
  };
  location: {
    search: string;
  };
  onUpdateAccount(account: null): void;
}

interface CasLogoutState {
  classes: CasLogoutProps;
  msg: string | null;
  owner?: string;
  applicationName?: string;
}

class CasLogout extends React.Component<CasLogoutProps, CasLogoutState> {
  constructor(props: CasLogoutProps) {
    super(props);
    const initialState: CasLogoutState = {
      classes: props,
      msg: null,
    };
    if (props.match?.params.casApplicationName !== undefined) {
      initialState.owner = props.match?.params.owner;
      initialState.applicationName = props.match?.params.casApplicationName;
    }
    this.state = initialState;
  }

  UNSAFE_componentWillMount() {
    const params = new URLSearchParams(this.props.location.search);
    const logoutInterval = 100;

    const logoutTimeOut = (redirectUri?: string | null) => {
      setTimeout(() => {
        AuthBackend.getAccount().then((accountRes) => {
          if (accountRes.status === "ok") {
            AuthBackend.logout().then((logoutRes) => {
              if (logoutRes.status === "ok") {
                logoutTimeOut(logoutRes.data2);
              } else {
                Setting.showMessage("error", `${t("general:Failed to log out")}: ${logoutRes.msg}`);
              }
            });
          } else {
            Setting.showMessage("success", t("application:Logged out successfully"));
            this.props.onUpdateAccount(null);
            if (redirectUri !== null && redirectUri !== undefined && redirectUri !== "") {
              Setting.goToLink(redirectUri);
            } else if (params.has("service")) {
              Setting.goToLink(params.get("service") as string);
            } else {
              Setting.goToLinkSoft(this, `/cas/${this.state.owner}/${this.state.applicationName}/login`);
            }
          }
        });
      }, logoutInterval);
    };

    AuthBackend.logout()
      .then((res) => {
        if (res.status === "ok") {
          logoutTimeOut(res.data2);
        } else {
          Setting.showMessage("error", `${t("general:Failed to log out")}: ${res.msg}`);
        }
      });
  }

  render() {
    return (
      <Card>
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          {
            <Spin size="large" tip={t("login:Logging out...")} style={{paddingTop: "10%"}} />
          }
        </div>
      </Card>
    );
  }
}
export default withRouter(CasLogout);
