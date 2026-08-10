"""
One-off script to create your first admin user.
Run this once from the Backend folder: python create_admin.py

Once the real admin-invite endpoint exists, you won't need this anymore —
new users will be created through the app itself.
"""

from src.database import SessionLocal
from src.models.user import User
from src.security import hash_password

def create_admin():
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = input("Admin password: ").strip()

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"A user with email {email} already exists.")
            return

        admin = User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            role="admin",
            is_pending_activation=False,  # skip the invite flow for this one
        )
        db.add(admin)
        db.commit()
        print(f"Admin user '{name}' ({email}) created successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()