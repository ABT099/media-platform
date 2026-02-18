package handler

import (
	"errors"
	"net/http"
	"strconv"

	"discovery/internal/model"
	"discovery/internal/port"

	"github.com/gin-gonic/gin"
)

// Ensure model types are used for swag codegen.
var (
	_ = (*model.SearchResult)(nil)
	_ = (*model.ProgramDetail)(nil)
	_ = (*model.EpisodeDetail)(nil)
)

// SearchHandler is the HTTP layer for search and detail endpoints.
type SearchHandler struct {
	searcher port.Searcher
}

func NewSearchHandler(searcher port.Searcher) *SearchHandler {
	return &SearchHandler{searcher: searcher}
}

// Search handles GET /search.
//
//	@Summary		Search programs and episodes
//	@Description	Retrieves a unified, relevance-ranked list of programs and episodes matching the query. Each item includes a type ("program" or "episode") and view fields only — no videoUrl is exposed in search results. Optional filters narrow by category or language. Results are paginated; use page and size to navigate. Responses are cached for 2 minutes for scale.
//	@Tags			search
//	@Param			q			query		string	false	"Full-text search query across titles and descriptions"	example(فنجان)
//	@Param			category	query		string	false	"Filter results by category (exact match)"				example(Culture)
//	@Param			language	query		string	false	"Filter results by language code (e.g. ar, en)"			example(ar)
//	@Param			page		query		int		false	"Page number, starts at 1"								default(1)
//	@Param			size		query		int		false	"Number of items per page (1–100, default 10)"			default(10)
//	@Success		200	{object}	model.SearchResult	"Search results retrieved successfully. Items are a flat mixed list; use the type field to distinguish programs from episodes."
//	@Failure		500	{object}	object				"Internal server error — Elasticsearch or cache unavailable"
//	@Router			/search [get]
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
//
//	@Summary		Get program by ID with episodes
//	@Description	Retrieves a single program by UUID with a paginated list of its episodes ordered by season and episode number. Use episodePage and episodeSize to page through episodes (e.g. load 20 at a time on the program detail page). Internal fields (status, createdAt, updatedAt) are omitted — this is the public-facing view. Responses are cached for 3 minutes.
//	@Tags			programs
//	@Param			id				path		string	true	"Program UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)"	example(123e4567-e89b-12d3-a456-426614174000)
//	@Param			episodePage		query		int		false	"Episode list page number (starts at 1)"					default(1)
//	@Param			episodeSize		query		int		false	"Number of episodes per page (default 20, max 100)"			default(20)
//	@Success		200	{object}	model.ProgramDetail	"Program retrieved successfully with its episode list. Episodes are ordered by seasonNumber then episodeNumber ascending."
//	@Failure		400	{object}	object				"Bad request — id path parameter is missing or empty"
//	@Failure		404	{object}	object				"Program not found — no program exists with the given UUID"
//	@Failure		500	{object}	object				"Internal server error — Elasticsearch or cache unavailable"
//	@Router			/programs/{id} [get]
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
//
//	@Summary		Get episode by ID
//	@Description	Retrieves a single episode by UUID including full detail (video URL, duration, season/episode numbers, publication date) and a brief summary of the parent program (id, title, cover image). Use this on the episode player page. Internal fields are omitted. Responses are cached for 3 minutes.
//	@Tags			episodes
//	@Param			id	path		string	true	"Episode UUID (e.g. 223e4567-e89b-12d3-a456-426614174000)"	example(223e4567-e89b-12d3-a456-426614174000)
//	@Success		200	{object}	model.EpisodeDetail	"Episode retrieved successfully. The program field contains a lightweight program summary suitable for rendering a back-link or breadcrumb."
//	@Failure		400	{object}	object				"Bad request — id path parameter is missing or empty"
//	@Failure		404	{object}	object				"Episode not found — no episode exists with the given UUID"
//	@Failure		500	{object}	object				"Internal server error — Elasticsearch or cache unavailable"
//	@Router			/episodes/{id} [get]
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
