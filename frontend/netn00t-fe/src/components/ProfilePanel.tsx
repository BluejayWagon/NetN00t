import React from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

interface Profile {
  id: string;
  name: string;
  boardType: string;
  monitorOrientation: string;
  ip: string;
  notes?: string;
  picture?: string;
}

interface ProfilePanelProps {
  profiles: Profile[];
  selectedProfileId: string;
  selectedProfile: Profile | null;
  onProfileChange: (id: string) => void;
  onNewProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onDeleteProfile: (profileId: string) => void;
}

export default function ProfilePanel({
  profiles,
  selectedProfileId,
  selectedProfile,
  onProfileChange,
  onNewProfile,
  onEditProfile,
  onDeleteProfile,
}: ProfilePanelProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2, gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Active Profile:
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <Select
            value={selectedProfileId}
            onChange={(e) => onProfileChange(e.target.value)}
            displayEmpty
            size="small"
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
          onClick={onNewProfile}
          size="medium"
          sx={{ minHeight: "40px" }}
        >
          New Profile
        </Button>
        {selectedProfile && (
          <>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEditProfile(selectedProfile)}
              size="medium"
              sx={{ minHeight: "40px" }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => onDeleteProfile(selectedProfile.id)}
              size="medium"
              sx={{ minHeight: "40px" }}
            >
              Delete
            </Button>
          </>
        )}
      </Stack>
      {selectedProfile && (
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Board:</strong> {selectedProfile.boardType} |{" "}
            <strong>Orientation:</strong> {selectedProfile.monitorOrientation} |{" "}
            <strong>IP:</strong> {selectedProfile.ip}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
