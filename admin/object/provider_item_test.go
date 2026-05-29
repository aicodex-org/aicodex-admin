package object

import "testing"

func TestApplicationIsProviderVisibleForLoginHandlesMissingProvider(t *testing.T) {
	application := &Application{
		Providers: []*ProviderItem{
			{Name: "github", Provider: &Provider{Category: "OAuth", Type: "GitHub"}},
		},
	}

	if application.IsProviderVisibleForLogin("missing") {
		t.Fatal("expected missing provider to be treated as not visible")
	}
	if !application.IsProviderVisibleForLogin("github") {
		t.Fatal("expected visible OAuth provider to be visible")
	}
}
