package web

import (
	"encoding/json"
	"net/http"
	"nnb-portable/config"
	files "nnb-portable/file"
	"nnb-portable/naomi"
	"sort"
	"strings"
)

// BoardConfig is a type alias for the config BoardConfig
type BoardConfig = config.BoardConfig

// romIndexCache holds the indexed ROM details for fast lookups.
// It is initialized at startup and reused for all requests.
var (
	romIndexCache map[string]files.FullRomDetails // keyed by lowercased filename
)

// RebuildROMCache builds and replaces the ROM index from the given directory.
// Can be called at startup or when the ROM directory changes.
func RebuildROMCache(directory string) error {
	var fileList []files.FileDetails
	err := files.GatherBinFilesRecursive(directory, &fileList)
	if err != nil {
		return err
	}

	romDetails, err := files.LoadRomDetailsFromEmbedded()
	if err != nil {
		return err
	}

	fullFileDetails := files.TransformFilesToRomDetails(fileList, romDetails)
	newCache := make(map[string]files.FullRomDetails, len(fullFileDetails))
	for _, rom := range fullFileDetails {
		// index by lowercased filename for case-insensitive lookup
		newCache[strings.ToLower(rom.FileName)] = rom
	}
	romIndexCache = newCache
	return nil
}

// InitializeROMCache builds and initializes the ROM index from the given directory.
// This should be called once at startup. Returns an error if the index cannot be built.
func InitializeROMCache(directory string) error {
	return RebuildROMCache(directory)
}

// boardCompatible checks if a profile's board type can play a ROM's board type.
// Naomi 2 can play Naomi 1 ROMs.
// Naomi 1 and Naomi 2 can play Atomiswave ROMs (via software emulation on Naomi hardware).
func boardCompatible(profileBoard, romBoard string) bool {
	if profileBoard == "" || romBoard == "" {
		return true
	}

	// Normalize both to lowercase and remove spaces for comparison
	profileNorm := strings.ToLower(strings.ReplaceAll(profileBoard, " ", ""))
	romNorm := strings.ToLower(strings.ReplaceAll(romBoard, " ", ""))

	if profileNorm == romNorm {
		return true
	}
	// Naomi 2 can play Naomi 1 games
	if strings.Contains(profileNorm, "naomi2") && strings.Contains(romNorm, "naomi1") {
		return true
	}
	// Naomi 1 and Naomi 2 can play Atomiswave games (via software emulation)
	if (strings.Contains(profileNorm, "naomi1") || strings.Contains(profileNorm, "naomi2")) &&
		strings.Contains(romNorm, "atomswave") {
		return true
	}
	return false
}

// monitorCompatible checks if a ROM's orientation matches the profile's monitor.
func monitorCompatible(profileOrientation string, rom files.FullRomDetails) bool {
	if profileOrientation == "" {
		return true
	}
	profileLower := strings.ToLower(profileOrientation)

	// Check if profile is vertical orientation
	// Handle various naming conventions: "Vertical", "TATE", "Vertical/TATE"
	isProfileVertical := strings.Contains(profileLower, "vertical") ||
		strings.Contains(profileLower, "tate")

	// ROM.Tate indicates vertical orientation
	// Match: profile vertical wants rom vertical, profile horizontal wants rom horizontal
	return isProfileVertical == rom.Tate
}

// GetCachedSummaries converts the initialized ROM cache to a list of summaries.
// All ROM data is already cached on startup, so this is an O(n) operation to
// build the slice from the map, not a network/filesystem scan.
// If filter parameters are provided, only matching ROMs are returned.
func GetCachedSummaries(boardType, monitorOrientation string) []files.RomSummary {
	summaries := make([]files.RomSummary, 0, len(romIndexCache))
	for _, rom := range romIndexCache {
		// Apply filters if provided
		if boardType != "" && !boardCompatible(boardType, rom.BoardType) {
			continue
		}
		if monitorOrientation != "" && !monitorCompatible(monitorOrientation, rom) {
			continue
		}

		summaries = append(summaries, files.RomSummary{
			Name:     rom.Name,
			FileName: rom.FileName,
			ImageUrl: "/images/" + strings.TrimSpace(rom.PictureName),
		})
	}
	// sort the results alphabetically by name so output is deterministic
	sort.Slice(summaries, func(i, j int) bool {
		return strings.ToLower(summaries[i].Name) < strings.ToLower(summaries[j].Name)
	})
	return summaries
}

type UploadRequest struct {
	IP       string `json:"ip"`
	FileName string `json:"fileName"`
}

// UploadHandler handles the upload of a ROM file to the Naomi
func UploadHandler(w http.ResponseWriter, r *http.Request) {
	var request UploadRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Look up the file in the cached ROM index
	matchedFile, found := romIndexCache[strings.ToLower(request.FileName)]
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

// ListFilesHandler returns a lightweight summary of every rom found in the
// directory. The response only contains the name, filename and picture URL.
// Query parameters can be used to filter the results:
// - boardType: filter by board type (Naomi 1, Naomi 2, etc.)
// - monitorOrientation: filter by monitor orientation (Horizontal/Yoko, Vertical/TATE, etc.)
// Uses the cached ROM index built at startup for instant responses.
func ListFilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	boardType := r.URL.Query().Get("boardType")
	monitorOrientation := r.URL.Query().Get("monitorOrientation")

	summaries := GetCachedSummaries(boardType, monitorOrientation)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summaries)
}

// VersionHandler returns the current application version.
func VersionHandler(version string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"version": version})
	}
}

// RomDetailsHandler responds with all of the metadata for a single rom
// specified by the fileName query parameter.
func RomDetailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fileName := r.URL.Query().Get("fileName")
	if fileName == "" {
		http.Error(w, "Missing fileName parameter", http.StatusBadRequest)
		return
	}

	// Look up the ROM by lowercased filename for case-insensitive matching
	rom, found := romIndexCache[strings.ToLower(fileName)]
	if !found {
		http.Error(w, "ROM not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rom)
}
