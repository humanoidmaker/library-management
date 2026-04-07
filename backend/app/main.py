from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, books, members, circulation, settings as settings_api

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="BookStack Library API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(books.router)
app.include_router(members.router)
app.include_router(circulation.router)
app.include_router(settings_api.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "BookStack Library"}

@app.get("/api/stats")
async def stats():
    from app.core.database import get_db as gdb
    db = await gdb()
    tb = await db.books.count_documents({"is_active": {"$ne": False}})
    tm = await db.members.count_documents({"is_active": {"$ne": False}})
    ti = await db.issued_books.count_documents({"status": "issued"})
    from datetime import datetime, timezone
    to = await db.issued_books.count_documents({"status": "issued", "due_date": {"$lt": datetime.now(timezone.utc)}})
    return {"stats": {"total_books": tb, "total_members": tm, "books_issued": ti, "overdue": to}}
