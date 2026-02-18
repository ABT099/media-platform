// Discovery API
//
//	@title			Discovery API
//	@version		1.0
//	@description	User-facing read-only API for search and content discovery. Returns a unified list of programs and episodes. Program and episode detail endpoints return full content with optional episode pagination. Responses are cached with a short TTL for scale.
//	@host			localhost:8080
//	@BasePath		/
//	@tag.name		search
//	@tag.description	Search endpoints - Unified search across programs and episodes with filters and pagination
//	@tag.name		programs
//	@tag.description	Program endpoints - Get program details by ID with paginated episode list
//	@tag.name		episodes
//	@tag.description	Episode endpoints - Get episode details by ID including parent program summary
package main

import (
	"log"

	_ "discovery/docs"
	"discovery/internal/cache"
	"discovery/internal/config"
	"discovery/internal/handler"
	"discovery/internal/service"
	"discovery/internal/store"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal(err)
	}
}
