// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// DefaultDingTalkApiBaseUrl 是钉钉服务端通讯录 API 的默认公开入口。
const DefaultDingTalkApiBaseUrl = "https://oapi.dingtalk.com"

// DingTalkAddressBookClient 封装钉钉通讯录读取边界，只输出同步服务可消费的脱敏快照。
type DingTalkAddressBookClient struct {
	AppKey     string
	AppSecret  string
	BaseUrl    string
	HttpClient *http.Client
}

// DingTalkAccessToken 保存钉钉 access token 响应中同步流程需要的字段。
type DingTalkAccessToken struct {
	AccessToken string
	ExpiresIn   int
}

// DingTalkDepartmentSnapshot 是钉钉部门响应归一化后的内部快照。
type DingTalkDepartmentSnapshot struct {
	Id               string
	ParentId         string
	Name             string
	Order            int
	DepartmentLeader []string
}

// DingTalkUserSnapshot 是钉钉成员响应归一化后的内部快照。
type DingTalkUserSnapshot struct {
	UserId               string
	UnionId              string
	Name                 string
	Departments          []string
	DepartmentOrders     []int
	Position             string
	Mobile               string
	Email                string
	Avatar               string
	IsLeaderInDepartment []bool
	DirectLeaders        []string
	MainDepartmentId     string
	Status               string
}

// DingTalkAddressBookConnectionTestResult 描述连接测试读到的通讯录权限和基础数据规模。
type DingTalkAddressBookConnectionTestResult struct {
	AccessTokenOk        bool     `json:"accessTokenOk"`
	DepartmentSnapshotOk bool     `json:"departmentSnapshotOk"`
	UserSnapshotOk       bool     `json:"userSnapshotOk"`
	DepartmentCount      int      `json:"departmentCount"`
	UserCount            int      `json:"userCount"`
	MissingFields        []string `json:"missingFields"`
}

// DingTalkApiError 保留钉钉错误码，同时通过 SafeMessage 防止返回 token、secret 或原始响应。
type DingTalkApiError struct {
	Operation string
	ErrCode   int
	ErrMsg    string
	Cause     error
}

// Error 返回可安全记录或展示的钉钉 API 错误摘要。
func (e *DingTalkApiError) Error() string {
	return e.SafeMessage()
}

// SafeMessage 生成不包含凭据、原始通讯录数据或私有 URL 的错误摘要。
func (e *DingTalkApiError) SafeMessage() string {
	if e == nil {
		return ""
	}
	operation := strings.TrimSpace(e.Operation)
	if operation == "" {
		operation = "api"
	}
	msg := sanitizeDingTalkApiMessage(e.ErrMsg)
	if e.ErrCode == 0 && msg == "" {
		msg = "request failed"
	}
	text := fmt.Sprintf("dingtalk %s failed: errcode=%d, errmsg=%s", operation, e.ErrCode, msg)
	if e.Cause != nil {
		return text + ": " + sanitizeDingTalkApiMessage(e.Cause.Error())
	}
	return text
}

// NewDingTalkAddressBookClient 创建默认钉钉通讯录客户端。
func NewDingTalkAddressBookClient(appKey string, appSecret string) *DingTalkAddressBookClient {
	return &DingTalkAddressBookClient{
		AppKey:     appKey,
		AppSecret:  appSecret,
		BaseUrl:    DefaultDingTalkApiBaseUrl,
		HttpClient: http.DefaultClient,
	}
}

// GetAccessToken 使用 AppKey/AppSecret 换取钉钉通讯录读取 token。
func (c *DingTalkAddressBookClient) GetAccessToken(ctx context.Context) (*DingTalkAccessToken, error) {
	const operation = "gettoken"
	reader, err := c.do(ctx, http.MethodGet, "/gettoken", map[string]string{
		"appkey":    strings.TrimSpace(c.AppKey),
		"appsecret": strings.TrimSpace(c.AppSecret),
	}, nil, operation)
	if err != nil {
		return nil, err
	}
	var resp struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := decodeDingTalkResponse(reader, &resp); err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if resp.ErrCode != 0 {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: resp.ErrCode, ErrMsg: resp.ErrMsg}
	}
	if strings.TrimSpace(resp.AccessToken) == "" {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "empty access token"}
	}
	return &DingTalkAccessToken{AccessToken: resp.AccessToken, ExpiresIn: resp.ExpiresIn}, nil
}

// FetchDepartmentSnapshots 从指定部门开始递归拉取部门树快照。
func (c *DingTalkAddressBookClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]DingTalkDepartmentSnapshot, error) {
	if strings.TrimSpace(departmentId) == "" {
		departmentId = "1"
	}
	departments := []DingTalkDepartmentSnapshot{}
	queue := []string{departmentId}
	seen := map[string]bool{}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if seen[current] {
			continue
		}
		seen[current] = true
		children, err := c.listSubDepartments(ctx, accessToken, current)
		if err != nil {
			return nil, err
		}
		for _, child := range children {
			if child.Id == "" || seen[child.Id] {
				continue
			}
			departments = append(departments, child)
			queue = append(queue, child.Id)
		}
	}
	return departments, nil
}

// FetchUserSnapshots 按部门分页拉取成员详情，并按 userId 合并重复部门成员。
func (c *DingTalkAddressBookClient) FetchUserSnapshots(ctx context.Context, accessToken string, departments []DingTalkDepartmentSnapshot) ([]DingTalkUserSnapshot, error) {
	departmentIds := []string{}
	seenDepartmentIds := map[string]bool{}
	for _, department := range departments {
		id := strings.TrimSpace(department.Id)
		if id == "" || seenDepartmentIds[id] {
			continue
		}
		seenDepartmentIds[id] = true
		departmentIds = append(departmentIds, id)
	}
	if len(departmentIds) == 0 {
		departmentIds = []string{"1"}
	}

	usersById := map[string]DingTalkUserSnapshot{}
	for _, departmentId := range departmentIds {
		users, err := c.listUsersByDepartment(ctx, accessToken, departmentId)
		if err != nil {
			return nil, err
		}
		for _, user := range users {
			if user.UserId == "" {
				continue
			}
			if len(user.Departments) == 0 {
				user.Departments = []string{departmentId}
			}
			existing, ok := usersById[user.UserId]
			if ok {
				user = mergeDingTalkUserSnapshot(existing, user)
			}
			usersById[user.UserId] = user
		}
	}
	users := make([]DingTalkUserSnapshot, 0, len(usersById))
	for _, user := range usersById {
		users = append(users, user)
	}
	return users, nil
}

// TestConnection 验证 token、部门读取和成员读取权限，不写入本地组织主数据。
func (c *DingTalkAddressBookClient) TestConnection(ctx context.Context) (*DingTalkAddressBookConnectionTestResult, error) {
	result := &DingTalkAddressBookConnectionTestResult{}
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return result, err
	}
	result.AccessTokenOk = true
	departments, err := c.FetchDepartmentSnapshots(ctx, token.AccessToken, "1")
	if err != nil {
		return result, err
	}
	result.DepartmentSnapshotOk = true
	result.DepartmentCount = len(departments)
	users, err := c.FetchUserSnapshots(ctx, token.AccessToken, departments)
	if err != nil {
		return result, err
	}
	result.UserSnapshotOk = true
	result.UserCount = len(users)
	return result, nil
}

func (c *DingTalkAddressBookClient) listSubDepartments(ctx context.Context, accessToken string, departmentId string) ([]DingTalkDepartmentSnapshot, error) {
	const operation = "department/listsub"
	reader, err := c.postJson(ctx, "/topapi/v2/department/listsub", map[string]string{"access_token": accessToken}, map[string]any{
		"dept_id": strings.TrimSpace(departmentId),
	}, operation)
	if err != nil {
		return nil, err
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		Result  []struct {
			DeptId                 json.RawMessage `json:"dept_id"`
			ParentId               json.RawMessage `json:"parent_id"`
			Name                   string          `json:"name"`
			Order                  int             `json:"order"`
			DeptManagerUserIdList  string          `json:"dept_manager_userid_list"`
			DeptManagerUserIdArray []string        `json:"dept_manager_userid_array"`
		} `json:"result"`
	}
	if err := decodeDingTalkResponse(reader, &resp); err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if resp.ErrCode != 0 {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: resp.ErrCode, ErrMsg: resp.ErrMsg}
	}
	departments := make([]DingTalkDepartmentSnapshot, 0, len(resp.Result))
	for _, item := range resp.Result {
		departments = append(departments, DingTalkDepartmentSnapshot{
			Id:               rawDingTalkString(item.DeptId),
			ParentId:         rawDingTalkString(item.ParentId),
			Name:             item.Name,
			Order:            item.Order,
			DepartmentLeader: normalizeDingTalkLeaderList(item.DeptManagerUserIdList, item.DeptManagerUserIdArray),
		})
	}
	return departments, nil
}

func (c *DingTalkAddressBookClient) listUsersByDepartment(ctx context.Context, accessToken string, departmentId string) ([]DingTalkUserSnapshot, error) {
	const operation = "user/list"
	users := []DingTalkUserSnapshot{}
	cursor := 0
	for {
		reader, err := c.postJson(ctx, "/topapi/v2/user/list", map[string]string{"access_token": accessToken}, map[string]any{
			"dept_id": strings.TrimSpace(departmentId),
			"cursor":  cursor,
			"size":    100,
		}, operation)
		if err != nil {
			return nil, err
		}
		var resp struct {
			ErrCode int    `json:"errcode"`
			ErrMsg  string `json:"errmsg"`
			Result  struct {
				HasMore    bool                         `json:"has_more"`
				NextCursor int                          `json:"next_cursor"`
				List       []map[string]json.RawMessage `json:"list"`
			} `json:"result"`
		}
		if err := decodeDingTalkResponse(reader, &resp); err != nil {
			return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
		}
		if resp.ErrCode != 0 {
			return nil, &DingTalkApiError{Operation: operation, ErrCode: resp.ErrCode, ErrMsg: resp.ErrMsg}
		}
		for _, raw := range resp.Result.List {
			user, err := newDingTalkUserSnapshotFromRaw(operation, raw)
			if err != nil {
				return nil, err
			}
			users = append(users, *user)
		}
		if !resp.Result.HasMore {
			break
		}
		cursor = resp.Result.NextCursor
	}
	return users, nil
}

func (c *DingTalkAddressBookClient) postJson(ctx context.Context, path string, query map[string]string, payload map[string]any, operation string) (io.Reader, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request body", Cause: err}
	}
	return c.do(ctx, http.MethodPost, path, query, bytes.NewReader(body), operation)
}

func (c *DingTalkAddressBookClient) do(ctx context.Context, method string, path string, query map[string]string, body io.Reader, operation string) (io.Reader, error) {
	endpoint, err := c.buildUrl(path, query)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "read response failed", Cause: err}
	}
	return bytes.NewReader(payload), nil
}

func (c *DingTalkAddressBookClient) buildUrl(path string, query map[string]string) (string, error) {
	baseUrl := strings.TrimRight(c.BaseUrl, "/")
	if baseUrl == "" {
		baseUrl = DefaultDingTalkApiBaseUrl
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

func (c *DingTalkAddressBookClient) httpClient() *http.Client {
	if c.HttpClient != nil {
		return c.HttpClient
	}
	return http.DefaultClient
}

func newDingTalkUserSnapshotFromRaw(operation string, raw map[string]json.RawMessage) (*DingTalkUserSnapshot, error) {
	departments, err := rawDingTalkStringSlice(firstRaw(raw, "dept_id_list", "department_ids", "department"))
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid dept_id_list response", Cause: err}
	}
	orders, err := rawDingTalkIntSlice(firstRaw(raw, "dept_order_list", "department_order"))
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid dept_order_list response", Cause: err}
	}
	leaderFlags, err := rawDingTalkLeaderFlags(firstRaw(raw, "leader_in_dept", "is_leader_in_dept"), departments)
	if err != nil {
		return nil, &DingTalkApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid leader_in_dept response", Cause: err}
	}
	status := rawDingTalkString(raw["status"])
	if status == "" {
		status = rawDingTalkActiveStatus(raw["active"])
	}
	mainDepartmentId := rawDingTalkString(firstRaw(raw, "main_dept_id", "main_department_id"))
	if mainDepartmentId == "" && len(departments) > 0 {
		mainDepartmentId = departments[0]
	}
	return &DingTalkUserSnapshot{
		UserId:               rawDingTalkString(firstRaw(raw, "userid", "user_id")),
		UnionId:              rawDingTalkString(firstRaw(raw, "unionid", "union_id")),
		Name:                 rawDingTalkString(raw["name"]),
		Departments:          departments,
		DepartmentOrders:     orders,
		Position:             rawDingTalkString(firstRaw(raw, "title", "position")),
		Mobile:               rawDingTalkString(raw["mobile"]),
		Email:                rawDingTalkString(raw["email"]),
		Avatar:               rawDingTalkString(raw["avatar"]),
		IsLeaderInDepartment: leaderFlags,
		DirectLeaders:        compactDingTalkStrings([]string{rawDingTalkString(firstRaw(raw, "manager_userid", "manager_user_id"))}),
		MainDepartmentId:     mainDepartmentId,
		Status:               status,
	}, nil
}

func mergeDingTalkUserSnapshot(existing DingTalkUserSnapshot, incoming DingTalkUserSnapshot) DingTalkUserSnapshot {
	merged := existing
	merged.Departments = mergeStringSets(existing.Departments, incoming.Departments)
	merged.DepartmentOrders = mergeDingTalkIntSlices(existing.DepartmentOrders, incoming.DepartmentOrders)
	merged.IsLeaderInDepartment = mergeDingTalkBoolSlices(existing.IsLeaderInDepartment, incoming.IsLeaderInDepartment)
	merged.DirectLeaders = mergeStringSets(existing.DirectLeaders, incoming.DirectLeaders)
	if merged.UnionId == "" {
		merged.UnionId = incoming.UnionId
	}
	if merged.Name == "" {
		merged.Name = incoming.Name
	}
	if merged.Position == "" {
		merged.Position = incoming.Position
	}
	if merged.Mobile == "" {
		merged.Mobile = incoming.Mobile
	}
	if merged.Email == "" {
		merged.Email = incoming.Email
	}
	if merged.Avatar == "" {
		merged.Avatar = incoming.Avatar
	}
	if merged.MainDepartmentId == "" {
		merged.MainDepartmentId = incoming.MainDepartmentId
	}
	if merged.Status == "" {
		merged.Status = incoming.Status
	}
	return merged
}

func decodeDingTalkResponse(reader io.Reader, target any) error {
	decoder := json.NewDecoder(reader)
	decoder.UseNumber()
	return decoder.Decode(target)
}

func rawDingTalkString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var text string
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &text); err == nil {
		return strings.TrimSpace(text)
	}
	var number json.Number
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &number); err == nil {
		return number.String()
	}
	return ""
}

func rawDingTalkStringSlice(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var texts []string
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &texts); err == nil {
		return compactDingTalkStrings(texts), nil
	}
	var numbers []json.Number
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &numbers); err == nil {
		texts = make([]string, 0, len(numbers))
		for _, number := range numbers {
			texts = append(texts, number.String())
		}
		return compactDingTalkStrings(texts), nil
	}
	return nil, fmt.Errorf("expected string or number array")
}

func rawDingTalkIntSlice(raw json.RawMessage) ([]int, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var values []int
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &values); err == nil {
		return values, nil
	}
	var numbers []json.Number
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &numbers); err == nil {
		values = make([]int, 0, len(numbers))
		for _, number := range numbers {
			intValue, _ := number.Int64()
			values = append(values, int(intValue))
		}
		return values, nil
	}
	return nil, fmt.Errorf("expected int array")
}

func rawDingTalkLeaderFlags(raw json.RawMessage, departments []string) ([]bool, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var flags []bool
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &flags); err == nil {
		return flags, nil
	}
	var intFlags []int
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &intFlags); err == nil {
		flags = make([]bool, 0, len(intFlags))
		for _, value := range intFlags {
			flags = append(flags, value != 0)
		}
		return flags, nil
	}
	var objects []struct {
		DeptId json.RawMessage `json:"dept_id"`
		Leader bool            `json:"leader"`
	}
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &objects); err == nil {
		byDepartment := map[string]bool{}
		for _, item := range objects {
			byDepartment[rawDingTalkString(item.DeptId)] = item.Leader
		}
		flags = make([]bool, 0, len(departments))
		for _, departmentId := range departments {
			flags = append(flags, byDepartment[departmentId])
		}
		return flags, nil
	}
	return nil, fmt.Errorf("expected leader flags")
}

func rawDingTalkActiveStatus(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var active bool
	if err := decodeDingTalkResponse(bytes.NewReader(raw), &active); err == nil {
		if active {
			return "active"
		}
		return "inactive"
	}
	return rawDingTalkString(raw)
}

func normalizeDingTalkLeaderList(commaSeparated string, values []string) []string {
	leaders := []string{}
	if commaSeparated != "" {
		leaders = append(leaders, strings.Split(commaSeparated, ",")...)
	}
	leaders = append(leaders, values...)
	return compactDingTalkStrings(leaders)
}

func compactDingTalkStrings(values []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func mergeDingTalkIntSlices(a []int, b []int) []int {
	if len(a) >= len(b) {
		return a
	}
	return b
}

func mergeDingTalkBoolSlices(a []bool, b []bool) []bool {
	if len(a) >= len(b) {
		return a
	}
	return b
}

var dingtalkSensitiveMessagePattern = regexp.MustCompile(`(?i)(access[_-]?token|appsecret|secret|token)`)

func sanitizeDingTalkApiMessage(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return dingtalkSensitiveMessagePattern.ReplaceAllString(value, "[redacted]")
}
