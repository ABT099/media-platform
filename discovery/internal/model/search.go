package model

import (
	"encoding/json"
	"time"
)

// SearchItem is a single item in the unified search results (program or episode) with full data.
type SearchItem struct {
	Type        string  `json:"type"` // "program" or "episode"
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`

	// program-only
	ProgramType *string `json:"programType,omitempty"`
	Category    *string `json:"category,omitempty"`
	Language    *string `json:"language,omitempty"`
	CoverImage  *string `json:"coverImageUrl,omitempty"`

	// episode-only
	ProgramID       *string    `json:"programId,omitempty"`
	ThumbnailURL    *string    `json:"thumbnailUrl,omitempty"`
	VideoURL        *string    `json:"videoUrl,omitempty"`
	DurationSeconds *int       `json:"durationInSeconds,omitempty"`
	EpisodeNumber   *int       `json:"episodeNumber,omitempty"`
	SeasonNumber    *int       `json:"seasonNumber,omitempty"`
	PublicationDate *time.Time `json:"publicationDate,omitempty"`

	// shared
	ExtraInfo json.RawMessage `json:"extraInfo,omitempty"`
}

// SearchResult is the response for GET /search.
type SearchResult struct {
	Items []SearchItem `json:"items"`
	Total int          `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}
