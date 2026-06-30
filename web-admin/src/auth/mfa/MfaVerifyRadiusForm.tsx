import {Button, Checkbox, Form, Input} from "antd";
import i18next from "i18next";
import React from "react";
import {mfaAuth} from "./MfaVerifyForm";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {MfaVerifyChildProps} from "./MfaVerifyForm";
const t = i18next.t as (key: string) => string;

export const MfaVerifyRadiusForm = ({mfaProps, onFinish, method}: MfaVerifyChildProps) => {
  const [form] = Form.useForm();
  const activeMfaProps = mfaProps as NonNullable<MfaVerifyChildProps["mfaProps"]>;
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
      {
        method === mfaAuth ? null : (<Form.Item
          name="dest"
          noStyle
          rules={[{required: true, message: t("login:Please input your RADIUS username!")}]}
        >
          <Input
            style={{width: "100%"}}
            placeholder={t("signup:Username")}
          />
        </Form.Item>)
      }
      <Form.Item
        name="passcode"
        noStyle
        rules={[{required: true, message: t("login:Please input your RADIUS password!")}]}
      >
        <Input
          style={{width: "100%", marginTop: 12}}
          placeholder={t("general:Password")}
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

export default MfaVerifyRadiusForm;
