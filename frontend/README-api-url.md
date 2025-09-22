Frontend API base URL

- The frontend reads NEXT_PUBLIC_API_URL (from .env.local) to know where to call the backend.
- Set it to your FastAPI server, for example:

NEXT_PUBLIC_API_URL=http://localhost:8000

Docker compose already sets this env in the frontend service. Locally, update frontend/.env.local and restart the dev server after changes.
