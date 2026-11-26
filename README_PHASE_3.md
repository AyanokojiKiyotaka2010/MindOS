# MINDOS Phase 3 — Authentication and Profiles

## Features

- Registration with Argon2id password hashing
- Login and logout
- HTTP-only JWT session cookie
- Double-submit CSRF token for state-changing requests
- Protected profile and settings endpoints
- Profile display name, username, and bio updates
- Profile visibility and privacy settings
- React registration, login, route guard, and profile UI

## Environment

Copy `backend/.env.example` to `backend/.env` and set real values. Never commit `.env`.

Required database and auth values:

```env
DATABASE_URL=mysql+pymysql://mindos_app:CHANGE_ME@127.0.0.1:3306/mindos?charset=utf8mb4
AUTH_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_SECRET
AUTH_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=60
```

Use the same application database account verified during Phase 2. Generate a separate, high-entropy `AUTH_SECRET` locally.

## Install and run

Backend:

```powershell
cd C:\Users\jayrp\Projects\mindos\backend
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\jayrp\Projects\mindos\frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## API endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me/profile`
- `GET /api/v1/users/me/settings`
- `PATCH /api/v1/users/me/settings`

Cookie-authenticated mutation endpoints require `X-CSRF-Token` matching the `mindos_csrf` cookie.

## Test

```powershell
cd C:\Users\jayrp\Projects\mindos\backend
.\.venv\Scripts\python.exe -m pytest -q
```

```powershell
cd C:\Users\jayrp\Projects\mindos\frontend
npm run build
```
