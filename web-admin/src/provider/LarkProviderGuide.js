// Copyright 2026 The AICodex Authors. All Rights Reserved.
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
import {Alert, Col, Input, Row} from "antd";
import i18next from "i18next";
import * as Setting from "../Setting";
import {getLarkProviderCallbackUrl, getLarkProviderEndpointModeInfo, isLarkProvider} from "./LarkProviderUtils";

export function renderLarkProviderGuide(provider, origin = window.location.origin) {
  if (!isLarkProvider(provider)) {
    return null;
  }

  const endpointModeInfo = getLarkProviderEndpointModeInfo(provider);
  const callbackUrl = getLarkProviderCallbackUrl(origin);

  return (
    <React.Fragment>
      <Row style={{marginTop: "20px"}}>
        <Col span={24}>
          <Alert
            type="info"
            showIcon
            message={i18next.t("provider:Feishu / Lark login setup")}
            description={(
              <div>
                <div>{i18next.t("provider:Lark Provider type supports domestic Feishu and global Lark; no separate Feishu Provider type is required")}</div>
                <div>{`${i18next.t("provider:Selected endpoint mode")}: ${i18next.t(`provider:${endpointModeInfo.modeName}`)}`}</div>
                <div>{i18next.t("provider:Configure this callback URL in the matching Feishu or Lark open platform application")}</div>
                <div>{i18next.t("provider:If an application uses forcedRedirectOrigin or shares this Provider, use the authentication center origin that actually starts login")}</div>
                <div>{i18next.t("provider:The AICodex client redirect URI is downstream; desktop custom scheme deep link must not be configured as the Feishu or Lark callback URL")}</div>
              </div>
            )}
          />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}}>
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(i18next.t("provider:Callback URL"), i18next.t("provider:Feishu / Lark callback URL - Tooltip"))} :
        </Col>
        <Col span={22}>
          <Input readOnly value={callbackUrl} />
        </Col>
      </Row>
    </React.Fragment>
  );
}
