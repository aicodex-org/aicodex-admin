// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeFeishuConfigStore struct {
	config *FeishuOrganizationSyncConfig
	saved  *FeishuOrganizationSyncConfig
}

func (s *fakeFeishuConfigStore) GetFeishuOrganizationSyncConfigByOrganization(organization string) (*FeishuOrganizationSyncConfig, error) {
	if s.config == nil || s.config.Organization != organization {
		return nil, nil
	}
	return s.config, nil
}

func (s *fakeFeishuConfigStore) SaveFeishuOrganizationSyncConfig(config *FeishuOrganizationSyncConfig) (bool, error) {
	copy := *config
	s.saved = &copy
	return true, nil
}

type fakeFeishuConnectionTester struct {
	result *FeishuAddressBookConnectionTestResult
	err    error
}

func (t *fakeFeishuConnectionTester) TestConnection(ctx context.Context) (*FeishuAddressBookConnectionTestResult, error) {
	return t.result, t.err
}

func TestFeishuAddressBookClientBuildUrlSelectsEndpointMode(t *testing.T) {
	domestic := NewFeishuAddressBookClient("cli_1", "secret", "")
	domesticUrl, err := domestic.buildUrl("/open-apis/contact/v3/users/find_by_department", map[string]string{"department_id": "0"})
	if err != nil {
		t.Fatalf("domestic buildUrl() error = %v", err)
	}
	if !strings.HasPrefix(domesticUrl, DefaultFeishuApiBaseUrl) {
		t.Fatalf("domestic url = %q, want prefix %q", domesticUrl, DefaultFeishuApiBaseUrl)
	}
	if !strings.Contains(domesticUrl, "department_id=0") {
		t.Fatalf("domestic url = %q, want query department_id=0", domesticUrl)
	}

	overseas := NewFeishuAddressBookClient("cli_1", "secret", "larksuite")
	overseasUrl, err := overseas.buildUrl("/open-apis/contact/v3/users/find_by_department", nil)
	if err != nil {
		t.Fatalf("overseas buildUrl() error = %v", err)
	}
	if !strings.HasPrefix(overseasUrl, DefaultLarkApiBaseUrl) {
		t.Fatalf("overseas url = %q, want prefix %q", overseasUrl, DefaultLarkApiBaseUrl)
	}
}

func TestFeishuAddressBookClientTestConnectionReadsDepartmentsAndUsers(t *testing.T) {
	var tokenRequests int
	var departmentRequests int
	var userRequests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/open-apis/auth/v3/tenant_access_token/internal":
			tokenRequests++
			if r.Method != http.MethodPost {
				t.Fatalf("token method = %s, want POST", r.Method)
			}
			_, _ = w.Write([]byte(`{"code":0,"msg":"ok","tenant_access_token":"tenant-token","expire":7200}`))
		case "/open-apis/contact/v3/departments/0/children":
			departmentRequests++
			if r.Header.Get("Authorization") != "Bearer tenant-token" {
				t.Fatalf("department authorization = %q", r.Header.Get("Authorization"))
			}
			_, _ = w.Write([]byte(`{"code":0,"msg":"ok","data":{"items":[{"open_department_id":"od-1","open_parent_department_id":"0","name":"研发"}]}}`))
		case "/open-apis/contact/v3/users/find_by_department":
			userRequests++
			if r.Header.Get("Authorization") != "Bearer tenant-token" {
				t.Fatalf("user authorization = %q", r.Header.Get("Authorization"))
			}
			if r.URL.Query().Get("department_id") == "od-1" {
				_, _ = w.Write([]byte(`{"code":0,"msg":"ok","data":{"items":[{"user_id":"ou_1","open_id":"open_1","union_id":"union_1","tenant_key":"tenant-a","name":"Alice","department_ids":["od-1"],"main_department_id":"od-1"}]}}`))
				return
			}
			_, _ = w.Write([]byte(`{"code":0,"msg":"ok","data":{"items":[]}}`))
		default:
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	client := NewFeishuAddressBookClient("cli_1", "secret", "feishu")
	client.BaseUrl = server.URL
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
	if tokenRequests != 1 || departmentRequests != 1 || userRequests != 2 {
		t.Fatalf("requests token/department/user = %d/%d/%d, want 1/1/2", tokenRequests, departmentRequests, userRequests)
	}
}

func TestFeishuUserSnapshotFromRawNormalizesContactV3Fields(t *testing.T) {
	raw := map[string]json.RawMessage{
		"user_id":            json.RawMessage(`12345`),
		"open_id":            json.RawMessage(`"open_1"`),
		"union_id":           json.RawMessage(`"union_1"`),
		"tenant_key":         json.RawMessage(`"tenant-a"`),
		"cn_name":            json.RawMessage(`"Alice"`),
		"mobile":             json.RawMessage(`"13800138000"`),
		"avatar_url":         json.RawMessage(`"https://avatar.example/a.png"`),
		"position":           json.RawMessage(`"工程师"`),
		"user_status":        json.RawMessage(`{"status":"activated"}`),
		"department_ids":     json.RawMessage(`[100,200]`),
		"main_department_id": json.RawMessage(`100`),
	}
	user, err := newFeishuUserSnapshotFromRaw("test", raw)
	if err != nil {
		t.Fatalf("newFeishuUserSnapshotFromRaw() error = %v", err)
	}
	if user.UserId != "12345" || user.Name != "Alice" || user.Status != "activated" {
		t.Fatalf("user = %+v, want normalized id/name/status", user)
	}
	if len(user.Departments) != 2 || user.Departments[0] != "100" || user.MainDepartmentId != "100" {
		t.Fatalf("departments = %+v main=%q, want numeric ids as strings", user.Departments, user.MainDepartmentId)
	}
}

func TestRawFeishuStringSliceHandlesStringNumberNullAndInvalidValues(t *testing.T) {
	values, err := rawFeishuStringSlice(json.RawMessage(`["od-1","od-2"]`))
	if err != nil {
		t.Fatalf("rawFeishuStringSlice(strings) error = %v", err)
	}
	if len(values) != 2 || values[0] != "od-1" || values[1] != "od-2" {
		t.Fatalf("string values = %+v, want od-1/od-2", values)
	}
	values, err = rawFeishuStringSlice(json.RawMessage(`[100,200]`))
	if err != nil {
		t.Fatalf("rawFeishuStringSlice(numbers) error = %v", err)
	}
	if len(values) != 2 || values[0] != "100" || values[1] != "200" {
		t.Fatalf("number values = %+v, want 100/200", values)
	}
	values, err = rawFeishuStringSlice(json.RawMessage(`null`))
	if err != nil || values != nil {
		t.Fatalf("null values = %+v err=%v, want nil nil", values, err)
	}
	if _, err = rawFeishuStringSlice(json.RawMessage(`{"unexpected":true}`)); err == nil {
		t.Fatalf("rawFeishuStringSlice(invalid) error = nil, want error")
	}
}

func TestFeishuOrganizationSyncConfigServicePreservesMaskedSecretAndNormalizesEndpoint(t *testing.T) {
	store := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Owner:        "engineering",
		Name:         FeishuOrganizationSyncDefaultConfigName,
		Organization: "engineering",
		AppId:        "old_cli",
		AppSecret:    "real-secret",
		EndpointMode: FeishuEndpointModeDomestic,
		TenantKey:    "tenant-a",
	}}
	service := &FeishuOrganizationSyncConfigService{Store: store}
	config, _, err := service.SaveConfig(&FeishuOrganizationSyncConfig{
		Organization: " engineering ",
		AppId:        " cli_2 ",
		AppSecret:    FeishuOrganizationSyncMaskedSecret,
		EndpointMode: "larksuite",
	}, true)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}
	if store.saved.AppSecret != "real-secret" {
		t.Fatalf("saved secret = %q, want preserved real secret", store.saved.AppSecret)
	}
	if store.saved.EndpointMode != FeishuEndpointModeOverseas {
		t.Fatalf("saved endpoint = %q, want lark", store.saved.EndpointMode)
	}
	if store.saved.TenantKey != "tenant-a" {
		t.Fatalf("saved tenant key = %q, want existing tenant-a", store.saved.TenantKey)
	}
	if config.AppSecret != FeishuOrganizationSyncMaskedSecret {
		t.Fatalf("response secret = %q, want masked", config.AppSecret)
	}
}

func TestFeishuOrganizationSyncConfigServiceTestConnectionUsesPreparedConfig(t *testing.T) {
	var gotAppId, gotSecret, gotEndpointMode string
	service := &FeishuOrganizationSyncConfigService{
		NewAddressBookConnectionTester: func(appId string, appSecret string, endpointMode string) FeishuAddressBookConnectionTester {
			gotAppId, gotSecret, gotEndpointMode = appId, appSecret, endpointMode
			return &fakeFeishuConnectionTester{result: &FeishuAddressBookConnectionTestResult{AccessTokenOk: true}}
		},
	}
	_, err := service.TestConnection(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: " engineering ",
		AppId:        " cli_1 ",
		AppSecret:    " secret ",
		EndpointMode: "global",
	})
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if gotAppId != "cli_1" || gotSecret != "secret" || gotEndpointMode != FeishuEndpointModeOverseas {
		t.Fatalf("connection tester args = %q/%q/%q, want trimmed cli_1/secret/lark", gotAppId, gotSecret, gotEndpointMode)
	}
}

func TestFeishuOrganizationSyncConfigServiceTestConnectionPreservesMaskedSecret(t *testing.T) {
	store := &fakeFeishuConfigStore{config: &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    "real-secret",
		EndpointMode: FeishuEndpointModeDomestic,
	}}
	var gotSecret string
	service := &FeishuOrganizationSyncConfigService{
		Store: store,
		NewAddressBookConnectionTester: func(appId string, appSecret string, endpointMode string) FeishuAddressBookConnectionTester {
			gotSecret = appSecret
			return &fakeFeishuConnectionTester{result: &FeishuAddressBookConnectionTestResult{AccessTokenOk: true}}
		},
	}
	_, err := service.TestConnection(context.Background(), &FeishuOrganizationSyncConfig{
		Organization: "engineering",
		AppId:        "cli_1",
		AppSecret:    FeishuOrganizationSyncMaskedSecret,
		EndpointMode: "feishu",
	})
	if err != nil {
		t.Fatalf("TestConnection() error = %v", err)
	}
	if gotSecret != "real-secret" {
		t.Fatalf("connection tester secret = %q, want preserved real secret", gotSecret)
	}
}

func TestSafeOrganizationSyncErrorTextRedactsFeishuSecrets(t *testing.T) {
	safe := safeOrganizationSyncErrorText("secret=real-secret token tenant-token authorization: Bearer abc", "real-secret", "tenant-token")
	if strings.Contains(safe, "real-secret") || strings.Contains(safe, "tenant-token") || strings.Contains(safe, "Bearer") {
		t.Fatalf("safe error text leaked secret: %q", safe)
	}
}
