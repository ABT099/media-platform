package handler

import (
	"net/http"
	"strconv"

	"discovery/internal/model"
	"discovery/internal/port"

	"github.com/gin-gonic/gin"
)

// ErrorResponse is the JSON body for error responses.
type ErrorResponse struct {
	Error string `json:"error"`
}

// Ensure model types are used for swag codegen.
var _ = (*model.SearchResult)(nil)

// SearchHandler is the HTTP layer for search.
type SearchHandler struct {
	searcher port.Searcher
}

func NewSearchHandler(searcher port.Searcher) *SearchHandler {
	return &SearchHandler{searcher: searcher}
}

// Search handles GET /search.
//
//	@Summary		Search programs and episodes
//	@Description	Retrieves a unified, relevance-ranked list of programs and episodes matching the query. Each item includes full data (type, id, title, description, and type-specific fields including videoUrl for episodes and extraInfo). Optional filters narrow by category or language. Results are paginated; use page and size to navigate. Responses are cached for 2 minutes.
//	@Tags			search
//	@Param			q			query		string	false	"Full-text search query across titles and descriptions"	example(فنجان)
//	@Param			category	query		string	false	"Filter results by category (exact match)"				example(Culture)
//	@Param			language	query		string	false	"Filter results by language code (e.g. ar, en)"			example(ar)
//	@Param			page		query		int		false	"Page number, starts at 1"								default(1)
//	@Param			size		query		int		false	"Number of items per page (1–100, default 10)"			default(10)
//	@Success		200	{object}	model.SearchResult	"Search results with full item data."
//	@Failure		400	{object}	handler.ErrorResponse	"Bad request — invalid page or size"
//	@Failure		500	{object}	handler.ErrorResponse	"Internal server error — Elasticsearch or cache unavailable"
//	@Router			/search [get]
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	category := c.Query("category")
	language := c.Query("language")

	pageStr := c.Query("page")
	sizeStr := c.Query("size")
	page := 1
	size := 10
	if pageStr != "" {
		p, err := strconv.Atoi(pageStr)
		if err != nil || p < 1 {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid page"})
			return
		}
		page = p
	}
	if sizeStr != "" {
		s, err := strconv.Atoi(sizeStr)
		if err != nil || s < 1 || s > 100 {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid size"})
			return
		}
		size = s
	}

	result, err := h.searcher.Search(c.Request.Context(), query, category, language, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
