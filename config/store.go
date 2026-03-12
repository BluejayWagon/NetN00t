package config

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

//go:embed boardConfig.json
var embeddedBoardConfig []byte

type AppConfig struct {
	RomDirectory string `json:"romDirectory"`
}

type Profile struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	BoardType          string `json:"boardType"`
	MonitorOrientation string `json:"monitorOrientation"`
	IP                 string `json:"ip"`
	Notes              string `json:"notes,omitempty"`
	Picture            string `json:"picture,omitempty"`
}

type profilesFile struct {
	Selected string    `json:"selected,omitempty"`
	Profiles []Profile `json:"profiles"`
}

type MonitorfOrientation struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type BoardConfig struct {
	BoardTypes          []string               `json:"boardTypes"`
	BoardInfo           map[string]interface{} `json:"boardInfo,omitempty"`
	MonitorOrientations []MonitorfOrientation  `json:"monitorOrientations"`
	DefaultPictures     map[string]string      `json:"defaultPictures,omitempty"`
}

type Store struct {
	mu           sync.RWMutex
	dir          string
	profiles     profilesFile
	boardConfig  BoardConfig
	appConfig    AppConfig
	profilesPath string
	appConfigPath string
}

// NewStore creates a new Store backed by files in dir. If files do not exist
// they are created with sensible defaults.
func NewStore(dir string) (*Store, error) {
	if dir == "" {
		return nil, errors.New("dir required")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	s := &Store{
		dir:           dir,
		profilesPath:  filepath.Join(dir, "profiles.json"),
		appConfigPath: filepath.Join(dir, "app.json"),
	}
	if err := s.loadBoardConfig(); err != nil {
		return nil, err
	}
	if err := s.loadProfiles(); err != nil {
		return nil, err
	}
	if err := s.loadAppConfig(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) loadBoardConfig() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	var cfg BoardConfig
	if err := json.Unmarshal(embeddedBoardConfig, &cfg); err != nil {
		return err
	}
	s.boardConfig = cfg
	return nil
}


func (s *Store) loadProfiles() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, err := os.ReadFile(s.profilesPath)
	if err != nil {
		if os.IsNotExist(err) {
			s.profiles = profilesFile{Profiles: []Profile{}}
			// create empty file
			return s.saveProfilesLocked()
		}
		return err
	}
	var pf profilesFile
	if err := json.Unmarshal(data, &pf); err != nil {
		return err
	}
	s.profiles = pf
	return nil
}

func (s *Store) saveProfilesLocked() error {
	data, err := json.MarshalIndent(s.profiles, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.profilesPath, data, 0o644)
}

func (s *Store) loadAppConfig() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, err := os.ReadFile(s.appConfigPath)
	if err != nil {
		if os.IsNotExist(err) {
			s.appConfig = AppConfig{}
			return s.saveAppConfigLocked()
		}
		return err
	}
	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return err
	}
	s.appConfig = cfg
	return nil
}

func (s *Store) saveAppConfigLocked() error {
	data, err := json.MarshalIndent(s.appConfig, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.appConfigPath, data, 0o644)
}

// GetRomDirectory returns the configured ROM directory path.
func (s *Store) GetRomDirectory() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.appConfig.RomDirectory
}

// SetRomDirectory persists a new ROM directory path.
func (s *Store) SetRomDirectory(path string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.appConfig.RomDirectory = path
	return s.saveAppConfigLocked()
}

// GetBoardConfig returns a copy of the board/reference configuration.
func (s *Store) GetBoardConfig() BoardConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.boardConfig
}

// GetProfiles returns a slice of all profiles (copy).
func (s *Store) GetProfiles() []Profile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Profile, len(s.profiles.Profiles))
	copy(out, s.profiles.Profiles)
	return out
}

// GetSelected returns the selected profile or nil.
func (s *Store) GetSelected() *Profile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.profiles.Selected == "" {
		return nil
	}
	for _, p := range s.profiles.Profiles {
		if p.ID == s.profiles.Selected {
			cp := p
			return &cp
		}
	}
	return nil
}

// AddProfile adds a new profile. Returns the new profile ID or error if name
// duplicates.
func (s *Store) AddProfile(p Profile) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// prevent duplicate names
	for _, ex := range s.profiles.Profiles {
		if ex.Name == p.Name {
			return "", errors.New("profile name already exists")
		}
	}
	if p.ID == "" {
		p.ID = generateID()
	}
	s.profiles.Profiles = append(s.profiles.Profiles, p)
	if err := s.saveProfilesLocked(); err != nil {
		return "", err
	}
	return p.ID, nil
}

// UpdateProfile updates an existing profile by ID.
func (s *Store) UpdateProfile(id string, update Profile) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, p := range s.profiles.Profiles {
		if p.ID == id {
			// check duplicate name with other profiles
			for _, ex := range s.profiles.Profiles {
				if ex.ID != id && ex.Name == update.Name {
					return errors.New("profile name already exists")
				}
			}
			update.ID = id
			s.profiles.Profiles[i] = update
			return s.saveProfilesLocked()
		}
	}
	return errors.New("profile not found")
}

// DeleteProfile removes a profile by ID.
func (s *Store) DeleteProfile(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i, p := range s.profiles.Profiles {
		if p.ID == id {
			idx = i
			break
		}
	}
	if idx == -1 {
		return errors.New("profile not found")
	}
	s.profiles.Profiles = append(s.profiles.Profiles[:idx], s.profiles.Profiles[idx+1:]...)
	if s.profiles.Selected == id {
		s.profiles.Selected = ""
	}
	return s.saveProfilesLocked()
}

// SetSelected sets the active profile by ID.
func (s *Store) SetSelected(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if id != "" {
		found := false
		for _, p := range s.profiles.Profiles {
			if p.ID == id {
				found = true
				break
			}
		}
		if !found {
			return errors.New("profile not found")
		}
	}
	s.profiles.Selected = id
	return s.saveProfilesLocked()
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
