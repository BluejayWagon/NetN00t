package web

import (
	"encoding/json"
	"net/http"
	files "nnb-portable/file"
	"nnb-portable/naomi"
)

type UploadRequest struct {
	IP       string `json:"ip"`
	FileName string `json:"fileName"`
}

// UploadHandler handles the upload of a ROM file to the Naomi

func UploadHandler(w http.ResponseWriter, r *http.Request, Directory string) {
	var request UploadRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Gather files to validte that the file exists
	// We should convert this to a function in files.go that just returns rom details of all files
	var fileList []files.FileDetails
	err = files.GatherBinFilesRecursive(Directory, &fileList)
	if err != nil {
		http.Error(w, "Failed to gather files: "+err.Error(), http.StatusInternalServerError)
		return
	}

	romDetails, err := files.LoadRomDetailsFromEmbedded()
	if err != nil {
		http.Error(w, "Failed to load ROM details: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fullFileDetails := files.TransformFilesToRomDetails(fileList, romDetails)

	// Check if the requested file exists in the file list
	var matchedFile files.FullRomDetails
	found := false
	for _, file := range fullFileDetails {
		if file.Name == request.FileName {
			matchedFile = file
			found = true
			break
		}
	}

	if !found {
		http.Error(w, "File not found: "+request.FileName, http.StatusNotFound)
		return
	}

	err = naomi.ConnectAndUploadRomToNaomi(request.IP, matchedFile.FullPath)
	if err != nil {
		http.Error(w, "Failed to upload ROM: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ROM uploaded successfully"))
}

// ListFilesHandler lists all files in the specified directory

func ListFilesHandler(Directory string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var fileList []files.FileDetails
		err := files.GatherBinFilesRecursive(Directory, &fileList)
		if err != nil {
			http.Error(w, "Failed to gather files: "+err.Error(), http.StatusInternalServerError)
			return
		}

		FrontendResponses, err := files.TransformFilesToFrontendResponse(fileList)
		if err != nil {
			http.Error(w, "Failed to gather files: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(FrontendResponses)
	}
}
