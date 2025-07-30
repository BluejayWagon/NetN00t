package main

import (
	"flag"
	"fmt"
	"net/http"
	"nnb-portable/web"
)

func main() {
	mode := flag.String("mode", "prod", "Mode to run the server in: 'prod' for production, 'dev' for development")
	flag.Parse()

	if *mode == "prod" {
		fmt.Println("Running in production mode, serving frontend from ./frontend/nnbp-fe/build")
		// Serve React static files
		fs := http.FileServer(http.Dir("./frontend/nnbp-fe/build"))
		http.Handle("/", fs)

	} else {
		fmt.Println("Running in development mode, React app should be started separately")
	}

	// Handle API requests
	http.HandleFunc("/api/upload", web.UploadHandler)

	http.ListenAndServe(":8080", nil)
}
