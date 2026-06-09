package object

import "testing"

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
