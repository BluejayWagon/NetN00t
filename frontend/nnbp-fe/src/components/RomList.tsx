import React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";

interface RomSummary {
  name: string;
  fileName: string;
  imageUrl: string;
}

interface RomListProps {
  summaries: RomSummary[];
  hasFetched: boolean;
  selectedFileName: string;
  onSelect: (fileName: string) => void;
}

export default function RomList({
  summaries,
  hasFetched,
  selectedFileName,
  onSelect,
}: RomListProps) {
  if (!hasFetched) {
    return (
      <Typography variant="body1" color="text.secondary">
        Loading...
      </Typography>
    );
  }

  if (summaries.length === 0) {
    return (
      <Alert severity="info">No files found. Try a different profile.</Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "1fr 1fr",
          md: "1fr 1fr 1fr",
        },
        gap: 2,
      }}
    >
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
            bgcolor:
              selectedFileName === file.fileName
                ? "primary.light"
                : "background.paper",
            minHeight: { xs: "80px", md: "auto" },
          }}
          onClick={() => onSelect(file.fileName)}
        >
          <CardMedia
            component="img"
            sx={{ height: { xs: 70, md: 120 }, objectFit: "contain", bgcolor: "#f5f5f5" }}
            image={file.imageUrl}
            alt={file.name}
          />
          <CardContent sx={{ textAlign: "center", p: { xs: 1, md: 2 } }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {file.name}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
