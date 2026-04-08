from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import csv
import io
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/circulation", tags=["circulation"])


def issue_serial(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/issue")
async def issue_book(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    book = await db.books.find_one({"_id": ObjectId(data["book_id"])})
    if not book or book.get("copies_available", 0) <= 0:
        raise HTTPException(status_code=400, detail="Book not available")
    member = await db.members.find_one({"_id": ObjectId(data["member_id"])})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if not member.get("is_active", True):
        raise HTTPException(status_code=400, detail="Member account is inactive")
    issued_count = await db.issued_books.count_documents({"member_id": data["member_id"], "status": "issued"})
    max_books = member.get("max_books", 2)
    if issued_count >= max_books:
        raise HTTPException(status_code=400, detail=f"Member has reached max books limit ({max_books})")
    # Check if same book already issued to same member
    already = await db.issued_books.find_one({"book_id": data["book_id"], "member_id": data["member_id"], "status": "issued"})
    if already:
        raise HTTPException(status_code=400, detail="This book is already issued to this member")
    settings_doc = await db.settings.find_one({"key": "issue_duration_days"})
    days = int(settings_doc["value"]) if settings_doc else 14
    now = datetime.now(timezone.utc)
    due_date = now + timedelta(days=days)
    issue = {
        "book_id": data["book_id"],
        "member_id": data["member_id"],
        "book_title": book["title"],
        "book_isbn": book.get("isbn", ""),
        "member_name": member["name"],
        "membership_number": member.get("membership_number", ""),
        "issued_date": now,
        "due_date": due_date,
        "return_date": None,
        "status": "issued",
        "renewals": 0,
        "fine_amount": 0,
        "fine_paid": False,
        "created_at": now,
    }
    result = await db.issued_books.insert_one(issue)
    await db.books.update_one({"_id": ObjectId(data["book_id"])}, {"$inc": {"copies_available": -1}})
    await db.members.update_one({"_id": ObjectId(data["member_id"])}, {"$inc": {"total_books_issued": 1}})
    return {
        "success": True,
        "id": str(result.inserted_id),
        "due_date": due_date.isoformat(),
        "message": f"'{book['title']}' issued to {member['name']}, due on {due_date.strftime('%d %b %Y')}",
    }


@router.post("/return/{issue_id}")
async def return_book(issue_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    issue = await db.issued_books.find_one({"_id": ObjectId(issue_id)})
    if not issue or issue["status"] != "issued":
        raise HTTPException(status_code=400, detail="Invalid return - book not currently issued")
    now = datetime.now(timezone.utc)
    fine = 0
    overdue_days = 0
    if now > issue["due_date"]:
        overdue_days = (now - issue["due_date"]).days
        fine_doc = await db.settings.find_one({"key": "fine_per_day"})
        fine_rate = int(fine_doc["value"]) if fine_doc else 5
        fine = overdue_days * fine_rate
    await db.issued_books.update_one({"_id": ObjectId(issue_id)}, {"$set": {
        "status": "returned",
        "return_date": now,
        "fine_amount": fine,
        "overdue_days": overdue_days,
    }})
    await db.books.update_one({"_id": ObjectId(issue["book_id"])}, {"$inc": {"copies_available": 1}})
    msg = f"Book returned. Fine: Rs.{fine} ({overdue_days} days overdue)" if fine else "Book returned successfully"
    return {"success": True, "fine": fine, "overdue_days": overdue_days, "message": msg}


@router.post("/renew/{issue_id}")
async def renew_book(issue_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    issue = await db.issued_books.find_one({"_id": ObjectId(issue_id)})
    if not issue or issue["status"] != "issued":
        raise HTTPException(status_code=400, detail="Invalid renewal")
    max_renewals_doc = await db.settings.find_one({"key": "max_renewals"})
    max_renewals = int(max_renewals_doc["value"]) if max_renewals_doc else 1
    if issue.get("renewals", 0) >= max_renewals:
        raise HTTPException(status_code=400, detail=f"Maximum renewals ({max_renewals}) reached")
    now = datetime.now(timezone.utc)
    if now > issue["due_date"]:
        raise HTTPException(status_code=400, detail="Cannot renew overdue book. Please return first.")
    duration_doc = await db.settings.find_one({"key": "issue_duration_days"})
    days = int(duration_doc["value"]) if duration_doc else 14
    new_due = issue["due_date"] + timedelta(days=days)
    await db.issued_books.update_one({"_id": ObjectId(issue_id)}, {
        "$set": {"due_date": new_due},
        "$inc": {"renewals": 1},
    })
    return {"success": True, "new_due_date": new_due.isoformat(), "message": f"Renewed. New due date: {new_due.strftime('%d %b %Y')}"}


@router.get("/issued")
async def list_issued(db=Depends(get_db), user=Depends(get_current_user)):
    docs = await db.issued_books.find({"status": "issued"}).sort("due_date", 1).to_list(500)
    now = datetime.now(timezone.utc)
    results = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["is_overdue"] = now > d.get("due_date", now)
        if d["is_overdue"]:
            d["overdue_days"] = (now - d["due_date"]).days
        results.append(d)
    return {"success": True, "issued": results}


@router.get("/overdue")
async def list_overdue(db=Depends(get_db), user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    docs = await db.issued_books.find({"status": "issued", "due_date": {"$lt": now}}).sort("due_date", 1).to_list(500)
    fine_doc = await db.settings.find_one({"key": "fine_per_day"})
    fine_rate = int(fine_doc["value"]) if fine_doc else 5
    results = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["overdue_days"] = (now - d["due_date"]).days
        d["estimated_fine"] = d["overdue_days"] * fine_rate
        results.append(d)
    return {"success": True, "overdue": results}


@router.get("/history")
async def issue_history(
    member_id: str = Query(""),
    book_id: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query: dict = {}
    if member_id:
        query["member_id"] = member_id
    if book_id:
        query["book_id"] = book_id
    total = await db.issued_books.count_documents(query)
    cursor = db.issued_books.find(query).sort("issued_date", -1).skip((page - 1) * limit).limit(limit)
    records = []
    async for d in cursor:
        d["id"] = str(d.pop("_id"))
        records.append(d)
    return {"success": True, "history": records, "total": total, "page": page}


@router.get("/stats")
async def circulation_stats(db=Depends(get_db), user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    total_issued = await db.issued_books.count_documents({"status": "issued"})
    issued_today = await db.issued_books.count_documents({"status": "issued", "issued_date": {"$gte": today_start}})
    returned_today = await db.issued_books.count_documents({"status": "returned", "return_date": {"$gte": today_start}})
    overdue = await db.issued_books.count_documents({"status": "issued", "due_date": {"$lt": now}})
    fine_pipe = [{"$match": {"fine_amount": {"$gt": 0}}}, {"$group": {"_id": None, "total": {"$sum": "$fine_amount"}}}]
    fine_result = await db.issued_books.aggregate(fine_pipe).to_list(1)
    total_fines = fine_result[0]["total"] if fine_result else 0
    # Popular books (top 10 most issued)
    pop_pipe = [
        {"$group": {"_id": "$book_id", "title": {"$first": "$book_title"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    popular = await db.issued_books.aggregate(pop_pipe).to_list(10)
    # Genre distribution
    genre_pipe = [
        {"$lookup": {"from": "books", "let": {"bid": {"$toObjectId": "$book_id"}}, "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$bid"]}}}], "as": "book"}},
        {"$unwind": {"path": "$book", "preserveNullAndEmptyArrays": True}},
        {"$group": {"_id": "$book.genre", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    genre_dist = await db.issued_books.aggregate(genre_pipe).to_list(20)
    # Daily trend (last 14 days)
    trend = []
    for i in range(13, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        issued_c = await db.issued_books.count_documents({"issued_date": {"$gte": day_start, "$lt": day_end}})
        returned_c = await db.issued_books.count_documents({"return_date": {"$gte": day_start, "$lt": day_end}})
        trend.append({"date": day_start.strftime("%d %b"), "issued": issued_c, "returned": returned_c})
    return {
        "success": True,
        "stats": {
            "total_issued": total_issued,
            "issued_today": issued_today,
            "returned_today": returned_today,
            "overdue": overdue,
            "total_fines_collected": total_fines,
        },
        "popular_books": popular,
        "genre_distribution": genre_dist,
        "daily_trend": trend,
    }


@router.get("/export-csv")
async def export_csv(status: str = Query(""), db=Depends(get_db), user=Depends(get_current_user)):
    query: dict = {}
    if status:
        query["status"] = status
    docs = await db.issued_books.find(query).sort("issued_date", -1).to_list(5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Book Title", "ISBN", "Member Name", "Membership#", "Issued Date", "Due Date", "Return Date", "Status", "Fine"])
    for d in docs:
        writer.writerow([
            d.get("book_title", ""),
            d.get("book_isbn", ""),
            d.get("member_name", ""),
            d.get("membership_number", ""),
            d.get("issued_date", ""),
            d.get("due_date", ""),
            d.get("return_date", ""),
            d.get("status", ""),
            d.get("fine_amount", 0),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=circulation_report.csv"},
    )
