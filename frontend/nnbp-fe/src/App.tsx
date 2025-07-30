import React, { useState } from "react";
import axios from "axios";

function UploadRom() {
  const [ip, setIp] = useState("");
  const [filePath, setFilePath] = useState("");

  const handleUpload = async () => {
    try {
      const response = await axios.post("/api/upload", { ip, filePath });
      alert(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error: " + (error.response?.data || error.message));
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
    }
  };

  return (
    <div>
      <h1>Upload ROM</h1>
      <input
        type="text"
        placeholder="Naomi IP"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
      />
      <input
        type="text"
        placeholder="File Selector"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
      />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default UploadRom;