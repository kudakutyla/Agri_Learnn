# Deployment Configuration

## Backend

Copy `server/.env.example` to `server/.env` and provide a unique JWT secret with at least 32 characters. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` with your email provider's SMTP settings to enable password reset emails. Set `PASSWORD_RESET_URL` to the app's `agrilearn:///reset-password` deep link, or to your deployed web reset page. Keep provider credentials in environment variables and never commit them. The server uses a local JSON data file by default; set `DATA_FILE` to a persistent writable path in production.

For private lesson video storage, configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`), and `R2_REGION=auto` as backend-only environment variables. Optional size/multipart settings are documented in [CLOUDFLARE_R2_SETUP.md](./CLOUDFLARE_R2_SETUP.md). Do not set these variables on the Expo/mobile service. Video metadata remains in the current JSON store, so a persistent backend disk is required until PostgreSQL/Neon persistence is implemented.

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
