package model

import (
	"encoding/json"
	"time"
)

type ProgramType string

const (
	ProgramTypePodcast     ProgramType = "podcast"
	ProgramTypeDocumentary ProgramType = "documentary"
	ProgramTypeSeries      ProgramType = "series"
)

// ProgramDetail is the response for GET /programs/:id (no internal fields).
type ProgramDetail struct {
	ID         string           `json:"id"`
	Title      string           `json:"title"`
	Description *string          `json:"description,omitempty"`
	Type       ProgramType      `json:"type"`
	Category   string           `json:"category"`
	Language   string           `json:"language"`
	CoverImage *string          `json:"coverImageUrl,omitempty"`
	ExtraInfo  json.RawMessage  `json:"extraInfo,omitempty" swaggertype:"object"`
	Episodes   []EpisodeSummary `json:"episodes"`
}

// EpisodeSummary is used in ProgramDetail (episode list on program page).
type EpisodeSummary struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	ThumbnailURL    *string    `json:"thumbnailUrl,omitempty"`
	VideoURL        *string    `json:"videoUrl,omitempty"`
	DurationSeconds *int       `json:"durationInSeconds,omitempty"`
	EpisodeNumber   *int       `json:"episodeNumber,omitempty"`
	SeasonNumber    *int       `json:"seasonNumber,omitempty"`
	PublicationDate *time.Time `json:"publicationDate,omitempty"`
}

// ProgramSummary is used in EpisodeDetail (parent program on episode page).
type ProgramSummary struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	CoverImage *string `json:"coverImageUrl,omitempty"`
}
