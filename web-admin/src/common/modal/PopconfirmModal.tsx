// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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

import {Button, Popconfirm} from "antd";
import i18next from "i18next";
import React from "react";
type LegacyAny = import("../../types/legacyPage").LegacyAny;

const t = (key: string, options?: LegacyAny): string => String(i18next.t(key, options));

export const PopconfirmModal = (props: LegacyAny) => {
  const text = props.text ? props.text : t("general:Delete");
  const size = props.size ? props.size : "middle";
  const type = props.type ? props.type : "primary";
  const danger = props.danger === undefined ? true : props.danger;
  return (
    <Popconfirm
      title={props.title}
      onConfirm={props.onConfirm}
      disabled={props.disabled}
      okText={t("general:OK")}
      cancelText={t("general:Cancel")}
    >
      <Button className={props.className} style={{...props.style}} size={size} disabled={props.disabled} loading={props.loading} type={type} danger={danger}>{text}</Button>
    </Popconfirm>
  );
};

export default PopconfirmModal;
