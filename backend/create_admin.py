import os
import sys
from datetime import datetime
import pymongo
import certifi
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_admin_user(username, password, email="admin@example.com"):
    """Create an admin user in the database."""
    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('MONGO_DB_NAME', 'fraud_detection')
    
    if not MONGO_URL:
        print("Error: MONGO_URL environment variable not set")
        return False
    
    try:
        # Use certifi CA bundle
        ca = certifi.where()
        client = pymongo.MongoClient(MONGO_URL, tlsCAFile=ca, serverSelectionTimeoutMS=10000)
        # Test the connection
        client.server_info()
        db = client[DB_NAME]
        
        # Check if admin already exists
        admin_username = f"{username}_admin"
        if db.approved_users.find_one({"username": admin_username}):
            print(f"Admin user '{admin_username}' already exists")
            return True
            
        # Create admin user
        admin_user = {
            "username": admin_username,
            "password": password,  # In production, this should be hashed
            "email": email,
            "role": "admin",
            "createdAt": datetime.utcnow(),
            "approvedAt": datetime.utcnow()
        }
        
        # Insert into approved_users
        result = db.approved_users.insert_one(admin_user)
        
        if result.inserted_id:
            print(f"✓ Successfully created admin user: {admin_username}")
            print(f"  Email: {email}")
            print(f"  Role: admin")
            print(f"\nYou can now log in with these credentials:")
            print(f"  Username: {admin_username}")
            print(f"  Password: {password}")
            return True
        else:
            print("✗ Failed to create admin user")
            return False
            
    except Exception as e:
        print(f"✗ Error creating admin user: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <username> <password> [email]")
        print("\nExample:")
        print("  python create_admin.py admin secure_password admin@example.com")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3] if len(sys.argv) > 3 else "admin@example.com"
    
    print(f"Creating admin user: {username}_admin...")
    if create_admin_user(username, password, email):
        print("\n✓ Admin user created successfully!")
        sys.exit(0)
    else:
        print("\n✗ Failed to create admin user")
        sys.exit(1)
