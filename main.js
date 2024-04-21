// This is free and unencumbered software released into the public domain.
// See LICENSE for details

const { app, BrowserWindow, Menu } = require('electron');
const log = require('electron-log');
const { autoUpdater } = require("electron-updater");
const http = require('http');

// Interval to check for updates (in milliseconds)
// const updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
const updateCheckInterval = 60 * 1000; // 24 hours

//-------------------------------------------------------------------
// Logging
//
// THIS SECTION IS NOT REQUIRED
//
// This logging setup is not required for auto-updates to work,
// but it sure makes debugging easier :)
//-------------------------------------------------------------------
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

//-------------------------------------------------------------------
// Define the menu
//
// THIS SECTION IS NOT REQUIRED
//-------------------------------------------------------------------
let template = []
if (process.platform === 'darwin') {
  // OS X
  const name = app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() { app.quit(); }
      },
    ]
  })
}


//-------------------------------------------------------------------
// Open a window that displays the version
//
// THIS SECTION IS NOT REQUIRED
//
// This isn't required for auto-updates to work, but it's easier
// for the app to show a window than to have to click "About" to see
// that updates are working.
//-------------------------------------------------------------------
let win;

function sendStatusToWindow(text) {
  log.info(text);
  win.webContents.send('message', text);
}
function createDefaultWindow() {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,

    },
    darkTheme: true
  });
  win.webContents.openDevTools();
  win.on('closed', () => {
    win = null;
  });
  win.loadURL(`file://${__dirname}/version.html#v${app.getVersion()}`);
  return win;
}

function clientApprovedForUpdates(version) {
  const options = {
    hostname: '127.0.0.1',
    port: 8000,
    path: `/updateAvailable?version=${version}&machine=123`,
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    let data = '';

    // Concatenate data chunks as they arrive
    res.on('data', (chunk) => {
      data += chunk;
    });

    // Handle the end of the response
    res.on('end', () => {
      // If the request is successful (status code 200), handle the response
      if (res.statusCode === 200) {
        console.log('Response:', data);
        // Do something with the response data
        sendStatusToWindow(`Update ${version} downloading.`);
        autoUpdater.version = version.version;
        autoUpdater.downloadUpdate();
      } else {
        console.error('Error: Unexpected status code:', res.statusCode);
        // Handle other status codes (optional)
        sendStatusToWindow(`Update ${version} not approved.`);
      }
    });
  });

  // Handle errors during the request
  req.on('error', (error) => {
    console.error('Error:', error.message);
    sendStatusToWindow(`Update ${version} not approved.`);
    // Handle the error accordingly
  });

  // End the request
  req.end();

}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...');
})
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow(`Update available ${info.version}.`);
  clientApprovedForUpdates(info.version);
})

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Update not available.');
})
autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error in auto-updater. ' + err);
})
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  sendStatusToWindow(log_message);
})
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded');
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  app.quit();
});


app.on('ready', function () {

  // Create the Menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createDefaultWindow();

  autoUpdater.autoDownload = false;

  function checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Call checkForUpdates initially when the app is ready
  checkForUpdates();

  // Set up interval to check for updates periodically
  setInterval(checkForUpdates, updateCheckInterval);
});


