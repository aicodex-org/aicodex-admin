package email

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type azureACSRoundTripFunc func(*http.Request) (*http.Response, error)

func (f azureACSRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestAzureACSConstructorOwnsBoundedHTTPClient(t *testing.T) {
	provider := NewAzureACSEmailProvider("c3ludGhldGljLWtleQ==", "https://provider.example.test")

	client := provider.client
	if client == nil {
		t.Fatal("Azure ACS provider does not own an injectable HTTP client")
	}
	if client == http.DefaultClient {
		t.Fatal("Azure ACS client must be independent from http.DefaultClient")
	}
	if client.Timeout != 30*time.Second {
		t.Fatalf("Azure ACS client timeout = %s, want 30s", client.Timeout)
	}
}

func TestAzureACSSendUsesInjectedClientAndPreservesContract(t *testing.T) {
	accessKey := base64.StdEncoding.EncodeToString([]byte("synthetic-key"))
	tests := []struct {
		name      string
		status    int
		body      string
		wantError string
	}{
		{name: "accepted", status: http.StatusAccepted},
		{name: "bad request", status: http.StatusBadRequest, body: `{"error":{"message":"synthetic bad request"}}`, wantError: "status code: 400, error message: synthetic bad request"},
		{name: "unauthorized", status: http.StatusUnauthorized, body: `{"error":{"message":"synthetic unauthorized"}}`, wantError: "status code: 401, error message: synthetic unauthorized"},
		{name: "other status", status: http.StatusServiceUnavailable, body: "synthetic response", wantError: "status code: 503"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectAzureACSDefaultTransport(t)
			var captured *http.Request
			provider := NewAzureACSEmailProvider(accessKey, "https://provider.example.test/base/")
			injected := &http.Client{
				Timeout: 7 * time.Second,
				Transport: azureACSRoundTripFunc(func(request *http.Request) (*http.Response, error) {
					captured = request
					return azureACSResponse(test.status, test.body), nil
				}),
			}
			provider.client = injected

			err := provider.Send("sender@example.test", "ignored", []string{"recipient@example.test"}, "synthetic subject", "synthetic content")

			if test.wantError == "" {
				if err != nil {
					t.Fatalf("Send() returned error: %v", err)
				}
			} else if err == nil || err.Error() != test.wantError {
				t.Fatalf("Send() error = %v, want %q", err, test.wantError)
			}
			if captured == nil {
				t.Fatal("injected transport did not receive the request")
			}
			assertAzureACSRequestContract(t, captured)
			if provider.client != injected || injected.Timeout != 7*time.Second {
				t.Fatal("injected Azure ACS client was replaced or mutated")
			}
		})
	}
}

func TestAzureACSSendPropagatesNetworkCancelAndTimeout(t *testing.T) {
	accessKey := base64.StdEncoding.EncodeToString([]byte("synthetic-key"))
	networkErr := errors.New("synthetic network failure")
	tests := []struct {
		name      string
		timeout   time.Duration
		transport azureACSRoundTripFunc
		wantCause error
	}{
		{
			name: "network error",
			transport: func(*http.Request) (*http.Response, error) {
				return nil, networkErr
			},
			wantCause: networkErr,
		},
		{
			name: "canceled",
			transport: func(*http.Request) (*http.Response, error) {
				return nil, context.Canceled
			},
			wantCause: context.Canceled,
		},
		{
			name:    "client timeout",
			timeout: 25 * time.Millisecond,
			transport: func(request *http.Request) (*http.Response, error) {
				<-request.Context().Done()
				return nil, request.Context().Err()
			},
			wantCause: context.DeadlineExceeded,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectAzureACSDefaultTransport(t)
			provider := NewAzureACSEmailProvider(accessKey, "https://provider.example.test")
			provider.client = &http.Client{Transport: test.transport, Timeout: test.timeout}
			started := time.Now()

			err := provider.Send("sender@example.test", "ignored", []string{"recipient@example.test"}, "synthetic subject", "synthetic content")

			if err == nil || !errors.Is(err, test.wantCause) {
				t.Fatalf("Send() error = %v, want cause %v", err, test.wantCause)
			}
			if elapsed := time.Since(started); elapsed > time.Second {
				t.Fatalf("Send() elapsed = %s, want bounded return within 1s", elapsed)
			}
		})
	}
}

func TestAzureACSNilClientFallsBackToBoundedPolicy(t *testing.T) {
	original := http.DefaultTransport
	http.DefaultTransport = azureACSRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return azureACSResponse(http.StatusAccepted, ""), nil
	})
	t.Cleanup(func() {
		http.DefaultTransport = original
	})
	provider := NewAzureACSEmailProvider(base64.StdEncoding.EncodeToString([]byte("synthetic-key")), "https://provider.example.test")
	provider.client = nil

	if err := provider.Send("sender@example.test", "ignored", []string{"recipient@example.test"}, "synthetic subject", "synthetic content"); err != nil {
		t.Fatalf("Send() with nil client returned error: %v", err)
	}
}

func assertAzureACSRequestContract(t *testing.T, request *http.Request) {
	t.Helper()
	if request.Method != http.MethodPost {
		t.Fatalf("request method = %s, want POST", request.Method)
	}
	if request.URL.String() != "https://provider.example.test/base/emails:send?api-version=2023-03-31" {
		t.Fatalf("request URL = %s", request.URL)
	}
	for _, header := range []string{"Authorization", "x-ms-content-sha256", "x-ms-date", "repeatability-request-id", "repeatability-first-sent"} {
		if request.Header.Get(header) == "" {
			t.Fatalf("request header %s is empty", header)
		}
	}
	if !strings.HasPrefix(request.Header.Get("Authorization"), "HMAC-SHA256 ") {
		t.Fatalf("Authorization = %q, want HMAC-SHA256 prefix", request.Header.Get("Authorization"))
	}
	if request.Header.Get("Content-Type") != "application/json" {
		t.Fatalf("Content-Type = %q, want application/json", request.Header.Get("Content-Type"))
	}
	var message Email
	if err := json.NewDecoder(request.Body).Decode(&message); err != nil {
		t.Fatalf("decode request body: %v", err)
	}
	if message.SenderAddress != "sender@example.test" || message.Content.Subject != "synthetic subject" || message.Content.HTML != "synthetic content" {
		t.Fatalf("request body changed: %#v", message)
	}
}

func azureACSResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
	}
}

func rejectAzureACSDefaultTransport(t *testing.T) {
	t.Helper()
	original := http.DefaultTransport
	http.DefaultTransport = azureACSRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, errors.New("unexpected use of default transport")
	})
	t.Cleanup(func() {
		http.DefaultTransport = original
	})
}
