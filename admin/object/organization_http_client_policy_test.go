// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package object

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const organizationHTTPClientTestTimeout = 50 * time.Millisecond

type organizationHTTPClientTestAdapter struct {
	httpClient      func() *http.Client
	setHTTPClient   func(*http.Client)
	setBaseURL      func(string)
	getAccessToken  func(context.Context) error
	isProviderError func(error) bool
}

func TestOrganizationAddressBookClientsUseConsistentDefaultHTTPPolicy(t *testing.T) {
	const wantTimeout = 30 * time.Second
	globalDefaultClient := http.DefaultClient
	globalDefaultTimeout := http.DefaultClient.Timeout
	seenClients := map[*http.Client]string{}

	for _, tc := range organizationHTTPClientPolicyTestCases() {
		t.Run(tc.name, func(t *testing.T) {
			adapter := tc.newAdapter()
			client := adapter.httpClient()
			if client == nil {
				t.Fatal("default HTTP client is nil")
			}
			if client.Timeout != wantTimeout {
				t.Fatalf("default HTTP client timeout = %s, want %s", client.Timeout, wantTimeout)
			}
			if owner, exists := seenClients[client]; exists {
				t.Fatalf("default HTTP client is shared with %s; want independent clients", owner)
			}
			seenClients[client] = tc.name
		})
	}
	if http.DefaultClient != globalDefaultClient || http.DefaultClient.Timeout != globalDefaultTimeout {
		t.Fatalf("global http.DefaultClient was mutated: client=%p timeout=%s", http.DefaultClient, http.DefaultClient.Timeout)
	}
}

func TestOrganizationAddressBookClientsPreserveInjectedHTTPClient(t *testing.T) {
	for _, tc := range organizationHTTPClientPolicyTestCases() {
		t.Run(tc.name, func(t *testing.T) {
			adapter := tc.newAdapter()
			adapter.setHTTPClient(nil)
			fallback := adapter.httpClient()
			if fallback == nil || fallback.Timeout != 30*time.Second {
				t.Fatalf("nil fallback client = %#v, want 30s timeout", fallback)
			}

			transport := &organizationHTTPRoundTripper{roundTrip: func(*http.Request) (*http.Response, error) {
				return nil, errors.New("not called")
			}}
			injected := &http.Client{Timeout: 17 * time.Second, Transport: transport}
			adapter.setHTTPClient(injected)
			if got := adapter.httpClient(); got != injected {
				t.Fatalf("resolved HTTP client = %p, want injected identity %p", got, injected)
			}
			if injected.Timeout != 17*time.Second || injected.Transport != transport {
				t.Fatalf("injected HTTP client was mutated: %#v", injected)
			}
		})
	}
}

func TestOrganizationAddressBookClientsHonorContextCancellationAndDeadline(t *testing.T) {
	modes := []struct {
		name       string
		newContext func() (context.Context, context.CancelFunc)
	}{
		{
			name: "pre-canceled",
			newContext: func() (context.Context, context.CancelFunc) {
				ctx, cancel := context.WithCancel(context.Background())
				cancel()
				return ctx, func() {}
			},
		},
		{
			name: "deadline",
			newContext: func() (context.Context, context.CancelFunc) {
				return context.WithTimeout(context.Background(), organizationHTTPClientTestTimeout)
			},
		},
	}

	for _, tc := range organizationHTTPClientPolicyTestCases() {
		for _, mode := range modes {
			t.Run(tc.name+"/"+mode.name, func(t *testing.T) {
				adapter := tc.newAdapter()
				server := newSlowOrganizationHTTPTestServer(t)
				defer server.Close()
				adapter.setBaseURL(server.URL)

				ctx, cancel := mode.newContext()
				defer cancel()
				started := time.Now()
				err := adapter.getAccessToken(ctx)
				assertBoundedOrganizationHTTPError(t, adapter, err, time.Since(started), server.URL)
			})
		}
	}
}

func TestOrganizationAddressBookClientsHonorInjectedClientTimeout(t *testing.T) {
	for _, tc := range organizationHTTPClientPolicyTestCases() {
		t.Run(tc.name, func(t *testing.T) {
			adapter := tc.newAdapter()
			server := newSlowOrganizationHTTPTestServer(t)
			defer server.Close()
			adapter.setBaseURL(server.URL)

			injected := &http.Client{Timeout: organizationHTTPClientTestTimeout}
			adapter.setHTTPClient(injected)
			started := time.Now()
			err := adapter.getAccessToken(context.Background())
			assertBoundedOrganizationHTTPError(t, adapter, err, time.Since(started), server.URL)
			if adapter.httpClient() != injected || injected.Timeout != organizationHTTPClientTestTimeout {
				t.Fatalf("injected timeout client was replaced or mutated: %#v", injected)
			}
		})
	}
}

func assertBoundedOrganizationHTTPError(t *testing.T, adapter *organizationHTTPClientTestAdapter, err error, elapsed time.Duration, privateEndpoint string) {
	t.Helper()
	if err == nil {
		t.Fatal("request error = nil, want cancellation or timeout")
	}
	if !adapter.isProviderError(err) {
		t.Fatalf("request error type = %T, want provider error alias", err)
	}
	if elapsed > time.Second {
		t.Fatalf("request elapsed = %s, want bounded return within 1s", elapsed)
	}
	visible := err.Error()
	for _, sensitive := range []string{privateEndpoint, "policy-secret", "policy-app", "policy-corp"} {
		if sensitive != "" && strings.Contains(visible, sensitive) {
			t.Fatalf("request error leaked sensitive endpoint or credential %q: %q", sensitive, visible)
		}
	}
}

func newSlowOrganizationHTTPTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(250 * time.Millisecond)
		_, _ = w.Write([]byte(`{"unexpected":"late response"}`))
	}))
}

type organizationHTTPClientPolicyTestCase struct {
	name       string
	newAdapter func() *organizationHTTPClientTestAdapter
}

func organizationHTTPClientPolicyTestCases() []organizationHTTPClientPolicyTestCase {
	return []organizationHTTPClientPolicyTestCase{
		{
			name: "dingtalk",
			newAdapter: func() *organizationHTTPClientTestAdapter {
				client := NewDingTalkAddressBookClient("policy-app", "policy-secret")
				return &organizationHTTPClientTestAdapter{
					httpClient:    client.httpClient,
					setHTTPClient: func(value *http.Client) { client.HttpClient = value },
					setBaseURL:    func(value string) { client.BaseUrl = value },
					getAccessToken: func(ctx context.Context) error {
						_, err := client.GetAccessToken(ctx)
						return err
					},
					isProviderError: func(err error) bool {
						var target *DingTalkApiError
						return errors.As(err, &target)
					},
				}
			},
		},
		{
			name: "feishu",
			newAdapter: func() *organizationHTTPClientTestAdapter {
				client := NewFeishuAddressBookClient("policy-app", "policy-secret", FeishuEndpointModeDomestic)
				return &organizationHTTPClientTestAdapter{
					httpClient:    client.httpClient,
					setHTTPClient: func(value *http.Client) { client.HttpClient = value },
					setBaseURL:    func(value string) { client.BaseUrl = value },
					getAccessToken: func(ctx context.Context) error {
						_, err := client.GetAccessToken(ctx)
						return err
					},
					isProviderError: func(err error) bool {
						var target *FeishuApiError
						return errors.As(err, &target)
					},
				}
			},
		},
		{
			name: "wecom",
			newAdapter: func() *organizationHTTPClientTestAdapter {
				client := NewWecomAddressBookClient("policy-corp", "policy-secret")
				return &organizationHTTPClientTestAdapter{
					httpClient:    client.httpClient,
					setHTTPClient: func(value *http.Client) { client.HttpClient = value },
					setBaseURL:    func(value string) { client.BaseUrl = value },
					getAccessToken: func(ctx context.Context) error {
						_, err := client.GetAccessToken(ctx)
						return err
					},
					isProviderError: func(err error) bool {
						var target *WecomApiError
						return errors.As(err, &target)
					},
				}
			},
		},
	}
}

type organizationHTTPRoundTripper struct {
	roundTrip func(*http.Request) (*http.Response, error)
}

func (r *organizationHTTPRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return r.roundTrip(req)
}
