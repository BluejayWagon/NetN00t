import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

interface SettingsDialogProps {
  open: boolean;
  isFirstRun: boolean;
  romDirectory: string;
  onSave: (dir: string) => void;
  onClose: () => void;
}

function SettingsDialog({
  open,
  isFirstRun,
  romDirectory,
  onSave,
  onClose,
}: SettingsDialogProps) {
  const [input, setInput] = useState(romDirectory);

  useEffect(() => {
    if (open) {
      setInput(romDirectory);
    }
  }, [open, romDirectory]);

  const handleSave = () => {
    if (!input.trim()) return;
    onSave(input.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={isFirstRun ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={isFirstRun}
    >
      <DialogTitle>
        {isFirstRun ? "Welcome — Set Your ROM Directory" : "Settings"}
      </DialogTitle>
      <DialogContent>
        {isFirstRun && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter the path to your ROM directory to get started. This is where
            your <strong>.bin</strong> ROM files are stored.
          </Typography>
        )}
        <TextField
          autoFocus
          fullWidth
          label="ROM Directory"
          placeholder="C:\Games\Naomi\Roms"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {!isFirstRun && (
          <Button onClick={onClose} color="inherit" sx={{ minHeight: "48px" }}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!input.trim()}
          sx={{ minHeight: "48px" }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SettingsDialog;
