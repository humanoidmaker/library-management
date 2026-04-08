from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/books", tags=["books"])


def book_serial(b: dict) -> dict:
    b["id"] = str(b.pop("_id"))
    return b


@router.get("/")
async def list_books(
    q: str = Query(""),
    genre: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    query: dict = {"is_active": {"$ne": False}}
    if q:
        regex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"title": regex}, {"author": regex}, {"isbn": regex}]
    if genre:
        query["genre"] = genre
    total = await db.books.count_documents(query)
    cursor = db.books.find(query).sort("title", 1).skip((page - 1) * limit).limit(limit)
    books = [book_serial(b) async for b in cursor]
    return {"success": True, "books": books, "total": total, "page": page}


@router.get("/genres")
async def list_genres(db=Depends(get_db), user=Depends(get_current_user)):
    genres = await db.genres.find().to_list(100)
    for g in genres:
        g["id"] = str(g.pop("_id"))
    return {"success": True, "genres": genres}


@router.get("/isbn/{isbn}")
async def get_by_isbn(isbn: str, db=Depends(get_db), user=Depends(get_current_user)):
    book = await db.books.find_one({"isbn": isbn})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"success": True, "book": book_serial(book)}


@router.get("/{book_id}")
async def get_book(book_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    result = book_serial(book)
    issues = []
    cursor = db.issued_books.find({"book_id": book_id}).sort("issue_date", -1).limit(50)
    async for iss in cursor:
        iss["id"] = str(iss.pop("_id"))
        if iss.get("member_id"):
            member = await db.members.find_one({"_id": ObjectId(iss["member_id"])})
            iss["member_name"] = member.get("name", "Unknown") if member else "Unknown"
        else:
            iss["member_name"] = "Unknown"
        issues.append(iss)
    result["issue_history"] = issues
    return {"success": True, "book": result}


@router.post("/")
async def create_book(data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    existing = await db.books.find_one({"isbn": data.get("isbn", "")})
    if existing:
        raise HTTPException(status_code=400, detail="ISBN already exists")
    copies = int(data.get("copies_total", 1))
    book = {
        "title": data["title"],
        "author": data["author"],
        "isbn": data["isbn"],
        "publisher": data.get("publisher", ""),
        "genre": data.get("genre", ""),
        "year": data.get("year", ""),
        "description": data.get("description", ""),
        "cover_url": data.get("cover_url", ""),
        "copies_total": copies,
        "copies_available": copies,
        "shelf_location": data.get("shelf_location", ""),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.books.insert_one(book)
    return {"success": True, "id": str(result.inserted_id), "message": "Book added"}


@router.put("/{book_id}")
async def update_book(book_id: str, data: dict, db=Depends(get_db), user=Depends(get_current_user)):
    existing = await db.books.find_one({"_id": ObjectId(book_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Book not found")
    update_fields = {}
    allowed = ["title", "author", "isbn", "publisher", "genre", "year", "description",
               "cover_url", "copies_total", "shelf_location", "is_active"]
    for key in allowed:
        if key in data:
            update_fields[key] = data[key]
    if "copies_total" in update_fields:
        old_total = existing.get("copies_total", 1)
        new_total = int(update_fields["copies_total"])
        diff = new_total - old_total
        update_fields["copies_available"] = max(0, existing.get("copies_available", 0) + diff)
    update_fields["updated_at"] = datetime.now(timezone.utc)
    await db.books.update_one({"_id": ObjectId(book_id)}, {"$set": update_fields})
    return {"success": True, "message": "Book updated"}


@router.delete("/{book_id}")
async def delete_book(book_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    issued = await db.issued_books.count_documents({"book_id": book_id, "status": "issued"})
    if issued > 0:
        raise HTTPException(status_code=400, detail="Cannot delete book with active issues")
    await db.books.update_one({"_id": ObjectId(book_id)}, {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"success": True, "message": "Book deleted"}
