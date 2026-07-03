# Yoga Analytics

Next.js and TypeScript app for daily yoga check-ins backed by Google Sheets.

## Google Sheet

Create a tab named `Checkins` with these columns:

```text
id | name | normalized_name | date | response | created_at | updated_at
```

The app can create the header row automatically when the sheet tab is empty.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```text
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEET_ID=
GOOGLE_SHEET_TAB_NAME=Checkins
APP_TIME_ZONE=America/New_York
ADMIN_PASSWORD=
```

Share the Google Sheet with the service account email using Editor access.

`ADMIN_PASSWORD` is the password for the admin page.

## Run

```bash
npm install
npm run dev
```
