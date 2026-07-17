package pp

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type paymentRoundTripFunc func(*http.Request) (*http.Response, error)

func (f paymentRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestTargetPaymentConstructorsOwnBoundedHTTPClients(t *testing.T) {
	gc := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test")
	fastSpring, err := NewFastSpringPaymentProvider("synthetic-user", "synthetic-password", "store.example.test")
	if err != nil {
		t.Fatalf("NewFastSpringPaymentProvider() returned error: %v", err)
	}

	gcClient := gc.client
	fastSpringClient := fastSpring.client
	for name, policy := range map[string]struct {
		client  *http.Client
		timeout time.Duration
	}{
		"GC":         {client: gcClient, timeout: gcClient.Timeout},
		"FastSpring": {client: fastSpringClient, timeout: fastSpringClient.Timeout},
	} {
		if policy.client == nil {
			t.Fatalf("%s provider does not own an injectable HTTP client", name)
		}
		if policy.client == http.DefaultClient {
			t.Fatalf("%s client must be independent from http.DefaultClient", name)
		}
		if policy.timeout != 15*time.Second {
			t.Fatalf("%s client timeout = %s, want 15s", name, policy.timeout)
		}
	}
	if gcClient == fastSpringClient {
		t.Fatal("payment providers must not share a mutable client instance")
	}
}

func paymentResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
	}
}

func rejectPaymentDefaultTransport(t *testing.T) {
	t.Helper()
	original := http.DefaultTransport
	http.DefaultTransport = paymentRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("unexpected use of default transport")
	})
	t.Cleanup(func() {
		http.DefaultTransport = original
	})
}
