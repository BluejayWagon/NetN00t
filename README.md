# NetN00t

<p align="center">
  <img src="frontend/netn00t-fe/public/netn00t.png" alt="NetN00t logo" width="400" />
</p>

A self-contained web application for netbooting Sega arcade hardware. Point it at a directory of ROM files, create a board profile, and boot games from your browser.

The UI is fully mobile-friendly and ships as a PWA — on Android or iOS, use "Add to Home Screen" from your browser and it will behave like a native app.

**Supported hardware:** Naomi 1, Naomi 2, Triforce, Chihiro

---

## Requirements

- A net DIMM board installed in your arcade cabinet (the standard hardware required for netbooting)
- Your arcade board must be reachable on your local network — either connected to your LAN or wired directly to a host machine (e.g. a Raspberry Pi)
- ROM files (`.bin` format) sourced separately — this project provides no ROMs

---

## Installation

Pre-built packages for Linux (x86_64, arm64, and arm) are available on the [Releases](https://github.com/BluejayWagon/NetN00t/releases) page.

| Package suffix | Raspberry Pi models |
|----------------|---------------------|
| `linux_arm64` | Pi 3, 4, 5 — running a 64-bit OS |
| `linux_armv7` | Pi 2, 3, 4 — running a 32-bit OS |

### Debian / Ubuntu (including Raspberry Pi OS 64-bit)

```bash
sudo dpkg -i netn00t_*.deb
```

### RHEL / Fedora

```bash
sudo rpm -i netn00t_*.rpm
```

The package installs a systemd service that starts automatically on boot.

### Managing the service

```bash
sudo systemctl status netn00t
sudo systemctl restart netn00t
sudo systemctl stop netn00t
```

Logs are available via:

```bash
journalctl -u netn00t
```

To change the port, edit the `ExecStart` line in `/lib/systemd/system/netn00t.service` and add the `--port` flag:

```
ExecStart=/usr/bin/netn00t --data /var/lib/netn00t --port 9090
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart netn00t
```

---

## Usage

NetN00t runs on port `8080` by default. Open a browser to `http://<host-ip>:8080` — use `localhost` if you're on the same machine, or the host's IP address from another device on your network.

To use a different port, pass `--port <PORT>` when running the binary (see [Running manually](#running-manually)), or edit the systemd service file for package installs (see [Managing the service](#managing-the-service)).

**First launch:** the settings dialog opens automatically — set your ROM directory and create at least one [arcade board profile](#profiles) to get started. You can return to settings at any time via the **Settings** button. Configuration and profiles are stored in `/var/lib/netn00t/` (package installs) or the directory specified by `--data` (manual installs).

Once set up:

1. Select an arcade board profile from the profile selector
2. Browse the ROM list — it automatically filters to games compatible with your selected board and monitor orientation
3. Click a ROM to view details, then click **Upload** to netboot it to the arcade board

![Selecting a ROM and viewing details](docs/rom-select-demo.gif)

---

## Profiles

A profile represents one of your arcade cabinets. Each profile stores:

- **Name** — a label for the cabinet (e.g. "Naomi Cabinet 1")
- **Board type** — the hardware inside (Naomi 1, Naomi 2, Triforce, or Chihiro)
- **Monitor orientation** — horizontal or vertical (tate), used to filter out games that won't display correctly
- **IP address** — the IP assigned to the arcade board so NetN00t knows where to send the ROM.
- **Notes** — optional field for your own reference

You can create as many profiles as you have cabinets. The active profile is remembered between sessions.

### Automatic ROM filtering

When a profile is selected, the ROM list is automatically filtered to show only games compatible with that board type and monitor orientation. For example:

- A **Naomi 2** profile will show Naomi 1, Naomi 2, and Atomiswave games (Naomi 2 is backwards-compatible)
- A **Triforce** profile will show only Triforce games
- A profile set to **vertical** orientation will only show tate (vertical) games

This means you never have to manually hunt for compatible games — just pick your cabinet and browse.

---

## Running manually

If you prefer not to use the package, download the binary for your platform from the [Releases](https://github.com/BluejayWagon/NetN00t/releases) page and run it directly.

```bash
./netn00t --data ./config
```

| Flag | Default | Description |
|------|---------|-------------|
| `--data` | `./config` | Path to app data directory (stores ROM dir setting and profiles) |
| `--port` | `8080` | Port to listen on |

---

## Board compatibility

| Board | Plays |
|-------|-------|
| Naomi 1 | Naomi 1, Atomiswave |
| Naomi 2 | Naomi 1, Naomi 2, Atomiswave |
| Triforce | Triforce |
| Chihiro | Chihiro |

---

## Contributing

Contributions are welcome. The project is a Go backend with an embedded React (TypeScript/MUI) frontend.

**Prerequisites:**
- Go (version specified in `go.mod`)
- Node.js 20+

**Running in development:**

```bash
# Start the backend (API only)
go run . -mode=dev -data=./config

# In a separate terminal, start the frontend dev server
cd frontend/netn00t-fe
npm install
npm start
```

The React dev server proxies `/api/*` requests to `:8080`. Open `http://localhost:3000`.

**Running tests:**

```bash
# Go tests
go test ./...

# Frontend tests
cd frontend/netn00t-fe
npm test -- --watchAll=false
```

**Building a production binary:**

```bash
cd frontend/netn00t-fe && npm run build && cd ../..
go build -o netn00t .
```

**Adding ROM metadata:** Edit [file/romConfig.json](file/romConfig.json) — each entry needs `name`, `fileName`, `pictureName`, `boardType`, `genre`, `tate` (bool), and `description`. ROM artwork goes in [file/images/](file/images/).

---

## Acknowledgements

The netboot protocol implementation in this project is a Go rewrite of the work done by debugmode, whose [triforcetools.py](https://web.archive.org/web/20090824052208/http://debugmo.de/wp-content/uploads/2009/04/triforcetools.py) was the original documentation of how netdimm connections actually work. Without that script, none of this would have been possible.

Thanks also to [piforcetools](https://github.com/travistyoj/piforcetools) for demonstrating how that work could be put into practice.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Disclaimer

The game title images bundled with this project are the property of their respective copyright holders (Sega, etc.). They are included solely for identification purposes and are not covered by the MIT license. This project has no affiliation with or endorsement from Sega or any other rights holder. If you are a rights holder and have concerns, please open an issue.
