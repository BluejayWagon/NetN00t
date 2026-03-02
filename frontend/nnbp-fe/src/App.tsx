import React, { useState, useEffect } from "react";
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

// Profile API types
interface Profile {
  id: string;
  name: string;
  boardType: string;
  monitorOrientation: string;
  ip: string;
  notes?: string;
  picture?: string;
}

interface MonitorOrientation {
  name: string;
  description: string;
}

interface BoardConfig {
  boardTypes: string[];
  boardInfo?: Record<string, {
    releaseYear: number;
    architecture: string;
    cpu: string;
    notable_games: string[];
  }>;
  monitorOrientations: MonitorOrientation[];
  defaultPictures?: Record<string, string>;
}

function UploadRom() {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [summaries, setSummaries] = useState<RomSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<RomDetail | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileBoard, setNewProfileBoard] = useState("Naomi 1");
  const [newProfileMonitorOrientation, setNewProfileMonitorOrientation] = useState("Horizontal/Yoko");
  const [newProfileIp, setNewProfileIp] = useState("");
  const [newProfileNotes, setNewProfileNotes] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string>("");

  // Fetch ROM files and profiles on component mount
  useEffect(() => {
    handleGetFiles();
    fetchProfiles();
    fetchBoardConfig();
  }, []);

  // Update selected profile when selectedProfileId changes, and refetch files with filters
  useEffect(() => {
    if (selectedProfileId) {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        setSelectedProfile(profile);
        setNewProfileIp(profile.ip);
        // Refetch files with the new profile's filter parameters
        handleGetFilesFiltered(profile);
      }
    } else {
      setSelectedProfile(null);
      // Fetch all files when no profile is selected
      handleGetFiles();
    }
  }, [selectedProfileId, profiles]);

  const fetchProfiles = async () => {
    try {
      const response = await axios.get("/api/profiles");
      const data = response.data;
      if (Array.isArray(data)) {
        setProfiles(data as Profile[]);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchBoardConfig = async () => {
    try {
      const response = await axios.get("/api/boardconfig");
      setBoardConfig(response.data as BoardConfig);
    } catch (error) {
      console.error("Error fetching board config:", error);
    }
  };

  const handleUpload = async () => {
    try {
      const response = await axios.post("/api/upload", {
        ip: selectedProfile?.ip || "",
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

  const handleGetFilesFiltered = async (profile: Profile) => {
    setHasFetched(true);
    try {
      const params = new URLSearchParams();
      params.append("boardType", profile.boardType);
      params.append("monitorOrientation", profile.monitorOrientation);
      
      const response = await axios.get(`/api/listfiles?${params.toString()}`);
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

  // Build a map of monitor orientation name -> set of file names (if available)
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      alert("Profile name is required");
      return;
    }
    try {
      const response = await axios.post("/api/profiles", {
        name: newProfileName,
        boardType: newProfileBoard,
        monitorOrientation: newProfileMonitorOrientation,
        ip: newProfileIp,
        notes: newProfileNotes,
      });
      const newId = (response.data as { id: string }).id;
      await fetchProfiles();
      setSelectedProfileId(newId);
      setShowProfileModal(false);
      resetProfileForm();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error creating profile: " + (error.response?.data || error.message));
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile || !newProfileName.trim()) {
      alert("Profile name is required");
      return;
    }
    try {
      await axios.put(`/api/profiles/${editingProfile.id}`, {
        name: newProfileName,
        boardType: newProfileBoard,
        monitorOrientation: newProfileMonitorOrientation,
        ip: newProfileIp,
        notes: newProfileNotes,
      });
      await fetchProfiles();
      setShowProfileModal(false);
      resetProfileForm();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error updating profile: " + (error.response?.data || error.message));
      }
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    setDeleteConfirmId(profileId);
  };

  const confirmDeleteProfile = async () => {
    try {
      await axios.delete(`/api/profiles/${deleteConfirmId}`);
      if (selectedProfileId === deleteConfirmId) {
        setSelectedProfileId("");
      }
      await fetchProfiles();
      setDeleteConfirmId("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error deleting profile: " + (error.response?.data || error.message));
      }
      setDeleteConfirmId("");
    }
  };

  const resetProfileForm = () => {
    setEditingProfile(null);
    setNewProfileName("");
    setNewProfileBoard("Naomi 1");
    setNewProfileMonitorOrientation("Horizontal/Yoko");
    setNewProfileIp("");
    setNewProfileNotes("");
  };

  const startEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setNewProfileBoard(profile.boardType);
    setNewProfileMonitorOrientation(profile.monitorOrientation);
    setNewProfileNotes(profile.notes || "");
    setShowProfileModal(true);
  };

  const getMonitorOrientationNames = (): string[] => {
    if (!boardConfig) return [];
    if (Array.isArray(boardConfig.monitorOrientations)) {
      return boardConfig.monitorOrientations.map(mo =>
        typeof mo === "string" ? mo : mo.name
      );
    }
    return [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <h1>Netboot Portal</h1>

      {/* Profile Panel */}
      <div style={{
        padding: "10px",
        backgroundColor: "#f5f5f5",
        borderBottom: "2px solid #ccc",
      }}>
        <div style={{ marginBottom: "10px" }}>
          <strong>Active Profile:</strong>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            <option value="">Select a profile...</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => { resetProfileForm(); setShowProfileModal(true); }}
            style={{ marginLeft: "10px", padding: "5px 10px" }}>
            New Profile
          </button>
          {selectedProfile && (
            <>
              <button
                onClick={() => startEditProfile(selectedProfile)}
                style={{ marginLeft: "5px", padding: "5px 10px" }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteProfile(selectedProfile.id)}
                style={{ marginLeft: "5px", padding: "5px 10px", color: "red" }}
              >
                Delete
              </button>
            </>
          )}
        </div>
        {selectedProfile && (
          <div style={{ fontSize: "0.9em", color: "#333" }}>
            Board: {selectedProfile.boardType} | Orientation: {selectedProfile.monitorOrientation} | IP: {selectedProfile.ip}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "300px",
            width: "90%",
          }}>
            <h2>Delete Profile?</h2>
            <p>Are you sure you want to delete this profile? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={confirmDeleteProfile}
                style={{ flex: 1, padding: "8px", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "4px" }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId("")}
                style={{ flex: 1, padding: "8px", backgroundColor: "#999", color: "white", border: "none", borderRadius: "4px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "90%",
          }}>
            <h2>{editingProfile ? "Edit Profile" : "Create Profile"}</h2>
            <input
              type="text"
              placeholder="Profile name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }}
            />
            <select
              value={newProfileBoard}
              onChange={(e) => setNewProfileBoard(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }}
            >
              {boardConfig?.boardTypes.map(bt => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
            <select
              value={newProfileMonitorOrientation}
              onChange={(e) => setNewProfileMonitorOrientation(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }}
            >
              {getMonitorOrientationNames().map(mo => (
                <option key={mo} value={mo}>{mo}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Naomi IP address"
              value={newProfileIp}
              onChange={(e) => setNewProfileIp(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box" }}
            />
            <textarea
              placeholder="Notes (optional)"
              value={newProfileNotes}
              onChange={(e) => setNewProfileNotes(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", boxSizing: "border-box", height: "80px" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
                style={{ flex: 1, padding: "8px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px" }}
              >
                {editingProfile ? "Update" : "Create"}
              </button>
              <button
                onClick={() => { setShowProfileModal(false); resetProfileForm(); }}
                style={{ flex: 1, padding: "8px", backgroundColor: "#999", color: "white", border: "none", borderRadius: "4px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* message when list was fetched and is empty */}
      {hasFetched && summaries.length === 0 && (
        <p style={{ marginTop: "10px", fontStyle: "italic", padding: "0 10px" }}>
          No files found.
        </p>
      )}

      {/* main content area: two columns */}
      <div style={{ display: "flex", flex: 1, marginTop: "10px", minHeight: 0 }}>
        {/* left column: summary list */}
        <div
          style={{
            width: "50%",
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            border: "1px solid #ccc",
            padding: "10px",
          }}
        >
          <ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {summaries.map((file) => (
              <li
                key={file.fileName}
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
            /* right column is not scrollable; content exceeding height will be clipped */
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
              <button
                onClick={handleUpload}
                disabled={!selectedFileName || !selectedProfile}
                style={{
                  padding: "10px 20px",
                  backgroundColor: selectedFileName && selectedProfile ? "#4CAF50" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedFileName && selectedProfile ? "pointer" : "not-allowed",
                }}
              >
                {selectedProfile ? "Upload to " + selectedProfile.name : "Select a profile to upload"}
              </button>
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