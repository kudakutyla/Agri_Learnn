# Deployment Configuration

## Backend

Copy `server/.env.example` to `server/.env` and provide a unique JWT secret with at least 32 characters. The server uses a local JSON data file by default; set `DATA_FILE` to a persistent writable path in production.

```powershell
cd server
npm install
npm run build
npm start
```

## Mobile

Set `EXPO_PUBLIC_API_URL` to the public API origin before starting Expo. Run:

```powershell
cd mobile
npm install
npx expo start
```
