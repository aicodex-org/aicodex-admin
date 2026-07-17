package pp

import (
	"net/http"
	"time"
)

// paymentHTTPClientTimeout 沿用同包 Airwallex 的 15 秒边界，限制支付 Provider 的整体外呼生命周期。
const paymentHTTPClientTimeout = 15 * time.Second

func newPaymentHTTPClient() *http.Client {
	return &http.Client{Timeout: paymentHTTPClientTimeout}
}

// resolvePaymentHTTPClient 原样保留注入 client；nil 时为当前 Provider 创建独立的有界 client。
func resolvePaymentHTTPClient(client *http.Client) *http.Client {
	if client != nil {
		return client
	}
	return newPaymentHTTPClient()
}
