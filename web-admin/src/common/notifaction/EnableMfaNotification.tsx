import {Button, Space, Tag, notification} from "antd";
import i18next from "i18next";
import {useEffect} from "react";
import * as ReactRouterDom from "react-router-dom";
import * as Setting from "../../Setting";
import {MfaRulePrompted, MfaRuleRequired} from "../../Setting";

type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string) => String(i18next.t(key));

const EnableMfaNotification = ({account}: {account: LegacyAny}) => {
  const [api, contextHolder] = notification.useNotification();
  const history = (ReactRouterDom as LegacyAny).useHistory();
  const location = (ReactRouterDom as LegacyAny).useLocation();

  useEffect(() => {
    if (account === null) {
      return;
    }

    const mfaItems = Setting.getMfaItemsByRules(account, account?.organization, [MfaRuleRequired, MfaRulePrompted]);
    if (location.state?.from === "/login" && mfaItems.length !== 0) {
      if (mfaItems.some((item) => item.rule === MfaRuleRequired)) {
        openRequiredEnableNotification(mfaItems.find((item: LegacyAny) => item.rule === MfaRuleRequired).name);
      } else {
        openPromptEnableNotification(mfaItems.filter((item: LegacyAny) => item.rule === MfaRulePrompted)?.map((item: LegacyAny) => item.name));
      }
    }
  }, [account, location.state?.from]);

  const openPromptEnableNotification = (mfaTypes: string[]) => {
    const key = `open${Date.now()}`;
    const btn = (
      <Space>
        <Button type="link" size="small" onClick={() => api.destroy(key)}>
          {t("general:Later")}
        </Button>
        <Button type="primary" size="small" onClick={() => {
          history.push(`/mfa/setup?mfaType=${mfaTypes[0]}`, {from: "/"});
          api.destroy(key);
        }}
        >
          {t("general:Go to enable")}
        </Button>
      </Space>
    );
    api.open({
      message: t("mfa:Enable multi-factor authentication"),
      description:
      <Space direction={"vertical"}>
        {t("mfa:To ensure the security of your account, it is recommended that you enable multi-factor authentication")}
        <Space>{mfaTypes.map((item: string) => <Tag color="orange" key={item}>{item}</Tag>)}</Space>
      </Space>,
      btn,
      key,
    });
  };

  const openRequiredEnableNotification = (mfaType: string) => {
    const key = `open${Date.now()}`;
    const btn = (
      <Space>
        <Button type="primary" size="small" onClick={() => {
          api.destroy(key);
        }}
        >
          {t("general:Confirm")}
        </Button>
      </Space>
    );
    api.open({
      message: t("mfa:Enable multi-factor authentication"),
      description:
      <Space direction={"vertical"}>
        {t("mfa:To ensure the security of your account, it is required to enable multi-factor authentication")}
        <Space><Tag color="orange">{mfaType}</Tag></Space>
      </Space>,
      btn,
      key,
    });
  };

  return (
    <>
      {contextHolder}
    </>
  );
};

export default EnableMfaNotification;
