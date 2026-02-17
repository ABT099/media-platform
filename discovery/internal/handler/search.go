package handler

import (
	"errors"
	"net/http"
	"strconv"

	"discovery/internal/port"

	"github.com/gin-gonic/gin"
)

// SearchHandler is the HTTP layer for search and detail endpoints.
type SearchHandler struct {
	searcher port.Searcher
}

func NewSearchHandler(searcher port.Searcher) *SearchHandler {
	return &SearchHandler{searcher: searcher}
}

// Search handles GET /search.
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	category := c.Query("category")
	language := c.Query("language")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 10
	}

	result, err := h.searcher.Search(c.Request.Context(), query, category, language, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetProgram handles GET /programs/:id.
func (h *SearchHandler) GetProgram(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}

	episodePage, _ := strconv.Atoi(c.DefaultQuery("episodePage", "1"))
	episodeSize, _ := strconv.Atoi(c.DefaultQuery("episodeSize", "20"))
	if episodePage < 1 {
		episodePage = 1
	}
	if episodeSize < 1 || episodeSize > 100 {
		episodeSize = 20
	}

	detail, err := h.searcher.GetProgram(c.Request.Context(), id, episodePage, episodeSize)
	if err != nil {
		if errors.Is(err, port.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "program not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, detail)
}

// GetEpisode handles GET /episodes/:id.
func (h *SearchHandler) GetEpisode(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}

	detail, err := h.searcher.GetEpisode(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, port.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "episode not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, detail)
}
