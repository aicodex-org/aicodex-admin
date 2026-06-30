// Copyright 2026 The Casdoor Authors. All Rights Reserved.
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
import {Col, Input, Row} from "antd";
import {LinkOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
import i18next from "i18next";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig, UpdateProviderField} from "./ProviderFieldTypes";

const t = i18next.t.bind(i18next) as (key: string) => string;

export function renderIDVerificationProviderFields(provider: ProviderConfig, updateProviderField: UpdateProviderField): React.ReactNode {
  return (
    <Row style={{marginTop: "20px"}} >
      <Col style={{marginTop: "5px"}} span={2}>
        {Setting.getLabel(t("provider:Endpoint"), t("provider:Region endpoint for Internet"))} :
      </Col>
      <Col span={22} >
        <Input prefix={<LinkOutlined />} value={provider.endpoint} onChange={e => {
          updateProviderField("endpoint", e.target.value);
        }} />
      </Col>
    </Row>
  );
}
