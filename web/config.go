package web

import (
	"encoding/json"
	"net/http"
)

type appConfigRequest struct {
	RomDirectory string `json:"romDirectory"`
}

func AppConfigHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(appConfigRequest{
				RomDirectory: profilesStore.GetRomDirectory(),
			})
		case http.MethodPut:
			var req appConfigRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid body", http.StatusBadRequest)
				return
			}
			if err := profilesStore.SetRomDirectory(req.RomDirectory); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if err := RebuildROMCache(req.RomDirectory); err != nil {
				http.Error(w, "directory saved but cache rebuild failed: "+err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}
