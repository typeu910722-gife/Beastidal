// Deployment settings. Fill googleClientId with an OAuth 2.0 "Web application" client ID from
// Google Cloud Console (APIs & Services > Credentials) and enable the Google Drive API.
// Leave it empty to ship a guest-only build: the game stays fully playable offline.
export const CONFIG = {
  googleClientId: '88386362927-ut3vim5c8qd154156af7tf5e0kugsjkj.apps.googleusercontent.com',
  // Drive appDataFolder is a hidden per-app folder; the game cannot see any other Drive file.
  driveScope: 'https://www.googleapis.com/auth/drive.appdata',
  driveFileName: 'beastidal-save.json',
  // Minimum seconds between automatic cloud uploads while playing.
  cloudSyncInterval: 60,
  // 0.48: the online message stele. Leave empty to keep the other residents simulated (works offline). Set it to the
  // site's own origin (e.g. 'https://beastidal.yzprojecttw.com') once worker/community.js is deployed with its D1
  // database — see docs/COMMUNITY.md.
  communityUrl: 'https://beastidal.yzprojecttw.com'
};
