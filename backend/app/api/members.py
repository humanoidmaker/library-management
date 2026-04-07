from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user
import random

router = APIRouter(prefix="/api/members", tags=["members"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_members(q: str = "", db=Depends(get_db), user=Depends(get_current_user)):
    f = {"is_active": {"$ne": False}}
    if q: f["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"phone": {"$regex": q}}, {"membership_number": {"$regex": q, "$options": "i"}}]
    docs = await db.members.find(f).sort("name", 1).to_list(500)
    return {"success": True, "members": [s(d) for d in docs]}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data["membership_number"] = f"LIB-{random.randint(1000,9999)}"
    data["is_active"] = True
    data["total_books_issued"] = 0
    data["created_at"] = datetime.now(timezone.utc)
    max_books = {"student": 3, "teacher": 5, "public": 2}
    data["max_books"] = max_books.get(data.get("membership_type", "public"), 2)
    r = await db.members.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{mid}")
async def update(mid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.pop("id", None); data.pop("_id", None)
    await db.members.update_one({"_id": ObjectId(mid)}, {"$set": data})
    return {"success": True}
