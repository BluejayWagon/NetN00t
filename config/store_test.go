package config

import (
	"os"
	"path/filepath"
	"testing"
)

// newTestStore creates a temporary Store backed by the embedded board config.
func newTestStore(t *testing.T) *Store {
	t.Helper()
	tmp := t.TempDir()
	s, err := NewStore(tmp)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}
	return s
}

func TestNewStore_EmptyDirRequired(t *testing.T) {
	_, err := NewStore("")
	if err == nil {
		t.Error("expected error for empty dir string")
	}
}

func TestNewStore_SucceedsWithoutBoardConfigFile(t *testing.T) {
	tmp := t.TempDir()
	// No boardConfig.json on disk — NewStore should succeed using embedded data
	_, err := NewStore(tmp)
	if err != nil {
		t.Errorf("expected NewStore to succeed with embedded board config, got: %v", err)
	}
}

func TestNewStore_StartsEmpty(t *testing.T) {
	s := newTestStore(t)
	profiles := s.GetProfiles()
	if len(profiles) != 0 {
		t.Errorf("expected 0 profiles on fresh store, got %d", len(profiles))
	}
}

func TestNewStore_CreatesAppJson(t *testing.T) {
	tmp := t.TempDir()

	_, err := NewStore(tmp)
	if err != nil {
		t.Fatalf("NewStore failed: %v", err)
	}

	if _, err := os.Stat(filepath.Join(tmp, "app.json")); os.IsNotExist(err) {
		t.Error("expected app.json to be created on first run")
	}
}

func TestAddProfile(t *testing.T) {
	s := newTestStore(t)

	id, err := s.AddProfile(Profile{
		Name:               "Test Cabinet",
		BoardType:          "Naomi 1",
		MonitorOrientation: "Horizontal/Yoko",
		IP:                 "192.168.1.100",
	})

	if err != nil {
		t.Fatalf("AddProfile failed: %v", err)
	}
	if id == "" {
		t.Error("expected non-empty ID from AddProfile")
	}

	profiles := s.GetProfiles()
	if len(profiles) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(profiles))
	}
	if profiles[0].Name != "Test Cabinet" {
		t.Errorf("expected 'Test Cabinet', got '%s'", profiles[0].Name)
	}
	if profiles[0].ID != id {
		t.Errorf("returned ID does not match stored profile ID")
	}
}

func TestAddProfile_GeneratesUniqueIDs(t *testing.T) {
	s := newTestStore(t)

	id1, _ := s.AddProfile(Profile{Name: "Cabinet A", BoardType: "Naomi 1", IP: "192.168.1.1"})
	id2, _ := s.AddProfile(Profile{Name: "Cabinet B", BoardType: "Naomi 2", IP: "192.168.1.2"})

	if id1 == id2 {
		t.Error("expected unique IDs for different profiles")
	}
}

func TestAddProfile_DuplicateName(t *testing.T) {
	s := newTestStore(t)

	_, err := s.AddProfile(Profile{Name: "Cabinet A", BoardType: "Naomi 1", IP: "192.168.1.1"})
	if err != nil {
		t.Fatal(err)
	}

	_, err = s.AddProfile(Profile{Name: "Cabinet A", BoardType: "Naomi 2", IP: "192.168.1.2"})
	if err == nil {
		t.Error("expected error for duplicate profile name")
	}
}

func TestUpdateProfile(t *testing.T) {
	s := newTestStore(t)

	id, _ := s.AddProfile(Profile{Name: "Original", BoardType: "Naomi 1", IP: "192.168.1.1"})

	err := s.UpdateProfile(id, Profile{
		Name:      "Updated",
		BoardType: "Naomi 2",
		IP:        "10.0.0.1",
	})
	if err != nil {
		t.Fatalf("UpdateProfile failed: %v", err)
	}

	profiles := s.GetProfiles()
	if profiles[0].Name != "Updated" {
		t.Errorf("expected 'Updated', got '%s'", profiles[0].Name)
	}
	if profiles[0].IP != "10.0.0.1" {
		t.Errorf("expected '10.0.0.1', got '%s'", profiles[0].IP)
	}
	if profiles[0].ID != id {
		t.Error("ID should not change on update")
	}
}

func TestUpdateProfile_NotFound(t *testing.T) {
	s := newTestStore(t)

	err := s.UpdateProfile("nonexistent-id", Profile{Name: "X"})
	if err == nil {
		t.Error("expected error for non-existent profile ID")
	}
}

func TestUpdateProfile_DuplicateName(t *testing.T) {
	s := newTestStore(t)

	_, _ = s.AddProfile(Profile{Name: "Cabinet A", BoardType: "Naomi 1", IP: "192.168.1.1"})
	id2, _ := s.AddProfile(Profile{Name: "Cabinet B", BoardType: "Naomi 2", IP: "192.168.1.2"})

	// Try to rename Cabinet B to Cabinet A — should fail
	err := s.UpdateProfile(id2, Profile{Name: "Cabinet A", BoardType: "Naomi 2", IP: "192.168.1.2"})
	if err == nil {
		t.Error("expected error when updating to a duplicate name")
	}
}

func TestDeleteProfile(t *testing.T) {
	s := newTestStore(t)

	id, _ := s.AddProfile(Profile{Name: "To Delete", BoardType: "Naomi 1", IP: "192.168.1.1"})

	err := s.DeleteProfile(id)
	if err != nil {
		t.Fatalf("DeleteProfile failed: %v", err)
	}

	profiles := s.GetProfiles()
	if len(profiles) != 0 {
		t.Errorf("expected 0 profiles after delete, got %d", len(profiles))
	}
}

func TestDeleteProfile_NotFound(t *testing.T) {
	s := newTestStore(t)

	err := s.DeleteProfile("nonexistent-id")
	if err == nil {
		t.Error("expected error for non-existent profile ID")
	}
}

func TestDeleteProfile_ClearsSelection(t *testing.T) {
	s := newTestStore(t)

	id, _ := s.AddProfile(Profile{Name: "Cabinet", BoardType: "Naomi 1", IP: "192.168.1.1"})
	_ = s.SetSelected(id)

	_ = s.DeleteProfile(id)

	if sel := s.GetSelected(); sel != nil {
		t.Error("expected selection to be cleared after deleting selected profile")
	}
}

func TestSetSelected_AndGetSelected(t *testing.T) {
	s := newTestStore(t)

	id, _ := s.AddProfile(Profile{Name: "Cabinet", BoardType: "Naomi 1", IP: "192.168.1.1"})

	if err := s.SetSelected(id); err != nil {
		t.Fatalf("SetSelected failed: %v", err)
	}

	sel := s.GetSelected()
	if sel == nil {
		t.Fatal("expected selected profile, got nil")
	}
	if sel.ID != id {
		t.Errorf("expected selected ID '%s', got '%s'", id, sel.ID)
	}
}

func TestSetSelected_InvalidID(t *testing.T) {
	s := newTestStore(t)

	err := s.SetSelected("bad-id")
	if err == nil {
		t.Error("expected error for non-existent profile ID")
	}
}

func TestSetSelected_EmptyIDClears(t *testing.T) {
	s := newTestStore(t)

	id, _ := s.AddProfile(Profile{Name: "Cabinet", BoardType: "Naomi 1", IP: "192.168.1.1"})
	_ = s.SetSelected(id)

	// Setting empty ID should clear selection
	if err := s.SetSelected(""); err != nil {
		t.Fatalf("SetSelected(\"\") failed: %v", err)
	}
	if sel := s.GetSelected(); sel != nil {
		t.Error("expected nil after clearing selection")
	}
}

func TestGetSelected_NoneSelected(t *testing.T) {
	s := newTestStore(t)

	sel := s.GetSelected()
	if sel != nil {
		t.Error("expected nil when no profile selected")
	}
}

func TestGetBoardConfig(t *testing.T) {
	s := newTestStore(t)

	cfg := s.GetBoardConfig()
	if len(cfg.BoardTypes) == 0 {
		t.Error("expected non-empty board types from config")
	}
	if len(cfg.MonitorOrientations) == 0 {
		t.Error("expected non-empty monitor orientations from config")
	}
}

func TestGetProfiles_ReturnsCopy(t *testing.T) {
	s := newTestStore(t)
	s.AddProfile(Profile{Name: "Cabinet", BoardType: "Naomi 1", IP: "192.168.1.1"})

	p1 := s.GetProfiles()
	p1[0].Name = "Mutated"

	p2 := s.GetProfiles()
	if p2[0].Name == "Mutated" {
		t.Error("GetProfiles should return a copy, not a reference to internal state")
	}
}

func TestStore_PersistsAcrossReopen(t *testing.T) {
	tmp := t.TempDir()

	s1, _ := NewStore(tmp)
	id, _ := s1.AddProfile(Profile{Name: "Persistent", BoardType: "Naomi 1", IP: "192.168.1.1"})
	_ = s1.SetSelected(id)

	// Open a second store on the same directory
	s2, err := NewStore(tmp)
	if err != nil {
		t.Fatalf("failed to reopen store: %v", err)
	}

	profiles := s2.GetProfiles()
	if len(profiles) != 1 {
		t.Fatalf("expected 1 persisted profile, got %d", len(profiles))
	}
	if profiles[0].Name != "Persistent" {
		t.Errorf("expected 'Persistent', got '%s'", profiles[0].Name)
	}
	if sel := s2.GetSelected(); sel == nil || sel.ID != id {
		t.Error("expected selected profile to persist across reopen")
	}
}

func TestGetRomDirectory_DefaultEmpty(t *testing.T) {
	s := newTestStore(t)
	if dir := s.GetRomDirectory(); dir != "" {
		t.Errorf("expected empty ROM directory on fresh store, got %q", dir)
	}
}

func TestSetRomDirectory_PersistsAcrossReopen(t *testing.T) {
	tmp := t.TempDir()

	s1, _ := NewStore(tmp)
	if err := s1.SetRomDirectory("/roms/naomi"); err != nil {
		t.Fatalf("SetRomDirectory failed: %v", err)
	}

	s2, err := NewStore(tmp)
	if err != nil {
		t.Fatalf("failed to reopen store: %v", err)
	}
	if dir := s2.GetRomDirectory(); dir != "/roms/naomi" {
		t.Errorf("expected '/roms/naomi', got %q", dir)
	}
}
