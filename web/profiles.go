package web

import (
	"encoding/json"
	"net/http"
	"nnb-portable/arcade_profiles"
	"path"
	"strings"
)

var profilesStore *arcade_profiles.Store

// InitializeProfilesStore creates or opens the profiles store at dir.
func InitializeProfilesStore(dir string) error {
	s, err := arcade_profiles.NewStore(dir)
	if err != nil {
		return err
	}
	profilesStore = s
	return nil
}

// ProfilesHandler handles /api/profiles for GET (list) and POST (create).
func ProfilesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if profilesStore == nil {
			http.Error(w, "profiles store not initialized", http.StatusInternalServerError)
			return
		}
		switch r.Method {
		case http.MethodGet:
			list := profilesStore.GetProfiles()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(list)
			return
		case http.MethodPost:
			var p arcade_profiles.Profile
			if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			id, err := profilesStore.AddProfile(p)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"id": id})
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}
}

// ProfileHandler handles /api/profiles/{id} for GET, PUT, DELETE.
func ProfileHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if profilesStore == nil {
			http.Error(w, "profiles store not initialized", http.StatusInternalServerError)
			return
		}
		// extract id from path
		id := strings.TrimPrefix(r.URL.Path, "/api/profiles/")
		id = path.Clean("/" + id)
		if id == "/" || id == "" {
			http.Error(w, "missing profile id", http.StatusBadRequest)
			return
		}
		id = strings.TrimPrefix(id, "/")

		switch r.Method {
		case http.MethodGet:
			// return the single profile
			for _, p := range profilesStore.GetProfiles() {
				if p.ID == id {
					w.Header().Set("Content-Type", "application/json")
					json.NewEncoder(w).Encode(p)
					return
				}
			}
			http.Error(w, "profile not found", http.StatusNotFound)
			return
		case http.MethodPut:
			var upd arcade_profiles.Profile
			if err := json.NewDecoder(r.Body).Decode(&upd); err != nil {
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			if err := profilesStore.UpdateProfile(id, upd); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusOK)
			return
		case http.MethodDelete:
			if err := profilesStore.DeleteProfile(id); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusOK)
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}
}

// ProfilesSelectedHandler handles getting/setting the selected profile.
func ProfilesSelectedHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if profilesStore == nil {
			http.Error(w, "profiles store not initialized", http.StatusInternalServerError)
			return
		}
		switch r.Method {
		case http.MethodGet:
			sel := profilesStore.GetSelected()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(sel)
			return
		case http.MethodPost:
			var req struct {
				ID string `json:"id"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			if err := profilesStore.SetSelected(req.ID); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusOK)
			return
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	}
}

// GetBoardConfigForFiltering returns the board config (used by ROM filtering).
func GetBoardConfigForFiltering() arcade_profiles.BoardConfig {
	if profilesStore == nil {
		return arcade_profiles.BoardConfig{}
	}
	return profilesStore.GetBoardConfig()
}

// BoardConfigHandler returns the board configuration reference data.
func BoardConfigHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if profilesStore == nil {
			http.Error(w, "profiles store not initialized", http.StatusInternalServerError)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		cfg := profilesStore.GetBoardConfig()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cfg)
	}
}
