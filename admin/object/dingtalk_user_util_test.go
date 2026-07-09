package object

import (
	"errors"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/idp"
)

func TestGetDingTalkIdentifierCandidatesUsesUserOpenUnionOrder(t *testing.T) {
	userInfo := &idp.UserInfo{
		Id:      "open-id",
		UnionId: "union-id",
		Extra: map[string]string{
			"user_id":  "ding-user",
			"open_id":  "open-id",
			"union_id": "union-id",
		},
	}

	candidates := GetDingTalkIdentifierCandidates(userInfo)

	expected := []string{"ding-user", "open-id", "union-id"}
	if len(candidates) != len(expected) {
		t.Fatalf("expected %d candidates, got %d: %#v", len(expected), len(candidates), candidates)
	}
	for i, value := range expected {
		if candidates[i] != value {
			t.Fatalf("expected candidate %d = %s, got %s", i, value, candidates[i])
		}
	}
}

func TestGetDingTalkIdentifierCandidatesFallsBackAndDeduplicates(t *testing.T) {
	userInfo := &idp.UserInfo{
		Id:      " open-id ",
		UnionId: "open-id",
	}

	candidates := GetDingTalkIdentifierCandidates(userInfo)

	if len(candidates) != 1 || candidates[0] != "open-id" {
		t.Fatalf("expected deduplicated fallback candidate open-id, got %#v", candidates)
	}
	if candidates := GetDingTalkIdentifierCandidates(nil); candidates != nil {
		t.Fatalf("expected nil candidates for nil userInfo, got %#v", candidates)
	}
}

func TestResolveDingTalkUserByIdentifierCandidatesRejectsConflicts(t *testing.T) {
	userByIdentifier := map[string]*User{
		"ding-user": {Owner: "built-in", Name: "alice", DingTalk: "ding-user"},
		"open-id":   {Owner: "built-in", Name: "bob", DingTalk: "open-id"},
	}

	_, _, err := ResolveDingTalkUserByIdentifierCandidates([]string{"ding-user", "open-id"}, func(identifier string) (*User, error) {
		return userByIdentifier[identifier], nil
	})

	if err == nil || !strings.Contains(err.Error(), "multiple DingTalk identifiers") {
		t.Fatalf("expected conflict error, got %v", err)
	}
}

func TestResolveDingTalkUserByIdentifierCandidatesAllowsSameUserAndPropagatesErrors(t *testing.T) {
	sameUser := &User{Owner: "built-in", Name: "alice", DingTalk: "ding-user"}

	user, matchedIdentifier, err := ResolveDingTalkUserByIdentifierCandidates([]string{"ding-user", "open-id"}, func(identifier string) (*User, error) {
		return sameUser, nil
	})
	if err != nil {
		t.Fatalf("expected same user matches to be accepted, got %v", err)
	}
	if user != sameUser || matchedIdentifier != "ding-user" {
		t.Fatalf("expected first matched identifier ding-user, got user=%#v identifier=%s", user, matchedIdentifier)
	}

	expectedErr := errors.New("lookup failed")
	_, _, err = ResolveDingTalkUserByIdentifierCandidates([]string{"ding-user"}, func(identifier string) (*User, error) {
		return nil, expectedErr
	})
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected lookup error to be propagated, got %v", err)
	}
}

func TestApplyDingTalkOAuthIdentifierPropertiesSavesRawIdsAndBackfillsPrimaryUserId(t *testing.T) {
	user := &User{
		Owner:      "built-in",
		Name:       "alice",
		DingTalk:   "open-id",
		Properties: map[string]string{},
	}
	userInfo := &idp.UserInfo{
		Id:      "open-id",
		UnionId: "union-id",
		Extra: map[string]string{
			"user_id":  "ding-user",
			"open_id":  "open-id",
			"union_id": "union-id",
		},
	}

	ApplyDingTalkOAuthIdentifierProperties(user, userInfo)

	if user.DingTalk != "ding-user" {
		t.Fatalf("expected DingTalk binding backfilled to ding-user, got %s", user.DingTalk)
	}
	expectedProperties := map[string]string{
		"oauth_DingTalk_userId":  "ding-user",
		"oauth_DingTalk_openId":  "open-id",
		"oauth_DingTalk_unionId": "union-id",
	}
	for key, value := range expectedProperties {
		if user.Properties[key] != value {
			t.Fatalf("expected property %s=%q, got %q", key, value, user.Properties[key])
		}
	}
}

func TestGetDingTalkPrimaryIdentifierPrefersSyncedUserId(t *testing.T) {
	userInfo := &idp.UserInfo{
		Id:      "open-id",
		UnionId: "union-id",
		Extra: map[string]string{
			"user_id":  "ding-user",
			"open_id":  "open-id",
			"union_id": "union-id",
		},
	}

	if identifier := GetDingTalkPrimaryIdentifier(userInfo); identifier != "ding-user" {
		t.Fatalf("expected primary DingTalk identifier ding-user, got %s", identifier)
	}

	userInfo.Extra = nil
	if identifier := GetDingTalkPrimaryIdentifier(userInfo); identifier != "open-id" {
		t.Fatalf("expected primary DingTalk identifier open-id fallback, got %s", identifier)
	}

	userInfo.Id = ""
	userInfo.UnionId = " union-id "
	if identifier := GetDingTalkPrimaryIdentifier(userInfo); identifier != "union-id" {
		t.Fatalf("expected primary DingTalk identifier union-id fallback, got %s", identifier)
	}

	if identifier := GetDingTalkPrimaryIdentifier(nil); identifier != "" {
		t.Fatalf("expected empty identifier for nil userInfo, got %s", identifier)
	}
}
