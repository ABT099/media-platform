package port

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"discovery/internal/model"
)

var ErrNotFound = errors.New("not found")

// Searcher is the port for search operations.
type Searcher interface {
	Search(ctx context.Context, query, category, language string, page, limit int) (*model.SearchResult, error)
}

// RawProgram is the store output shape for a program document (ES/DB raw).
type RawProgram struct {
	ID            string          `json:"id"`
	Title         string          `json:"title"`
	Description   *string         `json:"description"`
	Type          string          `json:"type"`
	Category      string          `json:"category"`
	Language      string          `json:"language"`
	CoverImageURL *string         `json:"coverImageUrl"`
	ExtraInfo     json.RawMessage `json:"extraInfo,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// RawEpisode is the store output shape for an episode document (ES/DB raw).
type RawEpisode struct {
	ID                string          `json:"id"`
	ProgramID         string          `json:"programId"`
	Title             string          `json:"title"`
	Description       *string         `json:"description"`
	DurationInSeconds int             `json:"durationInSeconds"`
	PublicationDate   *time.Time      `json:"publicationDate"`
	VideoURL          *string         `json:"videoUrl"`
	ThumbnailURL      *string         `json:"thumbnailUrl"`
	Status            string          `json:"status"`
	EpisodeNumber     int             `json:"episodeNumber"`
	SeasonNumber      *int            `json:"seasonNumber"`
	ExtraInfo         json.RawMessage `json:"extraInfo,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
}

// Hit is a single search hit (index name + raw source for multi-index search).
type Hit struct {
	Index  string          `json:"_index"`
	Source json.RawMessage `json:"_source"`
}

// Store is the port for persistence (service depends on this; store package implements it).
type Store interface {
	SearchMultiIndex(ctx context.Context, query, category, language string, from, size int) (hits []Hit, total int, err error)
}

// Cache is the port for caching (service depends on this; cache package implements it).
type Cache interface {
	Get(ctx context.Context, key string, dest any) error
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
}
