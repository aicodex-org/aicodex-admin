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

import {Select} from "antd";
import i18next from "i18next";
import * as Setting from "../../Setting";
import React from "react";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

const {Option} = Select;

export const CountryCodeSelect = (props: LegacyAny) => {
  const {onChange, style, disabled, initValue, mode} = props;
  const countryCodes = props.countryCodes ?? [];
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (initValue !== undefined) {
      setValue(initValue);
    } else {
      const initValue = countryCodes.length > 0 ? countryCodes[0] : "";
      handleOnChange(initValue);
    }
  }, []);

  const handleOnChange = (value: LegacyAny) => {
    setValue(value);
    onChange?.(value);
  };

  return (
    <Select
      virtual={false}
      showSearch
      style={style}
      disabled={disabled}
      value={value}
      mode={mode}
      popupMatchSelectWidth={false}
      optionLabelProp={"label"}
      onChange={handleOnChange}
      filterOption={(input: string, option: LegacyAny) => (option?.text ?? "").toLowerCase().includes(input.toLowerCase())}
    >
      {
        props.hasDefault ? (<Option key={"All"} value={"All"} label={t("general:All")} text={"general:All"} >
          <div style={{display: "flex", justifyContent: "space-between", marginRight: "10px"}}>
            {t("general:All")}
          </div>
        </Option>) : null
      }
      {
        Setting.getCountryCodeData(countryCodes).map((country: LegacyAny) => Setting.getCountryCodeOption(country))
      }
    </Select>
  );
};
