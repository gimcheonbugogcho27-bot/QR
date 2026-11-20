const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 560, height: 900, minWidth: 400, minHeight: 600,
    title: 'QR 메이커',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#0f1530',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.webContents.on('did-finish-load', () => { win.focus(); win.webContents.focus(); });
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // 외부 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
