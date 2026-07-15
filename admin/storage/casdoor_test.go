package storage

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/casdoor/oss/casdoor"
)

func TestNewCasdoorStorageProviderPreservesConfigFieldMapping(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Path; got != "/api/get-provider" {
			t.Errorf("unexpected request path: %s", got)
		}
		if got := r.URL.Query().Get("id"); got != "organization/provider" {
			t.Errorf("unexpected provider id: %s", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{"status":"ok","data":{"bucket":"bucket","pathPrefix":"prefix"}}`)
	}))
	defer server.Close()

	provider := NewCasdoorStorageProvider(
		"unused-provider-type",
		"client-id",
		"client-secret",
		"application",
		"provider",
		server.URL,
		"certificate",
		"organization",
	)
	client, ok := provider.(*casdoor.Client)
	if !ok {
		t.Fatalf("unexpected provider type: %T", provider)
	}

	expected := casdoor.Config{
		AccessID:         "client-id",
		AccessKey:        "client-secret",
		Endpoint:         server.URL,
		Certificate:      "certificate",
		ApplicationName:  "application",
		OrganizationName: "organization",
		Provider:         "provider",
	}
	if *client.Config != expected {
		t.Fatalf("unexpected Casdoor config: %#v", *client.Config)
	}
}
