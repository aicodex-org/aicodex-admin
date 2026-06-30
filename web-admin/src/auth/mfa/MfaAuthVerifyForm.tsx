// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

import React, {Fragment, useState} from "react";
import i18next from "i18next";
import {Button, Input} from "antd";
import * as AuthBackend from "../AuthBackend";
import {EmailMfaType, PushMfaType, RecoveryMfaType, SmsMfaType, TotpMfaType} from "../MfaSetupPage";
import {mfaAuth} from "./MfaVerifyForm";
import MfaVerifySmsForm from "./MfaVerifySmsForm";
import MfaVerifyTotpForm from "./MfaVerifyTotpForm";
import MfaVerifyRadiusForm from "./MfaVerifyRadiusForm";
import MfaVerifyPushForm from "./MfaVerifyPushForm";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {AuthApiResponse, LegacyRecord} from "../AuthCoreTypes";
import type {MfaProps} from "./MfaVerifyForm";
const t = i18next.t as (key: string) => string;

export const NextMfa = "NextMfa";
export const RequiredMfa = "RequiredMfa";

interface MfaAuthVerifyFormProps {
  formValues: LegacyRecord;
  authParams: LegacyRecord | null;
  mfaProps: MfaProps;
  application?: LegacyRecord | null;
  onSuccess: (res: AuthApiResponse) => void;
  onFail: (message: string) => void;
  verifyAuth?: (values: LegacyRecord) => Promise<AuthApiResponse>;
  recoverAuth?: (values: LegacyRecord) => Promise<AuthApiResponse>;
}

export function MfaAuthVerifyForm({formValues, authParams, mfaProps, application, onSuccess, onFail, verifyAuth, recoverAuth}: MfaAuthVerifyFormProps) {
  formValues.password = "";
  formValues.username = "";
  const [loading, setLoading] = useState(false);
  const [mfaType, setMfaType] = useState(mfaProps.mfaType);
  const [recoveryCode, setRecoveryCode] = useState("");

  const verify = ({passcode, enableMfaRemember}: LegacyRecord) => {
    setLoading(true);
    const values: LegacyRecord = {...formValues, passcode, enableMfaRemember};
    values["mfaType"] = mfaProps.mfaType;
    const loginFunction = formValues.type === "cas" ? AuthBackend.loginCas : AuthBackend.login;
    const authFunction = verifyAuth || ((values: LegacyRecord) => loginFunction(values, authParams));
    authFunction(values).then((res) => {
      if (res.status === "ok") {
        onSuccess(res);
      } else {
        onFail(res.msg);
      }
    }).catch((res) => {
      onFail(res.message);
    }).finally(() => {
      setLoading(false);
    });
  };

  const recover = () => {
    setLoading(true);
    const values = {...formValues, recoveryCode};
    const loginFunction = formValues.type === "cas" ? AuthBackend.loginCas : AuthBackend.login;
    const authFunction = recoverAuth || ((values: LegacyRecord) => loginFunction(values, authParams));
    authFunction(values).then((res) => {
      if (res.status === "ok") {
        onSuccess(res);
      } else {
        onFail(res.msg);
      }
    }).catch((res) => {
      onFail(res.message);
    }).finally(() => {
      setLoading(false);
    });
  };

  if (mfaType !== RecoveryMfaType) {
    return (
      <div style={{width: 320, height: 350}}>
        <div style={{marginBottom: 24, textAlign: "center", fontSize: "24px"}}>
          {t("mfa:Multi-factor authentication")}
        </div>
        {mfaProps.mfaType === SmsMfaType || mfaProps.mfaType === EmailMfaType ? (
          <Fragment>
            <div style={{marginBottom: 24}}>
              {t("mfa:You have enabled Multi-Factor Authentication, Please click 'Send Code' to continue")}
            </div>
            <MfaVerifySmsForm
              mfaProps={mfaProps}
              method={mfaAuth}
              onFinish={verify}
              application={application}
            />
          </Fragment>
        ) : mfaProps.mfaType === TotpMfaType ? (
          <Fragment>
            <div style={{marginBottom: 24}}>
              {t("mfa:You have enabled Multi-Factor Authentication, please enter the TOTP code")}
            </div>
            <MfaVerifyTotpForm
              mfaProps={mfaProps}
              onFinish={verify}
            />
          </Fragment>
        ) : mfaProps.mfaType === PushMfaType ? (
          <Fragment>
            <div style={{marginBottom: 24}}>
              {t("mfa:You have enabled Multi-Factor Authentication, please enter the verification code from push notification")}
            </div>
            <MfaVerifyPushForm
              mfaProps={mfaProps}
              method={mfaAuth}
              onFinish={verify}
            />
          </Fragment>
        ) : (
          <Fragment>
            <div style={{marginBottom: 24}}>
              {t("mfa:You have enabled Multi-Factor Authentication, please enter the RADIUS password")}
            </div>
            <MfaVerifyRadiusForm
              mfaProps={mfaProps}
              method={mfaAuth}
              onFinish={verify}
            />
          </Fragment>
        )}
        <span style={{float: "right"}}>
          {t("mfa:Have problems?")}
          <a onClick={() => {
            setMfaType("recovery");
          }}>
            {t("mfa:Use a recovery code")}
          </a>
        </span>
      </div>
    );
  } else {
    return (
      <div style={{width: 300, height: 350}}>
        <div style={{marginBottom: 24, textAlign: "center", fontSize: "24px"}}>
          {t("mfa:Multi-factor recover")}
        </div>
        <div style={{marginBottom: 24}}>
          {t("mfa:Multi-factor recover description")}
        </div>
        <Input placeholder={t("mfa:Recovery code")}
          style={{marginBottom: 24}}
          type={"passcode"}
          size={"large"}
          onChange={event => setRecoveryCode(event.target.value)}
        />
        <Button style={{width: "100%", marginBottom: 20}} size={"large"} loading={loading}
          type={"primary"} onClick={() => {
            recover();
          }}>{t("forget:Verify")}
        </Button>
        <span style={{float: "right"}}>
          {t("mfa:Have problems?")}
          <a onClick={() => {
            setMfaType(mfaProps.mfaType);
          }}>
            {t("mfa:Use SMS verification code")}
          </a>
        </span>
      </div>
    );
  }
}
