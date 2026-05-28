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
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"
)

func TestWecomAddressBookClientGetAccessToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/cgi-bin/gettoken" {
			t.Fatalf("path = %s, want /cgi-bin/gettoken", r.URL.Path)
		}
		if r.URL.Query().Get("corpid") != "ww123" {
			t.Fatalf("corpid = %s, want ww123", r.URL.Query().Get("corpid"))
		}
		if r.URL.Query().Get("corpsecret") != "secret" {
			t.Fatalf("corpsecret = %s, want secret", r.URL.Query().Get("corpsecret"))
		}
		_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"token-value","expires_in":7200}`))
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	token, err := client.GetAccessToken(context.Background())
	if err != nil {
		t.Fatalf("GetAccessToken() error = %v", err)
	}
	if token.AccessToken != "token-value" {
		t.Fatalf("access token = %s, want token-value", token.AccessToken)
	}
	if token.ExpiresIn != 7200 {
		t.Fatalf("expires in = %d, want 7200", token.ExpiresIn)
	}
	if token.ExpiresAt.Before(time.Now().Add(7100 * time.Second)) {
		t.Fatalf("expires at should be based on expires_in, got %s", token.ExpiresAt)
	}
}

func TestWecomAddressBookClientErrorMapping(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"errcode":40014,"errmsg":"invalid access_token"}`))
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	_, err := client.GetAccessToken(context.Background())
	var apiErr *WecomApiError
	if !errors.As(err, &apiErr) {
		t.Fatalf("error should be WecomApiError, got %T: %v", err, err)
	}
	if apiErr.ErrCode != 40014 {
		t.Fatalf("errcode = %d, want 40014", apiErr.ErrCode)
	}
	if apiErr.SafeMessage() == "" {
		t.Fatalf("safe message should not be empty")
	}
}

func TestWecomAddressBookClientListDepartments(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/cgi-bin/department/list" {
			t.Fatalf("path = %s, want /cgi-bin/department/list", r.URL.Path)
		}
		if r.URL.Query().Get("access_token") != "token-value" {
			t.Fatalf("access_token = %s, want token-value", r.URL.Query().Get("access_token"))
		}
		if r.URL.Query().Get("id") != "1" {
			t.Fatalf("id = %s, want 1", r.URL.Query().Get("id"))
		}
		_, _ = w.Write([]byte(`{
			"errcode": 0,
			"errmsg": "ok",
			"department": [
				{
					"id": 2,
					"name": "研发中心",
					"parentid": 1,
					"order": 10,
					"department_leader": ["zhangsan", "lisi"]
				}
			]
		}`))
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	departments, err := client.ListDepartments(context.Background(), "token-value", "1")
	if err != nil {
		t.Fatalf("ListDepartments() error = %v", err)
	}
	if len(departments) != 1 {
		t.Fatalf("len(departments) = %d, want 1", len(departments))
	}
	department := departments[0]
	if department.Id != "2" {
		t.Fatalf("department id = %s, want 2", department.Id)
	}
	if department.ParentId != "1" {
		t.Fatalf("parent id = %s, want 1", department.ParentId)
	}
	if department.Name != "研发中心" {
		t.Fatalf("name = %s, want 研发中心", department.Name)
	}
	if department.Order != 10 {
		t.Fatalf("order = %d, want 10", department.Order)
	}
	if len(department.DepartmentLeader) != 2 || department.DepartmentLeader[0] != "zhangsan" || department.DepartmentLeader[1] != "lisi" {
		t.Fatalf("department leaders = %#v", department.DepartmentLeader)
	}
}

func TestWecomAddressBookClientFetchDepartmentSnapshotsUsesVisibleAppDepartmentList(t *testing.T) {
	var departmentListCalled bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/cgi-bin/department/list":
			departmentListCalled = true
			if r.URL.Query().Get("access_token") != "token-value" {
				t.Fatalf("access_token = %s, want token-value", r.URL.Query().Get("access_token"))
			}
			if r.URL.Query().Get("id") != "1" {
				t.Fatalf("id = %s, want 1", r.URL.Query().Get("id"))
			}
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"department": [
					{"id": 1, "name": "总公司", "parentid": 0, "order": 100, "department_leader": ["ceo"]},
					{"id": 2, "name": "研发中心", "parentid": 1, "order": 10, "department_leader": []}
				]
			}`))
		case "/cgi-bin/department/get":
			t.Fatalf("department/get should not be called for organization read sync")
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	departments, err := client.FetchDepartmentSnapshots(context.Background(), "token-value", "1")
	if err != nil {
		t.Fatalf("FetchDepartmentSnapshots() error = %v", err)
	}
	if !departmentListCalled {
		t.Fatalf("department/list should be called")
	}
	if len(departments) != 2 {
		t.Fatalf("len(departments) = %d, want 2", len(departments))
	}
	if departments[0].Id != "1" || departments[0].ParentId != "0" || departments[0].Name != "总公司" || departments[0].Order != 100 {
		t.Fatalf("unexpected first department: %#v", departments[0])
	}
	if !departments[0].HasDepartmentLeaderField {
		t.Fatalf("department_leader field should be marked available")
	}
	if !reflect.DeepEqual(departments[0].DepartmentLeader, []string{"ceo"}) {
		t.Fatalf("department leaders = %#v, want [ceo]", departments[0].DepartmentLeader)
	}
}

func TestWecomAddressBookClientFetchUserSnapshotsUsesRecommendedApis(t *testing.T) {
	userListIdCalls := 0
	userGetIds := make([]string, 0)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/cgi-bin/user/list_id":
			userListIdCalls++
			if r.Method != http.MethodPost {
				t.Fatalf("method = %s, want POST", r.Method)
			}
			var body struct {
				Cursor string `json:"cursor"`
				Limit  int    `json:"limit"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatalf("invalid request body: %v", err)
			}
			if body.Limit != 10000 {
				t.Fatalf("limit = %d, want 10000", body.Limit)
			}
			if body.Cursor == "" {
				_, _ = w.Write([]byte(`{
					"errcode": 0,
					"errmsg": "ok",
					"next_cursor": "next-page",
					"dept_user": [
						{"userid": "zhangsan", "department": 2},
						{"userid": "zhangsan", "department": 3},
						{"userid": "lisi", "department": 2}
					]
				}`))
				return
			}
			if body.Cursor != "next-page" {
				t.Fatalf("cursor = %s, want next-page", body.Cursor)
			}
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"next_cursor": "",
				"dept_user": [
					{"userid": "wangwu", "department": 4}
				]
			}`))
		case "/cgi-bin/user/get":
			userGetIds = append(userGetIds, r.URL.Query().Get("userid"))
			switch r.URL.Query().Get("userid") {
			case "zhangsan":
				_, _ = w.Write([]byte(`{
					"errcode": 0,
					"errmsg": "ok",
					"userid": "zhangsan",
					"name": "张三",
					"department": [2, 3],
					"order": [20, 10],
					"position": "后台工程师",
					"mobile": "13800000000",
					"email": "zhangsan@example.com",
					"biz_mail": "zhangsan@corp.example.com",
					"is_leader_in_dept": [1, 0],
					"direct_leader": ["lisi"],
					"avatar": "https://example.com/avatar.png",
					"thumb_avatar": "https://example.com/thumb.png",
					"telephone": "020-123456",
					"alias": "jackzhang",
					"open_userid": "open-zhangsan",
					"main_department": 2,
					"status": 1
				}`))
			case "lisi":
				_, _ = w.Write([]byte(`{
					"errcode": 0,
					"errmsg": "ok",
					"userid": "lisi",
					"name": "李四",
					"department": [2],
					"is_leader_in_dept": [0],
					"direct_leader": [],
					"main_department": 2,
					"status": 1
				}`))
			case "wangwu":
				_, _ = w.Write([]byte(`{
					"errcode": 0,
					"errmsg": "ok",
					"userid": "wangwu",
					"name": "王五",
					"department": [4],
					"is_leader_in_dept": [0],
					"direct_leader": [],
					"main_department": 4,
					"status": 2
				}`))
			default:
				t.Fatalf("unexpected userid %s", r.URL.Query().Get("userid"))
			}
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	users, err := client.FetchUserSnapshots(context.Background(), "token-value")
	if err != nil {
		t.Fatalf("FetchUserSnapshots() error = %v", err)
	}
	if userListIdCalls != 2 {
		t.Fatalf("user/list_id calls = %d, want 2", userListIdCalls)
	}
	if !reflect.DeepEqual(userGetIds, []string{"zhangsan", "lisi", "wangwu"}) {
		t.Fatalf("user/get ids = %#v, want [zhangsan lisi wangwu]", userGetIds)
	}
	if len(users) != 3 {
		t.Fatalf("len(users) = %d, want 3", len(users))
	}
	user := users[0]
	if user.UserId != "zhangsan" || user.Name != "张三" || user.MainDepartmentId != "2" || user.Status != 1 {
		t.Fatalf("unexpected first user: %#v", user)
	}
	if !reflect.DeepEqual(user.Departments, []string{"2", "3"}) {
		t.Fatalf("departments = %#v, want [2 3]", user.Departments)
	}
	if !reflect.DeepEqual(user.DepartmentOrders, []int{20, 10}) {
		t.Fatalf("department orders = %#v, want [20 10]", user.DepartmentOrders)
	}
	if !reflect.DeepEqual(user.IsLeaderInDepartment, []bool{true, false}) {
		t.Fatalf("is leader in department = %#v, want [true false]", user.IsLeaderInDepartment)
	}
	if !reflect.DeepEqual(user.DirectLeaders, []string{"lisi"}) {
		t.Fatalf("direct leaders = %#v, want [lisi]", user.DirectLeaders)
	}
	if !user.HasDirectLeaderField || !user.HasIsLeaderInDepartmentField {
		t.Fatalf("required relationship fields should be marked available: %#v", user)
	}
	if user.Position != "后台工程师" || user.Mobile != "13800000000" || user.Email != "zhangsan@example.com" {
		t.Fatalf("profile fields were not normalized: %#v", user)
	}
}

func TestWecomAddressBookClientFetchUserSnapshotsFallsBackWhenListIdForbidden(t *testing.T) {
	var userListCalled bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/cgi-bin/user/list_id":
			_, _ = w.Write([]byte(`{"errcode":48002,"errmsg":"api forbidden"}`))
		case "/cgi-bin/user/list":
			userListCalled = true
			if r.URL.Query().Get("department_id") != "1" {
				t.Fatalf("department_id = %s, want 1", r.URL.Query().Get("department_id"))
			}
			if r.URL.Query().Get("fetch_child") != "1" {
				t.Fatalf("fetch_child = %s, want 1", r.URL.Query().Get("fetch_child"))
			}
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"userlist": [{
					"userid": "zhangsan",
					"name": "张三",
					"department": [1],
					"is_leader_in_dept": [0],
					"direct_leader": [],
					"main_department": 1,
					"status": 1
				}]
			}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	users, err := client.FetchUserSnapshots(context.Background(), "token-value")
	if err != nil {
		t.Fatalf("FetchUserSnapshots() error = %v", err)
	}
	if !userListCalled {
		t.Fatalf("user/list fallback should be called")
	}
	if len(users) != 1 || users[0].UserId != "zhangsan" {
		t.Fatalf("users = %#v, want zhangsan", users)
	}
	if !users[0].HasDirectLeaderField || !users[0].HasIsLeaderInDepartmentField {
		t.Fatalf("fallback should preserve required relationship field availability: %#v", users[0])
	}
}

func TestWecomAddressBookClientTestConnectionChecksRequiredFields(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/cgi-bin/gettoken":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"token-value","expires_in":7200}`))
		case "/cgi-bin/department/list":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"department": [{
					"id": 1,
					"name": "总公司",
					"parentid": 0,
					"order": 100,
					"department_leader": []
				}]
			}`))
		case "/cgi-bin/user/list_id":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"next_cursor": "",
				"dept_user": [{"userid": "zhangsan", "department": 1}]
			}`))
		case "/cgi-bin/user/get":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"name": "张三",
				"department": [1],
				"is_leader_in_dept": [0],
				"direct_leader": [],
				"main_department": 1,
				"status": 1
			}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	result, err := client.TestConnection(context.Background())
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if !result.AccessTokenOk || !result.DepartmentSnapshotOk || !result.UserSnapshotOk {
		t.Fatalf("connection result should mark api checks ok: %#v", result)
	}
	if !result.DepartmentLeaderFieldAvailable || !result.DirectLeaderFieldAvailable || !result.IsLeaderInDepartmentFieldAvailable {
		t.Fatalf("connection result should mark required fields available: %#v", result)
	}
	if !result.IsReadyForOrganizationSync() {
		t.Fatalf("connection result should be ready: %#v", result)
	}
}

func TestWecomAddressBookClientTestConnectionReportsMissingRequiredFields(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/cgi-bin/gettoken":
			_, _ = w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"token-value","expires_in":7200}`))
		case "/cgi-bin/department/list":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"department": [{
					"id": 1,
					"name": "总公司",
					"parentid": 0,
					"order": 100
				}]
			}`))
		case "/cgi-bin/user/list_id":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"next_cursor": "",
				"dept_user": [{"userid": "zhangsan", "department": 1}]
			}`))
		case "/cgi-bin/user/get":
			_, _ = w.Write([]byte(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"name": "张三",
				"department": [1],
				"main_department": 1,
				"status": 1
			}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewWecomAddressBookClient("ww123", "secret")
	client.BaseUrl = server.URL
	client.HttpClient = server.Client()

	result, err := client.TestConnection(context.Background())
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if result.IsReadyForOrganizationSync() {
		t.Fatalf("connection result should not be ready when required fields are absent: %#v", result)
	}
	wantMissing := []string{"department_leader", "direct_leader", "is_leader_in_dept"}
	if !reflect.DeepEqual(result.MissingFields, wantMissing) {
		t.Fatalf("missing fields = %#v, want %#v", result.MissingFields, wantMissing)
	}
}
