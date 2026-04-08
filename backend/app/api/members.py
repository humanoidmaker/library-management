from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import random
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/members", tags=["members"])

MAX_BOOKS_MAP = {"student": 3, "teacher": 5, "public": 2}


def member_serial(m: dict) -> dict:
    m["id"] = str(m.pop("_id"))
    return m


async def generate_membership_number(db) -> str:
    while True:
        num = f"LIB-{random.randint(1000, 9999)}"
        if not await db.members.find_one({"membership_number": num}):
            return num


@router.get("/")
async def list_members(
    q: str = Query(""),
    type: str = Query("", alias="type"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query: dict = {"is_active": {"$ne": False}}
    if q:
        regex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": regex}, {"phone": regex}, {"email": regex}, {"membership_number": regex}]
    if type:
        query["membership_type"] = type
    total = await db.members.count_documents(query)
    cursor = db.members.find(query).sort("name", 1).skip((page - 1) * limit).limit(limit)
    members = []
    async for m in cursor:
        m_data = member_serial(m)
        issued = await db.issued_books.count_documents({"member_id": m_data["id"], "status": "issued"})
        m_data["books_currently_issued"] = issued
        members.append(m_data)
    return {"success": True, "members": members, "total": total, "page": page}


@router.get("/membership/{number}")
async def get_by_membership(number: str, db=Depends(get_db), user=Depends(get_current_user)):
    member = await db.members.find_one({"membership_number": number})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True, "member": member_serial(member)}


@router.get("/{member_id}")
async def get_member(member_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    member = await db.members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    result = member_serial(member)
    issued = []
    cursor = db.issued_books.find({"member_id": member_id, "status": "issued"}).sort("due_date", 1)
    async for iss in cursor:
        iss["id"] = str(iss.pop("_id"))
        if iss.get("book_id"):
            book = await db.books.find_one({"_id": ObjectId(iss["book_id"])})
            iss["book_title"] = book.get("title", "Unknown") if book else "Unknown"
            iss["book_isbn"] = book.get("isbn", "") if book else ""
        else:
            iss["book_title"] = "Unknown"
            iss["book_isbn"] = ""
        issued.append(iss)
    result["issued_books"] = issued
    result["books_currently_issued"] = len(issued)
    fines = []
    cursor = db.issued_books.find({"member_id": member_id, "fine_amount": {"$gt": 0}}).sort("return_date", -1)
    async for f in cursor:
        f["id"] = str(f.pop("_id"))
        if f.get("book_id"):
            book = await db.books.find_one({"_id": ObjectId(f["book_id"])})
            f["book_title"] = book.get("title", "Unknown") if book else "Unknown"
        else:
            f["book_title"] = "Unknown"
        fines.append(f)
    result["fine_history"] = fines
    result["total_fines"] = sum(f.get("fine_amount", 0) for f in fines)
    return {"success": True, "member": result}


@router.post("/")
async def create_member(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    existing = await db.members.find_one({"phone": data.get("phone", "")})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    mtype = data.get("membership_type", "public")
    membership_number = await generate_membership_number(db)
    member = {
        "name": data["name"],
        "phone": data["phone"],
        "email": data.get("email", ""),
        "membership_type": mtype,
        "membership_number": membership_number,
        "membership_expiry": data.get("membership_expiry", (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()),
        "max_books": MAX_BOOKS_MAP.get(mtype, 2),
        "address": data.get("address", ""),
        "total_books_issued": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.members.insert_one(member)
    return {"success": True, "id": str(result.inserted_id), "membership_number": membership_number, "message": "Member registered"}


@router.put("/{member_id}")
async def update_member(member_id: str, data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    existing = await db.members.find_one({"_id": ObjectId(member_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")
    update_fields = {}
    allowed = ["name", "phone", "email", "membership_type", "membership_expiry", "address", "is_active"]
    for key in allowed:
        if key in data:
            update_fields[key] = data[key]
    if "membership_type" in update_fields:
        update_fields["max_books"] = MAX_BOOKS_MAP.get(update_fields["membership_type"], 2)
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.members.update_one({"_id": ObjectId(member_id)}, {"$set": update_fields})
    return {"success": True, "message": "Member updated"}


@router.delete("/{member_id}")
async def delete_member(member_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    member = await db.members.find_one({"_id": ObjectId(member_id)})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    issued = await db.issued_books.count_documents({"member_id": member_id, "status": "issued"})
    if issued > 0:
        raise HTTPException(status_code=400, detail="Cannot delete member with active issues")
    await db.members.update_one({"_id": ObjectId(member_id)}, {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "message": "Member deleted"}
