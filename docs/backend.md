# TENVI Backend

TENVI backend is an ASP.NET Core Web API project at `backend/Tenvi.Backend/Tenvi.Api`.

## Health API

Run the backend and call:

```txt
GET http://localhost:5032/api/health
```

Expected response shape:

```json
{
  "ok": true,
  "service": "TENVI API",
  "message": "Backend is Running",
  "checkedAt": "UTC timestamp"
}
```

## Frontend Connection Check

The frontend Settings screen includes a backend status panel. It calls `/api/health`, then shows checking, connected, or failed state.

The API base URL is configured with Vite:

```txt
VITE_API_BASE_URL=http://localhost:5032
```

Copy `.env.example` to a local `.env` only when you need to override the default. Do not commit `.env`.

## CORS

The backend currently allows the Vite frontend origin:

```txt
http://localhost:5173
```

If the frontend dev server runs on another port, update the backend CORS policy or start Vite on the allowed origin.

## Build

```bash
dotnet build backend/Tenvi.Backend/Tenvi.Api/Tenvi.Api.csproj
```
