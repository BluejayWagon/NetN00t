import React, { useState } from "react";
import axios from "axios";

// lightweight representation returned by /api/listfiles
interface RomSummary {
  name: string;
  fileName: string;
  imageUrl: string;
}

// backend returns the full RomDetails object directly; field names are
// capitalized and there is no imageUrl property.  We compute the URL when
// rendering.
interface RomDetail {
  Name: string;
  PictureName: string;
  FileName: string;
  BoardType: string;
  FullPath: string;
  Genre?: string;
  Tate?: boolean;
  Description?: string;
}

function UploadRom() {
  const [ip, setIp] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [summaries, setSummaries] = useState<RomSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<RomDetail | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const handleUpload = async () => {
    try {
      const response = await axios.post("/api/upload", {
        ip,
        fileName: selectedFileName,
      });
      alert(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error: " + (error.response?.data || error.message));
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
    }
  };

  const handleGetFiles = async () => {
    setHasFetched(true);
    try {
      const response = await axios.get("/api/listfiles");
      const data = response.data;
      if (Array.isArray(data)) {
        setSummaries(data as RomSummary[]);
      } else {
        console.warn("Unexpected response for /api/listfiles:", data);
        setSummaries([]);
      }
    } catch (error) {
      setSummaries([]);
      if (axios.isAxiosError(error)) {
        alert("Error: " + (error.response?.data || error.message));
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
    }
  };

  const fetchDetail = async (fileName: string) => {
    try {
      const resp = await axios.get(`/api/rom?fileName=${encodeURIComponent(
        fileName
      )}`);
      setSelectedDetail(resp.data as RomDetail);
      setSelectedFileName(fileName);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error retrieving rom details: " +
          (error.response?.data || error.message));
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
      setSelectedDetail(null);
      setSelectedFileName("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <h1>Upload ROM</h1>
      <input
        type="text"
        placeholder="Naomi IP"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
      />
      <div>
        <strong>Selected File:</strong> {selectedDetail?.Name || "None"}
      </div>
      <button onClick={handleUpload} disabled={!selectedFileName}>
        Upload
      </button>
      <button onClick={handleGetFiles}>Get Files</button>

      {/* message when list was fetched and is empty */}
      {hasFetched && summaries.length === 0 && (
        <p style={{ marginTop: "10px", fontStyle: "italic" }}>
          No files found.
        </p>
      )}

      {/* main content area: two columns */}
      <div style={{ display: "flex", flex: 1, marginTop: "20px" }}>
        {/* left column: summary list */}
        <div
          style={{
            width: "50%",
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: "10px",
          }}
        >
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summaries.map((file, index) => (
              <li
                key={index}
                style={{
                  cursor: "pointer",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
                onClick={() => fetchDetail(file.fileName)}
              >
                <strong>{file.name}</strong>
                <br />
                <img
                  src={file.imageUrl}
                  alt={file.name}
                  style={{
                    width: "150px",
                    height: "auto",
                    marginTop: "10px",
                    borderRadius: "8px",
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* right column: detail view – sticky so it stays in view while the left list scrolls */}
        <div style={{
            width: "50%",
            padding: "10px",
            position: "sticky",
            top: "0",
            alignSelf: "flex-start",
            height: "100vh",
            overflowY: "auto",
        }}>
          {selectedDetail ? (
            <div>
              <h2>{selectedDetail.Name}</h2>
              <img
                src={`/images/${selectedDetail.PictureName}`}
                alt={selectedDetail.Name}
                style={{ width: "200px", borderRadius: "8px" }}
              />
              <p>Board type: {selectedDetail.BoardType}</p>
              {selectedDetail.Genre && <p>Genre: {selectedDetail.Genre}</p>}
              {selectedDetail.Tate !== undefined && (
                <p>
                  Orientation:{" "}
                  {selectedDetail.Tate ? "Vertical/TATE" : "Horizontal"}
                </p>
              )}
              {selectedDetail.Description && (
                <p>{selectedDetail.Description}</p>
              )}
            </div>
          ) : (
            <p>Select a ROM to see full details on the right.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadRom;