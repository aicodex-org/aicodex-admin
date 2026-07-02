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

import i18next from "i18next";
import React from "react";
import ApplicationAccessServiceCredentialGovernancePanel from "./ApplicationAccessServiceCredentialGovernancePanel";
import {EnterpriseIdentityConsolePage} from "./common/EnterpriseIdentityConsoleLayout";

function t(key: string, defaultValue = key): string {
  const namespacedKey = `general:${key}`;
  const translated = i18next.t(namespacedKey, {defaultValue});
  return translated === namespacedKey || translated === key ? defaultValue : String(translated);
}

function ApplicationUsageAccessPage(): React.ReactElement {
  return (
    <EnterpriseIdentityConsolePage
      className="application-usage-access-page"
      eyebrow={t("Usage access handoff eyebrow", "应用接入 / 用量接入 / Admin Provider")}
      title={t("Usage access handoff title", "Insight Admin Provider 交接")}
    >
      <ApplicationAccessServiceCredentialGovernancePanel className="application-usage-access-service-credential-panel" />
    </EnterpriseIdentityConsolePage>
  );
}

export default ApplicationUsageAccessPage;
