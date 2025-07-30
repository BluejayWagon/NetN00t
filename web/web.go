package web

import (
	"encoding/json"
	"net/http"
	"nnb-portable/naomi"
)

type UploadRequest struct {
	IP       string `json:"ip"`
	Filepath string `json:"filepath"`
}

func UploadHandler(w http.ResponseWriter, r *http.Request) {
	var request UploadRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err = naomi.ConnectAndUploadRomToNaomi(request.IP, request.Filepath)
	if err != nil {
		http.Error(w, "Failed to upload ROM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ROM uploaded successfully"))
}
