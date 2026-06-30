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

import * as Setting from "../Setting";
import i18next from "i18next";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

export function sendTestEmail(provider: LegacyAny, email: LegacyAny): void {
  testEmailProvider(provider, email)
    .then((res: LegacyAny) => {
      if (res.status === "ok") {
        Setting.showMessage("success", t("general:Successfully sent"));
      } else {
        Setting.showMessage("error", res.msg);
      }
    })
    .catch((error: LegacyAny) => {
      Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
    });
}

export function connectSmtpServer(provider: LegacyAny): void {
  testEmailProvider(provider)
    .then((res: LegacyAny) => {
      if (res.status === "ok") {
        Setting.showMessage("success", t("provider:SMTP connected successfully"));
      } else {
        Setting.showMessage("error", res.msg);
      }
    })
    .catch((error: LegacyAny) => {
      Setting.showMessage("error", `${t("general:Failed to connect to server")}: ${error}`);
    });
}

function testEmailProvider(provider: LegacyAny, email = ""): Promise<LegacyAny> {
  const emailForm = {
    title: provider.title,
    content: provider.content,
    sender: provider.displayName,
    receivers: email === "" ? ["TestSmtpServer"] : [email],
    provider: provider.name,
    providerObject: provider,
    owner: provider.owner,
    name: provider.name,
  };

  return fetch(`${Setting.ServerUrl}/api/send-email`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(emailForm),
  }).then((res: LegacyAny) => res.json());
}
