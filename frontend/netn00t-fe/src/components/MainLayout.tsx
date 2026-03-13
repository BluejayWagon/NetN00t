import React from "react";
import { Box } from "@mui/material";

interface MainLayoutProps {
  romList: React.ReactNode;
  romDetails: React.ReactNode | null;
}

export default function MainLayout({ romList, romDetails }: MainLayoutProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        flexDirection: { xs: "column", md: "row" },
        overflow: { md: "hidden" },
      }}
    >
      {/* ROM list column — full height on mobile since details are in a drawer */}
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          overflowY: "auto",
          p: 2,
          borderRight: { md: "1px solid #e0e0e0" },
        }}
      >
        {romList}
      </Box>

      {/* ROM details column — desktop only */}
      {romDetails && (
        <Box
          sx={{
            width: "50%",
            overflowY: "auto",
            p: 2,
            display: { xs: "none", md: "block" },
          }}
        >
          {romDetails}
        </Box>
      )}
    </Box>
  );
}
