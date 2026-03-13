import React from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

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

interface RomDetailsProps {
  selectedDetail: RomDetail | null;
  selectedFileName: string;
  selectedProfile: Profile | null;
  onUpload: () => void;
}

export default function RomDetails({
  selectedDetail,
  selectedFileName,
  selectedProfile,
  onUpload,
}: RomDetailsProps) {
  if (!selectedDetail) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          Select a ROM from the list to view details
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2" sx={{ fontSize: { xs: "1.2rem", md: "2rem" } }}>
        {selectedDetail.Name}
      </Typography>
      <Box
        component="img"
        src={`/images/${selectedDetail.PictureName}`}
        alt={selectedDetail.Name}
        sx={{
          maxWidth: "100%",
          maxHeight: { xs: "160px", md: "300px" },
          height: "auto",
          borderRadius: 2,
          objectFit: "contain",
        }}
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
        <Typography variant="body2" paragraph>
          {selectedDetail.Description}
        </Typography>
      )}
      <Button
        variant="contained"
        size="large"
        startIcon={<CloudUploadIcon />}
        onClick={onUpload}
        disabled={!selectedFileName || !selectedProfile}
        fullWidth
        sx={{ minHeight: "48px" }}
      >
        {selectedProfile
          ? `Upload to ${selectedProfile.name}`
          : "Select a profile to upload"}
      </Button>
    </Stack>
  );
}
