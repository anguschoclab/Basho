const fs = require('fs');
let content = fs.readFileSync('electron/main.ts', 'utf-8');

const targetAppWhenReady = `app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });`;

if (content.includes(targetAppWhenReady)) {
    console.log("App when ready found");
}
