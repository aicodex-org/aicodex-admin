import React from "react";
import {Button, Popconfirm, Space} from "antd";
import type {ButtonProps, PopconfirmProps} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import i18next from "i18next";

interface ListPageRowActionsProps {
  className: string;
  children: React.ReactNode;
  wrap?: boolean;
}

function t(key: string, defaultValue = key): string {
  const translated = i18next.t(key, {defaultValue}) as unknown;
  return typeof translated === "string" ? translated : defaultValue;
}

// 行操作统一保持低噪声文本/图标按钮，避免列表复用时再次出现重按钮操作列。
export default function ListPageRowActions(props: ListPageRowActionsProps): JSX.Element {
  const className = ["enterprise-list-row-actions", props.className].filter(Boolean).join(" ");

  return (
    <Space className={className} size={4} wrap={props.wrap ?? false}>
      {props.children}
    </Space>
  );
}

interface ListPageRowActionButtonProps extends ButtonProps {
  danger?: boolean;
}

export function ListPageRowActionButton(props: ListPageRowActionButtonProps): JSX.Element {
  const {className, ...restProps} = props;
  return (
    <Button
      {...restProps}
      type="link"
      size={props.size ?? "small"}
      className={["enterprise-list-row-action-button", props.danger ? "enterprise-list-row-action-button-danger" : "", className].filter(Boolean).join(" ")}
    />
  );
}

interface ListPageRowEditActionProps {
  onClick: () => void;
  children?: React.ReactNode;
}

export function ListPageRowEditAction(props: ListPageRowEditActionProps): JSX.Element {
  return (
    <ListPageRowActionButton icon={<EditOutlined />} onClick={props.onClick}>
      {props.children ?? t("general:Edit")}
    </ListPageRowActionButton>
  );
}

interface ListPageRowDeleteActionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  popconfirmProps?: Pick<PopconfirmProps, "classNames" | "placement" | "styles">;
}

export function ListPageRowDeleteAction(props: ListPageRowDeleteActionProps): JSX.Element {
  return (
    <Popconfirm
      title={props.title}
      description={props.description}
      onConfirm={props.onConfirm}
      disabled={props.disabled}
      placement={props.popconfirmProps?.placement}
      classNames={props.popconfirmProps?.classNames}
      styles={props.popconfirmProps?.styles}
      okText={t("general:OK")}
      cancelText={t("general:Cancel")}
    >
      <ListPageRowActionButton danger disabled={props.disabled} loading={props.loading} icon={<DeleteOutlined />}>
        {props.children ?? t("general:Delete")}
      </ListPageRowActionButton>
    </Popconfirm>
  );
}
