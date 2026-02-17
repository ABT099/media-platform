package config

import (
	"os"
	"strings"
)

type Config struct {
	DatabaseURL   string
	RedisAddr     string
	RedisPassword string
	RedisUseTLS   bool
	ElasticNode   string
	ServerPort    string
}

func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://admin:password@localhost:5432/media_platform?sslmode=disable"),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisUseTLS:   getEnvBool("REDIS_TLS", false),
		ElasticNode:   getEnv("ELASTIC_NODE", "http://localhost:9200"),
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
