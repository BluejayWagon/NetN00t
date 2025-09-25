package files

import (
	_ "embed"
	"encoding/json"
	"os"
	"strings"
)

//go:embed romConfig.json
var embeddedRomConfig []byte

type Config struct {
	RomDirectory string `json:"romDirectory"`
}

type RomDetails struct {
	Name        string `json:"name"`
	PictureName string `json:"pictureName"`
	FileName    string `json:"fileName"`
	BoardType   string `json:"boardType"`
}

type FullRomDetails struct {
	Name        string
	PictureName string
	FileName    string
	BoardType   string
	FullPath    string
}

type FrontendResponse struct {
	Name      string `json:"name"`
	ImageUrl  string `json:"imageUrl"`
	BoardType string `json:"boardType"`
}

type FileDetails struct {
	FileName string `json:"fileName"`
	Name     string `json:"name"`
	FullPath string `json:"fullPath"`
}

func LoadConfig(filePath string) (*Config, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var config Config
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// TODO: I think we can remove this function now
func LoadRomDetails(filePath string) ([]RomDetails, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var romDetails []RomDetails
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&romDetails)
	if err != nil {
		return nil, err
	}
	return romDetails, nil
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
				})
			}
		}
	}
	return transformed
}

func TransformFilesToFrontendResponse(filelist []FileDetails) ([]FrontendResponse, error) {
	romDetails, err := LoadRomDetailsFromEmbedded()
	if err != nil {
		return nil, err
	}
	transformedFiles := TransformFilesToRomDetails(filelist, romDetails)
	var transformedResponses []FrontendResponse
	for _, rom := range transformedFiles {
		transformedResponses = append(transformedResponses, FrontendResponse{
			Name:      rom.Name,
			ImageUrl:  "/images/" + strings.TrimSpace(rom.PictureName),
			BoardType: rom.BoardType,
		})
	}
	return transformedResponses, nil
}
