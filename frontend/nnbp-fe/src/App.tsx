import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  AppBar,
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
  Paper,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";

import ProfilePanel from "./components/ProfilePanel";
import RomList from "./components/RomList";
import RomDetails from "./components/RomDetails";
import MainLayout from "./components/MainLayout";
import SettingsDialog from "./components/SettingsDialog";

interface RomSummary {
  name: string;
  fileName: string;
  imageUrl: string;
}

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
      main: "#ff6600",
    },
    background: {
      default: "#fef7f0",
    },
  },
});

function UploadRom() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [selectedFileName, setSelectedFileName] = useState("");
  const [summaries, setSummaries] = useState<RomSummary[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<RomDetail | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);

  const [romDirectory, setRomDirectory] = useState<string | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileBoard, setNewProfileBoard] = useState("Naomi 1");
  const [newProfileMonitorOrientation, setNewProfileMonitorOrientation] = useState("Horizontal/Yoko");
  const [newProfileIp, setNewProfileIp] = useState("");
  const [newProfileNotes, setNewProfileNotes] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string>("");

  useEffect(() => {
    fetchConfig();
    fetchProfiles();
    fetchBoardConfig();
  }, []);

  useEffect(() => {
    if (selectedProfileId) {
      const profile = profiles.find((p) => p.id === selectedProfileId);
      if (profile) {
        setSelectedProfile(profile);
        setNewProfileIp(profile.ip);
        handleGetFilesFiltered(profile);
      }
    } else {
      setSelectedProfile(null);
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

  const fetchConfig = async () => {
    try {
      const response = await axios.get("/api/config");
      const dir: string = response.data.romDirectory ?? "";
      setRomDirectory(dir);
      if (dir) {
        handleGetFiles();
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      setRomDirectory("");
    }
  };

  const handleSaveConfig = async (dir: string) => {
    try {
      await axios.put("/api/config", { romDirectory: dir });
      setRomDirectory(dir);
      setShowSettingsDialog(false);
      handleGetFiles();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert("Error saving config: " + (error.response?.data || error.message));
      }
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
      const resp = await axios.get(
        `/api/rom?fileName=${encodeURIComponent(fileName)}`
      );
      setSelectedDetail(resp.data as RomDetail);
      setSelectedFileName(fileName);
      if (isMobile) setDetailDrawerOpen(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        alert(
          "Error retrieving rom details: " +
            (error.response?.data || error.message)
        );
      } else {
        alert("An unexpected error occurred: " + String(error));
      }
      setSelectedDetail(null);
      setSelectedFileName("");
    }
  };

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
        alert(
          "Error creating profile: " + (error.response?.data || error.message)
        );
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
        alert(
          "Error updating profile: " + (error.response?.data || error.message)
        );
      }
    }
  };

  const handleDeleteProfile = (profileId: string) => {
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
        alert(
          "Error deleting profile: " + (error.response?.data || error.message)
        );
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
      return boardConfig.monitorOrientations.map((mo) =>
        typeof mo === "string" ? mo : mo.name
      );
    }
    return [];
  };

  const profilePanel = (
    <ProfilePanel
      profiles={profiles}
      selectedProfileId={selectedProfileId}
      selectedProfile={selectedProfile}
      onProfileChange={setSelectedProfileId}
      onNewProfile={() => { resetProfileForm(); setShowProfileModal(true); }}
      onEditProfile={startEditProfile}
      onDeleteProfile={handleDeleteProfile}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      <>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: { md: "100vh" },
            minHeight: { xs: "100vh" },
            overflow: { md: "hidden" },
            bgcolor: "#fef7f0",
          }}
        >
          {/* Sticky header: AppBar + desktop profile panel */}
          <Box sx={{ position: "sticky", top: 0, zIndex: 1100 }}>
            <AppBar position="static">
              <Toolbar>
                <Typography
                  variant="h1"
                  sx={{ fontSize: "1.5rem", flexGrow: 1, color: "white" }}
                >
                  🎮 Netboot Portal
                </Typography>
                <IconButton
                  color="inherit"
                  onClick={() => setShowSettingsDialog(true)}
                  aria-label="open settings"
                  sx={{ minWidth: 48, minHeight: 48 }}
                >
                  <SettingsIcon />
                </IconButton>
                {isMobile && (
                  <IconButton
                    color="inherit"
                    edge="end"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="open profile menu"
                    sx={{ minWidth: 48, minHeight: 48 }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
              </Toolbar>
            </AppBar>

            {/* Desktop profile panel */}
            {!isMobile && (
              <Paper sx={{ p: 2, borderRadius: 0 }}>
                {profilePanel}
              </Paper>
            )}
          </Box>

          {/* Mobile profile drawer */}
          <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <Box sx={{ width: 300, p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Profiles
              </Typography>
              {profilePanel}
            </Box>
          </Drawer>

          {/* Settings / First-run Dialog */}
          <SettingsDialog
            open={showSettingsDialog || romDirectory === ""}
            isFirstRun={romDirectory === ""}
            romDirectory={romDirectory ?? ""}
            onSave={handleSaveConfig}
            onClose={() => setShowSettingsDialog(false)}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={!!deleteConfirmId}
            onClose={() => setDeleteConfirmId("")}
            fullScreen={isMobile}
          >
            <DialogTitle>Delete Profile?</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete this profile? This action cannot
                be undone.
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
                sx={{ minHeight: "48px" }}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Profile Create/Edit Modal */}
          <Dialog
            open={showProfileModal}
            onClose={() => {
              setShowProfileModal(false);
              resetProfileForm();
            }}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle sx={{ pb: 3 }}>
              {editingProfile ? "Edit Profile" : "Create New Profile"}
            </DialogTitle>
            <DialogContent sx={{ pt: 5, overflow: "visible" }}>
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
                    onChange={(e) =>
                      setNewProfileMonitorOrientation(e.target.value)
                    }
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
                onClick={() => {
                  setShowProfileModal(false);
                  resetProfileForm();
                }}
                color="inherit"
                sx={{ minHeight: "48px" }}
              >
                Cancel
              </Button>
              <Button
                onClick={
                  editingProfile ? handleUpdateProfile : handleCreateProfile
                }
                variant="contained"
                color="primary"
                sx={{ minHeight: "48px" }}
              >
                {editingProfile ? "Update" : "Create"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Mobile bottom sheet for ROM details */}
          <Drawer
            anchor="bottom"
            open={detailDrawerOpen}
            onClose={() => setDetailDrawerOpen(false)}
            sx={{ display: { md: "none" } }}
            PaperProps={{
              sx: {
                maxHeight: "75vh",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            {/* Drag handle + close button */}
            <Box sx={{ display: "flex", alignItems: "center", px: 2, pt: 1.5, pb: 0.5 }}>
              <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "grey.300" }} />
              </Box>
              <IconButton size="small" onClick={() => setDetailDrawerOpen(false)} aria-label="close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {/* Scrollable content */}
            <Box sx={{ overflowY: "auto", flex: 1, px: 2, pb: 2 }}>
              <RomDetails
                selectedDetail={selectedDetail}
                selectedFileName={selectedFileName}
                selectedProfile={selectedProfile}
                onUpload={() => { handleUpload(); setDetailDrawerOpen(false); }}
              />
            </Box>
          </Drawer>

          {/* Main content */}
          <MainLayout
            romList={
              <RomList
                summaries={summaries}
                hasFetched={hasFetched}
                selectedFileName={selectedFileName}
                onSelect={fetchDetail}
              />
            }
            romDetails={
              <RomDetails
                selectedDetail={selectedDetail}
                selectedFileName={selectedFileName}
                selectedProfile={selectedProfile}
                onUpload={handleUpload}
              />
            }
          />
        </Box>
      </>
    </ThemeProvider>
  );
}

export default UploadRom;
