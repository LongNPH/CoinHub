# CoinHub Render Deploy

Render is the simplest cloud path for this demo because one Blueprint can create:

- a Node backend web service
- a React static frontend
- a PostgreSQL database
- a Redis-compatible Key Value cache

## Before Deploying

1. Push this repository to GitHub.
2. Create a Brevo account.
3. In Brevo, create an API key for transactional email.
4. In Brevo, register and verify the sender email you will put in `BREVO_SENDER_EMAIL`.
5. Create a Render account.
6. In Render, choose **New > Blueprint** and select this repository.
7. Render will read `render.yaml` from the repo root.

## Values Render Will Ask For

Enter these during the Blueprint creation flow:

| Variable | Service | Value |
|---|---|---|
| `FRONTEND_URL` | backend | Frontend Render URL, for example `https://coinhub-frontend.onrender.com` |
| `VITE_API_URL` | frontend | Backend Render URL, for example `https://coinhub-backend.onrender.com` |
| `VITE_WS_URL` | frontend | Same backend Render URL as `VITE_API_URL` |
| `COINGECKO_API_KEY` | backend | Leave blank if not using a CoinGecko demo key |
| `BREVO_API_KEY` | backend | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | backend | Sender email registered and verified in Brevo |
| `BREVO_SENDER_NAME` | backend | Sender display name, for example `CoinHub` |

Brevo sends through HTTPS instead of SMTP, so Render Free can deliver real OTP and price alert emails to Gmail inboxes. The backend still keeps SMTP fallback for local Docker Mailpit when `BREVO_API_KEY` is not set.

## After Deploying

1. Wait for the backend deployment to finish before testing the frontend.
2. Open the frontend Render URL.
3. Login with the seeded admin account created by backend startup.
4. Check backend logs if the first boot takes longer because coin and price history seed data is being fetched.

## Notes

- The backend now creates the PostgreSQL schema on startup before seeding data, so Render Postgres does not need Docker init scripts.
- Render terminates HTTPS for the frontend and backend URLs automatically.
- Render free backend instances can sleep after idle time. Open the frontend and give the backend time to wake before presenting.
- Brevo requires `BREVO_SENDER_EMAIL` to be registered and verified before the transactional email API can use it.
