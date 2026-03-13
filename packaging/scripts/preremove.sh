#!/bin/sh
# Only stop/disable on a true removal, not during an upgrade
# rpm: $1=0 means remove; deb: $1="remove"
if [ "${1}" = "remove" ] || [ "${1}" -eq 0 ] 2>/dev/null; then
    systemctl stop netn00t
    systemctl disable netn00t
fi
