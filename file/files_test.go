package files

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTransformFilesToRomDetails_MatchesOnFileName(t *testing.T) {
	filelist := []FileDetails{
		{FileName: "game1.bin", Name: "game1", FullPath: "/roms/game1.bin"},
		{FileName: "game2.bin", Name: "game2", FullPath: "/roms/game2.bin"},
		{FileName: "unknown.bin", Name: "unknown", FullPath: "/roms/unknown.bin"},
	}
	romDetails := []RomDetails{
		{Name: "Game 1", FileName: "game1.bin", PictureName: "game1.png", BoardType: "Naomi 1"},
		{Name: "Game 2", FileName: "game2.bin", PictureName: "game2.png", BoardType: "Naomi 2"},
	}

	result := TransformFilesToRomDetails(filelist, romDetails)

	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}
}

func TestTransformFilesToRomDetails_PopulatesAllFields(t *testing.T) {
	filelist := []FileDetails{
		{FileName: "game1.bin", Name: "game1", FullPath: "/roms/game1.bin"},
	}
	romDetails := []RomDetails{
		{
			Name:        "Game 1",
			FileName:    "game1.bin",
			PictureName: "game1.png",
			BoardType:   "Naomi 1",
			Genre:       "Fighting",
			Tate:        true,
			Description: "A great game",
		},
	}

	result := TransformFilesToRomDetails(filelist, romDetails)

	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	r := result[0]
	if r.FullPath != "/roms/game1.bin" {
		t.Errorf("FullPath: expected '/roms/game1.bin', got '%s'", r.FullPath)
	}
	if r.Name != "Game 1" {
		t.Errorf("Name: expected 'Game 1', got '%s'", r.Name)
	}
	if r.BoardType != "Naomi 1" {
		t.Errorf("BoardType: expected 'Naomi 1', got '%s'", r.BoardType)
	}
	if r.Genre != "Fighting" {
		t.Errorf("Genre: expected 'Fighting', got '%s'", r.Genre)
	}
	if !r.Tate {
		t.Error("expected Tate to be true")
	}
	if r.Description != "A great game" {
		t.Errorf("Description: expected 'A great game', got '%s'", r.Description)
	}
}

func TestTransformFilesToRomDetails_CaseInsensitiveMatch(t *testing.T) {
	filelist := []FileDetails{
		{FileName: "GAME.BIN", Name: "GAME", FullPath: "/roms/GAME.BIN"},
	}
	romDetails := []RomDetails{
		{Name: "My Game", FileName: "game.bin", PictureName: "game.png", BoardType: "Naomi 1"},
	}

	result := TransformFilesToRomDetails(filelist, romDetails)

	if len(result) != 1 {
		t.Fatalf("expected case-insensitive match to produce 1 result, got %d", len(result))
	}
}

func TestTransformFilesToRomDetails_NoMatch(t *testing.T) {
	filelist := []FileDetails{
		{FileName: "unknown.bin", Name: "unknown", FullPath: "/roms/unknown.bin"},
	}
	romDetails := []RomDetails{
		{Name: "Game 1", FileName: "game1.bin", PictureName: "game1.png", BoardType: "Naomi 1"},
	}

	result := TransformFilesToRomDetails(filelist, romDetails)

	if len(result) != 0 {
		t.Errorf("expected 0 results for unmatched file, got %d", len(result))
	}
}

func TestTransformFilesToRomDetails_EmptyInputs(t *testing.T) {
	result := TransformFilesToRomDetails([]FileDetails{}, []RomDetails{})
	if len(result) != 0 {
		t.Errorf("expected empty result, got %d items", len(result))
	}
}

func TestGatherBinFilesRecursive_FindsBinFiles(t *testing.T) {
	tmp := t.TempDir()

	for _, name := range []string{"game1.bin", "game2.bin", "readme.txt"} {
		if err := os.WriteFile(filepath.Join(tmp, name), []byte("data"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	var filelist []FileDetails
	if err := GatherBinFilesRecursive(tmp, &filelist); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(filelist) != 2 {
		t.Errorf("expected 2 .bin files, got %d", len(filelist))
	}
	for _, f := range filelist {
		if !strings.HasSuffix(f.FileName, ".bin") {
			t.Errorf("non-.bin file included: %s", f.FileName)
		}
	}
}

func TestGatherBinFilesRecursive_Recurses(t *testing.T) {
	tmp := t.TempDir()
	subdir := filepath.Join(tmp, "sub")
	if err := os.MkdirAll(subdir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmp, "root.bin"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(subdir, "nested.bin"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	var filelist []FileDetails
	if err := GatherBinFilesRecursive(tmp, &filelist); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(filelist) != 2 {
		t.Errorf("expected 2 files (root + nested), got %d", len(filelist))
	}
}

func TestGatherBinFilesRecursive_EmptyDir(t *testing.T) {
	tmp := t.TempDir()

	var filelist []FileDetails
	if err := GatherBinFilesRecursive(tmp, &filelist); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(filelist) != 0 {
		t.Errorf("expected 0 files in empty dir, got %d", len(filelist))
	}
}

func TestGatherBinFilesRecursive_InvalidDir(t *testing.T) {
	var filelist []FileDetails
	err := GatherBinFilesRecursive("/nonexistent/path/xyz123", &filelist)
	if err == nil {
		t.Error("expected error for nonexistent directory")
	}
}

func TestGatherBinFilesRecursive_SetsFullPath(t *testing.T) {
	tmp := t.TempDir()
	if err := os.WriteFile(filepath.Join(tmp, "game.bin"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	var filelist []FileDetails
	if err := GatherBinFilesRecursive(tmp, &filelist); err != nil {
		t.Fatal(err)
	}

	if len(filelist) != 1 {
		t.Fatalf("expected 1 file, got %d", len(filelist))
	}
	if filelist[0].FileName != "game.bin" {
		t.Errorf("expected FileName 'game.bin', got '%s'", filelist[0].FileName)
	}
	if filelist[0].FullPath == "" {
		t.Error("expected non-empty FullPath")
	}
}
