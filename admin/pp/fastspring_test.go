package pp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestFastSpringPayUsesInjectedClientAndPreservesContract(t *testing.T) {
	tests := []struct {
		name      string
		status    int
		body      string
		wantURL   string
		wantError string
	}{
		{
			name:    "created",
			status:  http.StatusCreated,
			body:    `{"id":"session-synthetic"}`,
			wantURL: "https://store.example.test/session/session-synthetic",
		},
		{
			name:      "non-success",
			status:    http.StatusBadGateway,
			body:      "synthetic fastspring failure",
			wantError: "fastspring API error: synthetic fastspring failure",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectPaymentDefaultTransport(t)
			provider := newFastSpringTestProvider(t)
			var captured *http.Request
			injected := &http.Client{
				Timeout: 7 * time.Second,
				Transport: paymentRoundTripFunc(func(request *http.Request) (*http.Response, error) {
					captured = request
					return paymentResponse(test.status, test.body), nil
				}),
			}
			provider.client = injected

			result, err := provider.Pay(fastSpringPayRequest())

			if test.wantError == "" {
				if err != nil {
					t.Fatalf("Pay() returned error: %v", err)
				}
				if result == nil || result.PayUrl != test.wantURL || result.OrderId != "session-synthetic" {
					t.Fatalf("Pay() result = %#v", result)
				}
			} else if err == nil || err.Error() != test.wantError {
				t.Fatalf("Pay() error = %v, want %q", err, test.wantError)
			}
			assertFastSpringPayRequest(t, captured)
			if provider.client != injected || injected.Timeout != 7*time.Second {
				t.Fatal("injected FastSpring client was replaced or mutated")
			}
		})
	}
}

func TestFastSpringNotifyUsesInjectedClientAndPreservesPaymentStates(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		body       string
		wantStatus PaymentState
		wantPaid   bool
	}{
		{
			name:       "order not found remains pending",
			status:     http.StatusNotFound,
			body:       "synthetic not found",
			wantStatus: PaymentStateCreated,
		},
		{
			name:       "incomplete order remains pending",
			status:     http.StatusOK,
			body:       `{"id":"order-synthetic","completed":false}`,
			wantStatus: PaymentStateCreated,
		},
		{
			name:       "completed order is paid",
			status:     http.StatusOK,
			body:       `{"id":"order-synthetic","completed":true,"total":12.34,"currency":"USD","tags":{"payment_name":"payment-synthetic","product_name":"product-synthetic","product_display_name":"Synthetic product","provider_name":"provider-synthetic"}}`,
			wantStatus: PaymentStatePaid,
			wantPaid:   true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectPaymentDefaultTransport(t)
			provider := newFastSpringTestProvider(t)
			var captured *http.Request
			provider.client = &http.Client{Transport: paymentRoundTripFunc(func(request *http.Request) (*http.Response, error) {
				captured = request
				return paymentResponse(test.status, test.body), nil
			})}

			result, err := provider.Notify(nil, "order-synthetic")
			if err != nil {
				t.Fatalf("Notify() returned error: %v", err)
			}
			if result == nil || result.PaymentStatus != test.wantStatus {
				t.Fatalf("Notify() result = %#v, want status %s", result, test.wantStatus)
			}
			if test.wantPaid {
				if result.PaymentName != "payment-synthetic" || result.ProductName != "product-synthetic" || result.ProviderName != "provider-synthetic" || result.Price != 12.34 || result.Currency != "USD" || result.OrderId != "order-synthetic" {
					t.Fatalf("paid mapping changed: %#v", result)
				}
			}
			assertFastSpringNotifyRequest(t, captured)
		})
	}
}

func TestFastSpringOperationsPropagateNetworkCancelAndTimeout(t *testing.T) {
	operations := []struct {
		name string
		call func(*FastSpringPaymentProvider) error
	}{
		{
			name: "pay",
			call: func(provider *FastSpringPaymentProvider) error {
				_, err := provider.Pay(fastSpringPayRequest())
				return err
			},
		},
		{
			name: "notify",
			call: func(provider *FastSpringPaymentProvider) error {
				_, err := provider.Notify(nil, "order-synthetic")
				return err
			},
		},
	}
	networkErr := errors.New("synthetic network failure")
	failures := []struct {
		name      string
		timeout   time.Duration
		transport paymentRoundTripFunc
		wantCause error
	}{
		{name: "network error", transport: func(*http.Request) (*http.Response, error) { return nil, networkErr }, wantCause: networkErr},
		{name: "canceled", transport: func(*http.Request) (*http.Response, error) { return nil, context.Canceled }, wantCause: context.Canceled},
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

	for _, operation := range operations {
		for _, failure := range failures {
			t.Run(operation.name+"/"+failure.name, func(t *testing.T) {
				rejectPaymentDefaultTransport(t)
				provider := newFastSpringTestProvider(t)
				provider.client = &http.Client{Transport: failure.transport, Timeout: failure.timeout}
				started := time.Now()

				err := operation.call(provider)

				if err == nil || !errors.Is(err, failure.wantCause) {
					t.Fatalf("operation error = %v, want cause %v", err, failure.wantCause)
				}
				if elapsed := time.Since(started); elapsed > time.Second {
					t.Fatalf("operation elapsed = %s, want bounded return within 1s", elapsed)
				}
			})
		}
	}
}

func TestFastSpringNilClientFallsBackForPayAndNotify(t *testing.T) {
	original := http.DefaultTransport
	http.DefaultTransport = paymentRoundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/sessions":
			return paymentResponse(http.StatusCreated, `{"id":"session-synthetic"}`), nil
		case "/orders/order-synthetic":
			return paymentResponse(http.StatusNotFound, "synthetic not found"), nil
		default:
			return paymentResponse(http.StatusBadRequest, "unexpected path"), nil
		}
	})
	t.Cleanup(func() {
		http.DefaultTransport = original
	})
	provider := newFastSpringTestProvider(t)
	provider.client = nil

	payResult, err := provider.Pay(fastSpringPayRequest())
	if err != nil || payResult == nil || payResult.OrderId != "session-synthetic" {
		t.Fatalf("Pay() with nil client = %#v, %v", payResult, err)
	}
	notifyResult, err := provider.Notify(nil, "order-synthetic")
	if err != nil || notifyResult == nil || notifyResult.PaymentStatus != PaymentStateCreated {
		t.Fatalf("Notify() with nil client = %#v, %v", notifyResult, err)
	}
}

func newFastSpringTestProvider(t *testing.T) *FastSpringPaymentProvider {
	t.Helper()
	provider, err := NewFastSpringPaymentProvider("synthetic-user", "synthetic-password", "store.example.test")
	if err != nil {
		t.Fatalf("NewFastSpringPaymentProvider() returned error: %v", err)
	}
	return provider
}

func fastSpringPayRequest() *PayReq {
	return &PayReq{
		ProviderName:       "provider-synthetic",
		ProductName:        "product-synthetic",
		ProductDisplayName: "Synthetic product",
		PayerName:          "Synthetic payer",
		PayerEmail:         "payer@example.test",
		PaymentName:        "payment-synthetic",
		Price:              12.34,
		Currency:           "usd",
	}
}

func assertFastSpringPayRequest(t *testing.T, request *http.Request) {
	t.Helper()
	if request == nil {
		t.Fatal("injected transport did not receive the request")
	}
	if request.Method != http.MethodPost || request.URL.String() != "https://api.fastspring.com/sessions" {
		t.Fatalf("request = %s %s", request.Method, request.URL)
	}
	assertFastSpringBasicAuth(t, request)
	if request.Header.Get("Content-Type") != "application/json" {
		t.Fatalf("Content-Type = %q", request.Header.Get("Content-Type"))
	}
	var body fastSpringSessionRequest
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		t.Fatalf("decode FastSpring request: %v", err)
	}
	if len(body.Items) != 1 || body.Items[0].Product != "product-synthetic" || body.Items[0].Pricing.Price["USD"] != 12.34 {
		t.Fatalf("FastSpring item mapping changed: %#v", body.Items)
	}
	if body.Tags["payment_name"] != "payment-synthetic" || body.Account == nil || body.Account.Contact == nil || body.Account.Contact.Email != "payer@example.test" {
		t.Fatalf("FastSpring metadata mapping changed: %#v", body)
	}
}

func assertFastSpringNotifyRequest(t *testing.T, request *http.Request) {
	t.Helper()
	if request == nil {
		t.Fatal("injected transport did not receive the request")
	}
	if request.Method != http.MethodGet || request.URL.String() != "https://api.fastspring.com/orders/order-synthetic" {
		t.Fatalf("request = %s %s", request.Method, request.URL)
	}
	assertFastSpringBasicAuth(t, request)
}

func assertFastSpringBasicAuth(t *testing.T, request *http.Request) {
	t.Helper()
	username, password, ok := request.BasicAuth()
	if !ok || username != "synthetic-user" || password != "synthetic-password" {
		t.Fatalf("Basic Auth changed: username=%q password-set=%t ok=%t", username, password != "", ok)
	}
	if strings.Contains(request.URL.String(), "synthetic-user") || strings.Contains(request.URL.String(), "synthetic-password") {
		t.Fatalf("request URL leaked Basic Auth credential: %s", request.URL)
	}
}
