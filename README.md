# Literature Stock Counter

A small, mobile-first app for estimating literature quantities from measured weight. The interface is in Portuguese and the app keeps all data on the device. It needs no login, server, or JW.org connection.

## Run on your computer

The app uses browser modules, IndexedDB, a service worker, and camera APIs. Open it from a local web server rather than by double-clicking `index.html`.

1. Install Python 3 if it is not already installed.
2. Open a terminal in this folder.
3. Run `python -m http.server 8000`.
4. Open `http://localhost:8000` in a current browser.

The app's calculations and manual entry work immediately. Camera access is allowed on `localhost`; on a phone, camera access requires HTTPS.

## Put the project on GitHub

1. Sign in at GitHub and choose **New repository**.
2. Give it a name such as `literature-stock-counter`. For a first setup, choose **Public** and do not add a README, license, or `.gitignore` (this folder already has a README).
3. On the new repository page choose **Add file → Upload files**.
4. Open this project folder on your computer and drag its files and folders into the upload area. Include `index.html`, `manifest.json`, `service-worker.js`, and the `css`, `js`, `locales`, and `icons` folders.
5. Enter a commit message such as `Add literature counter` and choose **Commit changes**.

## Publish with GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/(root)` folder, then choose **Save**.
4. Wait for the Pages address to appear on that screen. It will look like `https://YOUR-USERNAME.github.io/literature-stock-counter/`.
5. Open that HTTPS address on your Android phone. GitHub Pages provides HTTPS, which browsers require for installation, offline service workers, and camera access.

When you upload an update, the service worker caches the new app files when the browser next loads them. If an older screen remains open, close and reopen the app to receive the update.

## Install on Android

Open the Pages address in Chrome. Use the browser menu and choose **Install app** or **Add to Home screen**. The wording depends on the browser version. Open the installed app once while connected so its files are cached. The built-in QR scanner uses `BarcodeDetector` where the browser supports it; manual code entry remains available on every device.

## Data, backups, and privacy

Literature, calibrations, weighing records, and settings are stored in the browser's IndexedDB on that device. Clearing browser site data or uninstalling/resetting the browser may remove the local data. Use **Histórico → Exportar dados** regularly to save a JSON backup somewhere safe. On another device, open the app and choose **Importar dados**. Import validates the backup, asks before replacing current data, and leaves current data untouched if the file is invalid.

The service worker stores the app shell for offline use. All normal counting, literature, calculations, and history functions work without a network after the first successful load. QR scanning needs a supported browser and camera permission, and adding the app to another device needs transferring a backup.

## Test

Open `tests/calculations.test.js` in a modern browser, or use a JavaScript runtime with ES module support. It checks calibration, integer and fractional estimates, decimal input, and invalid values. Also run the sample workflow in the app: create a literature with 100 copies and 820 g, then weigh 410 g, 1,230 g, and 820 g at the three locations. The stock page should total about 300 copies.

## Localization

Visible UI text is in `locales/pt.js`; `js/i18n.js` provides the small translation lookup. Add a language dictionary and register it there to add another language. Literature codes are stored separately and never translated.
