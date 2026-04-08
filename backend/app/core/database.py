from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = None
db = None

async def get_db():
    return db

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_name = settings.MONGODB_URI.rsplit("/", 1)[-1].split("?")[0] or "library_mgmt"
    db = client[db_name]
    await db.books.create_index("isbn", unique=True)
    await db.members.create_index("phone", unique=True)
    await db.members.create_index("membership_number", unique=True)
    await db.issued_books.create_index([("member_id", 1), ("status", 1)])
    if not await db.settings.find_one({"key": "library_name"}):
        await db.settings.insert_many([
            {"key": "library_name", "value": "BookStack Library"},
            {"key": "library_address", "value": "789 Knowledge Lane"},
            {"key": "fine_per_day", "value": "5"},
            {"key": "issue_duration_days", "value": "14"},
            {"key": "max_renewals", "value": "1"},
        ])
    if await db.genres.count_documents({}) == 0:
        for g in ["Fiction", "Non-Fiction", "Science", "History", "Children"]:
            await db.genres.insert_one({"name": g, "slug": g.lower().replace("-", "")})

    # Email settings defaults
    email_defaults = [
        {"key": "smtp_host", "value": ""},
        {"key": "smtp_port", "value": "587"},
        {"key": "smtp_user", "value": ""},
        {"key": "smtp_pass", "value": ""},
        {"key": "smtp_from", "value": ""},
        {"key": "email_verification_enabled", "value": "true"},
        {"key": "email_welcome_enabled", "value": "true"},
        {"key": "email_password_reset_enabled", "value": "true"},
        {"key": "email_password_changed_enabled", "value": "true"},
        {"key": "require_email_verification", "value": "false"},
    ]
    for d in email_defaults:
        await db.settings.update_one({"key": d["key"]}, {"$setOnInsert": d}, upsert=True)

