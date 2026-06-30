import {Button, Checkbox, Form, Input} from "antd";
import i18next from "i18next";
import React from "react";
import {mfaAuth} from "./MfaVerifyForm";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {MfaVerifyChildProps} from "./MfaVerifyForm";
const t = i18next.t as (key: string) => string;

export const MfaVerifyPushForm = ({mfaProps, onFinish, method}: MfaVerifyChildProps) => {
  const [form] = Form.useForm();
  return (
    <Form
      form={form}
      style={{width: "300px"}}
      onFinish={onFinish}
      initialValues={{
        enableMfaRemember: false,
      }}
    >
      {
        method === mfaAuth ? null : (<Form.Item
          name="dest"
          noStyle
          rules={[{required: true, message: t("login:Please input your push notification receiver!")}]}
        >
          <Input
            style={{width: "100%"}}
            placeholder={t("mfa:Push notification receiver")}
          />
        </Form.Item>)
      }
      <Form.Item
        name="passcode"
        noStyle
        rules={[{required: true, message: t("code:Please input your verification code!")}]}
      >
        <Input
          style={{width: "100%", marginTop: 12}}
          placeholder={t("login:Verification code")}
        />
      </Form.Item>
      <Form.Item
        name="enableMfaRemember"
        valuePropName="checked"
      >
        <Checkbox>
          {t("mfa:Remember this account for {hour} hours").replace("{hour}", `${mfaProps?.mfaRememberInHours ?? ""}`)}
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

export default MfaVerifyPushForm;
