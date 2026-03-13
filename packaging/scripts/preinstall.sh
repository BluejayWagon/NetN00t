#!/bin/sh
getent group naomi >/dev/null || groupadd -r naomi
getent passwd naomi >/dev/null || useradd -r -g naomi -s /sbin/nologin -d /var/lib/naomi-netboot-portable -c "Naomi Netboot Portable" naomi
