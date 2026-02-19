package store

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"discovery/internal/port"

	"github.com/elastic/go-elasticsearch/v9"
)

const (
	indexPrograms = "programs"
	indexEpisodes = "episodes"
)

type ESStore struct {
	client *elasticsearch.Client
}

func NewESStore(elasticNode string) (*ESStore, error) {
	cfg := elasticsearch.Config{Addresses: []string{elasticNode}}
	client, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, err
	}
	return &ESStore{client: client}, nil
}

// SearchMultiIndex runs a multi-index search and returns hits and total count.
func (s *ESStore) SearchMultiIndex(ctx context.Context, query, category, language string, from, size int) ([]port.Hit, int, error) {
	must := []interface{}{}
	if query != "" {
		must = append(must, map[string]interface{}{
			"multi_match": map[string]interface{}{
				"query":  query,
				"fields": []string{"title^2", "description"},
				"type":   "best_fields",
			},
		})
	} else {
		must = append(must, map[string]interface{}{"match_all": map[string]interface{}{}})
	}
	filter := []interface{}{}
	if category != "" {
		filter = append(filter, map[string]interface{}{"term": map[string]interface{}{"category": category}})
	}
	if language != "" {
		filter = append(filter, map[string]interface{}{"term": map[string]interface{}{"language": language}})
	}
	searchQuery := map[string]interface{}{
		"query": map[string]interface{}{"bool": map[string]interface{}{"must": must, "filter": filter}},
		"from": from,
		"size": size,
	}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(searchQuery); err != nil {
		return nil, 0, err
	}
	res, err := s.client.Search(
		s.client.Search.WithContext(ctx),
		s.client.Search.WithIndex(indexPrograms+","+indexEpisodes),
		s.client.Search.WithBody(&buf),
	)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.IsError() {
		if res.StatusCode == 404 {
			return []port.Hit{}, 0, nil
		}
		return nil, 0, fmt.Errorf("elasticsearch error: %s", res.Status())
	}
	var searchResp struct {
		Hits struct {
			Total struct {
				Value int `json:"value"`
			} `json:"total"`
			Hits []struct {
				Index  string          `json:"_index"`
				Source json.RawMessage `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&searchResp); err != nil {
		return nil, 0, err
	}
	hits := make([]port.Hit, 0, len(searchResp.Hits.Hits))
	for _, h := range searchResp.Hits.Hits {
		hits = append(hits, port.Hit{Index: h.Index, Source: h.Source})
	}
	return hits, searchResp.Hits.Total.Value, nil
}

// GetProgram returns a program by ID or port.ErrNotFound.
func (s *ESStore) GetProgram(ctx context.Context, id string) (*port.RawProgram, error) {
	res, err := s.client.Get(indexPrograms, id, s.client.Get.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.IsError() {
		if res.StatusCode == 404 {
			return nil, port.ErrNotFound
		}
		return nil, fmt.Errorf("elasticsearch error: %s", res.Status())
	}
	var body struct {
		Source port.RawProgram `json:"_source"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.Source, nil
}

// GetEpisode returns an episode by ID or port.ErrNotFound.
func (s *ESStore) GetEpisode(ctx context.Context, id string) (*port.RawEpisode, error) {
	res, err := s.client.Get(indexEpisodes, id, s.client.Get.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.IsError() {
		if res.StatusCode == 404 {
			return nil, port.ErrNotFound
		}
		return nil, fmt.Errorf("elasticsearch error: %s", res.Status())
	}
	var body struct {
		Source port.RawEpisode `json:"_source"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.Source, nil
}

// GetEpisodesByProgramID returns episodes for a program with pagination (from, size).
func (s *ESStore) GetEpisodesByProgramID(ctx context.Context, programID string, size, from int) ([]port.RawEpisode, error) {
	epQuery := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{"programId": programID},
		},
		"from": from,
		"size": size,
		"sort": []map[string]interface{}{
			{"seasonNumber": "asc"},
			{"episodeNumber": "asc"},
		},
	}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(epQuery); err != nil {
		return nil, err
	}
	res, err := s.client.Search(
		s.client.Search.WithContext(ctx),
		s.client.Search.WithIndex(indexEpisodes),
		s.client.Search.WithBody(&buf),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.IsError() {
		if res.StatusCode == 404 {
			// Index doesn't exist - return empty results instead of error
			return []port.RawEpisode{}, nil
		}
		return nil, fmt.Errorf("elasticsearch error: %s", res.Status())
	}
	var epResp struct {
		Hits struct {
			Hits []struct {
				Source port.RawEpisode `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&epResp); err != nil {
		return nil, err
	}
	out := make([]port.RawEpisode, 0, len(epResp.Hits.Hits))
	for _, h := range epResp.Hits.Hits {
		out = append(out, h.Source)
	}
	return out, nil
}
