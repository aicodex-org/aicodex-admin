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

import {Button} from "antd";
import React from "react";
import i18next from "i18next";
import {CaptchaModal} from "./modal/CaptchaModal";
import * as UserBackend from "../backend/UserBackend";
type LegacyAny = import("../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

export const CaptchaPreview = (props: LegacyAny) => {
  const {owner, name, provider, captchaType, subType, clientId, clientSecret, clientId2, clientSecret2, providerUrl} = props;
  const [open, setOpen] = React.useState(false);

  const clickPreview = () => {
    provider.name = name;
    provider.clientId = clientId;
    provider.type = captchaType;
    provider.providerUrl = providerUrl;
    if (clientSecret !== "***") {
      provider.clientSecret = clientSecret;
      setOpen(true);
    } else {
      setOpen(true);
    }
  };

  const isButtonDisabled = () => {
    if (captchaType !== "Default") {
      if (!clientId || !clientSecret) {
        return true;
      }
      if (captchaType === "Aliyun Captcha") {
        if (!subType || !clientId2 || !clientSecret2) {
          return true;
        }
      }
    }
    return false;
  };

  const onOk = (captchaType: LegacyAny, captchaToken: LegacyAny, clientSecret: LegacyAny) => {
    UserBackend.verifyCaptcha(owner, name, captchaType, captchaToken, clientSecret).then(() => {
      setOpen(false);
    });
  };

  const onCancel = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <Button
        style={{fontSize: 14}}
        type={"primary"}
        onClick={clickPreview}
        disabled={isButtonDisabled()}
      >
        {t("general:Preview")}
      </Button>
      <CaptchaModal
        owner={owner}
        name={name}
        open={open}
        onOk={onOk}
        onCancel={onCancel}
        isCurrentProvider={true}
      />
    </React.Fragment>
  );
};
