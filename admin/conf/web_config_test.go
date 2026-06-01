package conf

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetWebConfigDoesNotForceLanguageWhenUnset(t *testing.T) {
	t.Setenv("forceLanguage", "")
	t.Setenv("defaultLanguage", "zh")

	config := GetWebConfig()
	assert.Equal(t, "", config.ForceLanguage)
	assert.Equal(t, "zh", config.DefaultLanguage)
}
