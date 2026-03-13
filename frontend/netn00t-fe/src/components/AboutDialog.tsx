import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";

interface AboutDialogProps {
  open: boolean;
  version: string;
  onClose: () => void;
}

function AboutDialog({ open, version, onClose }: AboutDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>About Netboot Portal</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          A self-contained web application for netbooting Sega arcade hardware
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Supports: Naomi 1, Naomi 2, Triforce, Chihiro
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" gutterBottom>
          <strong>Version:</strong> {version}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>License:</strong> MIT
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Copyright © 2026 BluejayWagon. Free to use, modify, and distribute
          with attribution.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ minHeight: "48px" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AboutDialog;
