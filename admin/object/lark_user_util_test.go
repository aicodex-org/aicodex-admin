package object

import (
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/idp"
)

func TestGetLarkIdentifierCandidatesUsesUserOpenUnionOrder(t *testing.T) {
	userInfo := &idp.UserInfo{
		Id:      "uid-user",
		UnionId: "on-union",
		Extra: map[string]string{
			"user_id":  "uid-user",
			"open_id":  "ou-open",
			"union_id": "on-union",
		},
	}

	candidates := GetLarkIdentifierCandidates(userInfo)

	expected := []string{"uid-user", "ou-open", "on-union"}
	if len(candidates) != len(expected) {
		t.Fatalf("expected %d candidates, got %d: %#v", len(expected), len(candidates), candidates)
	}
	for i, value := range expected {
		if candidates[i] != value {
			t.Fatalf("expected candidate %d = %s, got %s", i, value, candidates[i])
		}
	}
}

func TestResolveLarkUserByIdentifierCandidatesRejectsConflicts(t *testing.T) {
	userByIdentifier := map[string]*User{
		"uid-user": {Owner: "built-in", Name: "alice", Lark: "uid-user"},
		"ou-open":  {Owner: "built-in", Name: "bob", Lark: "ou-open"},
	}

	_, _, err := ResolveLarkUserByIdentifierCandidates([]string{"uid-user", "ou-open"}, func(identifier string) (*User, error) {
		return userByIdentifier[identifier], nil
	})

	if err == nil || !strings.Contains(err.Error(), "multiple Lark identifiers") {
		t.Fatalf("expected conflict error, got %v", err)
	}
}

func TestResolveLarkUserByIdentifierCandidatesReturnsHistoricalMatch(t *testing.T) {
	historicalUser := &User{Owner: "built-in", Name: "alice", Lark: "ou-open"}

	user, matchedIdentifier, err := ResolveLarkUserByIdentifierCandidates([]string{"uid-user", "ou-open", "on-union"}, func(identifier string) (*User, error) {
		if identifier == "ou-open" {
			return historicalUser, nil
		}
		return nil, nil
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user != historicalUser {
		t.Fatalf("expected historical user, got %#v", user)
	}
	if matchedIdentifier != "ou-open" {
		t.Fatalf("expected matched identifier ou-open, got %s", matchedIdentifier)
	}
}

func TestApplyLarkOAuthIdentifierPropertiesSavesRawIdsAndBackfillsPrimaryUserId(t *testing.T) {
	user := &User{
		Owner:      "built-in",
		Name:       "alice",
		Lark:       "ou-open",
		Properties: map[string]string{},
	}
	userInfo := &idp.UserInfo{
		Id:      "uid-user",
		UnionId: "on-union",
		Extra: map[string]string{
			"user_id":    "uid-user",
			"open_id":    "ou-open",
			"union_id":   "on-union",
			"tenant_key": "tenant-key",
		},
	}

	ApplyLarkOAuthIdentifierProperties(user, userInfo)

	if user.Lark != "uid-user" {
		t.Fatalf("expected Lark binding backfilled to uid-user, got %s", user.Lark)
	}
	expectedProperties := map[string]string{
		"oauth_Lark_userId":    "uid-user",
		"oauth_Lark_openId":    "ou-open",
		"oauth_Lark_unionId":   "on-union",
		"oauth_Lark_tenantKey": "tenant-key",
	}
	for key, value := range expectedProperties {
		if user.Properties[key] != value {
			t.Fatalf("expected property %s=%q, got %q", key, value, user.Properties[key])
		}
	}
}
