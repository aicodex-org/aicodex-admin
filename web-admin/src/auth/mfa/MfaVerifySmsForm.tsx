import {UserOutlined} from "@ant-design/icons";
import {Button, Checkbox, Form, Input, Space} from "antd";
import i18next from "i18next";
import React, {useEffect} from "react";
import {CountryCodeSelect} from "../../common/select/CountryCodeSelect";
import {SendCodeInput} from "../../common/SendCodeInput";
import * as Setting from "../../Setting";
import {EmailMfaType, SmsMfaType} from "../MfaSetupPage";
import {mfaAuth} from "./MfaVerifyForm";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {MfaVerifyChildProps} from "./MfaVerifyForm";
const t = i18next.t as (key: string) => string;
const LegacySendCodeInput = SendCodeInput as React.ComponentType<any>;

export const MfaVerifySmsForm = ({mfaProps, application, onFinish, method, user}: MfaVerifyChildProps) => {
  const [dest, setDest] = React.useState("");
  const [form] = Form.useForm();
  const activeMfaProps = mfaProps as NonNullable<MfaVerifyChildProps["mfaProps"]>;

  useEffect(() => {
    if (method === mfaAuth) {
      setDest(mfaProps?.secret ?? "");
      form.setFieldValue("dest", mfaProps?.secret);
      return;
    }
    if (activeMfaProps.mfaType === SmsMfaType) {
      setDest(user?.phone ?? "");
      form.setFieldValue("dest", user?.phone);
      return;
    }

    if (activeMfaProps.mfaType === EmailMfaType) {
      setDest(user?.email ?? "");
      form.setFieldValue("dest", user?.email);
    }
  }, [form, method, activeMfaProps.mfaType, activeMfaProps.secret, user]);

  const isShowText = () => {
    if (method === mfaAuth) {
      return true;
    }
    if (mfaProps?.mfaType === SmsMfaType && user?.phone !== "") {
      return true;
    }
    if (mfaProps?.mfaType === EmailMfaType && user?.email !== "") {
      return true;
    }
    return false;
  };

  const isEmail = () => {
    return mfaProps?.mfaType === EmailMfaType;
  };

  return (
    <Form
      form={form}
      style={{width: "300px"}}
      onFinish={onFinish}
      initialValues={{
        countryCode: activeMfaProps.countryCode,
        enableMfaRemember: false,
      }}
    >
      {isShowText() ?
        <div style={{marginBottom: 20, textAlign: "left", gap: 8}}>
          {isEmail() ? t("mfa:Your email is") : t("mfa:Your phone is")} {dest}
        </div> :
        (
          <p>{isEmail() ? t("mfa:Please bind your email first, the system will automatically uses the mail for multi-factor authentication") :
            t("mfa:Please bind your phone first, the system automatically uses the phone for multi-factor authentication")}
          </p>
        )
      }
      <Space.Compact style={{width: "300Px", marginBottom: "30px", display: isShowText() ? "none" : ""}}>
        {isEmail() || isShowText() ? null :
          <Form.Item
            name="countryCode"
            noStyle
            rules={[
              {
                required: false,
                message: t("signup:Please select your country code!"),
              },
            ]}
          >
            <CountryCodeSelect
              initValue={activeMfaProps.countryCode}
              style={{width: "30%"}}
              countryCodes={application?.organizationObj?.countryCodes}
            />
          </Form.Item>
        }
        <Form.Item
          name="dest"
          noStyle
          rules={[{required: true, message: t("login:Please input your Email or Phone!")}]}
        >
          <Input
            style={{width: isEmail() ? "100% " : "70%"}}
            onChange={(e) => {setDest(e.target.value);}}
            prefix={<UserOutlined />}
            placeholder={isEmail() ? t("general:Email") : t("general:Phone")}
          />
        </Form.Item>
      </Space.Compact>
      <Form.Item
        name="passcode"
        rules={[{required: true, message: t("login:Please input your code!")}]}
      >
        <LegacySendCodeInput
          countryCode={form.getFieldValue("countryCode")}
          method={method}
          onButtonClickArgs={[activeMfaProps.secret || dest, isEmail() ? "email" : "phone", Setting.getApplicationName(application)]}
          application={application}
        />
      </Form.Item>
      <Form.Item
        name="enableMfaRemember"
        valuePropName="checked"
      >
        <Checkbox>
          {t("mfa:Remember this account for {hour} hours").replace("{hour}", `${activeMfaProps.mfaRememberInHours ?? ""}`)}
        </Checkbox>
      </Form.Item>
      <Form.Item>
        <Button
          style={{marginTop: 24}}
          loading={false}
          block
          type="primary"
          htmlType="submit"
        >
          {t("forget:Next Step")}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default MfaVerifySmsForm;
