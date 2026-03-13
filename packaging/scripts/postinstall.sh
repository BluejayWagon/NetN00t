#!/bin/sh
systemctl daemon-reload
if [ "${1}" = "configure" ] || [ "${1}" -eq 1 ] 2>/dev/null; then
    # Fresh install (deb: "configure", rpm: 1)
    systemctl enable naomi-netboot-portable
    systemctl start naomi-netboot-portable
else
    # Upgrade — restart to pick up new binary
    systemctl restart naomi-netboot-portable
fi
