#!/bin/sh
systemctl daemon-reload
if [ "${1}" = "configure" ] || [ "${1}" -eq 1 ] 2>/dev/null; then
    # Fresh install (deb: "configure", rpm: 1)
    systemctl enable netn00t
    systemctl start netn00t
else
    # Upgrade — restart to pick up new binary
    systemctl restart netn00t
fi
