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

import React from "react";
import {Select} from "antd";
import i18next from "i18next";
import * as OrganizationBackend from "../../backend/OrganizationBackend";
import * as Setting from "../../Setting";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

function OrganizationSelect(props: LegacyAny) {
  const {onChange, initValue, style, onSelect, withAll, className, excludedOrganizations = []} = props;
  const [organizations, setOrganizations] = React.useState<LegacyAny[]>([]);
  const [value, setValue] = React.useState(initValue);

  React.useEffect(() => {
    if (initValue !== undefined) {
      setValue((currentValue: LegacyAny) => currentValue === initValue ? currentValue : initValue);
    }
  }, [initValue]);

  React.useEffect(() => {
    if (props.organizations === undefined) {
      getOrganizations();
    }
    window.addEventListener("storageOrganizationsChanged", getOrganizations);
    return function() {
      window.removeEventListener("storageOrganizationsChanged", getOrganizations);
    };
  }, [value]);

  const getOrganizations = () => {
    OrganizationBackend.getOrganizationNames("admin")
      .then((res: LegacyAny) => {
        if (res.status === "ok") {
          const organizationList = res.data ?? [];
          setOrganizations(organizationList);
          props.onOrganizationsLoaded?.(organizationList);
          const items = getOrganizationItems(organizationList);
          const selectedValueExist = items.filter((organization: LegacyAny) => organization.value === value).length > 0;
          if ((initValue === undefined || !selectedValueExist) && items.length > 0) {
            handleOnChange(items[0].value);
          }
        }
      });
  };

  const handleOnChange = (value: LegacyAny) => {
    setValue(value);
    onChange?.(value);
  };

  const getOrganizationItems = (sourceOrganizations: LegacyAny[] = organizations) => {
    const items: LegacyAny[] = [];

    // 部分业务页面不能把系统内置组织作为可选业务组织，例如企业微信通讯录同步目标。
    sourceOrganizations
      .filter((organization: LegacyAny) => !excludedOrganizations.includes(organization.name))
      .forEach((organization: LegacyAny) => items.push(Setting.getOption(organization.displayName, organization.name)));

    if (withAll) {
      items.unshift({
        label: t("general:All"),
        value: "All",
      });
    }

    return items;
  };

  return (
    <Select
      options={getOrganizationItems()}
      virtual={false}
      popupMatchSelectWidth={false}
      placeholder={t("login:Please select an organization")}
      value={value}
      onChange={handleOnChange}
      filterOption={(input: string, option: LegacyAny) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
      style={style}
      onSelect={onSelect}
      className={className}
    >
    </Select>
  );
}

export default OrganizationSelect;
