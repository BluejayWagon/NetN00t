import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Paper,
  Stack,
  Card,
  CardMedia,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

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

const theme = createTheme({
  palette: {
    primary: {
      main: '#ff6600',
    },
    background: {
      default: '#fef7f0',
    },
  },
});

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
    <ThemeProvider theme={theme}>
      <>
        <CssBaseline />
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#fef7f0" }}>
          {/* Header */}
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h1" sx={{ fontSize: "1.5rem", flexGrow: 1, color: "white" }}>
                🎮 Netboot Portal
              </Typography>
            </Toolbar>
          </AppBar>

        {/* Profile Panel */}
        <Paper sx={{ p: 2, borderRadius: 0 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Active Profile:
            </Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Select a profile...</em>
                </MenuItem>
                {profiles.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { resetProfileForm(); setShowProfileModal(true); }}
            >
              New Profile
            </Button>
            {selectedProfile && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => startEditProfile(selectedProfile)}
                  size="small"
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteProfile(selectedProfile.id)}
                  size="small"
                >
                  Delete
                </Button>
              </>
            )}
          </Stack>
          {selectedProfile && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Board:</strong> {selectedProfile.boardType} | <strong>Orientation:</strong> {selectedProfile.monitorOrientation} | <strong>IP:</strong> {selectedProfile.ip}
              </Typography>
            </Alert>
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId("")}
        >
          <DialogTitle>Delete Profile?</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this profile? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmId("")} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteProfile}
              variant="contained"
              color="error"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Profile Modal */}
        <Dialog
          open={showProfileModal}
          onClose={() => { setShowProfileModal(false); resetProfileForm(); }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 3 }}>
            {editingProfile ? "Edit Profile" : "Create New Profile"}
          </DialogTitle>
          <DialogContent sx={{ pt: 5, overflow: 'visible' }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Profile Name"
                placeholder="My Arcade Cabinet"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Board Type</InputLabel>
                <Select
                  value={newProfileBoard}
                  onChange={(e) => setNewProfileBoard(e.target.value)}
                  label="Board Type"
                >
                  {boardConfig?.boardTypes.map((bt) => (
                    <MenuItem key={bt} value={bt}>
                      {bt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Monitor Orientation</InputLabel>
                <Select
                  value={newProfileMonitorOrientation}
                  onChange={(e) => setNewProfileMonitorOrientation(e.target.value)}
                  label="Monitor Orientation"
                >
                  {getMonitorOrientationNames().map((mo) => (
                    <MenuItem key={mo} value={mo}>
                      {mo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Naomi IP Address"
                placeholder="192.168.1.100"
                value={newProfileIp}
                onChange={(e) => setNewProfileIp(e.target.value)}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                placeholder="Add any notes about this profile..."
                multiline
                rows={4}
                value={newProfileNotes}
                onChange={(e) => setNewProfileNotes(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => { setShowProfileModal(false); resetProfileForm(); }}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
              variant="contained"
              color="primary"
            >
              {editingProfile ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Main content area */}
        <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left column: ROM list */}
          <Box
            sx={{
              width: "50%",
              overflowY: "auto",
              p: 2,
              borderRight: "1px solid #e0e0e0",
            }}
          >
            {!hasFetched ? (
              <Typography variant="body1" color="text.secondary">
                Loading...
              </Typography>
            ) : summaries.length === 0 ? (
              <Alert severity="info">No files found. Try a different profile.</Alert>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 3 }}>
                {summaries.map((file) => (
                  <Card
                    key={file.fileName}
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        boxShadow: 4,
                        transform: "translateY(-4px)",
                      },
                      bgcolor: selectedFileName === file.fileName ? "primary.light" : "background.paper",
                    }}
                    onClick={() => fetchDetail(file.fileName)}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={file.imageUrl}
                      alt={file.name}
                      sx={{ objectFit: "contain", bgcolor: "#f5f5f5" }}
                    />
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {file.name}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>

          {/* Right column: ROM details */}
          <Box
            sx={{
              width: "50%",
              p: 2,
              overflowY: "auto",
            }}
          >
            {selectedDetail ? (
              <Stack spacing={2}>
                <Typography variant="h2">{selectedDetail.Name}</Typography>
                <Box
                  component="img"
                  src={`/images/${selectedDetail.PictureName}`}
                  alt={selectedDetail.Name}
                  sx={{ maxWidth: "100%", maxHeight: "300px", height: "auto", borderRadius: 2, objectFit: "contain" }}
                />
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Board Type:</strong> {selectedDetail.BoardType}
                    </Typography>
                    {selectedDetail.Genre && (
                      <Typography variant="body2">
                        <strong>Genre:</strong> {selectedDetail.Genre}
                      </Typography>
                    )}
                    {selectedDetail.Tate !== undefined && (
                      <Typography variant="body2">
                        <strong>Orientation:</strong>{" "}
                        {selectedDetail.Tate ? "Vertical/TATE" : "Horizontal"}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
                {selectedDetail.Description && (
                  <Box>
                    <Typography variant="body2" paragraph>
                      {selectedDetail.Description}
                    </Typography>
                  </Box>
                )}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleUpload}
                  disabled={!selectedFileName || !selectedProfile}
                  fullWidth
                >
                  {selectedProfile
                    ? `Upload to ${selectedProfile.name}`
                    : "Select a profile to upload"}
                </Button>
              </Stack>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  Select a ROM from the list to view details
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </>
    </ThemeProvider>
  );
}

export default UploadRom;