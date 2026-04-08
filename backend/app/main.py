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
    from datetime import datetime, timezone
    db = await gdb()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    total_books = await db.books.count_documents({"is_active": {"$ne": False}})
    total_members = await db.members.count_documents({"is_active": {"$ne": False}})
    issued_today = await db.issued_books.count_documents({"issued_date": {"$gte": today_start}})
    overdue_count = await db.issued_books.count_documents({"status": "issued", "due_date": {"$lt": now}})
    books_issued = await db.issued_books.count_documents({"status": "issued"})
    # Recently issued
    recent = await db.issued_books.find({"status": "issued"}).sort("issued_date", -1).limit(10).to_list(10)
    for r in recent:
        r["id"] = str(r.pop("_id"))
        r["is_overdue"] = now > r.get("due_date", now)
    return {
        "stats": {
            "total_books": total_books,
            "total_members": total_members,
            "issued_today": issued_today,
            "overdue_count": overdue_count,
            "books_issued": books_issued,
        },
        "recent_issued": recent,
    }
