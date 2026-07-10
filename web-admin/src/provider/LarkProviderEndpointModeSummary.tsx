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
import i18next from "i18next";
import {getLarkProviderEndpointModeInfo, isLarkProvider} from "./LarkProviderUtils";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig} from "./ProviderFieldTypes";

const t = i18next.t.bind(i18next) as (key: string) => string;

export function LarkProviderEndpointModeSummary({provider}: {provider: ProviderConfig}): React.ReactElement | null {
  if (!isLarkProvider(provider)) {
    return null;
  }

  const endpointModeInfo = getLarkProviderEndpointModeInfo(provider);

  return (
    <div className="provider-edit-endpoint-mode-panel">
      <div className="provider-edit-endpoint-mode-header">
        <span className="provider-edit-endpoint-mode-label">{t("provider:Selected endpoint mode")}</span>
        <span className="provider-edit-endpoint-mode-badge">{t(`provider:${endpointModeInfo.modeName}`)}</span>
      </div>
      <div className="provider-edit-endpoint-mode-grid">
        <span className="provider-edit-endpoint-mode-label">{t("provider:Authorization domain")}</span>
        <code className="provider-edit-endpoint-mode-code">{endpointModeInfo.authDomain}</code>
        <span className="provider-edit-endpoint-mode-label">{t("provider:API domain")}</span>
        <code className="provider-edit-endpoint-mode-code">{endpointModeInfo.apiDomain}</code>
        <span className="provider-edit-endpoint-mode-label">{t("provider:App ID and App Secret must come from")}</span>
        <span className="provider-edit-endpoint-mode-value">{t(`provider:${endpointModeInfo.credentialPlatform}`)}</span>
      </div>
    </div>
  );
}
