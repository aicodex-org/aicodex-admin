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
import {Button, Col, Input, Row, Switch} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import {authConfig} from "../auth/Auth";
import copy from "copy-to-clipboard";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig, UpdateProviderField} from "./ProviderFieldTypes";

const t = i18next.t.bind(i18next) as (key: string) => string;

const {TextArea} = Input;

const samlAuthConfig = authConfig as {serverUrl: string};

interface SamlMetadataConfig {
  requestUrl: string;
  setRequestUrl: (value: string) => void;
  metadataLoading: boolean;
  fetchSamlMetadata: () => void;
  parseSamlMetadata: () => void;
}

export function renderSamlProviderFields(provider: ProviderConfig, updateProviderField: UpdateProviderField, metadataConfig: SamlMetadataConfig): React.ReactNode {
  const {requestUrl, setRequestUrl, metadataLoading, fetchSamlMetadata, parseSamlMetadata} = metadataConfig;
  return (
    <React.Fragment>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:Sign request"), t("provider:Sign request - Tooltip"))} :
        </Col>
        <Col span={22} >
          <Switch checked={provider.enableSignAuthnRequest} onChange={checked => {
            updateProviderField("enableSignAuthnRequest", checked);
          }} />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:Metadata url"), t("provider:Metadata url - Tooltip"))} :
        </Col>
        <Col span={6} >
          <Input value={requestUrl} onChange={e => {
            setRequestUrl(e.target.value);
          }} />
        </Col>
        <Col span={16} >
          <Button style={{marginLeft: "10px"}} type="primary" loading={metadataLoading} onClick={() => {fetchSamlMetadata();}}>{t("general:Request")}</Button>
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:Metadata"), t("provider:Metadata - Tooltip"))} :
        </Col>
        <Col span={22}>
          <TextArea rows={4} value={provider.metadata} onChange={e => {
            updateProviderField("metadata", e.target.value);
          }} />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}}>
        <Col style={{marginTop: "5px"}} span={2} />
        <Col span={2}>
          <Button type="primary" onClick={() => {parseSamlMetadata();}}>
            {t("provider:Parse")}
          </Button>
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:Endpoint"), t("provider:SAML 2.0 Endpoint (HTTP)"))} :
        </Col>
        <Col span={22} >
          <Input value={provider.endpoint} onChange={e => {
            updateProviderField("endpoint", e.target.value);
          }} />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:IdP"), t("provider:IdP certificate"))} :
        </Col>
        <Col span={22} >
          <Input value={provider.idP} onChange={e => {
            updateProviderField("idP", e.target.value);
          }} />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:Issuer URL"), t("provider:Issuer URL - Tooltip"))} :
        </Col>
        <Col span={22} >
          <Input value={provider.issuerUrl} onChange={e => {
            updateProviderField("issuerUrl", e.target.value);
          }} />
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:SP ACS URL"), t("provider:SP ACS URL - Tooltip"))} :
        </Col>
        <Col span={21} >
          <Input value={`${samlAuthConfig.serverUrl}/api/acs`} readOnly />
        </Col>
        <Col span={1}>
          <Button type="primary" onClick={() => {
            copy(`${samlAuthConfig.serverUrl}/api/acs`);
            Setting.showMessage("success", t("general:Copied to clipboard successfully"));
          }}>
            {t("general:Copy")}
          </Button>
        </Col>
      </Row>
      <Row style={{marginTop: "20px"}} >
        <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
          {Setting.getLabel(t("provider:SP Entity ID"), t("provider:SP Entity ID - Tooltip"))} :
        </Col>
        <Col span={21} >
          <Input value={`${samlAuthConfig.serverUrl}/api/acs`} readOnly />
        </Col>
        <Col span={1}>
          <Button type="primary" onClick={() => {
            copy(`${samlAuthConfig.serverUrl}/api/acs`);
            Setting.showMessage("success", t("general:Copied to clipboard successfully"));
          }}>
            {t("general:Copy")}
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  );
}
