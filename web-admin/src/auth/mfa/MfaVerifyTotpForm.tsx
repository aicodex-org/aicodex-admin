import {CopyOutlined} from "@ant-design/icons";
import {Button, Checkbox, Col, Form, Input, QRCode, Space} from "antd";
import copy from "copy-to-clipboard";
import i18next from "i18next";
import React from "react";
import * as Setting from "../../Setting";
import * as Conf from "../../Conf";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {MfaVerifyChildProps} from "./MfaVerifyForm";
const t = i18next.t as (key: string) => string;

export const MfaVerifyTotpForm = ({mfaProps, onFinish}: Pick<MfaVerifyChildProps, "mfaProps" | "onFinish">) => {
  const [form] = Form.useForm();
  const activeMfaProps = mfaProps as NonNullable<MfaVerifyChildProps["mfaProps"]>;

  const renderSecret = () => {
    if (!activeMfaProps.secret) {
      return null;
    }

    return (
      <React.Fragment>
        <Col span={24} style={{display: "flex", justifyContent: "center"}}>
          <QRCode
            errorLevel="H"
            value={activeMfaProps.url}
            icon={Conf.BrandIcon}
          />
        </Col>
        <p style={{textAlign: "center"}}>{t("mfa:Scan the QR code with your Authenticator App")}</p>
        <p style={{textAlign: "center"}}>{t("mfa:Or copy the secret to your Authenticator App")}</p>
        <Col span={24}>
          <Space>
            <Input value={activeMfaProps.secret} />
            <Button type="primary" shape="round" icon={<CopyOutlined />} onClick={() => {
              copy(`${activeMfaProps.secret}`);
              Setting.showMessage("success", t("general:Copied to clipboard successfully"));
            }} />
          </Space>
        </Col>
      </React.Fragment>
    );
  };
  return (
    <Form
      form={form}
      style={{width: "300px"}}
      onFinish={onFinish}
      initialValues={{
        enableMfaRemember: false,
      }}
    >
      {renderSecret()}
      <Form.Item
        name="passcode"
        rules={[{required: true, message: "Please input your passcode"}]}
      >
        <Input.OTP
          style={{marginTop: 24}}
          onChange={() => {
            form.submit();
          }}
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

export default MfaVerifyTotpForm;
