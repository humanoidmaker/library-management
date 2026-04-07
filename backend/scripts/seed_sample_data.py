import asyncio, sys, random
from datetime import datetime, timezone, timedelta
sys.path.insert(0, ".")
from app.core.database import init_db, get_db

BOOKS = [
    ("The Midnight Garden", "Asha Mehta", "978-0-001", "Fiction", 2022, 3), ("Quantum Dreams", "Rohan Verma", "978-0-002", "Science", 2023, 2),
    ("Letters from the Hills", "Priya Nair", "978-0-003", "Fiction", 2021, 4), ("The Silent River", "Karan Desai", "978-0-004", "Fiction", 2020, 3),
    ("Digital Horizons", "Neha Kapoor", "978-0-005", "Science", 2024, 2), ("Echoes of Empire", "Amit Sharma", "978-0-006", "History", 2019, 3),
    ("The Painted Sky", "Meera Joshi", "978-0-007", "Fiction", 2023, 5), ("Ocean of Stars", "Vikram Rao", "978-0-008", "Science", 2022, 2),
    ("The Last Monsoon", "Sunita Reddy", "978-0-009", "Fiction", 2021, 3), ("Code and Canvas", "Dev Patel", "978-0-010", "Non-Fiction", 2024, 2),
    ("Whispers in Stone", "Ananya Iyer", "978-0-011", "History", 2020, 4), ("The Bamboo Bridge", "Harish Nair", "978-0-012", "Fiction", 2023, 3),
    ("Mind Over Matter", "Kavita Menon", "978-0-013", "Non-Fiction", 2022, 2), ("The Red Fort Tales", "Arjun Bhat", "978-0-014", "History", 2019, 3),
    ("Seeds of Tomorrow", "Divya Gupta", "978-0-015", "Non-Fiction", 2024, 2), ("The Magic Kite", "Pallavi Rao", "978-0-016", "Children", 2023, 5),
    ("Adventures of Chintu", "Sanjay Kumar", "978-0-017", "Children", 2022, 4), ("The Jungle Quiz", "Ritu Sharma", "978-0-018", "Children", 2021, 5),
    ("Galaxy Explorers", "Tarun Singh", "978-0-019", "Children", 2024, 3), ("The Hidden Valley", "Nisha Verma", "978-0-020", "Fiction", 2020, 3),
    ("Particles and Waves", "Deepak Iyer", "978-0-021", "Science", 2023, 2), ("The Silk Route Diary", "Pooja Nair", "978-0-022", "History", 2022, 3),
    ("Modern Mindfulness", "Rajesh Menon", "978-0-023", "Non-Fiction", 2024, 2), ("The Bronze Mirror", "Lakshmi Das", "978-0-024", "Fiction", 2021, 4),
    ("Data and Destiny", "Anil Kapoor", "978-0-025", "Science", 2023, 2), ("The Forgotten Temple", "Maya Pillai", "978-0-026", "History", 2020, 3),
    ("The Paper Boat Race", "Geeta Rao", "978-0-027", "Children", 2024, 5), ("Ocean Mysteries", "Vinod Sharma", "978-0-028", "Science", 2022, 2),
    ("The Mango Tree Stories", "Bhavna Desai", "978-0-029", "Children", 2023, 4), ("Spice Trail Adventures", "Ravi Joshi", "978-0-030", "Fiction", 2024, 3),
    ("Innovation Lab", "Sneha Gupta", "978-0-031", "Non-Fiction", 2023, 2), ("The Mountain Song", "Kishore Nair", "978-0-032", "Fiction", 2022, 3),
    ("Planet Earth Guide", "Swathi Iyer", "978-0-033", "Science", 2024, 2), ("The River Crossing", "Mohan Rao", "978-0-034", "Fiction", 2021, 4),
    ("History of Spices", "Usha Menon", "978-0-035", "History", 2020, 3), ("The Star Collector", "Nitin Kumar", "978-0-036", "Children", 2024, 5),
    ("Mindful Living", "Revathi Pillai", "978-0-037", "Non-Fiction", 2023, 2), ("The Glass House", "Ashwin Verma", "978-0-038", "Fiction", 2022, 3),
    ("Robots and Friends", "Tanvi Das", "978-0-039", "Children", 2024, 4), ("The Twilight Express", "Gaurav Bhat", "978-0-040", "Fiction", 2023, 3),
]

MEMBERS = [
    ("Aarav Sharma", "9876540001", "student"), ("Diya Patel", "9876540002", "student"), ("Vihaan Rao", "9876540003", "student"),
    ("Ananya Gupta", "9876540004", "student"), ("Arjun Nair", "9876540005", "student"),
    ("Prof. Sunita Iyer", "9876540006", "teacher"), ("Prof. Rajesh Menon", "9876540007", "teacher"), ("Prof. Kavita Desai", "9876540008", "teacher"),
    ("Mohan Das", "9876540009", "public"), ("Priya Joshi", "9876540010", "public"),
]

async def seed():
    await init_db()
    db = await get_db()
    if await db.books.count_documents({}) > 0:
        print("Data exists"); return

    for title, author, isbn, genre, year, copies in BOOKS:
        await db.books.insert_one({"title": title, "author": author, "isbn": isbn, "genre": genre, "year": year,
            "copies_total": copies, "copies_available": copies, "shelf_location": f"{genre[0]}-{random.randint(1,10)}", "is_active": True})

    max_books = {"student": 3, "teacher": 5, "public": 2}
    member_ids = []
    for i, (name, phone, mtype) in enumerate(MEMBERS):
        r = await db.members.insert_one({"name": name, "phone": phone, "membership_type": mtype,
            "membership_number": f"LIB-{2001+i}", "max_books": max_books[mtype], "is_active": True,
            "total_books_issued": 0, "created_at": datetime.now(timezone.utc)})
        member_ids.append(str(r.inserted_id))

    books = await db.books.find().to_list(100)
    now = datetime.now(timezone.utc)
    for i in range(15):
        book = random.choice(books)
        mid = random.choice(member_ids)
        issue_date = now - timedelta(days=random.randint(1, 20))
        due_date = issue_date + timedelta(days=14)
        status = "returned" if i < 8 else ("issued" if i < 13 else "issued")
        return_date = issue_date + timedelta(days=random.randint(7, 20)) if status == "returned" else None
        fine = max(0, ((return_date - due_date).days if return_date and return_date > due_date else 0)) * 5
        await db.issued_books.insert_one({"book_id": str(book["_id"]), "member_id": mid, "book_title": book["title"],
            "member_name": "", "issue_date": issue_date, "due_date": due_date, "return_date": return_date,
            "status": status, "fine_amount": fine, "fine_paid": status == "returned"})
        if status == "issued":
            await db.books.update_one({"_id": book["_id"]}, {"$inc": {"copies_available": -1}})

    print(f"Seeded: {len(BOOKS)} books, {len(MEMBERS)} members, 15 issued records")

asyncio.run(seed())
