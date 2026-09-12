# IINA Remote

This module controls IINA through the **IINA Companion Remote** plugin.

## Before connecting

1. Install IINA Companion Remote 0.2.0 or newer on the playback Mac.
2. Restart IINA and open one player window.
3. Open IINA Settings → Plugins → Companion Remote → Preferences.
4. Copy the pairing token and note the WebSocket port (default: 19190).
5. Allow incoming connections to IINA in the macOS firewall.

## Connection settings

- **Host:** Enter only the Mac's IP address or hostname, for example `192.168.1.50` or `iina-mac.local`. Do not add `ws://` or a port.
- **Port:** Defaults to `19190`.
- **Pairing token:** Paste the token shown by the IINA plugin.

Companion adds the WebSocket scheme and IPv6 brackets automatically. The IINA plugin currently uses unencrypted WebSocket, so use it only on a trusted LAN or VPN. Do not expose the port directly to the public internet.

Version 0.2 supports one open IINA player window.

## Playback completion and countdown

- `$(iina-remote:remaining_seconds)` is an integer countdown and reaches exactly `0` at natural EOF.
- `$(iina-remote:playback_finished)` becomes `true` only after natural playback completion.
- The **Playback finished** feedback is recommended for Companion triggers because an idle player can also have zero remaining seconds.
- Use **Close player window automatically when playback finishes** to enable or disable closing the IINA player one second after the final completion state is sent.

Version 0.3 also adds frame stepping, screenshots, chapters, playlist management, file and playlist looping, AB loop, track selection, audio/subtitle delay, subtitle visibility, rotation, aspect ratio, video adjustments, window/sidebar controls, and IINA OSD messages.

## Selecting a media file

Set **Media Folder** in IINA Settings → Plugins → Companion Remote. After Companion connects, the module scans that folder and fills the **Play a file from the media folder** action with a file dropdown. Use **Refresh media library** after changing files or changing the folder.

## Full screen on another display

Use **Full screen on selected display** and choose display 2 for the second monitor. The module moves the IINA window first and then enables macOS full screen. If IINA is already full screen elsewhere, it exits full screen, moves the window, and enters full screen again.
