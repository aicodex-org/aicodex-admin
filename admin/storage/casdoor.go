package storage

import (
	"github.com/casdoor/oss"
	"github.com/casdoor/oss/casdoor"
)

// NewCasdoorStorageProvider 按 Casdoor Config 的稳定字段名构造存储客户端，保持既有参数映射。
func NewCasdoorStorageProvider(providerType string, clientId string, clientSecret string, region string, bucket string, endpoint string, cert string, content string) oss.StorageInterface {
	sp := casdoor.New(&casdoor.Config{
		AccessID:         clientId,
		AccessKey:        clientSecret,
		Endpoint:         endpoint,
		Certificate:      cert,
		ApplicationName:  region,
		OrganizationName: content,
		Provider:         bucket,
	})
	return sp
}
