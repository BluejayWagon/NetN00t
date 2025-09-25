import React, { useState } from "react";
import axios from "axios";

function UploadRom() {
  const [ip, setIp] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileList, setFileList] = useState<{ name: string; imageUrl: string }[]>([]);

  const handleUpload = async () => {
    try {
      const response = await axios.post("/api/upload", { ip, fileName });
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
    try {
      const response = await axios.get("/api/listfiles");
      setFileList(response.data); // Update the file list state
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error: " + (error.response?.data || error.message));
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
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
        <strong>Selected File:</strong> {fileList.find(file => file.name === fileName)?.name || "None"}
      </div>
      <button onClick={handleUpload}>Upload</button>
      <button onClick={handleGetFiles}>Get Files</button>
      <div style={{ flex: 1, overflowY: "scroll", border: "1px solid #ccc", marginTop: "20px" }}>
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {fileList.map((file, index) => (
            <li
              key={index}
              style={{
                cursor: "pointer",
                marginBottom: "20px",
                textAlign: "center",
              }}
              onClick={() => {
                setFileName(file.name);
                console.log("Selected file path:", file.name); // Debugging log
              }}
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
    </div>
  );
}

export default UploadRom;