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
	"time"
)

const DefaultWecomApiBaseUrl = "https://qyapi.weixin.qq.com"

// WecomAddressBookClient 封装企业微信通讯录 API，并向同步服务输出规范化快照。
type WecomAddressBookClient struct {
	CorpId            string
	AddressBookSecret string
	BaseUrl           string
	HttpClient        *http.Client
}

// WecomAccessToken 表示服务端调用企业微信 API 使用的访问凭证。
type WecomAccessToken struct {
	AccessToken string
	ExpiresIn   int
	ExpiresAt   time.Time
}

// WecomDepartmentSnapshot 是同步服务使用的规范化部门快照。
type WecomDepartmentSnapshot struct {
	Id                       string
	ParentId                 string
	Name                     string
	Order                    int
	DepartmentLeader         []string
	HasDepartmentLeaderField bool
}

// WecomDepartmentIdSnapshot 表示 department/simplelist 返回的轻量部门身份。
type WecomDepartmentIdSnapshot struct {
	Id       string
	ParentId string
	Order    int
}

// WecomUserDepartmentIdSnapshot 表示 user/list_id 返回的成员与部门关系。
type WecomUserDepartmentIdSnapshot struct {
	UserId       string
	DepartmentId string
}

// WecomUserSnapshot 是同步服务使用的规范化成员快照。
type WecomUserSnapshot struct {
	UserId                       string
	Name                         string
	Departments                  []string
	DepartmentOrders             []int
	Position                     string
	Mobile                       string
	Email                        string
	BizMail                      string
	IsLeaderInDepartment         []bool
	DirectLeaders                []string
	Avatar                       string
	ThumbAvatar                  string
	Telephone                    string
	Alias                        string
	OpenUserId                   string
	MainDepartmentId             string
	Status                       int
	HasDirectLeaderField         bool
	HasIsLeaderInDepartmentField bool
}

// WecomAddressBookConnectionTestResult 表示 API 可达性和关键关系字段可见性。
type WecomAddressBookConnectionTestResult struct {
	AccessTokenOk                      bool
	DepartmentSnapshotOk               bool
	UserSnapshotOk                     bool
	DepartmentCount                    int
	UserCount                          int
	DepartmentLeaderFieldAvailable     bool
	DirectLeaderFieldAvailable         bool
	IsLeaderInDepartmentFieldAvailable bool
	MissingFields                      []string
}

// IsReadyForOrganizationSync 仅在同步关键 API 和关系字段都可用时返回 true。
func (r *WecomAddressBookConnectionTestResult) IsReadyForOrganizationSync() bool {
	if r == nil {
		return false
	}
	return r.AccessTokenOk &&
		r.DepartmentSnapshotOk &&
		r.UserSnapshotOk &&
		r.DepartmentLeaderFieldAvailable &&
		r.DirectLeaderFieldAvailable &&
		r.IsLeaderInDepartmentFieldAvailable &&
		len(r.MissingFields) == 0
}

// WecomApiError 保留企业微信 errcode/errmsg，并提供可用于后台页面和日志的安全摘要。
type WecomApiError struct {
	Operation string
	ErrCode   int
	ErrMsg    string
	Cause     error
}

func (e *WecomApiError) Error() string {
	return e.SafeMessage()
}

func (e *WecomApiError) SafeMessage() string {
	if e == nil {
		return ""
	}

	operation := strings.TrimSpace(e.Operation)
	if operation == "" {
		operation = "api"
	}
	if e.ErrCode == 0 && e.ErrMsg == "" {
		return fmt.Sprintf("wecom %s failed", operation)
	}
	return fmt.Sprintf("wecom %s failed: errcode=%d, errmsg=%s", operation, e.ErrCode, e.ErrMsg)
}

// NewWecomAddressBookClient 基于企业 ID 和具备通讯录读取范围的自建应用 Secret 创建企业微信通讯录客户端。
func NewWecomAddressBookClient(corpId string, addressBookSecret string) *WecomAddressBookClient {
	return &WecomAddressBookClient{
		CorpId:            corpId,
		AddressBookSecret: addressBookSecret,
		BaseUrl:           DefaultWecomApiBaseUrl,
		HttpClient:        newDefaultOrganizationHTTPClient(),
	}
}

func (c *WecomAddressBookClient) GetAccessToken(ctx context.Context) (*WecomAccessToken, error) {
	const operation = "gettoken"

	endpoint, err := c.buildUrl("/cgi-bin/gettoken", map[string]string{
		"corpid":     c.CorpId,
		"corpsecret": c.AddressBookSecret,
	})
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var tokenResp struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := decodeWecomResponse(resp.Body, &tokenResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if tokenResp.ErrCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: tokenResp.ErrCode, ErrMsg: tokenResp.ErrMsg}
	}
	if tokenResp.AccessToken == "" {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "empty access_token"}
	}

	return &WecomAccessToken{
		AccessToken: tokenResp.AccessToken,
		ExpiresIn:   tokenResp.ExpiresIn,
		ExpiresAt:   time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second),
	}, nil
}

func (c *WecomAddressBookClient) ListDepartments(ctx context.Context, accessToken string, departmentId string) ([]WecomDepartmentSnapshot, error) {
	const operation = "department/list"

	query := map[string]string{"access_token": accessToken}
	if departmentId != "" {
		query["id"] = departmentId
	}

	endpoint, err := c.buildUrl("/cgi-bin/department/list", query)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var departmentResp struct {
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
		Department []struct {
			Id               json.Number `json:"id"`
			Name             string      `json:"name"`
			ParentId         json.Number `json:"parentid"`
			Order            int         `json:"order"`
			DepartmentLeader []string    `json:"department_leader"`
		} `json:"department"`
	}
	if err := decodeWecomResponse(resp.Body, &departmentResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if departmentResp.ErrCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: departmentResp.ErrCode, ErrMsg: departmentResp.ErrMsg}
	}

	departments := make([]WecomDepartmentSnapshot, 0, len(departmentResp.Department))
	for _, item := range departmentResp.Department {
		departments = append(departments, WecomDepartmentSnapshot{
			Id:                       item.Id.String(),
			ParentId:                 item.ParentId.String(),
			Name:                     item.Name,
			Order:                    item.Order,
			DepartmentLeader:         item.DepartmentLeader,
			HasDepartmentLeaderField: item.DepartmentLeader != nil,
		})
	}
	return departments, nil
}

func (c *WecomAddressBookClient) ListDepartmentIds(ctx context.Context, accessToken string, departmentId string) ([]WecomDepartmentIdSnapshot, error) {
	const operation = "department/simplelist"

	query := map[string]string{"access_token": accessToken}
	if departmentId != "" {
		query["id"] = departmentId
	}

	endpoint, err := c.buildUrl("/cgi-bin/department/simplelist", query)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var departmentResp struct {
		ErrCode      int    `json:"errcode"`
		ErrMsg       string `json:"errmsg"`
		DepartmentId []struct {
			Id       json.Number `json:"id"`
			ParentId json.Number `json:"parentid"`
			Order    int         `json:"order"`
		} `json:"department_id"`
	}
	if err := decodeWecomResponse(resp.Body, &departmentResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if departmentResp.ErrCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: departmentResp.ErrCode, ErrMsg: departmentResp.ErrMsg}
	}

	departments := make([]WecomDepartmentIdSnapshot, 0, len(departmentResp.DepartmentId))
	for _, item := range departmentResp.DepartmentId {
		departments = append(departments, WecomDepartmentIdSnapshot{
			Id:       item.Id.String(),
			ParentId: item.ParentId.String(),
			Order:    item.Order,
		})
	}
	return departments, nil
}

func (c *WecomAddressBookClient) GetDepartment(ctx context.Context, accessToken string, departmentId string) (*WecomDepartmentSnapshot, error) {
	const operation = "department/get"

	endpoint, err := c.buildUrl("/cgi-bin/department/get", map[string]string{
		"access_token": accessToken,
		"id":           departmentId,
	})
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var departmentResp struct {
		ErrCode    int                        `json:"errcode"`
		ErrMsg     string                     `json:"errmsg"`
		Department map[string]json.RawMessage `json:"department"`
	}
	if err := decodeWecomResponse(resp.Body, &departmentResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if departmentResp.ErrCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: departmentResp.ErrCode, ErrMsg: departmentResp.ErrMsg}
	}

	snapshot := &WecomDepartmentSnapshot{
		Id:       rawString(departmentResp.Department["id"]),
		ParentId: rawString(departmentResp.Department["parentid"]),
		Name:     rawString(departmentResp.Department["name"]),
		Order:    rawInt(departmentResp.Department["order"]),
	}
	if raw, ok := departmentResp.Department["department_leader"]; ok {
		snapshot.HasDepartmentLeaderField = true
		leaders, err := rawStringSlice(raw)
		if err != nil {
			return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid department_leader response", Cause: err}
		}
		snapshot.DepartmentLeader = leaders
	}
	return snapshot, nil
}

// FetchDepartmentSnapshots 使用自建应用可见范围内的 department/list 获取部门详情。
// 通讯录同步助手 Secret 在新 IP 下不能读取 department/get 详情，读取型同步必须使用自建应用 Secret。
func (c *WecomAddressBookClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]WecomDepartmentSnapshot, error) {
	return c.ListDepartments(ctx, accessToken, departmentId)
}

// ListUserDepartmentIds 封装 user/list_id，用于获取完整的成员与部门关系。
func (c *WecomAddressBookClient) ListUserDepartmentIds(ctx context.Context, accessToken string, cursor string, limit int) ([]WecomUserDepartmentIdSnapshot, string, error) {
	const operation = "user/list_id"

	if limit <= 0 {
		limit = 10000
	}

	endpoint, err := c.buildUrl("/cgi-bin/user/list_id", map[string]string{
		"access_token": accessToken,
	})
	if err != nil {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	body, err := json.Marshal(struct {
		Cursor string `json:"cursor,omitempty"`
		Limit  int    `json:"limit"`
	}{
		Cursor: cursor,
		Limit:  limit,
	})
	if err != nil {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request body", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var userResp struct {
		ErrCode    int    `json:"errcode"`
		ErrMsg     string `json:"errmsg"`
		NextCursor string `json:"next_cursor"`
		DeptUser   []struct {
			UserId     string      `json:"userid"`
			Department json.Number `json:"department"`
		} `json:"dept_user"`
	}
	if err := decodeWecomResponse(resp.Body, &userResp); err != nil {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if userResp.ErrCode != 0 {
		return nil, "", &WecomApiError{Operation: operation, ErrCode: userResp.ErrCode, ErrMsg: userResp.ErrMsg}
	}

	items := make([]WecomUserDepartmentIdSnapshot, 0, len(userResp.DeptUser))
	for _, item := range userResp.DeptUser {
		items = append(items, WecomUserDepartmentIdSnapshot{
			UserId:       item.UserId,
			DepartmentId: item.Department.String(),
		})
	}
	return items, userResp.NextCursor, nil
}

// ListDepartmentUsers 通过部门成员详情接口读取成员，用于兼容 user/list_id 无权限的企业微信环境。
func (c *WecomAddressBookClient) ListDepartmentUsers(ctx context.Context, accessToken string, departmentId string, fetchChild bool) ([]WecomUserSnapshot, error) {
	const operation = "user/list"

	if departmentId == "" {
		departmentId = "1"
	}
	fetchChildValue := "0"
	if fetchChild {
		fetchChildValue = "1"
	}

	endpoint, err := c.buildUrl("/cgi-bin/user/list", map[string]string{
		"access_token":  accessToken,
		"department_id": departmentId,
		"fetch_child":   fetchChildValue,
	})
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var userResp struct {
		ErrCode  int                          `json:"errcode"`
		ErrMsg   string                       `json:"errmsg"`
		UserList []map[string]json.RawMessage `json:"userlist"`
	}
	if err := decodeWecomResponse(resp.Body, &userResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}
	if userResp.ErrCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: userResp.ErrCode, ErrMsg: userResp.ErrMsg}
	}

	users := make([]WecomUserSnapshot, 0, len(userResp.UserList))
	for _, rawUser := range userResp.UserList {
		user, err := newWecomUserSnapshotFromRaw(operation, rawUser)
		if err != nil {
			return nil, err
		}
		users = append(users, *user)
	}
	return users, nil
}

// GetUser 读取单个成员详情，并记录关键关系字段是否出现在响应中。
func (c *WecomAddressBookClient) GetUser(ctx context.Context, accessToken string, userId string) (*WecomUserSnapshot, error) {
	const operation = "user/get"

	endpoint, err := c.buildUrl("/cgi-bin/user/get", map[string]string{
		"access_token": accessToken,
		"userid":       userId,
	})
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request url", Cause: err}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid request", Cause: err}
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "request failed", Cause: err}
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, &WecomApiError{Operation: operation, ErrCode: resp.StatusCode, ErrMsg: "unexpected http status"}
	}

	var userResp map[string]json.RawMessage
	if err := decodeWecomResponse(resp.Body, &userResp); err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid json response", Cause: err}
	}

	errCode := rawInt(userResp["errcode"])
	errMsg := rawString(userResp["errmsg"])
	if errCode != 0 {
		return nil, &WecomApiError{Operation: operation, ErrCode: errCode, ErrMsg: errMsg}
	}

	return newWecomUserSnapshotFromRaw(operation, userResp)
}

func newWecomUserSnapshotFromRaw(operation string, userResp map[string]json.RawMessage) (*WecomUserSnapshot, error) {
	departments, err := rawStringSlice(userResp["department"])
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid department response", Cause: err}
	}
	orders, err := rawIntSlice(userResp["order"])
	if err != nil {
		return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid order response", Cause: err}
	}

	snapshot := &WecomUserSnapshot{
		UserId:           rawString(userResp["userid"]),
		Name:             rawString(userResp["name"]),
		Departments:      departments,
		DepartmentOrders: orders,
		Position:         rawString(userResp["position"]),
		Mobile:           rawString(userResp["mobile"]),
		Email:            rawString(userResp["email"]),
		BizMail:          rawString(userResp["biz_mail"]),
		Avatar:           rawString(userResp["avatar"]),
		ThumbAvatar:      rawString(userResp["thumb_avatar"]),
		Telephone:        rawString(userResp["telephone"]),
		Alias:            rawString(userResp["alias"]),
		OpenUserId:       rawString(userResp["open_userid"]),
		MainDepartmentId: rawString(userResp["main_department"]),
		Status:           rawInt(userResp["status"]),
	}
	if raw, ok := userResp["direct_leader"]; ok {
		snapshot.HasDirectLeaderField = true
		directLeaders, err := rawStringSlice(raw)
		if err != nil {
			return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid direct_leader response", Cause: err}
		}
		snapshot.DirectLeaders = directLeaders
	}
	if raw, ok := userResp["is_leader_in_dept"]; ok {
		snapshot.HasIsLeaderInDepartmentField = true
		leaders, err := rawBoolSlice(raw)
		if err != nil {
			return nil, &WecomApiError{Operation: operation, ErrCode: -1, ErrMsg: "invalid is_leader_in_dept response", Cause: err}
		}
		snapshot.IsLeaderInDepartment = leaders
	}
	return snapshot, nil
}

// FetchUserSnapshots 先用 user/list_id 覆盖成员范围，再用 user/get 获取资料和关系字段。
// user/list_id 按成员部门关系返回多行，同一个 userid 需要在这里去重。
func (c *WecomAddressBookClient) FetchUserSnapshots(ctx context.Context, accessToken string) ([]WecomUserSnapshot, error) {
	userIds := make([]string, 0)
	seenUserIds := map[string]bool{}
	cursor := ""
	for {
		items, nextCursor, err := c.ListUserDepartmentIds(ctx, accessToken, cursor, 10000)
		if err != nil {
			if isWecomApiForbidden(err) {
				// 部分自建应用不能调用 user/list_id，但仍允许按部门读取成员详情；保留回退路径降低联调门槛。
				return c.ListDepartmentUsers(ctx, accessToken, "1", true)
			}
			return nil, err
		}
		for _, item := range items {
			if item.UserId == "" || seenUserIds[item.UserId] {
				continue
			}
			seenUserIds[item.UserId] = true
			userIds = append(userIds, item.UserId)
		}
		if nextCursor == "" {
			break
		}
		cursor = nextCursor
	}

	users := make([]WecomUserSnapshot, 0, len(userIds))
	for _, userId := range userIds {
		user, err := c.GetUser(ctx, accessToken, userId)
		if err != nil {
			return nil, err
		}
		users = append(users, *user)
	}
	return users, nil
}

func isWecomApiForbidden(err error) bool {
	var apiErr *WecomApiError
	return errors.As(err, &apiErr) && apiErr.ErrCode == 48002
}

// TestConnection 校验凭证和必需字段可见性，不变更本地用户或用户组。
// 只要企业微信响应中出现字段，即使关系数组为空，也视为该字段可用。
func (c *WecomAddressBookClient) TestConnection(ctx context.Context) (*WecomAddressBookConnectionTestResult, error) {
	result := &WecomAddressBookConnectionTestResult{}

	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return result, err
	}
	result.AccessTokenOk = true

	departments, err := c.FetchDepartmentSnapshots(ctx, token.AccessToken, "")
	if err != nil {
		return result, err
	}
	result.DepartmentSnapshotOk = true
	result.DepartmentCount = len(departments)
	for _, department := range departments {
		if department.HasDepartmentLeaderField {
			result.DepartmentLeaderFieldAvailable = true
			break
		}
	}

	users, err := c.FetchUserSnapshots(ctx, token.AccessToken)
	if err != nil {
		return result, err
	}
	result.UserSnapshotOk = true
	result.UserCount = len(users)
	for _, user := range users {
		if user.HasDirectLeaderField {
			result.DirectLeaderFieldAvailable = true
		}
		if user.HasIsLeaderInDepartmentField {
			result.IsLeaderInDepartmentFieldAvailable = true
		}
		if result.DirectLeaderFieldAvailable && result.IsLeaderInDepartmentFieldAvailable {
			break
		}
	}
	result.RefreshMissingFields()
	return result, nil
}

func (r *WecomAddressBookConnectionTestResult) RefreshMissingFields() {
	if r == nil {
		return
	}

	missingFields := make([]string, 0, 3)
	if !r.DepartmentLeaderFieldAvailable {
		missingFields = append(missingFields, "department_leader")
	}
	if !r.DirectLeaderFieldAvailable {
		missingFields = append(missingFields, "direct_leader")
	}
	if !r.IsLeaderInDepartmentFieldAvailable {
		missingFields = append(missingFields, "is_leader_in_dept")
	}
	r.MissingFields = missingFields
}

func (c *WecomAddressBookClient) buildUrl(path string, query map[string]string) (string, error) {
	baseUrl := c.BaseUrl
	if baseUrl == "" {
		baseUrl = DefaultWecomApiBaseUrl
	}

	u, err := url.Parse(strings.TrimRight(baseUrl, "/") + path)
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

func (c *WecomAddressBookClient) httpClient() *http.Client {
	return organizationHTTPClient(c.HttpClient)
}

func decodeWecomResponse(reader io.Reader, target any) error {
	decoder := json.NewDecoder(reader)
	decoder.UseNumber()
	return decoder.Decode(target)
}

func decodeJsonRaw(raw json.RawMessage, target any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	return decoder.Decode(target)
}

func rawString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}

	var text string
	if err := decodeJsonRaw(raw, &text); err == nil {
		return text
	}

	var number json.Number
	if err := decodeJsonRaw(raw, &number); err == nil {
		return number.String()
	}

	return ""
}

func rawInt(raw json.RawMessage) int {
	if len(raw) == 0 || string(raw) == "null" {
		return 0
	}

	var value int
	if err := decodeJsonRaw(raw, &value); err == nil {
		return value
	}

	var number json.Number
	if err := decodeJsonRaw(raw, &number); err == nil {
		intValue, _ := number.Int64()
		return int(intValue)
	}

	return 0
}

func rawStringSlice(raw json.RawMessage) ([]string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}

	var texts []string
	if err := decodeJsonRaw(raw, &texts); err == nil {
		return texts, nil
	}

	var numbers []json.Number
	if err := decodeJsonRaw(raw, &numbers); err == nil {
		texts = make([]string, 0, len(numbers))
		for _, number := range numbers {
			texts = append(texts, number.String())
		}
		return texts, nil
	}

	return nil, fmt.Errorf("expected string or number array")
}

func rawIntSlice(raw json.RawMessage) ([]int, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}

	var values []int
	if err := decodeJsonRaw(raw, &values); err == nil {
		return values, nil
	}

	var numbers []json.Number
	if err := decodeJsonRaw(raw, &numbers); err == nil {
		values = make([]int, 0, len(numbers))
		for _, number := range numbers {
			intValue, _ := number.Int64()
			values = append(values, int(intValue))
		}
		return values, nil
	}

	return nil, fmt.Errorf("expected int array")
}

func rawBoolSlice(raw json.RawMessage) ([]bool, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}

	var values []bool
	if err := decodeJsonRaw(raw, &values); err == nil {
		return values, nil
	}

	intValues, err := rawIntSlice(raw)
	if err != nil {
		return nil, err
	}

	values = make([]bool, 0, len(intValues))
	for _, value := range intValues {
		values = append(values, value != 0)
	}
	return values, nil
}
