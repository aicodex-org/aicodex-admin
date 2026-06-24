import React from "react";
import {Button, Tooltip} from "antd";
import {CopyOutlined} from "@ant-design/icons";
import {Link} from "react-router-dom";
import copy from "copy-to-clipboard";
import * as Setting from "../Setting";

interface ListPageIdentityCellProps {
  classPrefix: string;
  title: string;
  titleTo: string;
  secondary?: string;
  copyValue?: string;
  copyLabel: string;
  copyClassName?: string;
  // `icon` 用于传入 Avatar 等有兜底逻辑的节点；`iconSrc` 保留给组织/群组等静态图标场景。
  icon?: React.ReactNode;
  iconSrc?: string;
  iconAlt?: string;
  onCopiedMessage: string;
}

// 复用列表主识别信息模型：主名称、低权重技术标识、弱复制入口和可选图标应作为一个单元演进。
export default function ListPageIdentityCell(props: ListPageIdentityCellProps): JSX.Element {
  const secondary = props.secondary ?? "";
  const copyValue = props.copyValue ?? secondary;
  const icon = props.icon ?? (props.iconSrc ? <img src={props.iconSrc} alt={props.iconAlt ?? props.title} /> : null);

  return (
    <div className={`${props.classPrefix}-cell`}>
      {
        icon ? (
          <span className={`${props.classPrefix}-icon`}>
            {icon}
          </span>
        ) : null
      }
      <div className={`${props.classPrefix}-content`}>
        <Link className={`enterprise-list-primary-text ${props.classPrefix}-name`} to={props.titleTo} title={props.title}>
          {props.title}
        </Link>
        <div className={`enterprise-list-secondary-text ${props.classPrefix}-meta`}>
          <Tooltip title={secondary || undefined}>
            <span className={`enterprise-list-secondary-text ${props.classPrefix}-id`} title={secondary}>{secondary}</span>
          </Tooltip>
          {
            copyValue ? (
              <Button
                aria-label={`${props.copyLabel}`}
                className={props.copyClassName ?? `${props.classPrefix}-copy-id`}
                icon={<CopyOutlined />}
                size="small"
                type="text"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  copy(copyValue);
                  Setting.showMessage("success", props.onCopiedMessage);
                }}
              />
            ) : null
          }
        </div>
      </div>
    </div>
  );
}
