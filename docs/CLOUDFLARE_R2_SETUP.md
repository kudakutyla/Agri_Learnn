# Cloudflare R2 Setup

This project uses Cloudflare R2's S3-compatible API for private lesson videos. R2 credentials are backend-only; never add them to Expo `EXPO_PUBLIC_*` variables, mobile code, or a checked-in file.

## 1. Create an R2 bucket and API token

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) or create an account.
2. Open **R2 Object Storage**, enable R2 billing if prompted, and create a bucket dedicated to AgriLearn videos. Keep the bucket private; do not enable public access or a public custom domain.
3. In **Manage R2 API Tokens**, create a token scoped to this bucket with **Object Read & Write** permissions. Keep the Access Key ID and Secret Access Key private. Do not use an account-wide token when a bucket-scoped token is available.
4. Copy the Cloudflare account ID from the dashboard. The S3 endpoint must be `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## 2. Configure local backend development

Copy `server/.env.example` to `server/.env` and set these values:

```dotenv
R2_ACCOUNT_ID=<Cloudflare account ID>
R2_ACCESS_KEY_ID=<bucket-scoped access key>
R2_SECRET_ACCESS_KEY=<bucket-scoped secret key>
R2_BUCKET_NAME=<private bucket name>
R2_ENDPOINT=https://<Cloudflare account ID>.r2.cloudflarestorage.com
R2_REGION=auto
```

Optional upload tuning:

```dotenv
R2_MAX_VIDEO_BYTES=2147483648
R2_MULTIPART_THRESHOLD_BYTES=104857600
R2_MULTIPART_PART_SIZE_BYTES=16777216
```

The defaults allow up to 2 GiB per video, use multipart uploads at 100 MiB, and upload 16 MiB parts. Multipart part size must be at least 5 MiB. Restart the backend after changing environment variables. Keep `server/.env` out of source control.

## 3. Configure bucket CORS

Direct uploads originate from the mobile app/browser, not the Express server. Configure the bucket's CORS policy to allow only the app's development and production origins. Add `PUT`, `GET`, and `HEAD`; allow the `Content-Type` request header; and expose `ETag`, `Content-Length`, `Content-Range`, and `Accept-Ranges` for multipart upload confirmation and media seeking. Example policy (replace the origins):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8081",
      "http://localhost:19006",
      "https://<your-production-app-origin>"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Native iOS/Android requests do not use browser CORS, but the web client does. Do not use `*` for production origins.

## 4. Configure Render

In the Render dashboard, open the backend service's **Environment** settings and add the six `R2_*` variables above as secret environment values. Render must run the `server/` package. Set `R2_ENDPOINT` from the account ID exactly, keep `R2_REGION=auto`, and redeploy. Do not place R2 credentials in the mobile service's environment.

The current backend database is `server/data/agrilearn.json`, not PostgreSQL/Neon. Configure a persistent Render disk and point `DATA_FILE` to it if JSON persistence is used in deployment. R2 stores video objects only; it does not make the JSON metadata durable. A relational database migration remains necessary for production-grade metadata persistence.

## 5. Verify setup and monitor usage

1. Start the server and call `GET /api/health`.
2. Sign in as an authorized trainer, create/edit a draft course with a video lesson, and upload a small MP4 or MOV from the app.
3. Confirm the trainer sees the video as `READY`, can preview it, and that the object appears in the private R2 bucket under a generated `videos/` key.
4. Publish the course, enrol as a learner, and play/seek the lesson. Request playback without enrolment and confirm it is rejected.
5. Replace and delete a video, then verify the old object is removed and the deleted video no longer yields a playback URL.
6. See [VIDEO_UPLOAD_TESTS.md](./VIDEO_UPLOAD_TESTS.md) for the full acceptance checklist.

Use the R2 bucket's **Metrics/Analytics** and Cloudflare **Billing** pages to monitor stored bytes, operation counts, and current free-tier usage. Allowances and pricing can change; rely on the current dashboard rather than hard-coding a free-tier quota. Configure Cloudflare's incomplete multipart-upload lifecycle cleanup where available, and review failed/pending records in the administrator video page.

If variables are absent, the API reports that cloud video storage is not configured. If they are wrong or the bucket is unreachable, upload/playback operations return a safe storage error; no credentials or provider error details are returned to the app.
