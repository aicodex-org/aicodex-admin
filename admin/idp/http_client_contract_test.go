package idp

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type idpRoundTripFunc func(*http.Request) (*http.Response, error)

func (f idpRoundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

type idpSentinelTransport struct{}

func (*idpSentinelTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("not called")
}

type idpTrackingBody struct {
	reader io.Reader
	closed bool
}

func (body *idpTrackingBody) Read(buffer []byte) (int, error) {
	return body.reader.Read(buffer)
}

func (body *idpTrackingBody) Close() error {
	body.closed = true
	return nil
}

type idpFailingBody struct {
	closed bool
}

func (body *idpFailingBody) Read([]byte) (int, error) {
	return 0, errors.New("sensitive-read-error")
}

func (body *idpFailingBody) Close() error {
	body.closed = true
	return nil
}

func TestIdPHTTPClientContract(t *testing.T) {
	t.Run("preserves injected client and transport", func(t *testing.T) {
		transport := &idpSentinelTransport{}
		client := &http.Client{Transport: transport, Timeout: 7 * time.Second}

		resolved := resolveIdPHTTPClient(client)

		if resolved != client {
			t.Fatal("expected injected client pointer to be preserved")
		}
		if resolved.Transport != transport {
			t.Fatal("expected injected transport to be preserved")
		}
		if resolved.Timeout != 7*time.Second {
			t.Fatalf("expected injected timeout to remain unchanged, got %s", resolved.Timeout)
		}
	})

	t.Run("uses bounded independent fallback", func(t *testing.T) {
		resolved := resolveIdPHTTPClient(nil)

		if resolved == nil {
			t.Fatal("expected non-nil fallback client")
		}
		if resolved == http.DefaultClient {
			t.Fatal("expected fallback to be independent from http.DefaultClient")
		}
		if resolved.Timeout != 30*time.Second {
			t.Fatalf("expected 30s fallback timeout, got %s", resolved.Timeout)
		}
	})
}

func TestExecuteIdPRequestClosesBodyAndSanitizesErrors(t *testing.T) {
	tests := []struct {
		name          string
		status        int
		body          io.ReadCloser
		wantBody      string
		wantErrorPart string
		forbidden     []string
	}{
		{
			name:     "success",
			status:   http.StatusOK,
			body:     &idpTrackingBody{reader: strings.NewReader(`{"ok":true}`)},
			wantBody: `{"ok":true}`,
		},
		{
			name:          "non-2xx",
			status:        http.StatusBadGateway,
			body:          &idpTrackingBody{reader: strings.NewReader("response-body-secret")},
			wantErrorPart: "status 502",
			forbidden:     []string{"response-body-secret"},
		},
		{
			name:          "read error",
			status:        http.StatusOK,
			body:          &idpFailingBody{},
			wantErrorPart: "read response",
			forbidden:     []string{"sensitive-read-error"},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			client := &http.Client{Transport: idpRoundTripFunc(func(*http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: test.status, Body: test.body}, nil
			})}
			request, err := http.NewRequest(http.MethodGet, "https://provider.example.test/resource", nil)
			if err != nil {
				t.Fatalf("failed to create test request: %v", err)
			}

			data, requestErr := executeIdPRequest(client, "test-provider", "load profile", request)

			if test.wantErrorPart == "" {
				if requestErr != nil {
					t.Fatalf("executeIdPRequest() returned error: %v", requestErr)
				}
				if string(data) != test.wantBody {
					t.Fatalf("expected body %q, got %q", test.wantBody, string(data))
				}
			} else {
				if requestErr == nil || !strings.Contains(requestErr.Error(), test.wantErrorPart) {
					t.Fatalf("expected error containing %q, got %v", test.wantErrorPart, requestErr)
				}
				for _, forbidden := range test.forbidden {
					if strings.Contains(requestErr.Error(), forbidden) {
						t.Fatalf("error leaked %q: %v", forbidden, requestErr)
					}
				}
			}

			switch body := test.body.(type) {
			case *idpTrackingBody:
				if !body.closed {
					t.Fatal("expected response body to be closed")
				}
			case *idpFailingBody:
				if !body.closed {
					t.Fatal("expected failing response body to be closed")
				}
			}
		})
	}
}
