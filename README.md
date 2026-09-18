# companion-module-iina-remote

Bitfocus Companion 5.x connection module for the IINA Companion Remote plugin.

Supports authenticated remote playback, live status and countdown variables, media-library presets,
multiple named IINA player windows, target-display fullscreen playback, looping, and close-on-finish.
Version 0.5.1 also provides actions and ready-made buttons to show/hide the IINA Remote Controller and
switch it between full and compact layouts.

Version 0.6.0 adds heartbeat-based disconnect detection and automatic recovery when IINA or its Mac
goes offline and later returns. A stale connection is marked disconnected within about 15 seconds.

Requires the matching [IINA Companion Remote plugin](https://github.com/houtacheng/iina-companion-remote).

Build with `yarn install`, then `yarn package`. Import the generated `.tgz` from Companion → Modules → Import module package.

Downloads and the setup guide: https://houtacheng.github.io/companion-module-iina-remote/
