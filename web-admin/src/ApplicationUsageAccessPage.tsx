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

import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {Alert, Button, Space} from "antd";
import i18next from "i18next";
import React from "react";
import {Link} from "react-router-dom";
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
      eyebrow={t("Usage access eyebrow", "应用接入 / 用量接入")}
      title={t("Usage Access", "用量接入")}
      description={t("Usage access page description", "聚焦原应用接入中心中的服务凭据治理，承接用量链路的配置、诊断和交接包。")}
      actions={(
        <Space wrap>
          <Link to="/applications"><Button icon={<AppstoreOutlined />}>{t("Application Access Center", "应用接入中心")}</Button></Link>
          <Link to="/providers"><Button icon={<SafetyCertificateOutlined />}>{t("Review identity source", "核对身份源")}</Button></Link>
          <Link to="/platform-api-mappings"><Button icon={<ApiOutlined />}>{t("Review Gateway mapping", "核对 Gateway 映射")}</Button></Link>
          <Link to="/records"><Button icon={<AuditOutlined />}>{t("Audit Records", "审计记录")}</Button></Link>
        </Space>
      )}
    >
      <Alert
        className="enterprise-identity-console-alert"
        type="info"
        showIcon
        message={t("Usage access owner boundary", "Admin 只承接服务凭据治理中的身份、组织、resolver、projection 和服务间凭据入口。")}
        description={t("Usage access owner boundary description", "页面不承接 API/Gateway 或 Insight 自己的 truth，不执行登录、同步、凭据测试或 Gateway 发布。")}
      />
      <ApplicationAccessServiceCredentialGovernancePanel className="application-usage-access-service-credential-panel" />
    </EnterpriseIdentityConsolePage>
  );
}

export default ApplicationUsageAccessPage;
