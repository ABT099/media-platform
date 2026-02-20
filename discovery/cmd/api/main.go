// Discovery API
//
//	@title			Discovery API
//	@version		1.0
//	@description	User-facing read-only API for search and content discovery. Returns a unified list of programs and episodes with full data. Responses are cached with a short TTL for scale.
//	@BasePath		/discovery
//	@tag.name		search
//	@tag.description	Search across programs and episodes with filters and pagination
package main

import (
	"log"

	_ "discovery/docs"
	"discovery/internal/cache"
	"discovery/internal/config"
	"discovery/internal/handler"
	"discovery/internal/service"
	"discovery/internal/store"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	cfg := config.Load()

	esStore, err := store.NewESStore(cfg.OSEndpoint)
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
	router.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowHeaders:    []string{"Origin", "Content-Type", "Accept", "Authorization"},
	}))
	
	v1 := router.Group("/discovery")
	v1.GET("/search", searchHandler.Search)
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})
	// Swagger UI at /discovery/api/docs (same path shape as CMS /cms/api/docs); no redirect to index.html
	v1.GET("/api/docs", func(c *gin.Context) {
		c.Request.URL.Path = "/discovery/api/docs/index.html"
		ginSwagger.WrapHandler(swaggerFiles.Handler)(c)
	})
	v1.GET("/api/docs/", func(c *gin.Context) {
		c.Request.URL.Path = "/discovery/api/docs/index.html"
		ginSwagger.WrapHandler(swaggerFiles.Handler)(c)
	})
	v1.GET("/api/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal(err)
	}
}
