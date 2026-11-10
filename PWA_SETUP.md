# StudyMate AI app installation

This package adds installable PWA support to the existing FastAPI app.

## Deploy
Copy the changed files into the existing GitHub repository (keep your existing Render environment variables). Commit and push to `main`. Render will redeploy.

## Install
- Android Chrome: open the HTTPS site, browser menu > Install app / Add to Home screen.
- iPhone/iPad Safari: Share > Add to Home Screen.
- Desktop Chrome/Edge: use Install app in browser toolbar/menu when offered.

## Notes
The app shell can display from cache after a previous online visit, but Gemini AI generation requires internet. This version has no push notifications, user accounts, or app-store submission. Web content uses network-first caching so future website updates appear after refresh/reopen when online.
