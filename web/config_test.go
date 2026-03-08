package web

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// initTestStore initializes a temporary profilesStore for config handler tests.
func initTestStore(t *testing.T) {
	t.Helper()
	tmp := t.TempDir()

	boardCfg := map[string]interface{}{
		"boardTypes":          []string{"Naomi 1"},
		"monitorOrientations": []map[string]string{{"name": "Horizontal/Yoko"}},
	}
	data, _ := json.Marshal(boardCfg)
	if err := os.WriteFile(filepath.Join(tmp, "boardConfig.json"), data, 0644); err != nil {
		t.Fatalf("failed to write boardConfig.json: %v", err)
	}
	if err := InitializeStore(tmp); err != nil {
		t.Fatalf("InitializeStore failed: %v", err)
	}
}

func TestAppConfigHandler_Get_ReturnsEmptyRomDirectory(t *testing.T) {
	initTestStore(t)

	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	w := httptest.NewRecorder()
	AppConfigHandler()(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp appConfigRequest
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.RomDirectory != "" {
		t.Errorf("expected empty romDirectory on fresh store, got %q", resp.RomDirectory)
	}
}

func TestAppConfigHandler_Put_SavesRomDirectory(t *testing.T) {
	initTestStore(t)
	// Use an empty temp dir as the ROM directory so RebuildROMCache succeeds.
	romTmp := t.TempDir()

	body, _ := json.Marshal(appConfigRequest{RomDirectory: romTmp})
	req := httptest.NewRequest(http.MethodPut, "/api/config", bytes.NewReader(body))
	w := httptest.NewRecorder()
	AppConfigHandler()(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if got := profilesStore.GetRomDirectory(); got != romTmp {
		t.Errorf("expected romDirectory %q, got %q", romTmp, got)
	}
}

func TestAppConfigHandler_Put_InvalidBody(t *testing.T) {
	initTestStore(t)

	req := httptest.NewRequest(http.MethodPut, "/api/config", bytes.NewReader([]byte("not json")))
	w := httptest.NewRecorder()
	AppConfigHandler()(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAppConfigHandler_MethodNotAllowed(t *testing.T) {
	initTestStore(t)

	req := httptest.NewRequest(http.MethodPost, "/api/config", nil)
	w := httptest.NewRecorder()
	AppConfigHandler()(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}
