package model

import (
	"encoding/json"
	"time"
)

// EpisodeDetail is the response for GET /episodes/:id (no internal fields).
type EpisodeDetail struct {
	ID              string          `json:"id"`
	Title           string          `json:"title"`
	Description     *string         `json:"description,omitempty"`
	VideoURL        *string         `json:"videoUrl,omitempty"`
	ThumbnailURL    *string         `json:"thumbnailUrl,omitempty"`
	DurationSeconds *int            `json:"durationInSeconds,omitempty"`
	EpisodeNumber   *int            `json:"episodeNumber,omitempty"`
	SeasonNumber    *int            `json:"seasonNumber,omitempty"`
	PublicationDate *time.Time      `json:"publicationDate,omitempty"`
	ExtraInfo       json.RawMessage `json:"extraInfo,omitempty"`
	Program         ProgramSummary  `json:"program"`
}
