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

package routers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/mcpself"
	"git.leagsoft.com/aicodex/aicodex-admin/object"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/core/logs"
	"github.com/beego/beego/v2/server/web/context"
)

var authenticateAdminSecureHandoffProviderCredential = func(material string) (*object.AdminSecureHandoffProviderCredentialAuth, *object.AdminSecureHandoffProviderCredentialError) {
	return (&object.AdminSecureHandoffGrantService{}).AuthenticateProviderCredential(material)
}

func AutoSigninFilter(ctx *context.Context) {
	urlPath := ctx.Request.URL.Path
	if strings.HasPrefix(urlPath, "/api/login/oauth/access_token") {
		return
	}
	if urlPath == "/api/mcp" {
		var req mcpself.McpRequest
		if err := json.Unmarshal(ctx.Input.RequestBody, &req); err == nil {
			if req.Method == "initialize" || req.Method == "notifications/initialized" || req.Method == "ping" || req.Method == "tools/list" {
				return
			}
		}
	}
	//if getSessionUser(ctx) != "" {
	//	return
	//}

	// GET parameter like "/page?access_token=123" or
	// HTTP Bearer token like "Authorization: Bearer 123"
	accessToken := ctx.Input.Query("accessToken")
	if accessToken == "" {
		accessToken = ctx.Input.Query("access_token")
	}
	if accessToken == "" {
		accessToken = parseBearerToken(ctx)
	}

	if accessToken != "" {
		if isInsightAdminProviderPath(urlPath) {
			if object.IsAdminSecureHandoffProviderRuntimeCredential(accessToken) {
				auth, credentialErr := authenticateAdminSecureHandoffProviderCredential(accessToken)
				if credentialErr != nil {
					writeInsightAdminProviderFilterError(ctx, credentialErr.Code)
					return
				}
				ctx.Input.SetData(object.AdminSecureHandoffProviderCredentialContextKey, auth)
			}
			// Provider JWTs are verified by the Provider controller instead of the generic OAuth token lookup.
			return
		}
		if object.IsOrganizationSyncApiKeySecret(accessToken) {
			auth, err := object.AuthenticateOrganizationSyncApiKey(accessToken, util.GetClientIpFromRequest(ctx.Request), ctx.Request.UserAgent())
			if err != nil {
				responseError(ctx, err.Error())
				return
			}
			ctx.Input.SetData(object.OrganizationSyncApiKeyContextKey, auth)
			return
		}

		token, err := object.GetTokenByAccessToken(accessToken)
		if err != nil {
			responseError(ctx, err.Error())
			return
		}

		if token == nil {
			responseError(ctx, "Access token doesn't exist in database")
			return
		}

		isExpired, expireTime := util.IsTokenExpired(token.CreatedTime, token.ExpiresIn)
		if isExpired {
			responseError(ctx, fmt.Sprintf("Access token has expired, expireTime = %s", expireTime))
			return
		}

		userId := util.GetId(token.Organization, token.User)
		application, err := object.GetApplicationByUserId(fmt.Sprintf("app/%s", token.Application))
		if err != nil {
			responseError(ctx, err.Error())
			return
		}
		if application == nil {
			responseError(ctx, fmt.Sprintf("No application is found for userId: app/%s", token.Application))
			return
		}

		setSessionUser(ctx, userId)
		setSessionOidc(ctx, token.Scope, application.ClientId)
		return
	}

	// "/page?clientId=123&clientSecret=456"
	userId, err := getUsernameByClientIdSecret(ctx)
	if err != nil {
		responseError(ctx, err.Error())
		return
	}
	if userId != "" {
		setSessionUser(ctx, userId)
		return
	}

	// "/page?username=built-in/admin&password=123"
	userId = ctx.Input.Query("username")
	password := ctx.Input.Query("password")
	if userId != "" && password != "" && ctx.Input.Query("grant_type") == "" {
		owner, name, err := util.GetOwnerAndNameFromIdWithError(userId)
		if err != nil {
			responseError(ctx, err.Error())
			return
		}

		_, err = object.CheckUserPassword(owner, name, password, "en")
		if err != nil {
			responseError(ctx, err.Error())
			return
		}

		setSessionUser(ctx, userId)
	}
}

func isInsightAdminProviderPath(path string) bool {
	switch path {
	case "/api/admin-provider/insight/v1/current-user",
		"/api/admin-provider/insight/v1/current-user/scope",
		"/api/admin-provider/insight/v1/current-user/organization-tree":
		return true
	default:
		return false
	}
}

func writeInsightAdminProviderFilterError(ctx *context.Context, code string) {
	status := http.StatusUnauthorized
	message := "invalid provider credential"
	if code == object.AdminSecureHandoffProviderCredentialAuthorizationFailed {
		status = http.StatusForbidden
		message = "provider credential is not authorized"
	}
	traceId := ""
	for _, header := range []string{"X-Trace-Id", "X-Request-Id"} {
		if traceId = strings.TrimSpace(ctx.Request.Header.Get(header)); traceId != "" {
			break
		}
	}
	if traceId == "" {
		traceId = util.GenerateId()
	}
	type providerFilterError struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		TraceId string `json:"traceId,omitempty"`
	}
	type providerFilterEnvelope struct {
		Status  string               `json:"status"`
		TraceId string               `json:"traceId"`
		Error   *providerFilterError `json:"error"`
	}
	ctx.Output.SetStatus(status)
	_ = ctx.Output.JSON(providerFilterEnvelope{
		Status:  "error",
		TraceId: traceId,
		Error:   &providerFilterError{Code: code, Message: message, TraceId: traceId},
	}, true, false)
	// filter拒绝不会进入controller audit；这里保持同一稳定字段集合，并只记录零计数和错误分类。
	logs.Info("insight_admin_provider_audit traceId=%s adminUserId= organization= scopeType= groupCount=0 nodeCount=0 adminUserCount=0 apiUserCount=0 mappingStatus= readModelSource= orgVersion= freshness= status=error errorCode=%s", traceId, code)
}
