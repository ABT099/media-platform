package main

import (
	"log"

	"discovery/internal/cache"
	"discovery/internal/config"
	"discovery/internal/handler"
	"discovery/internal/service"
	"discovery/internal/store"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	esStore, err := store.NewESStore(cfg.ElasticNode)
	if err != nil {
		log.Fatalf("store: %v", err)
	}

	redisClient := cache.NewRedisClient(cache.RedisOptions{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		UseTLS:   cfg.RedisUseTLS,
	})
	defer redisClient.Close()

	svc := service.New(esStore, redisClient)
	searchHandler := handler.NewSearchHandler(svc)

	router := gin.Default()
	
	router.GET("/search", searchHandler.Search)
	router.GET("/programs/:id", searchHandler.GetProgram)
	router.GET("/episodes/:id", searchHandler.GetEpisode)

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal(err)
	}
}
