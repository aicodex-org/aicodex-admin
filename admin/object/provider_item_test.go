package object

import (
	"errors"
	"testing"
)

func TestApplicationIsProviderVisibleForLoginHandlesMissingProvider(t *testing.T) {
	application := &Application{
		Providers: []*ProviderItem{
			{Name: "github", Provider: &Provider{Category: "OAuth", Type: "GitHub"}},
			{
				Owner: "admin",
				Name:  "wecom-internal",
				Provider: &Provider{
					Owner:    "admin",
					Name:     "wecom-internal",
					Category: "OAuth",
					Type:     "WeCom",
				},
			},
		},
	}

	if application.IsProviderVisibleForLogin("missing") {
		t.Fatal("expected missing provider to be treated as not visible")
	}
	if !application.IsProviderVisibleForLogin("github") {
		t.Fatal("expected visible OAuth provider to be visible")
	}
	if !application.IsProviderVisibleForLogin("wecom-internal") {
		t.Fatal("expected bare provider name to be visible")
	}
	if !application.IsProviderVisibleForLogin("admin/wecom-internal") {
		t.Fatal("expected ProviderItem owner/name to be visible")
	}
}

func TestApplicationResolveProviderLoginOrganizationUsesTargetOrganization(t *testing.T) {
	application := &Application{
		Organization: "wecom-org",
		Providers: []*ProviderItem{
			{Owner: "admin", Name: "lark-main", TargetOrganization: "feishu-test", Provider: &Provider{Category: "OAuth", Type: "Lark"}},
		},
	}

	organization, err := application.ResolveProviderLoginOrganization("admin/lark-main", func(name string) (bool, error) {
		return name == "feishu-test", nil
	})

	if err != nil {
		t.Fatalf("ResolveProviderLoginOrganization() error = %v", err)
	}
	if organization != "feishu-test" {
		t.Fatalf("expected target organization feishu-test, got %q", organization)
	}
}

func TestApplicationResolveProviderLoginOrganizationFallsBackToApplicationOrganization(t *testing.T) {
	application := &Application{
		Organization: "wecom-org",
		Providers: []*ProviderItem{
			{Name: "wecom-main", Provider: &Provider{Category: "OAuth", Type: "WeCom"}},
		},
	}

	organization, err := application.ResolveProviderLoginOrganization("wecom-main", func(name string) (bool, error) {
		return name == "wecom-org", nil
	})

	if err != nil {
		t.Fatalf("ResolveProviderLoginOrganization() error = %v", err)
	}
	if organization != "wecom-org" {
		t.Fatalf("expected fallback organization wecom-org, got %q", organization)
	}
}

func TestApplicationResolveProviderLoginOrganizationFailsClosedForUnavailableTarget(t *testing.T) {
	application := &Application{
		Organization: "wecom-org",
		Providers: []*ProviderItem{
			{Name: "lark-main", TargetOrganization: "missing-org", Provider: &Provider{Category: "OAuth", Type: "Lark"}},
		},
	}

	organization, err := application.ResolveProviderLoginOrganization("lark-main", func(name string) (bool, error) {
		return false, nil
	})

	if organization != "" {
		t.Fatalf("expected empty organization on failure, got %q", organization)
	}
	if !errors.Is(err, ErrProviderLoginOrganizationUnavailable) {
		t.Fatalf("expected ErrProviderLoginOrganizationUnavailable, got %v", err)
	}
}

func TestApplicationResolveProviderLoginOrganizationFailsClosedForNilApplication(t *testing.T) {
	var application *Application

	organization, err := application.ResolveProviderLoginOrganization("lark-main", nil)

	if organization != "" {
		t.Fatalf("expected empty organization on nil application, got %q", organization)
	}
	if !errors.Is(err, ErrProviderLoginOrganizationUnavailable) {
		t.Fatalf("expected ErrProviderLoginOrganizationUnavailable, got %v", err)
	}
}

func TestApplicationResolveProviderLoginOrganizationFailsClosedForEmptyFallback(t *testing.T) {
	application := &Application{
		Providers: []*ProviderItem{
			{Name: "lark-main", Provider: &Provider{Category: "OAuth", Type: "Lark"}},
		},
	}

	organization, err := application.ResolveProviderLoginOrganization("lark-main", nil)

	if organization != "" {
		t.Fatalf("expected empty organization on empty fallback, got %q", organization)
	}
	if !errors.Is(err, ErrProviderLoginOrganizationUnavailable) {
		t.Fatalf("expected ErrProviderLoginOrganizationUnavailable, got %v", err)
	}
}

func TestApplicationResolveProviderLoginOrganizationObjectLoadsTargetOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "feishu-test")

	application := &Application{
		Organization: "wecom-org",
		Providers: []*ProviderItem{
			{Name: "lark-main", TargetOrganization: "feishu-test", Provider: &Provider{Category: "OAuth", Type: "Lark"}},
		},
	}

	organizationName, organization, err := application.ResolveProviderLoginOrganizationObject("lark-main")

	if err != nil {
		t.Fatalf("ResolveProviderLoginOrganizationObject() error = %v", err)
	}
	if organizationName != "feishu-test" {
		t.Fatalf("organizationName = %q, want feishu-test", organizationName)
	}
	if organization == nil || organization.Name != "feishu-test" {
		t.Fatalf("organization = %#v, want feishu-test", organization)
	}
}

func TestApplicationResolveProviderLoginOrganizationObjectFailsForMissingTargetOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	application := &Application{
		Organization: "wecom-org",
		Providers: []*ProviderItem{
			{Name: "lark-main", TargetOrganization: "missing-org", Provider: &Provider{Category: "OAuth", Type: "Lark"}},
		},
	}

	organizationName, organization, err := application.ResolveProviderLoginOrganizationObject("lark-main")

	if organizationName != "" || organization != nil {
		t.Fatalf("organizationName = %q, organization = %#v, want empty failure result", organizationName, organization)
	}
	if !errors.Is(err, ErrProviderLoginOrganizationUnavailable) {
		t.Fatalf("expected ErrProviderLoginOrganizationUnavailable, got %v", err)
	}
}
