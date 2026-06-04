package idp

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"golang.org/x/oauth2"
)

type roundTripFunc func(req *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func newJsonResponse(body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
	}
}

func TestWeComInternalIdProviderGetUserInfoMapsSensitiveProfileFields(t *testing.T) {
	requestedPaths := []string{}
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		requestedPaths = append(requestedPaths, req.URL.Path)
		switch req.URL.Path {
		case "/cgi-bin/auth/getuserinfo":
			return newJsonResponse(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"user_ticket": "ticket-for-sensitive-fields"
			}`), nil
		case "/cgi-bin/auth/getuserdetail":
			if req.Method != http.MethodPost {
				t.Fatalf("expected getuserdetail POST, got %s", req.Method)
			}
			return newJsonResponse(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"name": "张三",
				"mobile": "13800000000",
				"email": "",
				"biz_mail": "zhangsan@example.com",
				"avatar": "https://example.com/avatar.png"
			}`), nil
		default:
			t.Fatalf("unexpected request path: %s", req.URL.Path)
			return nil, nil
		}
	})}

	provider := NewWeComInternalIdProvider("corp-id", "secret", "https://auth.example.com/callback", true)
	provider.SetHttpClient(client)

	userInfo, err := provider.GetUserInfo((&oauth2.Token{AccessToken: "access-token"}).WithExtra(map[string]interface{}{"code": "auth-code"}))
	if err != nil {
		t.Fatalf("GetUserInfo() returned error: %v", err)
	}

	if len(requestedPaths) != 2 || requestedPaths[0] != "/cgi-bin/auth/getuserinfo" || requestedPaths[1] != "/cgi-bin/auth/getuserdetail" {
		t.Fatalf("unexpected request paths: %#v", requestedPaths)
	}
	if userInfo.Id != "zhangsan" || userInfo.Username != "zhangsan" {
		t.Fatalf("expected stable userid identity, got id=%q username=%q", userInfo.Id, userInfo.Username)
	}
	if userInfo.DisplayName != "张三" {
		t.Fatalf("expected display name from WeCom, got %q", userInfo.DisplayName)
	}
	if userInfo.Phone != "13800000000" {
		t.Fatalf("expected mobile to map to phone, got %q", userInfo.Phone)
	}
	if userInfo.Email != "zhangsan@example.com" {
		t.Fatalf("expected biz_mail fallback, got %q", userInfo.Email)
	}
}

func TestWeComInternalIdProviderGetUserInfoSupplementsMissingSensitiveFieldsFromContact(t *testing.T) {
	requestedPaths := []string{}
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		requestedPaths = append(requestedPaths, req.URL.Path)
		switch req.URL.Path {
		case "/cgi-bin/auth/getuserinfo":
			return newJsonResponse(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"user_ticket": "ticket-without-sensitive-fields"
			}`), nil
		case "/cgi-bin/auth/getuserdetail":
			return newJsonResponse(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan"
			}`), nil
		case "/cgi-bin/user/get":
			if req.URL.Query().Get("userid") != "zhangsan" {
				t.Fatalf("expected contact user zhangsan, got %q", req.URL.Query().Get("userid"))
			}
			return newJsonResponse(`{
				"errcode": 0,
				"errmsg": "ok",
				"userid": "zhangsan",
				"name": "张三",
				"mobile": "13800000000",
				"email": "zhangsan@example.com",
				"avatar": "https://example.com/avatar.png"
			}`), nil
		default:
			t.Fatalf("unexpected request path: %s", req.URL.Path)
			return nil, nil
		}
	})}

	provider := NewWeComInternalIdProvider("corp-id", "secret", "https://auth.example.com/callback", true)
	provider.SetHttpClient(client)

	userInfo, err := provider.GetUserInfo((&oauth2.Token{AccessToken: "access-token"}).WithExtra(map[string]interface{}{"code": "auth-code"}))
	if err != nil {
		t.Fatalf("GetUserInfo() returned error: %v", err)
	}

	expectedPaths := []string{"/cgi-bin/auth/getuserinfo", "/cgi-bin/auth/getuserdetail", "/cgi-bin/user/get"}
	if len(requestedPaths) != len(expectedPaths) {
		t.Fatalf("unexpected request paths: %#v", requestedPaths)
	}
	for i, expectedPath := range expectedPaths {
		if requestedPaths[i] != expectedPath {
			t.Fatalf("request path %d = %q, want %q; all paths = %#v", i, requestedPaths[i], expectedPath, requestedPaths)
		}
	}
	if userInfo.Phone != "13800000000" || userInfo.Email != "zhangsan@example.com" || userInfo.DisplayName != "张三" {
		t.Fatalf("expected profile fields from contact supplement, got phone=%q email=%q displayName=%q", userInfo.Phone, userInfo.Email, userInfo.DisplayName)
	}
}
