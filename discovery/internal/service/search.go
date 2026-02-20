package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"discovery/internal/model"
	"discovery/internal/port"
)

const (
	searchCacheTTL = 2 * time.Minute
	indexPrograms  = "programs"
)

type SearchService struct {
	store port.Store
	cache port.Cache
}

func New(store port.Store, cache port.Cache) *SearchService {
	return &SearchService{store: store, cache: cache}
}

// Search implements port.Searcher.
func (s *SearchService) Search(ctx context.Context, query, category, language string, page, limit int) (*model.SearchResult, error) {
	key := fmt.Sprintf("search|%s|%s|%s|%d|%d", query, category, language, page, limit)
	var result model.SearchResult
	if err := s.cache.Get(ctx, key, &result); err == nil {
		return &result, nil
	}
	from := (page - 1) * limit
	hits, total, err := s.store.SearchMultiIndex(ctx, query, category, language, from, limit)
	if err != nil {
		return nil, err
	}
	items := make([]model.SearchItem, 0, len(hits))
	for _, h := range hits {
		item, err := hitToSearchItem(h)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	result = model.SearchResult{Items: items, Total: total, Page: page, Limit: limit}
	_ = s.cache.Set(ctx, key, &result, searchCacheTTL)
	return &result, nil
}

func hitToSearchItem(h port.Hit) (model.SearchItem, error) {
	var item model.SearchItem
	if h.Index == indexPrograms {
		var p port.RawProgram
		if err := json.Unmarshal(h.Source, &p); err != nil {
			return item, err
		}
		item.Type = "program"
		item.ID = p.ID
		item.Title = p.Title
		item.Description = p.Description
		item.ProgramType = &p.Type
		item.Category = &p.Category
		item.Language = &p.Language
		item.CoverImage = p.CoverImageURL
		item.ExtraInfo = p.ExtraInfo
		return item, nil
	}
	var e port.RawEpisode
	if err := json.Unmarshal(h.Source, &e); err != nil {
		return item, err
	}
	item.Type = "episode"
	item.ID = e.ID
	item.Title = e.Title
	item.Description = e.Description
	item.ProgramID = &e.ProgramID
	item.ThumbnailURL = e.ThumbnailURL
	item.VideoURL = e.VideoURL
	item.DurationSeconds = &e.DurationInSeconds
	item.EpisodeNumber = &e.EpisodeNumber
	item.SeasonNumber = e.SeasonNumber
	item.PublicationDate = e.PublicationDate
	item.ExtraInfo = e.ExtraInfo
	return item, nil
}
