package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	files "nnb-portable/file"
)

// setupTestCache seeds the package-level romIndexCache for use in tests.
func setupTestCache(roms []files.FullRomDetails) {
	romIndexCache = make(map[string]files.FullRomDetails)
	for _, rom := range roms {
		romIndexCache[strings.ToLower(rom.FileName)] = rom
	}
}

// --- boardCompatible ---

func TestBoardCompatible(t *testing.T) {
	tests := []struct {
		name         string
		profileBoard string
		romBoard     string
		want         bool
	}{
		{"both empty", "", "", true},
		{"empty profile board", "", "Naomi 1", true},
		{"empty rom board", "Naomi 1", "", true},
		{"exact match naomi1", "Naomi 1", "Naomi 1", true},
		{"exact match naomi2", "Naomi 2", "Naomi 2", true},
		{"naomi2 plays naomi1", "Naomi 2", "Naomi 1", true},
		{"naomi1 cannot play naomi2", "Naomi 1", "Naomi 2", false},
		{"naomi1 plays atomswave", "Naomi 1", "Atomswave", true},
		{"naomi2 plays atomswave", "Naomi 2", "Atomswave", true},
		{"triforce cannot play naomi1", "Triforce", "Naomi 1", false},
		{"triforce exact match", "Triforce", "Triforce", true},
		{"chihiro vs naomi1 incompatible", "Chihiro", "Naomi 1", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := boardCompatible(tt.profileBoard, tt.romBoard)
			if got != tt.want {
				t.Errorf("boardCompatible(%q, %q) = %v, want %v",
					tt.profileBoard, tt.romBoard, got, tt.want)
			}
		})
	}
}

// --- monitorCompatible ---

func TestMonitorCompatible(t *testing.T) {
	hRom := files.FullRomDetails{Tate: false}
	vRom := files.FullRomDetails{Tate: true}

	tests := []struct {
		name        string
		orientation string
		rom         files.FullRomDetails
		want        bool
	}{
		{"empty orientation, horizontal rom", "", hRom, true},
		{"empty orientation, vertical rom", "", vRom, true},
		{"horizontal profile, horizontal rom", "Horizontal/Yoko", hRom, true},
		{"horizontal profile, vertical rom", "Horizontal/Yoko", vRom, false},
		{"vertical profile, vertical rom", "Vertical/TATE", vRom, true},
		{"vertical profile, horizontal rom", "Vertical/TATE", hRom, false},
		{"tate keyword matches vertical", "TATE", vRom, true},
		{"vertical keyword matches vertical", "Vertical", vRom, true},
		{"vertical keyword rejects horizontal", "Vertical", hRom, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := monitorCompatible(tt.orientation, tt.rom)
			if got != tt.want {
				t.Errorf("monitorCompatible(%q, tate=%v) = %v, want %v",
					tt.orientation, tt.rom.Tate, got, tt.want)
			}
		})
	}
}

// --- GetCachedSummaries ---

func TestGetCachedSummaries_ReturnsAll(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "Game A", FileName: "a.bin", PictureName: "a.png", BoardType: "Naomi 1"},
		{Name: "Game B", FileName: "b.bin", PictureName: "b.png", BoardType: "Naomi 2"},
	})

	summaries := GetCachedSummaries("", "")
	if len(summaries) != 2 {
		t.Errorf("expected 2 summaries, got %d", len(summaries))
	}
}

func TestGetCachedSummaries_SortedAlphabetically(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "Zebra", FileName: "z.bin", PictureName: "z.png", BoardType: "Naomi 1"},
		{Name: "Alpha", FileName: "a.bin", PictureName: "a.png", BoardType: "Naomi 1"},
		{Name: "Mango", FileName: "m.bin", PictureName: "m.png", BoardType: "Naomi 1"},
	})

	summaries := GetCachedSummaries("", "")
	if len(summaries) != 3 {
		t.Fatalf("expected 3 summaries, got %d", len(summaries))
	}
	if summaries[0].Name != "Alpha" || summaries[1].Name != "Mango" || summaries[2].Name != "Zebra" {
		t.Errorf("summaries not sorted: %v", []string{summaries[0].Name, summaries[1].Name, summaries[2].Name})
	}
}

func TestGetCachedSummaries_ImageUrlFormatted(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "Game", FileName: "g.bin", PictureName: "game.png", BoardType: "Naomi 1"},
	})

	summaries := GetCachedSummaries("", "")
	if len(summaries) != 1 {
		t.Fatalf("expected 1 summary")
	}
	if summaries[0].ImageUrl != "/images/game.png" {
		t.Errorf("expected ImageUrl '/images/game.png', got '%s'", summaries[0].ImageUrl)
	}
}

func TestGetCachedSummaries_FilterByBoardType_Naomi2PlaysNaomi1(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "N1 Game", FileName: "n1.bin", PictureName: "n1.png", BoardType: "Naomi 1"},
		{Name: "N2 Game", FileName: "n2.bin", PictureName: "n2.png", BoardType: "Naomi 2"},
		{Name: "TF Game", FileName: "tf.bin", PictureName: "tf.png", BoardType: "Triforce"},
	})

	// Naomi 2 profile should see Naomi 1 + Naomi 2 ROMs (not Triforce)
	summaries := GetCachedSummaries("Naomi 2", "")
	if len(summaries) != 2 {
		t.Errorf("Naomi 2 profile: expected 2 ROMs (Naomi1+Naomi2), got %d", len(summaries))
	}
}

func TestGetCachedSummaries_FilterByBoardType_Naomi1OnlyOwn(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "N1 Game", FileName: "n1.bin", PictureName: "n1.png", BoardType: "Naomi 1"},
		{Name: "N2 Game", FileName: "n2.bin", PictureName: "n2.png", BoardType: "Naomi 2"},
	})

	// Naomi 1 cannot play Naomi 2 ROMs
	summaries := GetCachedSummaries("Naomi 1", "")
	if len(summaries) != 1 {
		t.Errorf("Naomi 1 profile: expected 1 ROM, got %d", len(summaries))
	}
	if summaries[0].Name != "N1 Game" {
		t.Errorf("expected 'N1 Game', got '%s'", summaries[0].Name)
	}
}

func TestGetCachedSummaries_FilterByOrientation(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "H Game", FileName: "h.bin", PictureName: "h.png", Tate: false},
		{Name: "V Game", FileName: "v.bin", PictureName: "v.png", Tate: true},
	})

	hSummaries := GetCachedSummaries("", "Horizontal/Yoko")
	if len(hSummaries) != 1 || hSummaries[0].Name != "H Game" {
		t.Errorf("horizontal filter: expected 1 horizontal ROM, got %v", hSummaries)
	}

	vSummaries := GetCachedSummaries("", "Vertical/TATE")
	if len(vSummaries) != 1 || vSummaries[0].Name != "V Game" {
		t.Errorf("vertical filter: expected 1 vertical ROM, got %v", vSummaries)
	}
}

func TestGetCachedSummaries_EmptyCache(t *testing.T) {
	setupTestCache([]files.FullRomDetails{})
	summaries := GetCachedSummaries("", "")
	if len(summaries) != 0 {
		t.Errorf("expected 0 summaries from empty cache, got %d", len(summaries))
	}
}

// --- ListFilesHandler ---

func TestListFilesHandler_GetReturnsOK(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "Test ROM", FileName: "test.bin", PictureName: "test.png", BoardType: "Naomi 1"},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/listfiles", nil)
	w := httptest.NewRecorder()
	ListFilesHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var summaries []files.RomSummary
	if err := json.NewDecoder(w.Body).Decode(&summaries); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(summaries) != 1 {
		t.Errorf("expected 1 summary, got %d", len(summaries))
	}
}

func TestListFilesHandler_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/listfiles", nil)
	w := httptest.NewRecorder()
	ListFilesHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestListFilesHandler_FilterQueryParams(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "N1 Game", FileName: "n1.bin", PictureName: "n1.png", BoardType: "Naomi 1", Tate: false},
		{Name: "TF Game", FileName: "tf.bin", PictureName: "tf.png", BoardType: "Triforce", Tate: false},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/listfiles?boardType=Naomi+1", nil)
	w := httptest.NewRecorder()
	ListFilesHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var summaries []files.RomSummary
	json.NewDecoder(w.Body).Decode(&summaries)
	if len(summaries) != 1 {
		t.Errorf("expected 1 ROM for Naomi 1 filter, got %d", len(summaries))
	}
}

// --- RomDetailsHandler ---

func TestRomDetailsHandler_Found(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "My Game", FileName: "mygame.bin", PictureName: "mygame.png", BoardType: "Naomi 1", Genre: "Action"},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/rom?fileName=mygame.bin", nil)
	w := httptest.NewRecorder()
	RomDetailsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var rom files.FullRomDetails
	if err := json.NewDecoder(w.Body).Decode(&rom); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if rom.Name != "My Game" {
		t.Errorf("expected 'My Game', got '%s'", rom.Name)
	}
}

func TestRomDetailsHandler_CaseInsensitiveLookup(t *testing.T) {
	setupTestCache([]files.FullRomDetails{
		{Name: "My Game", FileName: "mygame.bin", PictureName: "mygame.png", BoardType: "Naomi 1"},
	})

	req := httptest.NewRequest(http.MethodGet, "/api/rom?fileName=MYGAME.BIN", nil)
	w := httptest.NewRecorder()
	RomDetailsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for case-insensitive lookup, got %d", w.Code)
	}
}

func TestRomDetailsHandler_NotFound(t *testing.T) {
	setupTestCache([]files.FullRomDetails{})

	req := httptest.NewRequest(http.MethodGet, "/api/rom?fileName=missing.bin", nil)
	w := httptest.NewRecorder()
	RomDetailsHandler(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestRomDetailsHandler_MissingFileNameParam(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/rom", nil)
	w := httptest.NewRecorder()
	RomDetailsHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestRomDetailsHandler_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/rom?fileName=test.bin", nil)
	w := httptest.NewRecorder()
	RomDetailsHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

// --- RebuildROMCache ---

func TestRebuildROMCache_EmptyDirectory(t *testing.T) {
	tmp := t.TempDir()
	// Empty dir should succeed with an empty cache (no bin files)
	err := RebuildROMCache(tmp)
	if err != nil {
		t.Errorf("expected no error for empty directory, got %v", err)
	}
	summaries := GetCachedSummaries("", "")
	if len(summaries) != 0 {
		t.Errorf("expected 0 summaries from empty directory, got %d", len(summaries))
	}
}
