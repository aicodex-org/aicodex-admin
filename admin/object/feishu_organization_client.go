// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	DefaultFeishuApiBaseUrl = "https://open.feishu.cn"
	DefaultLarkApiBaseUrl   = "https://open.larksuite.com"
)

type FeishuAddressBookClient struct {
	AppId        string
	AppSecret    string
	EndpointMode string
	BaseUrl      string
	HttpClient   *http.Client
}

type FeishuAccessToken struct {
	TenantAccessToken string
	Expire            int
}

type FeishuAddressBookConnectionTestResult struct {
	AccessTokenOk        bool     `json:"accessTokenOk"`
	DepartmentSnapshotOk bool     `json:"departmentSnapshotOk"`
	UserSnapshotOk       bool     `json:"userSnapshotOk"`
	DepartmentCount      int      `json:"departmentCount"`
	UserCount            int      `json:"userCount"`
	TenantKey            string   `json:"tenantKey"`
	MissingFields        []string `json:"missingFields"`
}

type FeishuApiError struct {
	Operation string
	Code      int
	Msg       string
	Cause     error
}

func (e *FeishuApiError) Error() string {
	if e == nil {
		return ""
	}
	text := fmt.Sprintf("feishu api %s failed: code=%d msg=%s", e.Operation, e.Code, e.Msg)
	if e.Cause != nil {
		return text + ": " + e.Cause.Error()
	}
	return text
}

func NewFeishuAddressBookClient(appId string, appSecret string, endpointMode string) *FeishuAddressBookClient {
	return &FeishuAddressBookClient{AppId: appId, AppSecret: appSecret, EndpointMode: normalizeFeishuEndpointMode(endpointMode)}
}

func (c *FeishuAddressBookClient) GetAccessToken(ctx context.Context) (*FeishuAccessToken, error) {
	const operation = "tenant_access_token/internal"
	body, err := json.Marshal(map[string]string{
		"app_id":     strings.TrimSpace(c.AppId),
		"app_secret": strings.TrimSpace(c.AppSecret),
	})
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid request body", Cause: err}
	}
	reader, err := c.do(ctx, http.MethodPost, "/open-apis/auth/v3/tenant_access_token/internal", nil, bytes.NewReader(body), operation)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Code              int    `json:"code"`
		Msg               string `json:"msg"`
		TenantAccessToken string `json:"tenant_access_token"`
		Expire            int    `json:"expire"`
	}
	if err := decodeFeishuResponse(reader, &resp); err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid json response", Cause: err}
	}
	if resp.Code != 0 {
		return nil, &FeishuApiError{Operation: operation, Code: resp.Code, Msg: resp.Msg}
	}
	if resp.TenantAccessToken == "" {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "tenant_access_token is empty"}
	}
	return &FeishuAccessToken{TenantAccessToken: resp.TenantAccessToken, Expire: resp.Expire}, nil
}

func (c *FeishuAddressBookClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]FeishuDepartmentSnapshot, error) {
	if strings.TrimSpace(departmentId) == "" {
		departmentId = "0"
	}
	const operation = "contact/v3/department/children"
	query := map[string]string{
		"department_id_type": "open_department_id",
		"fetch_child":        "true",
		"page_size":          "50",
	}
	departments := []FeishuDepartmentSnapshot{}
	pageToken := ""
	for {
		if pageToken != "" {
			query["page_token"] = pageToken
		}
		reader, err := c.doWithToken(ctx, http.MethodGet, "/open-apis/contact/v3/departments/"+url.PathEscape(departmentId)+"/children", query, nil, operation, accessToken)
		if err != nil {
			return nil, err
		}
		var resp struct {
			Code int    `json:"code"`
			Msg  string `json:"msg"`
			Data struct {
				Items []struct {
					OpenDepartmentId       string `json:"open_department_id"`
					DepartmentId           string `json:"department_id"`
					ParentDepartmentId     string `json:"parent_department_id"`
					OpenParentDepartmentId string `json:"open_parent_department_id"`
					Name                   string `json:"name"`
				} `json:"items"`
				PageToken string `json:"page_token"`
				HasMore   bool   `json:"has_more"`
			} `json:"data"`
		}
		if err := decodeFeishuResponse(reader, &resp); err != nil {
			return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid json response", Cause: err}
		}
		if resp.Code != 0 {
			return nil, &FeishuApiError{Operation: operation, Code: resp.Code, Msg: resp.Msg}
		}
		for _, item := range resp.Data.Items {
			id := firstNonEmpty(item.OpenDepartmentId, item.DepartmentId)
			if id == "" {
				continue
			}
			departments = append(departments, FeishuDepartmentSnapshot{
				Id:       id,
				ParentId: firstNonEmpty(item.OpenParentDepartmentId, item.ParentDepartmentId),
				Name:     item.Name,
			})
		}
		if !resp.Data.HasMore || resp.Data.PageToken == "" {
			break
		}
		pageToken = resp.Data.PageToken
	}
	return departments, nil
}

func (c *FeishuAddressBookClient) FetchUserSnapshots(ctx context.Context, accessToken string, departments []FeishuDepartmentSnapshot) ([]FeishuUserSnapshot, error) {
	usersById := map[string]FeishuUserSnapshot{}
	departmentIds := []string{"0"}
	for _, department := range departments {
		if department.Id != "" {
			departmentIds = append(departmentIds, department.Id)
		}
	}
	for _, departmentId := range departmentIds {
		users, err := c.FindUsersByDepartment(ctx, accessToken, departmentId)
		if err != nil {
			return nil, err
		}
		for _, user := range users {
			if user.UserId == "" {
				continue
			}
			existing := usersById[user.UserId]
			user.Departments = mergeStringSets(existing.Departments, user.Departments)
			if user.MainDepartmentId == "" {
				user.MainDepartmentId = existing.MainDepartmentId
			}
			usersById[user.UserId] = user
		}
	}
	users := make([]FeishuUserSnapshot, 0, len(usersById))
	for _, user := range usersById {
		users = append(users, user)
	}
	return users, nil
}

func (c *FeishuAddressBookClient) FindUsersByDepartment(ctx context.Context, accessToken string, departmentId string) ([]FeishuUserSnapshot, error) {
	const operation = "contact/v3/user/find_by_department"
	query := map[string]string{
		"department_id":      departmentId,
		"department_id_type": "open_department_id",
		"user_id_type":       "user_id",
		"page_size":          "50",
	}
	users := []FeishuUserSnapshot{}
	pageToken := ""
	for {
		if pageToken != "" {
			query["page_token"] = pageToken
		}
		reader, err := c.doWithToken(ctx, http.MethodGet, "/open-apis/contact/v3/users/find_by_department", query, nil, operation, accessToken)
		if err != nil {
			return nil, err
		}
		var resp struct {
			Code int    `json:"code"`
			Msg  string `json:"msg"`
			Data struct {
				Items     []map[string]json.RawMessage `json:"items"`
				PageToken string                       `json:"page_token"`
				HasMore   bool                         `json:"has_more"`
			} `json:"data"`
		}
		if err := decodeFeishuResponse(reader, &resp); err != nil {
			return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid json response", Cause: err}
		}
		if resp.Code != 0 {
			return nil, &FeishuApiError{Operation: operation, Code: resp.Code, Msg: resp.Msg}
		}
		for _, item := range resp.Data.Items {
			user, err := newFeishuUserSnapshotFromRaw(operation, item)
			if err != nil {
				return nil, err
			}
			if len(user.Departments) == 0 && departmentId != "" && departmentId != "0" {
				user.Departments = []string{departmentId}
			}
			users = append(users, *user)
		}
		if !resp.Data.HasMore || resp.Data.PageToken == "" {
			break
		}
		pageToken = resp.Data.PageToken
	}
	return users, nil
}

func (c *FeishuAddressBookClient) TestConnection(ctx context.Context) (*FeishuAddressBookConnectionTestResult, error) {
	result := &FeishuAddressBookConnectionTestResult{}
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return result, err
	}
	result.AccessTokenOk = true
	departments, err := c.FetchDepartmentSnapshots(ctx, token.TenantAccessToken, "0")
	if err != nil {
		return result, err
	}
	result.DepartmentSnapshotOk = true
	result.DepartmentCount = len(departments)
	users, err := c.FetchUserSnapshots(ctx, token.TenantAccessToken, departments)
	if err != nil {
		return result, err
	}
	result.UserSnapshotOk = true
	result.UserCount = len(users)
	result.MissingFields = nil
	return result, nil
}

func (c *FeishuAddressBookClient) doWithToken(ctx context.Context, method string, path string, query map[string]string, body io.Reader, operation string, accessToken string) (io.Reader, error) {
	return c.do(ctx, method, path, query, body, operation, "Bearer "+accessToken)
}

func (c *FeishuAddressBookClient) do(ctx context.Context, method string, path string, query map[string]string, body io.Reader, operation string, authorization ...string) (io.Reader, error) {
	endpoint, err := c.buildUrl(path, query)
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid request url", Cause: err}
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid request", Cause: err}
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	for _, value := range authorization {
		if value != "" {
			req.Header.Set("Authorization", value)
		}
	}
	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "request failed", Cause: err}
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &FeishuApiError{Operation: operation, Code: resp.StatusCode, Msg: "unexpected http status"}
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "read response failed", Cause: err}
	}
	return bytes.NewReader(payload), nil
}

func (c *FeishuAddressBookClient) buildUrl(path string, query map[string]string) (string, error) {
	baseUrl := strings.TrimRight(c.BaseUrl, "/")
	if baseUrl == "" {
		if normalizeFeishuEndpointMode(c.EndpointMode) == FeishuEndpointModeOverseas {
			baseUrl = DefaultLarkApiBaseUrl
		} else {
			baseUrl = DefaultFeishuApiBaseUrl
		}
	}
	u, err := url.Parse(baseUrl + path)
	if err != nil {
		return "", err
	}
	values := u.Query()
	for key, value := range query {
		values.Set(key, value)
	}
	u.RawQuery = values.Encode()
	return u.String(), nil
}

func (c *FeishuAddressBookClient) httpClient() *http.Client {
	if c.HttpClient != nil {
		return c.HttpClient
	}
	return http.DefaultClient
}

func newFeishuUserSnapshotFromRaw(operation string, raw map[string]json.RawMessage) (*FeishuUserSnapshot, error) {
	departments, err := rawFeishuStringSlice(firstRaw(raw, "department_ids", "department_ids"))
	if err != nil {
		return nil, &FeishuApiError{Operation: operation, Code: -1, Msg: "invalid department_ids response", Cause: err}
	}
	status := rawFeishuString(raw["status"])
	if status == "" {
		status = rawFeishuString(raw["user_status"])
	}
	return &FeishuUserSnapshot{
		UserId:           rawFeishuString(firstRaw(raw, "user_id", "userid")),
		OpenId:           rawFeishuString(raw["open_id"]),
		UnionId:          rawFeishuString(raw["union_id"]),
		TenantKey:        rawFeishuString(raw["tenant_key"]),
		Name:             rawFeishuString(firstRaw(raw, "name", "cn_name")),
		Email:            rawFeishuString(raw["email"]),
		Mobile:           rawFeishuString(raw["mobile"]),
		Avatar:           rawFeishuAvatarUrl(firstRaw(raw, "avatar", "avatar_url")),
		Title:            rawFeishuString(firstRaw(raw, "job_title", "position")),
		Status:           status,
		Departments:      departments,
		MainDepartmentId: rawFeishuString(firstRaw(raw, "main_department_id", "department_id")),
	}, nil
}

func firstRaw(raw map[string]json.RawMessage, keys ...string) json.RawMessage {
	for _, key := range keys {
		if value, ok := raw[key]; ok {
			return value
		}
	}
	return nil
}

func decodeFeishuResponse(reader io.Reader, target any) error {
	decoder := json.NewDecoder(reader)
	decoder.UseNumber()
	return decoder.Decode(target)
}

func rawFeishuString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var text string
	if err := decodeFeishuResponse(bytes.NewReader(raw), &text); err == nil {
		return text
	}
	var number json.Number
	if err := decodeFeishuResponse(bytes.NewReader(raw), &number); err == nil {
		return number.String()
	}
	var obj map[string]any
	if err := decodeFeishuResponse(bytes.NewReader(raw), &obj); err == nil {
		if value, ok := obj["status"].(string); ok {
			return value
		}
	}
	return ""
}

func rawFeishuAvatarUrl(raw json.RawMessage) string {
	if text := rawFeishuString(raw); text != "" {
		return text
	}
	var obj map[string]any
	if err := decodeFeishuResponse(bytes.NewReader(raw), &obj); err != nil {
		return ""
	}
	for _, key := range []string{"avatar_origin", "avatar_640", "avatar_240", "avatar_72", "avatar_url", "url"} {
		if value, ok := obj[key].(string); ok && strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func rawFeishuStringSlice(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var texts []string
	if err := decodeFeishuResponse(bytes.NewReader(raw), &texts); err == nil {
		return texts, nil
	}
	var numbers []json.Number
	if err := decodeFeishuResponse(bytes.NewReader(raw), &numbers); err == nil {
		texts = make([]string, 0, len(numbers))
		for _, number := range numbers {
			texts = append(texts, number.String())
		}
		return texts, nil
	}
	return nil, errors.New("expected string or number array")
}

func mergeStringSets(a []string, b []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, values := range [][]string{a, b} {
		for _, value := range values {
			value = strings.TrimSpace(value)
			if value == "" || seen[value] {
				continue
			}
			seen[value] = true
			out = append(out, value)
		}
	}
	return out
}
