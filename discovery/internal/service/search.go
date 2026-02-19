package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"discovery/internal/model"
	"discovery/internal/port"

	"golang.org/x/sync/errgroup"
)

const (
	searchCacheTTL = 2 * time.Minute
	detailCacheTTL = 3 * time.Minute
	defaultEpSize  = 20
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
	item.DurationSeconds = &e.DurationInSeconds
	item.EpisodeNumber = &e.EpisodeNumber
	item.SeasonNumber = e.SeasonNumber
	item.PublicationDate = e.PublicationDate
	return item, nil
}

// GetProgram implements port.Searcher.
func (s *SearchService) GetProgram(ctx context.Context, id string, episodePage, episodeSize int) (*model.ProgramDetail, error) {
	key := fmt.Sprintf("program|%s", id)
	var detail model.ProgramDetail
	if err := s.cache.Get(ctx, key, &detail); err == nil {
		return &detail, nil
	}
	if episodeSize <= 0 {
		episodeSize = defaultEpSize
	}
	if episodePage <= 0 {
		episodePage = 1
	}
	from := (episodePage - 1) * episodeSize

	var rawProgram *port.RawProgram
	var episodes []port.RawEpisode
	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		p, err := s.store.GetProgram(gctx, id)
		if err != nil {
			return err
		}
		rawProgram = p
		return nil
	})
	g.Go(func() error {
		eps, err := s.store.GetEpisodesByProgramID(gctx, id, episodeSize, from)
		if err != nil {
			return err
		}
		episodes = eps
		return nil
	})
	if err := g.Wait(); err != nil {
		if errors.Is(err, port.ErrNotFound) {
			return nil, port.ErrNotFound
		}
		return nil, err
	}

	detail = model.ProgramDetail{
		ID:         rawProgram.ID,
		Title:      rawProgram.Title,
		Description: rawProgram.Description,
		Type:       model.ProgramType(rawProgram.Type),
		Category:   rawProgram.Category,
		Language:   rawProgram.Language,
		CoverImage: rawProgram.CoverImageURL,
		ExtraInfo:  rawProgram.ExtraInfo,
		Episodes:   make([]model.EpisodeSummary, 0, len(episodes)),
	}
	for _, e := range episodes {
		detail.Episodes = append(detail.Episodes, model.EpisodeSummary{
			ID:              e.ID,
			Title:           e.Title,
			ThumbnailURL:    e.ThumbnailURL,
			VideoURL:        e.VideoURL,
			DurationSeconds: &e.DurationInSeconds,
			EpisodeNumber:   &e.EpisodeNumber,
			SeasonNumber:    e.SeasonNumber,
			PublicationDate: e.PublicationDate,
		})
	}
	_ = s.cache.Set(ctx, key, &detail, detailCacheTTL)
	return &detail, nil
}

// GetEpisode implements port.Searcher.
func (s *SearchService) GetEpisode(ctx context.Context, id string) (*model.EpisodeDetail, error) {
	key := fmt.Sprintf("episode|%s", id)
	var detail model.EpisodeDetail
	if err := s.cache.Get(ctx, key, &detail); err == nil {
		return &detail, nil
	}

	rawEpisode, err := s.store.GetEpisode(ctx, id)
	if err != nil {
		if errors.Is(err, port.ErrNotFound) {
			return nil, port.ErrNotFound
		}
		return nil, err
	}

	rawProgram, _ := s.store.GetProgram(ctx, rawEpisode.ProgramID)

	detail = model.EpisodeDetail{
		ID:              rawEpisode.ID,
		Title:           rawEpisode.Title,
		Description:     rawEpisode.Description,
		VideoURL:        rawEpisode.VideoURL,
		ThumbnailURL:    rawEpisode.ThumbnailURL,
		DurationSeconds: &rawEpisode.DurationInSeconds,
		EpisodeNumber:   &rawEpisode.EpisodeNumber,
		SeasonNumber:    rawEpisode.SeasonNumber,
		PublicationDate: rawEpisode.PublicationDate,
		ExtraInfo:       rawEpisode.ExtraInfo,
		Program:         model.ProgramSummary{},
	}
	if rawProgram != nil {
		detail.Program = model.ProgramSummary{
			ID:         rawProgram.ID,
			Title:      rawProgram.Title,
			CoverImage: rawProgram.CoverImageURL,
		}
	}
	_ = s.cache.Set(ctx, key, &detail, detailCacheTTL)
	return &detail, nil
}
