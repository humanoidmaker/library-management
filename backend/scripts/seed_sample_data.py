import asyncio
import sys
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, ".")
from app.core.database import init_db, get_db

BOOKS = [
    ("The Midnight Garden", "Asha Mehta", "978-0-001", "Fiction", 2022, "Sapphire Press", 3),
    ("Quantum Dreams", "Rohan Verma", "978-0-002", "Science", 2023, "Nova Books", 2),
    ("Letters from the Hills", "Priya Nair", "978-0-003", "Fiction", 2021, "Highland Pub", 4),
    ("The Silent River", "Karan Desai", "978-0-004", "Fiction", 2020, "Riverdale Press", 3),
    ("Digital Horizons", "Neha Kapoor", "978-0-005", "Science", 2024, "TechRead", 2),
    ("Echoes of Empire", "Amit Sharma", "978-0-006", "History", 2019, "Heritage House", 3),
    ("The Painted Sky", "Meera Joshi", "978-0-007", "Fiction", 2023, "Canvas Books", 5),
    ("Ocean of Stars", "Vikram Rao", "978-0-008", "Science", 2022, "Cosmos Pub", 2),
    ("The Last Monsoon", "Sunita Reddy", "978-0-009", "Fiction", 2021, "Seasonal Press", 3),
    ("Code and Canvas", "Dev Patel", "978-0-010", "Non-Fiction", 2024, "Binary Books", 2),
    ("Whispers in Stone", "Ananya Iyer", "978-0-011", "History", 2020, "Artifact Press", 4),
    ("The Bamboo Bridge", "Harish Nair", "978-0-012", "Fiction", 2023, "Eastern Pub", 3),
    ("Mind Over Matter", "Kavita Menon", "978-0-013", "Non-Fiction", 2022, "Clarity Books", 2),
    ("The Red Fort Tales", "Arjun Bhat", "978-0-014", "History", 2019, "Monument Press", 3),
    ("Seeds of Tomorrow", "Divya Gupta", "978-0-015", "Non-Fiction", 2024, "FutureRead", 2),
    ("The Magic Kite", "Pallavi Rao", "978-0-016", "Children", 2023, "Wonder Books", 5),
    ("Adventures of Chintu", "Sanjay Kumar", "978-0-017", "Children", 2022, "Tiny Tales", 4),
    ("The Jungle Quiz", "Ritu Sharma", "978-0-018", "Children", 2021, "Wild Reads", 5),
    ("Galaxy Explorers", "Tarun Singh", "978-0-019", "Children", 2024, "StarKid Press", 3),
    ("The Hidden Valley", "Nisha Verma", "978-0-020", "Fiction", 2020, "Secret Garden Pub", 3),
    ("Particles and Waves", "Deepak Iyer", "978-0-021", "Science", 2023, "Quantum Press", 2),
    ("The Silk Route Diary", "Pooja Nair", "978-0-022", "History", 2022, "Traveller Books", 3),
    ("Modern Mindfulness", "Rajesh Menon", "978-0-023", "Non-Fiction", 2024, "Zen Publications", 2),
    ("The Bronze Mirror", "Lakshmi Das", "978-0-024", "Fiction", 2021, "Antique Press", 4),
    ("Data and Destiny", "Anil Kapoor", "978-0-025", "Science", 2023, "Algorithm Books", 2),
    ("The Forgotten Temple", "Maya Pillai", "978-0-026", "History", 2020, "Relic House", 3),
    ("The Paper Boat Race", "Geeta Rao", "978-0-027", "Children", 2024, "PlayTime Press", 5),
    ("Ocean Mysteries", "Vinod Sharma", "978-0-028", "Science", 2022, "Deep Blue Books", 2),
    ("The Mango Tree Stories", "Bhavna Desai", "978-0-029", "Children", 2023, "Orchard Pub", 4),
    ("Spice Trail Adventures", "Ravi Joshi", "978-0-030", "Fiction", 2024, "Flavour Press", 3),
    ("Innovation Lab", "Sneha Gupta", "978-0-031", "Non-Fiction", 2023, "Startup Books", 2),
    ("The Mountain Song", "Kishore Nair", "978-0-032", "Fiction", 2022, "Summit Press", 3),
    ("Planet Earth Guide", "Swathi Iyer", "978-0-033", "Science", 2024, "Globe Pub", 2),
    ("The River Crossing", "Mohan Rao", "978-0-034", "Fiction", 2021, "Bridge Books", 4),
    ("History of Spices", "Usha Menon", "978-0-035", "History", 2020, "Culinary Press", 3),
    ("The Star Collector", "Nitin Kumar", "978-0-036", "Children", 2024, "Nightsky Books", 5),
    ("Mindful Living", "Revathi Pillai", "978-0-037", "Non-Fiction", 2023, "Balance Pub", 2),
    ("The Glass House", "Ashwin Verma", "978-0-038", "Fiction", 2022, "Crystal Press", 3),
    ("Robots and Friends", "Tanvi Das", "978-0-039", "Children", 2024, "FutureTots", 4),
    ("The Twilight Express", "Gaurav Bhat", "978-0-040", "Fiction", 2023, "Evening Star Books", 3),
]

MEMBERS = [
    ("Aarav Sharma", "9876540001", "aarav@email.com", "student"),
    ("Diya Patel", "9876540002", "diya@email.com", "student"),
    ("Vihaan Rao", "9876540003", "vihaan@email.com", "student"),
    ("Ananya Gupta", "9876540004", "ananya@email.com", "student"),
    ("Arjun Nair", "9876540005", "arjun@email.com", "student"),
    ("Prof. Sunita Iyer", "9876540006", "sunita@college.edu", "teacher"),
    ("Prof. Rajesh Menon", "9876540007", "rajesh@college.edu", "teacher"),
    ("Prof. Kavita Desai", "9876540008", "kavita@college.edu", "teacher"),
    ("Mohan Das", "9876540009", "mohan@email.com", "public"),
    ("Priya Joshi", "9876540010", "priya@email.com", "public"),
]

MAX_BOOKS_MAP = {"student": 3, "teacher": 5, "public": 2}


async def seed():
    await init_db()
    db = await get_db()
    if await db.books.count_documents({}) > 0:
        print("Data already exists, skipping seed.")
        return

    now = datetime.now(timezone.utc)

    # Insert books
    book_docs = []
    for title, author, isbn, genre, year, publisher, copies in BOOKS:
        doc = {
            "title": title,
            "author": author,
            "isbn": isbn,
            "publisher": publisher,
            "genre": genre,
            "year": year,
            "description": f"A compelling {genre.lower()} book by {author}.",
            "cover_url": "",
            "copies_total": copies,
            "copies_available": copies,
            "shelf_location": f"{genre[0]}-{random.randint(1, 10)}",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        r = await db.books.insert_one(doc)
        book_docs.append({**doc, "_id": r.inserted_id, "id": str(r.inserted_id)})

    # Insert members
    member_ids = []
    for i, (name, phone, email, mtype) in enumerate(MEMBERS):
        doc = {
            "name": name,
            "phone": phone,
            "email": email,
            "membership_type": mtype,
            "membership_number": f"LIB-{2001 + i}",
            "membership_expiry": (now + timedelta(days=365)).isoformat(),
            "max_books": MAX_BOOKS_MAP[mtype],
            "address": f"{random.randint(1, 200)} Library Road, Booktown",
            "total_books_issued": 0,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        r = await db.members.insert_one(doc)
        member_ids.append({"id": str(r.inserted_id), "name": name, "membership_number": doc["membership_number"]})

    # Create 15 issued records
    # 8 returned on time, 2 returned late with fines, 5 currently issued (2 overdue)
    used_books = set()
    for i in range(15):
        # Pick a unique book for each to avoid over-decrementing
        book = random.choice(book_docs)
        while str(book["_id"]) in used_books and len(used_books) < len(book_docs):
            book = random.choice(book_docs)
        used_books.add(str(book["_id"]))

        member = random.choice(member_ids)
        book_id = str(book["_id"])
        member_id = member["id"]

        if i < 8:
            # Returned on time
            issue_date = now - timedelta(days=random.randint(20, 40))
            due_date = issue_date + timedelta(days=14)
            return_date = issue_date + timedelta(days=random.randint(5, 13))
            fine = 0
            status = "returned"
        elif i < 10:
            # Returned late with fines
            issue_date = now - timedelta(days=random.randint(25, 45))
            due_date = issue_date + timedelta(days=14)
            overdue_days = random.randint(3, 10)
            return_date = due_date + timedelta(days=overdue_days)
            fine = overdue_days * 5
            status = "returned"
        elif i < 13:
            # Currently issued, not overdue
            issue_date = now - timedelta(days=random.randint(1, 10))
            due_date = issue_date + timedelta(days=14)
            return_date = None
            fine = 0
            status = "issued"
        else:
            # Currently issued, overdue
            issue_date = now - timedelta(days=random.randint(18, 25))
            due_date = issue_date + timedelta(days=14)
            return_date = None
            fine = 0
            status = "issued"

        await db.issued_books.insert_one({
            "book_id": book_id,
            "member_id": member_id,
            "book_title": book["title"],
            "book_isbn": book["isbn"],
            "member_name": member["name"],
            "membership_number": member["membership_number"],
            "issued_date": issue_date,
            "due_date": due_date,
            "return_date": return_date,
            "status": status,
            "renewals": 0,
            "fine_amount": fine,
            "fine_paid": status == "returned",
            "created_at": issue_date,
        })

        if status == "issued":
            await db.books.update_one({"_id": book["_id"]}, {"$inc": {"copies_available": -1}})
            await db.members.update_one(
                {"_id": {"$in": [m["id"] for m in member_ids if m["id"] == member_id]}},
                {"$inc": {"total_books_issued": 1}},
            )

    print(f"Seeded: {len(BOOKS)} books, {len(MEMBERS)} members, 15 issued records (8 returned on time, 2 returned late with fines, 5 currently issued including 2 overdue)")


asyncio.run(seed())
