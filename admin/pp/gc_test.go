package pp

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

func TestGcDoPostUsesInjectedClientAndPreservesHTTPContract(t *testing.T) {
	rejectPaymentDefaultTransport(t)
	provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
	var captured *http.Request
	injected := &http.Client{
		Timeout: 7 * time.Second,
		Transport: paymentRoundTripFunc(func(request *http.Request) (*http.Response, error) {
			captured = request
			return paymentResponse(http.StatusBadGateway, "synthetic-response"), nil
		}),
	}
	provider.client = injected

	response, err := provider.doPost([]byte("synthetic-request"))
	if err != nil {
		t.Fatalf("doPost() returned error: %v", err)
	}
	if string(response) != "synthetic-response" {
		t.Fatalf("doPost() response = %q, want synthetic-response", string(response))
	}
	if captured == nil {
		t.Fatal("injected transport did not receive the request")
	}
	if captured.Method != http.MethodPost || captured.URL.String() != "https://provider.example.test/gc" {
		t.Fatalf("request = %s %s, want POST synthetic endpoint", captured.Method, captured.URL)
	}
	if captured.Header.Get("Content-Type") != "text/plain;charset=UTF-8" {
		t.Fatalf("Content-Type = %q", captured.Header.Get("Content-Type"))
	}
	body, readErr := io.ReadAll(captured.Body)
	if readErr != nil || string(body) != "synthetic-request" {
		t.Fatalf("request body = %q, err = %v", string(body), readErr)
	}
	if provider.client != injected || injected.Timeout != 7*time.Second {
		t.Fatal("injected GC client was replaced or mutated")
	}
}

func TestGcPayPreservesSuccessAndProviderFailure(t *testing.T) {
	successData, err := json.Marshal(GcPayRespInfo{PayUrl: "https://checkout.example.test/session"})
	if err != nil {
		t.Fatalf("marshal success fixture: %v", err)
	}
	tests := []struct {
		name      string
		response  GcResponseBody
		wantURL   string
		wantError string
	}{
		{
			name: "success",
			response: GcResponseBody{
				ReturnCode: "SUCCESS",
				Data:       base64.StdEncoding.EncodeToString(successData),
			},
			wantURL: "https://checkout.example.test/session",
		},
		{
			name:      "provider failure",
			response:  GcResponseBody{ReturnCode: "FAILED", ReturnMsg: "synthetic failure"},
			wantError: "FAILED: synthetic failure",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectPaymentDefaultTransport(t)
			responseBody, marshalErr := json.Marshal(test.response)
			if marshalErr != nil {
				t.Fatalf("marshal response fixture: %v", marshalErr)
			}
			var captured *http.Request
			provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
			provider.client = &http.Client{Transport: paymentRoundTripFunc(func(request *http.Request) (*http.Response, error) {
				captured = request
				return paymentResponse(http.StatusOK, string(responseBody)), nil
			})}

			result, payErr := provider.Pay(&PayReq{
				PaymentName:        "payment-synthetic",
				ProductName:        "product-synthetic",
				ProductDisplayName: "Synthetic product",
				PayerName:          "Synthetic payer",
				Price:              12.34,
				ReturnUrl:          "https://return.example.test",
				NotifyUrl:          "https://notify.example.test",
			})

			if test.wantError == "" {
				if payErr != nil {
					t.Fatalf("Pay() returned error: %v", payErr)
				}
				if result == nil || result.PayUrl != test.wantURL {
					t.Fatalf("Pay() result = %#v, want URL %q", result, test.wantURL)
				}
			} else if payErr == nil || payErr.Error() != test.wantError {
				t.Fatalf("Pay() error = %v, want %q", payErr, test.wantError)
			}
			assertGcPayRequest(t, captured)
		})
	}
}

func TestGcGetInvoicePreservesSuccessAndPendingSemantics(t *testing.T) {
	tests := []struct {
		name      string
		invoice   GcInvoiceRespInfo
		wantURL   string
		wantError string
	}{
		{name: "success", invoice: GcInvoiceRespInfo{State: "1", Url: "https://invoice.example.test/file"}, wantURL: "https://invoice.example.test/file"},
		{name: "pending", invoice: GcInvoiceRespInfo{State: "0"}, wantError: "申请成功，开票中"},
		{name: "empty URL", invoice: GcInvoiceRespInfo{State: "1"}, wantError: "invoice URL is empty"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectPaymentDefaultTransport(t)
			invoiceData, marshalErr := json.Marshal(test.invoice)
			if marshalErr != nil {
				t.Fatalf("marshal invoice fixture: %v", marshalErr)
			}
			responseBody, marshalErr := json.Marshal(GcResponseBody{ReturnCode: "SUCCESS", Data: base64.StdEncoding.EncodeToString(invoiceData)})
			if marshalErr != nil {
				t.Fatalf("marshal response fixture: %v", marshalErr)
			}
			provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
			provider.client = &http.Client{Transport: paymentRoundTripFunc(func(*http.Request) (*http.Response, error) {
				return paymentResponse(http.StatusOK, string(responseBody)), nil
			})}

			invoiceURL, invoiceErr := provider.GetInvoice("payment-synthetic", "Synthetic payer", "synthetic-id", "payer@example.test", "00000000000", "Person", "", "")

			if test.wantError == "" {
				if invoiceErr != nil || invoiceURL != test.wantURL {
					t.Fatalf("GetInvoice() = %q, %v; want %q, nil", invoiceURL, invoiceErr, test.wantURL)
				}
			} else if invoiceErr == nil || invoiceErr.Error() != test.wantError {
				t.Fatalf("GetInvoice() error = %v, want %q", invoiceErr, test.wantError)
			}
		})
	}
}

func TestGcDoPostPropagatesNetworkCancelAndTimeout(t *testing.T) {
	networkErr := errors.New("synthetic network failure")
	tests := []struct {
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

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			rejectPaymentDefaultTransport(t)
			provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
			provider.client = &http.Client{Transport: test.transport, Timeout: test.timeout}
			started := time.Now()

			_, err := provider.doPost([]byte("synthetic-request"))

			if err == nil || !errors.Is(err, test.wantCause) {
				t.Fatalf("doPost() error = %v, want cause %v", err, test.wantCause)
			}
			if elapsed := time.Since(started); elapsed > time.Second {
				t.Fatalf("doPost() elapsed = %s, want bounded return within 1s", elapsed)
			}
		})
	}
}

func TestGcDoPostReturnsRequestAndResponseReadErrors(t *testing.T) {
	t.Run("invalid request URL", func(t *testing.T) {
		provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "://invalid")

		_, err := provider.doPost([]byte("synthetic-request"))

		if err == nil {
			t.Fatal("doPost() error = nil, want invalid URL error")
		}
	})

	t.Run("response read error", func(t *testing.T) {
		rejectPaymentDefaultTransport(t)
		readErr := errors.New("synthetic response read failure")
		provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
		provider.client = &http.Client{Transport: paymentRoundTripFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: http.StatusOK, Body: &gcFailingReadCloser{err: readErr}}, nil
		})}

		_, err := provider.doPost([]byte("synthetic-request"))

		if !errors.Is(err, readErr) {
			t.Fatalf("doPost() error = %v, want cause %v", err, readErr)
		}
	})
}

func TestGcNilClientFallsBackToBoundedPolicy(t *testing.T) {
	original := http.DefaultTransport
	http.DefaultTransport = paymentRoundTripFunc(func(*http.Request) (*http.Response, error) {
		return paymentResponse(http.StatusOK, "synthetic-response"), nil
	})
	t.Cleanup(func() {
		http.DefaultTransport = original
	})
	provider := NewGcPaymentProvider("synthetic-client", "synthetic-secret", "https://provider.example.test/gc")
	provider.client = nil

	response, err := provider.doPost([]byte("synthetic-request"))
	if err != nil || string(response) != "synthetic-response" {
		t.Fatalf("doPost() with nil client = %q, %v", string(response), err)
	}
}

func assertGcPayRequest(t *testing.T, request *http.Request) {
	t.Helper()
	if request == nil {
		t.Fatal("injected transport did not receive the request")
	}
	var body GcRequestBody
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		t.Fatalf("decode GC request: %v", err)
	}
	if body.Op != "OrderCreate" || body.Xmpch != "synthetic-client" || body.Sign == "" {
		t.Fatalf("GC request envelope changed: %#v", body)
	}
	decoded, err := base64.StdEncoding.DecodeString(body.Data)
	if err != nil {
		t.Fatalf("decode GC data: %v", err)
	}
	var payInfo GcPayReqInfo
	if err := json.Unmarshal(decoded, &payInfo); err != nil {
		t.Fatalf("unmarshal GC data: %v", err)
	}
	if payInfo.OrderNo != "payment-synthetic" || payInfo.Amount != "12.34" || !strings.Contains(payInfo.Body, "Synthetic") {
		t.Fatalf("GC payment request changed: %#v", payInfo)
	}
}

type gcFailingReadCloser struct {
	err error
}

func (body *gcFailingReadCloser) Read([]byte) (int, error) {
	return 0, body.err
}

func (body *gcFailingReadCloser) Close() error {
	return nil
}
