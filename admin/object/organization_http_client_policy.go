// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"net/http"
	"time"
)

// defaultOrganizationHTTPClientTimeout 沿用同仓 connector 的 30 秒惯例，为无 deadline 的组织同步外呼提供最终边界。
const defaultOrganizationHTTPClientTimeout = 30 * time.Second

func newDefaultOrganizationHTTPClient() *http.Client {
	return &http.Client{Timeout: defaultOrganizationHTTPClientTimeout}
}

// organizationHTTPClient 原样保留调用方注入 client；nil 时才创建本业务域的有界默认 client。
func organizationHTTPClient(injected *http.Client) *http.Client {
	if injected != nil {
		return injected
	}
	return newDefaultOrganizationHTTPClient()
}

// safeOrganizationHTTPErrorCause 去除可能携带完整请求 URL 和 query 凭据的 url.Error，仅保留可操作的失败分类。
func safeOrganizationHTTPErrorCause(err error) error {
	switch {
	case errors.Is(err, context.Canceled):
		return context.Canceled
	case errors.Is(err, context.DeadlineExceeded):
		return context.DeadlineExceeded
	default:
		return errors.New("transport error")
	}
}
