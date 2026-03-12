package files

import (
	_ "embed"
	"encoding/json"
	"os"
	"strings"
)

//go:embed romConfig.json
var embeddedRomConfig []byte

// RomDetails represents the metadata for a single ROM, as defined in the romConfig.json file.
// This is the structure used to parse the metadata from the JSON file.  It does not
// include the file system details, which are combined later to produce FullRomDetails.
type RomDetails struct {
	Name        string `json:"name"`
	PictureName string `json:"pictureName"`
	FileName    string `json:"fileName"`
	BoardType   string `json:"boardType"`
	// additional metadata
	Genre       string `json:"genre,omitempty"`
	Tate        bool   `json:"tate,omitempty"`
	Description string `json:"description,omitempty"`
}

// FullRomDetails combines the file system details with the metadata from romConfig.json.
// This is the main structure used internally in the application for each ROM.
type FullRomDetails struct {
	Name        string
	PictureName string
	FileName    string
	BoardType   string
	FullPath    string
	Genre       string
	Tate        bool
	Description string
}

// RomSummary contains only the minimal information displayed in the rom list.
// It is returned by the lightweight list API to reduce payload size.
// The frontend is responsible for requesting full details when a summary
// entry is selected.
type RomSummary struct {
	Name     string `json:"name"`
	FileName string `json:"fileName"` // used to request further details or perform uploads
	ImageUrl string `json:"imageUrl"`
}

type FileDetails struct {
	FileName string `json:"fileName"`
	Name     string `json:"name"`
	FullPath string `json:"fullPath"`
}

func LoadRomDetailsFromEmbedded() ([]RomDetails, error) {
	var romDetails []RomDetails
	err := json.Unmarshal(embeddedRomConfig, &romDetails)
	if err != nil {
		return nil, err
	}
	return romDetails, nil
}

func GatherBinFilesRecursive(dir string, filelist *[]FileDetails) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		filepath := dir + string(os.PathSeparator) + entry.Name()
		if entry.IsDir() {
			err := GatherBinFilesRecursive(filepath, filelist)
			if err != nil {
				return err
			}
		} else {
			if strings.HasSuffix(entry.Name(), ".bin") {

				*filelist = append(*filelist, FileDetails{
					FileName: entry.Name(),
					Name:     strings.TrimSuffix(entry.Name(), ".bin"),
					FullPath: filepath})
			}
		}
	}
	return nil
}

func TransformFilesToRomDetails(filelist []FileDetails, romDetails []RomDetails) []FullRomDetails {
	var transformed []FullRomDetails
	for _, file := range filelist {
		for _, rom := range romDetails {
			if strings.EqualFold(rom.FileName, file.FileName) {
				transformed = append(transformed, FullRomDetails{
					Name:        rom.Name,
					PictureName: rom.PictureName,
					FileName:    rom.FileName,
					BoardType:   rom.BoardType,
					FullPath:    file.FullPath,
					Genre:       rom.Genre,
					Tate:        rom.Tate,
					Description: rom.Description,
				})
			}
		}
	}
	return transformed
}

// TransformFilesToSummaries produces a list of RomSummary objects.  Only the
// minimum fields necessary for the initial listing are populated.  This is
// useful when the client only needs the picture and name and will request
// further details later.
func TransformFilesToSummaries(filelist []FileDetails) ([]RomSummary, error) {
	romDetails, err := LoadRomDetailsFromEmbedded()
	if err != nil {
		return nil, err
	}
	transformedFiles := TransformFilesToRomDetails(filelist, romDetails)
	summaries := make([]RomSummary, 0, len(transformedFiles))
	for _, rom := range transformedFiles {
		summaries = append(summaries, RomSummary{
			Name:     rom.Name,
			FileName: rom.FileName,
			ImageUrl: "/images/" + strings.TrimSpace(rom.PictureName),
		})
	}
	return summaries, nil
}
