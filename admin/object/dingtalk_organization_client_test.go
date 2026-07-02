// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

func TestDingTalkAddressBookClientGetAccessToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/gettoken" {
			t.Fatalf("path = %s, want /gettoken", r.URL.Path)
		}
		if r.URL.Query().Get("appkey") != "ding-app" {
			t.Fatalf("appkey = %s, want ding-app", r.URL.Query().Get("appkey"))
		}
		if r.URL.Query().Get("appsecret") != "secret" {
			t.Fatalf("appsecret = %s, want secret", r.URL.Query().Get("appsecret"))
		}
		_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"ding-token","expires_in":7200}`))
	}))
	defer server.Close()

	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	token, err := client.GetAccessToken(context.Background())
	if err != nil {
		t.Fatalf("GetAccessToken() error = %v", err)
	}
	if token.AccessToken != "ding-token" || token.ExpiresIn != 7200 {
		t.Fatalf("token = %+v, want access token and expire", token)
	}
}

func TestDingTalkAddressBookClientFetchDepartmentSnapshotsRecursively(t *testing.T) {
	requestedDepartments := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/topapi/v2/department/listsub" {
			t.Fatalf("path = %s, want /topapi/v2/department/listsub", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.Query().Get("access_token") != "ding-token" {
			t.Fatalf("access_token = %s, want ding-token", r.URL.Query().Get("access_token"))
		}
		body := readDingTalkRequestBody(t, r)
		departmentId := body["dept_id"].(string)
		requestedDepartments = append(requestedDepartments, departmentId)
		switch departmentId {
		case "1":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":[{"dept_id":2,"parent_id":1,"name":"研发中心","order":10},{"dept_id":3,"parent_id":1,"name":"销售中心","order":20}]}`))
		case "2":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":[{"dept_id":4,"parent_id":2,"name":"平台组","order":5}]}`))
		case "3", "4":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":[]}`))
		default:
			t.Fatalf("unexpected dept_id %s", departmentId)
		}
	}))
	defer server.Close()

	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	departments, err := client.FetchDepartmentSnapshots(context.Background(), "ding-token", "1")
	if err != nil {
		t.Fatalf("FetchDepartmentSnapshots() error = %v", err)
	}
	if !reflect.DeepEqual(requestedDepartments, []string{"1", "2", "3", "4"}) {
		t.Fatalf("requested departments = %#v, want recursive breadth-first walk", requestedDepartments)
	}
	if len(departments) != 3 {
		t.Fatalf("len(departments) = %d, want 3", len(departments))
	}
	if departments[0].Id != "2" || departments[0].ParentId != "1" || departments[0].Name != "研发中心" || departments[0].Order != 10 {
		t.Fatalf("first department = %+v, want normalized dept 2", departments[0])
	}
}

func TestDingTalkAddressBookClientFetchUserSnapshotsPagesDepartments(t *testing.T) {
	userListCalls := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/topapi/v2/user/list" {
			t.Fatalf("path = %s, want /topapi/v2/user/list", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		body := readDingTalkRequestBody(t, r)
		departmentId := body["dept_id"].(string)
		cursor := int(body["cursor"].(float64))
		userListCalls = append(userListCalls, departmentId)
		switch {
		case departmentId == "2" && cursor == 0:
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":{"has_more":true,"next_cursor":1,"list":[{"userid":"u1","unionid":"union-u1","name":"张三","dept_id_list":[2,4],"dept_order_list":[20,10],"title":"工程师","mobile":"13800000000","email":"u1@example.test","avatar":"https://avatar.example/u1.png","leader_in_dept":[{"dept_id":2,"leader":true},{"dept_id":4,"leader":false}],"manager_userid":"u2","main_dept_id":2,"active":true}]}}`))
		case departmentId == "2" && cursor == 1:
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":{"has_more":false,"next_cursor":0,"list":[{"userid":"u2","name":"李四","dept_id_list":[2],"manager_userid":"","main_dept_id":2,"active":false}]}}`))
		case departmentId == "4":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":{"has_more":false,"next_cursor":0,"list":[{"userid":"u1","unionid":"union-u1","name":"张三","dept_id_list":[2,4],"main_dept_id":2,"active":true}]}}`))
		default:
			t.Fatalf("unexpected dept_id/cursor %s/%d", departmentId, cursor)
		}
	}))
	defer server.Close()

	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	users, err := client.FetchUserSnapshots(context.Background(), "ding-token", []DingTalkDepartmentSnapshot{
		{Id: "2", ParentId: "1", Name: "研发中心"},
		{Id: "4", ParentId: "2", Name: "平台组"},
	})
	if err != nil {
		t.Fatalf("FetchUserSnapshots() error = %v", err)
	}
	if !reflect.DeepEqual(userListCalls, []string{"2", "2", "4"}) {
		t.Fatalf("user list calls = %#v, want department pages then child dept", userListCalls)
	}
	if len(users) != 2 {
		t.Fatalf("len(users) = %d, want u1/u2 de-duplicated", len(users))
	}
	user := findDingTalkUserSnapshot(users, "u1")
	if user == nil {
		t.Fatalf("u1 not found in %+v", users)
	}
	if user.UnionId != "union-u1" || user.Name != "张三" || user.MainDepartmentId != "2" || user.Status != "active" {
		t.Fatalf("u1 = %+v, want normalized identity/profile/status", user)
	}
	if !reflect.DeepEqual(user.Departments, []string{"2", "4"}) {
		t.Fatalf("u1 departments = %#v, want [2 4]", user.Departments)
	}
	if !reflect.DeepEqual(user.DepartmentOrders, []int{20, 10}) {
		t.Fatalf("u1 department orders = %#v, want [20 10]", user.DepartmentOrders)
	}
	if !reflect.DeepEqual(user.IsLeaderInDepartment, []bool{true, false}) {
		t.Fatalf("u1 leader flags = %#v, want [true false]", user.IsLeaderInDepartment)
	}
	if !reflect.DeepEqual(user.DirectLeaders, []string{"u2"}) {
		t.Fatalf("u1 direct leaders = %#v, want [u2]", user.DirectLeaders)
	}
}

func TestDingTalkAddressBookClientTestConnectionAndSafeError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/gettoken":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"ding-token","expires_in":7200}`))
		case "/topapi/v2/department/listsub":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":[{"dept_id":2,"parent_id":1,"name":"研发"}]}`))
		case "/topapi/v2/user/list":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":{"has_more":false,"list":[{"userid":"u1","name":"张三","dept_id_list":[2],"main_dept_id":2,"active":true}]}}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	result, err := client.TestConnection(context.Background())
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if !result.AccessTokenOk || !result.DepartmentSnapshotOk || !result.UserSnapshotOk {
		t.Fatalf("result = %+v, want all checks true", result)
	}
	if result.DepartmentCount != 1 || result.UserCount != 1 {
		t.Fatalf("counts = departments %d users %d, want 1/1", result.DepartmentCount, result.UserCount)
	}

	errorServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"errcode":40001,"errmsg":"invalid appsecret secret-value access_token should not leak"}`))
	}))
	defer errorServer.Close()

	client.BaseUrl = errorServer.URL
	_, err = client.GetAccessToken(context.Background())
	var apiErr *DingTalkApiError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %T:%v, want DingTalkApiError", err, err)
	}
	if apiErr.SafeMessage() == "" || apiErr.SafeMessage() != apiErr.Error() {
		t.Fatalf("safe message should be non-empty and equal Error(), got %q/%q", apiErr.SafeMessage(), apiErr.Error())
	}
	if containsSensitiveDingTalkText(apiErr.SafeMessage()) {
		t.Fatalf("safe message leaks sensitive text: %q", apiErr.SafeMessage())
	}
}

func TestDingTalkRawFieldHelpersHandleMixedShapes(t *testing.T) {
	ints, err := rawDingTalkIntSlice(json.RawMessage(`[10.5,20]`))
	if err != nil || !reflect.DeepEqual(ints, []int{0, 20}) {
		t.Fatalf("rawDingTalkIntSlice(number fallback) = %#v, %v; want [0 20]", ints, err)
	}
	if _, err := rawDingTalkIntSlice(json.RawMessage(`{"bad":true}`)); err == nil {
		t.Fatalf("rawDingTalkIntSlice(object) error = nil, want parse error")
	}

	flags, err := rawDingTalkLeaderFlags(json.RawMessage(`[1,0,2]`), []string{"2", "4", "6"})
	if err != nil || !reflect.DeepEqual(flags, []bool{true, false, true}) {
		t.Fatalf("rawDingTalkLeaderFlags(ints) = %#v, %v; want [true false true]", flags, err)
	}
	flags, err = rawDingTalkLeaderFlags(json.RawMessage(`true`), []string{"2"})
	if err == nil || flags != nil {
		t.Fatalf("rawDingTalkLeaderFlags(bool) = %#v, %v; want parse error", flags, err)
	}

	if got := rawDingTalkActiveStatus(json.RawMessage(`false`)); got != "inactive" {
		t.Fatalf("rawDingTalkActiveStatus(false) = %q, want inactive", got)
	}
	if got := mergeDingTalkIntSlices([]int{1}, []int{1, 2}); !reflect.DeepEqual(got, []int{1, 2}) {
		t.Fatalf("mergeDingTalkIntSlices() = %#v, want longer right side", got)
	}
	if got := mergeDingTalkBoolSlices([]bool{true}, []bool{true, false}); !reflect.DeepEqual(got, []bool{true, false}) {
		t.Fatalf("mergeDingTalkBoolSlices() = %#v, want longer right side", got)
	}
	if got := sanitizeDingTalkApiMessage(" appSecret token leaked "); strings.Contains(strings.ToLower(got), "secret") || strings.Contains(strings.ToLower(got), "token") {
		t.Fatalf("sanitizeDingTalkApiMessage() = %q, want redacted sensitive words", got)
	}
}

func TestDingTalkAddressBookClientHandlesHttpAndDecodeFailuresSafely(t *testing.T) {
	testCases := []struct {
		name       string
		statusCode int
		body       string
		want       string
	}{
		{name: "http status", statusCode: http.StatusBadGateway, body: `bad gateway`, want: "unexpected http status"},
		{name: "bad json", statusCode: http.StatusOK, body: `{`, want: "invalid json response"},
		{name: "empty token", statusCode: http.StatusOK, body: `{"errcode":0,"errmsg":"ok","access_token":""}`, want: "empty access"},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.statusCode)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			client := NewDingTalkAddressBookClient("ding-app", "secret")
			client.BaseUrl = server.URL
			client.HttpClient = server.Client()

			_, err := client.GetAccessToken(context.Background())
			var apiErr *DingTalkApiError
			if !errors.As(err, &apiErr) || !strings.Contains(apiErr.SafeMessage(), tc.want) {
				t.Fatalf("GetAccessToken() error = %T:%v, want DingTalkApiError containing %q", err, err, tc.want)
			}
			if containsSensitiveDingTalkText(apiErr.SafeMessage()) {
				t.Fatalf("safe message leaks sensitive text: %q", apiErr.SafeMessage())
			}
		})
	}
}

func TestDingTalkAddressBookClientUsesDefaultsAndPropagatesRequestErrors(t *testing.T) {
	client := &DingTalkAddressBookClient{
		BaseUrl:    ":// bad-url",
		HttpClient: nil,
	}
	if client.httpClient() != http.DefaultClient {
		t.Fatalf("httpClient() should fall back to http.DefaultClient")
	}
	if _, err := client.buildUrl("/gettoken", map[string]string{"appkey": "ding-app"}); err == nil {
		t.Fatalf("buildUrl(invalid base) error = nil, want parse error")
	}

	client.BaseUrl = ""
	built, err := client.buildUrl("/gettoken?existing=1", map[string]string{"appkey": "ding-app"})
	if err != nil {
		t.Fatalf("buildUrl(default base) error = %v", err)
	}
	if !strings.HasPrefix(built, DefaultDingTalkApiBaseUrl+"/gettoken") || !strings.Contains(built, "existing=1") || !strings.Contains(built, "appkey=ding-app") {
		t.Fatalf("buildUrl(default base) = %q, want default base preserving query", built)
	}

	client.HttpClient = &http.Client{Transport: dingTalkRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("transport failed with token abc")
	})}
	_, err = client.do(context.Background(), http.MethodGet, "/gettoken", nil, nil, "gettoken")
	var apiErr *DingTalkApiError
	if !errors.As(err, &apiErr) || !strings.Contains(apiErr.SafeMessage(), "request failed") {
		t.Fatalf("do(transport error) = %T:%v, want safe request failure", err, err)
	}
	if strings.Contains(strings.ToLower(apiErr.SafeMessage()), "token abc") {
		t.Fatalf("transport error leaked sensitive text: %q", apiErr.SafeMessage())
	}
}

func TestDingTalkAddressBookClientPropagatesSnapshotReadFailures(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/topapi/v2/department/listsub":
			_, _ = w.Write([]byte(`{"errcode":40035,"errmsg":"bad token"}`))
		case "/topapi/v2/user/list":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","result":{"has_more":false,"list":[{"userid":"u1","dept_id_list":{"bad":true}}]}}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()
	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	if _, err := client.FetchDepartmentSnapshots(context.Background(), "ding-token", ""); err == nil || !strings.Contains(err.Error(), "department/listsub") {
		t.Fatalf("FetchDepartmentSnapshots() error = %v, want department API error", err)
	}
	if _, err := client.FetchUserSnapshots(context.Background(), "ding-token", []DingTalkDepartmentSnapshot{{Id: "2"}}); err == nil || !strings.Contains(err.Error(), "invalid dept_id_list") {
		t.Fatalf("FetchUserSnapshots() error = %v, want invalid user payload error", err)
	}
}

type dingTalkRoundTripFunc func(*http.Request) (*http.Response, error)

func (f dingTalkRoundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

type errorReader struct{}

func (errorReader) Read([]byte) (int, error) {
	return 0, fmt.Errorf("read failed with secret")
}

func TestDingTalkAddressBookClientReadErrorIsSafe(t *testing.T) {
	client := NewDingTalkAddressBookClient("ding-app", "secret")
	client.HttpClient = &http.Client{Transport: dingTalkRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(errorReader{}),
		}, nil
	})}

	_, err := client.do(context.Background(), http.MethodGet, "/gettoken", nil, nil, "gettoken")
	var apiErr *DingTalkApiError
	if !errors.As(err, &apiErr) || !strings.Contains(apiErr.SafeMessage(), "read response failed") {
		t.Fatalf("do(read error) = %T:%v, want safe read failure", err, err)
	}
	if strings.Contains(apiErr.SafeMessage(), "secret") {
		t.Fatalf("read error leaked sensitive text: %q", apiErr.SafeMessage())
	}
}

func findDingTalkUserSnapshot(users []DingTalkUserSnapshot, userId string) *DingTalkUserSnapshot {
	for i := range users {
		if users[i].UserId == userId {
			return &users[i]
		}
	}
	return nil
}

func readDingTalkRequestBody(t *testing.T, r *http.Request) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		t.Fatalf("invalid request body: %v", err)
	}
	return body
}

func containsSensitiveDingTalkText(value string) bool {
	return strings.Contains(value, "secret-value") || strings.Contains(value, "access_token")
}
