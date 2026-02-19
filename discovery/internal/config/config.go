package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	OSEndpoint    string
	RedisAddr     string
	RedisPassword string
	RedisUseTLS   bool
	AWSRegion     string
	ServerPort    string
}

func Load() *Config {
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")

	return &Config{
		OSEndpoint:    getEnv("OS_ENDPOINT", "http://localhost:9200"),
		RedisAddr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisUseTLS:   getEnvBool("REDIS_TLS", false),
		AWSRegion:     getEnv("AWS_REGION", "us-east-1"),
		ServerPort:    getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if v == "" {
		return defaultValue
	}
	return v == "true" || v == "1" || v == "yes"
}
