from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/books", tags=["books"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("/")
async def list_books(q: str = "", genre: str = "", db=Depends(get_db)):
    f = {"is_active": {"$ne": False}}
    if q: f["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"author": {"$regex": q, "$options": "i"}}, {"isbn": q}]
    if genre: f["genre"] = genre
    docs = await db.books.find(f).sort("title", 1).to_list(500)
    return {"success": True, "books": [s(d) for d in docs]}

@router.get("/isbn/{isbn}")
async def by_isbn(isbn: str, db=Depends(get_db)):
    doc = await db.books.find_one({"isbn": isbn})
    if not doc: raise HTTPException(404, "Not found")
    return {"success": True, "book": s(doc)}

@router.post("/")
async def create(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.setdefault("copies_available", data.get("copies_total", 1))
    data.setdefault("is_active", True)
    r = await db.books.insert_one(data)
    return {"success": True, "id": str(r.inserted_id)}

@router.put("/{bid}")
async def update(bid: str, data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    data.pop("id", None); data.pop("_id", None)
    await db.books.update_one({"_id": ObjectId(bid)}, {"$set": data})
    return {"success": True}

@router.delete("/{bid}")
async def delete(bid: str, user=Depends(get_current_user), db=Depends(get_db)):
    await db.books.update_one({"_id": ObjectId(bid)}, {"$set": {"is_active": False}})
    return {"success": True}
