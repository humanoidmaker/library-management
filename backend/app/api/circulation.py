from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/circulation", tags=["circulation"])

def s(doc):
    if doc: doc["id"] = str(doc.pop("_id"))
    return doc

@router.post("/issue")
async def issue_book(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    book = await db.books.find_one({"_id": ObjectId(data["book_id"])})
    if not book or book.get("copies_available", 0) <= 0:
        raise HTTPException(400, "Book not available")
    member = await db.members.find_one({"_id": ObjectId(data["member_id"])})
    if not member:
        raise HTTPException(404, "Member not found")
    issued_count = await db.issued_books.count_documents({"member_id": data["member_id"], "status": "issued"})
    if issued_count >= member.get("max_books", 2):
        raise HTTPException(400, f"Member has reached max books limit ({member.get('max_books', 2)})")
    settings_doc = await db.settings.find_one({"key": "issue_duration_days"})
    days = int(settings_doc["value"]) if settings_doc else 14
    now = datetime.now(timezone.utc)
    issue = {"book_id": data["book_id"], "member_id": data["member_id"], "book_title": book["title"], "member_name": member["name"],
             "issue_date": now, "due_date": now + timedelta(days=days), "status": "issued", "fine_amount": 0, "fine_paid": False}
    await db.issued_books.insert_one(issue)
    await db.books.update_one({"_id": ObjectId(data["book_id"])}, {"$inc": {"copies_available": -1}})
    return {"success": True, "message": f"Book issued to {member['name']}, due in {days} days"}

@router.post("/return/{iid}")
async def return_book(iid: str, user=Depends(get_current_user), db=Depends(get_db)):
    issue = await db.issued_books.find_one({"_id": ObjectId(iid)})
    if not issue or issue["status"] != "issued":
        raise HTTPException(400, "Invalid return")
    now = datetime.now(timezone.utc)
    fine = 0
    if now > issue["due_date"]:
        overdue_days = (now - issue["due_date"]).days
        fine_doc = await db.settings.find_one({"key": "fine_per_day"})
        fine_rate = int(fine_doc["value"]) if fine_doc else 5
        fine = overdue_days * fine_rate
    await db.issued_books.update_one({"_id": ObjectId(iid)}, {"$set": {"status": "returned", "return_date": now, "fine_amount": fine}})
    await db.books.update_one({"_id": ObjectId(issue["book_id"])}, {"$inc": {"copies_available": 1}})
    return {"success": True, "fine": fine, "message": f"Book returned. Fine: Rs.{fine}" if fine else "Book returned successfully"}

@router.get("/issued")
async def list_issued(db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.issued_books.find({"status": "issued"}).sort("due_date", 1).to_list(500)
    return {"success": True, "issued": [s(d) for d in docs]}

@router.get("/overdue")
async def overdue(db=Depends(get_db), user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    docs = await db.issued_books.find({"status": "issued", "due_date": {"$lt": now}}).sort("due_date", 1).to_list(500)
    return {"success": True, "overdue": [s(d) for d in docs]}
