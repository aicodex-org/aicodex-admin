package idp

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"golang.org/x/oauth2"
)

type dingTalkRoundTripFunc func(*http.Request) (*http.Response, error)

func (f dingTalkRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func newDingTalkTestResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestDingTalkIdProviderGetUserInfoPreservesUserOpenUnionIdentifiers(t *testing.T) {
	requested := []string{}
	provider := NewDingTalkIdProvider("ding-app-key", "secret", "https://auth.example.com/callback")
	provider.SetHttpClient(&http.Client{
		Transport: dingTalkRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			requested = append(requested, req.Method+" "+req.URL.String())
			switch {
			case req.Method == http.MethodGet && req.URL.String() == "https://api.dingtalk.com/v1.0/contact/users/me":
				if req.Header.Get("x-acs-dingtalk-access-token") != "user-token" {
					t.Fatalf("expected user access token header, got %s", req.Header.Get("x-acs-dingtalk-access-token"))
				}
				return newDingTalkTestResponse(http.StatusOK, `{
					"nick": "张三",
					"openId": "open-id",
					"unionId": "union-id",
					"avatarUrl": "https://cdn.example.com/avatar.png",
					"mobile": "13000000000",
					"stateCode": "86"
				}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://api.dingtalk.com/v1.0/oauth2/accessToken":
				return newDingTalkTestResponse(http.StatusOK, `{"accessToken":"corp-token","expireIn":7200}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token=corp-token":
				return newDingTalkTestResponse(http.StatusOK, `{"errcode":0,"errmsg":"ok","result":{"userid":"ding-user"}}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://oapi.dingtalk.com/topapi/v2/user/get?access_token=corp-token":
				return newDingTalkTestResponse(http.StatusOK, `{"errmsg":"ok","result":{"mobile":"13100000000","email":"corp@example.com","unionid":"union-id"}}`), nil
			default:
				t.Fatalf("unexpected DingTalk request: %s %s", req.Method, req.URL.String())
				return nil, nil
			}
		}),
	})

	userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "user-token"})
	if err != nil {
		t.Fatalf("GetUserInfo() returned error: %v", err)
	}

	if len(requested) != 4 {
		t.Fatalf("expected 4 DingTalk requests, got %d: %#v", len(requested), requested)
	}
	if userInfo.Id != "open-id" {
		t.Fatalf("expected OAuth open_id as id, got %s", userInfo.Id)
	}
	if userInfo.Username != "union-id" {
		t.Fatalf("expected corp union id username fallback, got %s", userInfo.Username)
	}
	if userInfo.Phone != "13100000000" {
		t.Fatalf("expected corp phone override, got %s", userInfo.Phone)
	}
	if userInfo.Email != "corp@example.com" {
		t.Fatalf("expected corp email override, got %s", userInfo.Email)
	}
	expectedExtra := map[string]string{
		"user_id":  "ding-user",
		"open_id":  "open-id",
		"union_id": "union-id",
	}
	for key, value := range expectedExtra {
		if userInfo.Extra[key] != value {
			t.Fatalf("expected extra %s=%q, got %q", key, value, userInfo.Extra[key])
		}
	}
}

func TestDingTalkIdProviderGetUserInfoRejectsMissingRequiredIdentifiers(t *testing.T) {
	provider := NewDingTalkIdProvider("ding-app-key", "secret", "https://auth.example.com/callback")
	provider.SetHttpClient(&http.Client{
		Transport: dingTalkRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method == http.MethodGet && req.URL.String() == "https://api.dingtalk.com/v1.0/contact/users/me" {
				return newDingTalkTestResponse(http.StatusOK, `{"nick":"张三","openId":"","unionId":"union-id","mobile":"13000000000","stateCode":"86"}`), nil
			}
			t.Fatalf("unexpected DingTalk request: %s %s", req.Method, req.URL.String())
			return nil, nil
		}),
	})

	_, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "user-token"})
	if err == nil || !strings.Contains(err.Error(), `"openId":""`) {
		t.Fatalf("expected missing identifier error, got %v", err)
	}
}

func TestDingTalkIdProviderGetUserInfoKeepsOAuthInfoWhenCorpDetailFails(t *testing.T) {
	provider := NewDingTalkIdProvider("ding-app-key", "secret", "https://auth.example.com/callback")
	provider.SetHttpClient(&http.Client{
		Transport: dingTalkRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			switch {
			case req.Method == http.MethodGet && req.URL.String() == "https://api.dingtalk.com/v1.0/contact/users/me":
				return newDingTalkTestResponse(http.StatusOK, `{
					"nick": "张三",
					"openId": "open-id",
					"unionId": "union-id",
					"email": "oauth@example.com",
					"mobile": "13000000000",
					"stateCode": "86"
				}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://api.dingtalk.com/v1.0/oauth2/accessToken":
				return newDingTalkTestResponse(http.StatusOK, `{"accessToken":"corp-token","expireIn":7200}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token=corp-token":
				return newDingTalkTestResponse(http.StatusOK, `{"errcode":0,"errmsg":"ok","result":{}}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://oapi.dingtalk.com/topapi/v2/user/get?access_token=corp-token":
				return newDingTalkTestResponse(http.StatusOK, `{"errmsg":"not ok"}`), nil
			default:
				t.Fatalf("unexpected DingTalk request: %s %s", req.Method, req.URL.String())
				return nil, nil
			}
		}),
	})

	userInfo, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "user-token"})
	if err != nil {
		t.Fatalf("GetUserInfo() returned error: %v", err)
	}
	if userInfo.Email != "oauth@example.com" {
		t.Fatalf("expected OAuth email to be preserved, got %s", userInfo.Email)
	}
	if userInfo.Extra["user_id"] != "" {
		t.Fatalf("expected empty user_id when corp lookup has no userid, got %s", userInfo.Extra["user_id"])
	}
	if userInfo.Username != "张三" {
		t.Fatalf("expected OAuth nick to be preserved, got %s", userInfo.Username)
	}
}

func TestDingTalkIdProviderGetUserInfoReturnsCorpUserLookupError(t *testing.T) {
	provider := NewDingTalkIdProvider("ding-app-key", "secret", "https://auth.example.com/callback")
	provider.SetHttpClient(&http.Client{
		Transport: dingTalkRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			switch {
			case req.Method == http.MethodGet && req.URL.String() == "https://api.dingtalk.com/v1.0/contact/users/me":
				return newDingTalkTestResponse(http.StatusOK, `{
					"nick": "张三",
					"openId": "open-id",
					"unionId": "union-id",
					"mobile": "13000000000",
					"stateCode": "86"
				}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://api.dingtalk.com/v1.0/oauth2/accessToken":
				return newDingTalkTestResponse(http.StatusOK, `{"accessToken":"corp-token","expireIn":7200}`), nil
			case req.Method == http.MethodPost && req.URL.String() == "https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token=corp-token":
				return newDingTalkTestResponse(http.StatusOK, `{"errcode":60121,"errmsg":"not in corp"}`), nil
			default:
				t.Fatalf("unexpected DingTalk request: %s %s", req.Method, req.URL.String())
				return nil, nil
			}
		}),
	})

	_, err := provider.GetUserInfo(&oauth2.Token{AccessToken: "user-token"})
	if err == nil || !strings.Contains(err.Error(), "该应用只允许本企业内部用户登录") {
		t.Fatalf("expected corp lookup error, got %v", err)
	}
}
