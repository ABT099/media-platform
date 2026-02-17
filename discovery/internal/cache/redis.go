package cache

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client *redis.Client
}

type RedisOptions struct {
	Addr     string
	Password string
	UseTLS   bool
}

func NewRedisClient(opts RedisOptions) *RedisClient {
	redisOpts := &redis.Options{
		Addr:     opts.Addr,
		Password: opts.Password,
		DB:       0,
	}
	if opts.UseTLS {
		redisOpts.TLSConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	client := redis.NewClient(redisOpts)
	return &RedisClient{client: client}
}


func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(val), dest)
}

func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return r.client.Set(ctx, key, data, ttl).Err()
}

func (r *RedisClient) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisClient) Close() error {
	return r.client.Close()
}
