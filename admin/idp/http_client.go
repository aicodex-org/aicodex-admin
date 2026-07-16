package idp

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

const idpHTTPFallbackTimeout = 30 * time.Second

// resolveIdPHTTPClient 保留调用方注入的代理和Transport；仅在未注入时创建有整体超时的独立client。
func resolveIdPHTTPClient(client *http.Client) *http.Client {
	if client != nil {
		return client
	}

	return &http.Client{Timeout: idpHTTPFallbackTimeout}
}

// executeIdPRequest 统一HTTP状态、body生命周期和脱敏错误，不把可能含credential的底层错误带入普通错误链。
func executeIdPRequest(client *http.Client, provider string, operation string, request *http.Request) ([]byte, error) {
	response, err := resolveIdPHTTPClient(client).Do(request)
	if err != nil {
		return nil, fmt.Errorf("%s %s: request failed", provider, operation)
	}
	if response == nil || response.Body == nil {
		return nil, fmt.Errorf("%s %s: empty response", provider, operation)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("%s %s: unexpected HTTP status %d", provider, operation, response.StatusCode)
	}

	data, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("%s %s: read response failed", provider, operation)
	}
	return data, nil
}
