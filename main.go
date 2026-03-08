package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"net/http"
	"nnb-portable/web"
)

var version = "dev"

//go:embed frontend/nnbp-fe/build/*
var embeddedFrontendFiles embed.FS

//go:embed file/images/*
var embeddedImageFiles embed.FS

func main() {
	mode := flag.String("mode", "prod", "Mode to run the server in: 'prod' for production, 'dev' for development")
	dataDir := flag.String("data", "./config", "Path to app data directory")
	flag.Parse()

	if *mode == "prod" {
		fmt.Println("Running in production mode, serving frontend from ./frontend/nnbp-fe/build")
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

	// Initialize store (loads ROM dir + profiles from data dir)
	fmt.Println("Initializing config store...")
	if err := web.InitializeStore(*dataDir); err != nil {
		fmt.Println("Error initializing config store:", err)
		return
	}
	fmt.Println("Config store initialized")

	// Initialize ROM cache only if a directory is already configured
	romDir := web.GetRomDirectory()
	if romDir != "" {
		fmt.Println("Initializing ROM cache from:", romDir)
		if err := web.InitializeROMCache(romDir); err != nil {
			fmt.Println("Error initializing ROM cache:", err)
			return
		}
		fmt.Println("ROM cache initialized successfully")
	} else {
		fmt.Println("No ROM directory configured — skipping ROM cache init")
	}

	// Handle API requests
	http.HandleFunc("/api/upload", web.UploadHandler)
	http.HandleFunc("/api/listfiles", web.ListFilesHandler)
	http.HandleFunc("/api/rom", web.RomDetailsHandler)
	http.HandleFunc("/api/config", web.AppConfigHandler())

	// Profiles API
	http.HandleFunc("/api/profiles", web.ProfilesHandler())
	http.HandleFunc("/api/profiles/", web.ProfileHandler())
	http.HandleFunc("/api/profiles/selected", web.ProfilesSelectedHandler())
	http.HandleFunc("/api/boardconfig", web.BoardConfigHandler())
	http.HandleFunc("/api/version", web.VersionHandler(version))

	fmt.Println("Server listening on :8080")
	http.ListenAndServe(":8080", nil)
}
