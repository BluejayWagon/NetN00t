package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"net/http"
	files "nnb-portable/file"
	"nnb-portable/web"
	"strings"
)

//go:embed config.json
var configFileContent []byte

//go:embed frontend/nnbp-fe/build/*
var embeddedFrontendFiles embed.FS

//go:embed file/images/*
var embeddedImageFiles embed.FS

func main() {
	mode := flag.String("mode", "prod", "Mode to run the server in: 'prod' for production, 'dev' for development")
	configFile := flag.String("config", "", "Full path to the configuration file")
	flag.Parse()

	var configuration *files.Config
	var err error
	if *configFile == "" {
		fmt.Println("No configuration file provided, using default config.json")
		err = json.Unmarshal(configFileContent, &configuration)
		if err != nil {
			fmt.Println("Error loading default config:", err)
			return
		}
	} else {
		fmt.Println("Loading configuration from:", *configFile)
		var err error
		configuration, err = files.LoadConfig(*configFile)
		if err != nil {
			fmt.Println("Error loading config file:", err)
			return
		}
		configuration.RomDirectory = strings.ReplaceAll(configuration.RomDirectory, "\\", "/")
		fmt.Println("Configuration loaded:", configuration.RomDirectory)
	}
	if *mode == "prod" {
		fmt.Println("Running in production mode, serving frontend from ./frontend/nnbp-fe/build")
		// Serve React static files
		/// Create a sub-filesystem for the embedded frontend build directory
		subFS, err := fs.Sub(embeddedFrontendFiles, "frontend/nnbp-fe/build")
		if err != nil {
			fmt.Println("Error accessing embedded frontend files:", err)
			return
		}
		fs := http.FileServer(http.FS(subFS))
		http.Handle("/", fs)

	} else {
		fmt.Println("Running in development mode, React app should be started separately")
	}

	// Serve image files
	subImageFS, err := fs.Sub(embeddedImageFiles, "file/images")
	if err != nil {
		fmt.Println("Error accessing embedded image files:", err)
		return
	}
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.FS(subImageFS))))

	// Initialize the ROM cache at startup
	fmt.Println("Initializing ROM cache...")
	err = web.InitializeROMCache(configuration.RomDirectory)
	if err != nil {
		fmt.Println("Error initializing ROM cache:", err)
		return
	}
	fmt.Println("ROM cache initialized successfully")

	// Initialize profiles store (persists profiles under ./arcade_profiles)
	fmt.Println("Initializing profiles store...")
	if err := web.InitializeProfilesStore("arcade_profiles"); err != nil {
		fmt.Println("Error initializing profiles store:", err)
		return
	}
	fmt.Println("Profiles store initialized")

	// Handle API requests
	http.HandleFunc("/api/upload", func(w http.ResponseWriter, r *http.Request) {
		web.UploadHandler(w, r, configuration.RomDirectory)
	})
	// lightweight list of roms (name/picture only)
	http.HandleFunc("/api/listfiles", web.ListFilesHandler(configuration.RomDirectory))
	// detailed metadata for a single rom; query param: fileName
	http.HandleFunc("/api/rom", web.RomDetailsHandler(configuration.RomDirectory))

	// Profiles API
	http.HandleFunc("/api/profiles", web.ProfilesHandler())
	http.HandleFunc("/api/profiles/", web.ProfileHandler())
	http.HandleFunc("/api/profiles/selected", web.ProfilesSelectedHandler())
	http.HandleFunc("/api/boardconfig", web.BoardConfigHandler())
	fmt.Println(configuration)

	http.ListenAndServe(":8080", nil)
}
