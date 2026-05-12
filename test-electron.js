const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

fs.writeFileSync('test.html', '<html><body>Hello</body></html>');

app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false });
  win.webContents.on('will-navigate', (event, url) => {
    console.log('will-navigate triggered:', url);
    event.preventDefault();
  });
  win.loadFile('test.html').then(() => {
    console.log('loadFile finished successfully');
    app.quit();
  }).catch(e => {
    console.log('loadFile failed:', e);
    app.quit();
  });
});
