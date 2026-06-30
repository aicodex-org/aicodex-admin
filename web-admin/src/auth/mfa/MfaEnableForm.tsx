import {Button} from "antd";
import i18next from "i18next";
import React, {useState} from "react";
import * as MfaBackend from "../../backend/MfaBackend";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {AuthApiResponse, LegacyRecord} from "../AuthCoreTypes";
const t = i18next.t as (key: string) => string;

interface MfaEnableFormProps {
  user?: LegacyRecord | null;
  mfaType?: string;
  secret?: string;
  recoveryCodes?: string[];
  dest?: string;
  countryCode?: string;
  onSuccess: (res: AuthApiResponse) => void;
  onFail: (res: AuthApiResponse) => void;
}

export function MfaEnableForm({user, mfaType, secret, recoveryCodes, dest, countryCode, onSuccess, onFail}: MfaEnableFormProps) {
  const [loading, setLoading] = useState(false);
  const requestEnableMfa = () => {
    const data: LegacyRecord = {
      mfaType,
      secret,
      dest,
      countryCode,
      ...user,
    };
    data["recoveryCodes"] = recoveryCodes?.[0];
    setLoading(true);
    MfaBackend.MfaSetupEnable(data).then(res => {
      if (res.status === "ok") {
        onSuccess(res);
      } else {
        onFail(res);
      }
    }
    ).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div style={{width: "400px"}}>
      <p>{t("mfa:Please save this recovery code. Once your device cannot provide an authentication code, you can reset mfa authentication by this recovery code")}</p>
      <br />
      <code style={{fontStyle: "solid"}}>{recoveryCodes?.[0]}</code>
      <Button style={{marginTop: 24}} loading={loading} onClick={() => {
        requestEnableMfa();
      }} block type="primary">
        {t("general:Enable")}
      </Button>
    </div>
  );
}

export default MfaEnableForm;
