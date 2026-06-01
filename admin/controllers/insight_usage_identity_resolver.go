package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"github.com/beego/beego/v2/core/logs"
)

const (
	insightUsageIdentityResolverDefaultCaller    = "aicodex-admin"
	insightUsageIdentityResolverDefaultMaxItems  = 200
	insightUsageIdentityResolverDefaultTimeoutMs = 5000
)

type insightUsageIdentityResolverConfig struct {
	Endpoint      string
	Token         string
	Caller        string
	MaxItems      int
	LookupTimeout time.Duration
}

type insightUsageIdentityResolveRequest struct {
	TraceId string                            `json:"traceId"`
	Caller  string                            `json:"caller"`
	Items   []insightUsageIdentityResolveItem `json:"items"`
}

type insightUsageIdentityResolveItem struct {
	RequestId       string `json:"requestId"`
	AdminSubject    string `json:"adminSubject,omitempty"`
	WecomExternalId string `json:"wecomExternalId,omitempty"`
	WecomCorpId     string `json:"wecomCorpId,omitempty"`
	WecomUserId     string `json:"wecomUserId,omitempty"`
}

type insightUsageIdentityResolveResponse struct {
	Results []insightUsageIdentityResolveResult `json:"results"`
}

type insightUsageIdentityResolveResult struct {
	RequestId     string `json:"requestId"`
	MappingStatus string `json:"mappingStatus"`
	ApiUserId     int    `json:"apiUserId,omitempty"`
	ErrorCode     string `json:"errorCode,omitempty"`
	Message       string `json:"message,omitempty"`
}

type insightUsageIdentityResolveEnvelope struct {
	Success bool                                `json:"success"`
	TraceId string                              `json:"traceId,omitempty"`
	Data    insightUsageIdentityResolveResponse `json:"data,omitempty"`
	Error   *InsightProviderError               `json:"error,omitempty"`
}

type insightUsageIdentityResolver interface {
	Enabled() bool
	Resolve(traceId string, items []insightUsageIdentityResolveItem) ([]insightUsageIdentityResolveResult, *InsightProviderError)
}

type insightUsageIdentityHTTPResolver struct {
	config insightUsageIdentityResolverConfig
	client *http.Client
}

func getInsightUsageIdentityResolverConfig() (insightUsageIdentityResolverConfig, bool) {
	endpoint := strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverEndpoint"))
	token := strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverToken"))
	if endpoint == "" || token == "" {
		return insightUsageIdentityResolverConfig{}, false
	}
	caller := strings.TrimSpace(conf.GetConfigString("insightUsageIdentityResolverCaller"))
	if caller == "" {
		caller = insightUsageIdentityResolverDefaultCaller
	}
	maxItems := getInsightUsageIdentityResolverIntConfig("insightUsageIdentityResolverMaxItems", insightUsageIdentityResolverDefaultMaxItems)
	timeoutMs := getInsightUsageIdentityResolverIntConfig("insightUsageIdentityResolverTimeoutMs", insightUsageIdentityResolverDefaultTimeoutMs)
	return insightUsageIdentityResolverConfig{
		Endpoint:      endpoint,
		Token:         token,
		Caller:        caller,
		MaxItems:      normalizeInsightUsageIdentityResolverMaxItems(maxItems),
		LookupTimeout: time.Duration(normalizeInsightUsageIdentityResolverTimeoutMs(timeoutMs)) * time.Millisecond,
	}, true
}

func newInsightUsageIdentityResolverFromConfig() insightUsageIdentityResolver {
	config, ok := getInsightUsageIdentityResolverConfig()
	if !ok {
		return nil
	}
	return insightUsageIdentityHTTPResolver{config: config}
}

func (r insightUsageIdentityHTTPResolver) Enabled() bool {
	return strings.TrimSpace(r.config.Endpoint) != "" && strings.TrimSpace(r.config.Token) != ""
}

func (r insightUsageIdentityHTTPResolver) Resolve(traceId string, items []insightUsageIdentityResolveItem) ([]insightUsageIdentityResolveResult, *InsightProviderError) {
	if !r.Enabled() || len(items) == 0 {
		return []insightUsageIdentityResolveResult{}, nil
	}
	maxItems := normalizeInsightUsageIdentityResolverMaxItems(r.config.MaxItems)
	results := []insightUsageIdentityResolveResult{}
	for start := 0; start < len(items); start += maxItems {
		end := start + maxItems
		if end > len(items) {
			end = len(items)
		}
		batchResults, providerErr := r.resolveBatch(traceId, items[start:end])
		if providerErr != nil {
			return nil, providerErr
		}
		results = append(results, batchResults...)
	}
	return results, nil
}

func (r insightUsageIdentityHTTPResolver) resolveBatch(traceId string, items []insightUsageIdentityResolveItem) ([]insightUsageIdentityResolveResult, *InsightProviderError) {
	startedAt := time.Now()
	requestBody := insightUsageIdentityResolveRequest{
		TraceId: traceId,
		Caller:  firstNonEmptyInsightString(r.config.Caller, insightUsageIdentityResolverDefaultCaller),
		Items:   items,
	}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}

	timeout := r.config.LookupTimeout
	if timeout <= 0 {
		timeout = time.Duration(insightUsageIdentityResolverDefaultTimeoutMs) * time.Millisecond
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.config.Endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	req.Header.Set("Authorization", "Bearer "+r.config.Token)
	req.Header.Set("Content-Type", "application/json")

	client := r.client
	if client == nil {
		client = &http.Client{Timeout: timeout}
	}
	resp, err := client.Do(req)
	if err != nil {
		r.writeAudit(traceId, len(items), nil, InsightProviderErrorUnavailable, startedAt)
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	defer resp.Body.Close()

	envelope := insightUsageIdentityResolveEnvelope{}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		r.writeAudit(traceId, len(items), nil, InsightProviderErrorUnavailable, startedAt)
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, err.Error(), traceId, "")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !envelope.Success {
		message := fmt.Sprintf("usage identity resolver returned status %d", resp.StatusCode)
		if envelope.Error != nil && envelope.Error.Message != "" {
			message = envelope.Error.Message
		}
		r.writeAudit(traceId, len(items), envelope.Data.Results, InsightProviderErrorUnavailable, startedAt)
		return nil, newInsightProviderError(InsightProviderErrorUnavailable, message, traceId, "")
	}

	r.writeAudit(traceId, len(items), envelope.Data.Results, "", startedAt)
	return envelope.Data.Results, nil
}

func (r insightUsageIdentityHTTPResolver) writeAudit(traceId string, batchSize int, results []insightUsageIdentityResolveResult, errorCode string, startedAt time.Time) {
	okCount, missingCount, ambiguousCount, invalidCount := countInsightUsageIdentityResolveStatuses(results)
	status := "ok"
	if errorCode != "" {
		status = "error"
	}
	// 审计日志不输出 token、手机号、邮箱或完整身份原文，只保留批量统计和错误码。
	logs.Info("insight_usage_identity_resolver_audit traceId=%s resolverCaller=%s resolverBatchSize=%d resolverOkCount=%d resolverMissingCount=%d resolverAmbiguousCount=%d resolverInvalidCount=%d status=%s errorCode=%s durationMs=%d",
		traceId, r.config.Caller, batchSize, okCount, missingCount, ambiguousCount, invalidCount, status, errorCode, time.Since(startedAt).Milliseconds())
}

func countInsightUsageIdentityResolveStatuses(results []insightUsageIdentityResolveResult) (int, int, int, int) {
	okCount, missingCount, ambiguousCount, invalidCount := 0, 0, 0, 0
	for _, result := range results {
		switch result.MappingStatus {
		case MappingStatusOK:
			okCount++
		case MappingStatusMissing:
			missingCount++
		case MappingStatusAmbiguous:
			ambiguousCount++
		case MappingStatusInvalid:
			invalidCount++
		}
	}
	return okCount, missingCount, ambiguousCount, invalidCount
}

func getInsightUsageIdentityResolverIntConfig(key string, fallback int) int {
	value := strings.TrimSpace(conf.GetConfigString(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func normalizeInsightUsageIdentityResolverMaxItems(value int) int {
	if value <= 0 {
		return insightUsageIdentityResolverDefaultMaxItems
	}
	return value
}

func normalizeInsightUsageIdentityResolverTimeoutMs(value int) int {
	if value <= 0 {
		return insightUsageIdentityResolverDefaultTimeoutMs
	}
	return value
}

func firstNonEmptyInsightString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
