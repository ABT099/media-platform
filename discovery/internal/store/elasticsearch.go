package store

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"discovery/internal/port"

	opensearch "github.com/opensearch-project/opensearch-go/v4"
	"github.com/opensearch-project/opensearch-go/v4/opensearchapi"
)

const (
	indexPrograms = "programs"
	indexEpisodes = "episodes"
)

type ESStore struct {
	client *opensearchapi.Client
}

func NewESStore(elasticNode string) (*ESStore, error) {
	cfg := opensearchapi.Config{
		Client: opensearch.Config{Addresses: []string{elasticNode}},
	}
	client, err := opensearchapi.NewClient(cfg)
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
		"from":  from,
		"size":  size,
	}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(searchQuery); err != nil {
		return nil, 0, err
	}
	resp, err := s.client.Search(ctx, &opensearchapi.SearchReq{
		Indices: []string{indexPrograms, indexEpisodes},
		Body:    &buf,
	})
	if err != nil {
		return nil, 0, err
	}
	if resp.Inspect().Response.IsError() {
		if resp.Inspect().Response.StatusCode == 404 {
			return []port.Hit{}, 0, nil
		}
		return nil, 0, fmt.Errorf("opensearch error: %s", resp.Inspect().Response.Status())
	}
	hits := make([]port.Hit, 0, len(resp.Hits.Hits))
	for _, h := range resp.Hits.Hits {
		hits = append(hits, port.Hit{Index: h.Index, Source: h.Source})
	}
	return hits, resp.Hits.Total.Value, nil
}
