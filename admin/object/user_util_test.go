package object

import (
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/idp"
)

func TestApplyUserOAuthProfilePropertiesFillsEmptyPhoneAndEmail(t *testing.T) {
	user := &User{
		Owner:      "built-in",
		Name:       "alice",
		Properties: map[string]string{},
	}
	userInfo := &idp.UserInfo{
		Id:          "oauth-user-id",
		DisplayName: "Alice",
		Email:       "alice@example.com",
		Phone:       "13800000000",
	}

	applyUserOAuthProfileProperties(user, "WeCom", userInfo)

	if user.Email != "alice@example.com" {
		t.Fatalf("expected empty email to be filled, got %q", user.Email)
	}
	if user.Phone != "13800000000" {
		t.Fatalf("expected empty phone to be filled, got %q", user.Phone)
	}
	if user.Properties["oauth_WeCom_phone"] != "13800000000" {
		t.Fatalf("expected OAuth phone property to be stored, got %#v", user.Properties)
	}
}

func TestApplyUserOAuthProfilePropertiesKeepsExistingPhoneAndEmail(t *testing.T) {
	user := &User{
		Owner:      "built-in",
		Name:       "alice",
		Email:      "old@example.com",
		Phone:      "13900000000",
		Properties: map[string]string{},
	}
	userInfo := &idp.UserInfo{
		Email: "new@example.com",
		Phone: "13800000000",
	}

	applyUserOAuthProfileProperties(user, "WeCom", userInfo)

	if user.Email != "old@example.com" {
		t.Fatalf("expected existing email to be preserved, got %q", user.Email)
	}
	if user.Phone != "13900000000" {
		t.Fatalf("expected existing phone to be preserved, got %q", user.Phone)
	}
	if user.Properties["oauth_WeCom_phone"] != "13800000000" {
		t.Fatalf("expected latest OAuth phone property to be stored, got %#v", user.Properties)
	}
}
