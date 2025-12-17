import os
from flask import Flask, request, jsonify
import pymongo
import certifi
import traceback
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime

# Load environment variables from backend/.env so we can read Mongo URL & DB name
load_dotenv()

# Main Flask application that exposes all backend REST endpoints
app = Flask(__name__)

# Allow the React frontend to call any /api/* route (CORS = cross‑origin requests)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config['JSON_SORT_KEYS'] = False

def get_db():
    """Create a Mongo client using MONGO_URL env var."""
    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('MONGO_DB_NAME', 'fraud_detection')
    if not MONGO_URL:
        return None
    try:
        # Use certifi CA bundle to avoid local OpenSSL CA issues
        ca = certifi.where()
        client = pymongo.MongoClient(MONGO_URL, tlsCAFile=ca, serverSelectionTimeoutMS=10000)
        # Test the connection (will raise on failure)
        client.server_info()
        db = client[DB_NAME]
        # Test database access
        db.list_collection_names()
        return db
    except Exception as e:
        print(f"MongoDB Connection Error: {str(e)}")
        traceback.print_exc()
        return None

# Simple test endpoint to verify connection
@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Test if MongoDB connection is working."""
    print("Received test connection request")  # Debug log
    try:
        db = get_db()
        if db is None:
            print("MongoDB connection failed")  # Debug log
            return jsonify({'status': 'error', 'message': 'Could not connect to MongoDB'}), 500
        print("MongoDB connection successful")  # Debug log
        return jsonify({'status': 'success', 'message': 'Connected to MongoDB'}), 200
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug log
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Check if user exists and credentials are valid."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        data = request.get_json()
        username = (data.get('username') or '').strip()
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        # Check for an approved user with matching password (no hashing)
        approved_user = db.approved_users.find_one({'username': username, 'password': password})
        if approved_user:
            user_data = {
                'username': approved_user['username'],
                'email': approved_user.get('email'),
                'role': approved_user.get('role', 'user')
            }
            return jsonify({'success': True, 'message': 'Login successful', 'user': user_data}), 200

        # If not an approved user, check if they have a pending access request
        pending_request = db.access_requests.find_one({'username': username})
        if pending_request and pending_request.get('status') == 'pending':
            return jsonify({'error': 'Your access request is still pending approval', 'status': 'pending'}), 403

        return jsonify({'error': 'Invalid username or password', 'status': 'unauthorized', 'requestAccess': True}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Save platform feedback to `platform_feedback` collection."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        data = request.get_json() or {}
        # Basic validation
        if not data.get('rating') or not data.get('comments'):
            return jsonify({'error': 'Rating and comments are required'}), 400

        feedback = {
            'name': data.get('name'),
            'email': data.get('email'),
            'rating': data.get('rating'),
            'comments': data.get('comments'),
            'username': data.get('username', 'Anonymous'),
            'created_at': datetime.utcnow()
        }

        result = db.platform_feedback.insert_one(feedback)
        return jsonify({'message': 'Feedback saved', 'id': str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback', methods=['GET'])
def list_feedback():
    """List saved feedback (admin). Optional query params: transactionId, username."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        query = {}
        tx = request.args.get('transactionId')
        user = request.args.get('username')
        if tx:
            query['transactionId'] = tx
        if user:
            query['username'] = user

        cursor = db.platform_feedback.find(query).sort('created_at', -1)  # Sort by newest first
        results = []
        for r in cursor:
            r['_id'] = str(r.get('_id'))
            if isinstance(r.get('created_at'), datetime):
                r['created_at'] = r['created_at'].isoformat()
            results.append(r)

        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/access-requests', methods=['POST'])
def create_access_request():
    """Create a new access request."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return jsonify({'error': 'Username, email, and password are required'}), 400

        # Check if username or email already exists in either collection
        existing_user = db.approved_users.find_one({
            '$or': [{'username': username}, {'email': email}]
        })
        if existing_user:
            return jsonify({'error': 'Username or email already exists'}), 400

        existing_request = db.access_requests.find_one({
            '$or': [{'username': username}, {'email': email}]
        })
        if existing_request:
            return jsonify({'error': 'An access request with this username or email already exists'}), 400

        # Create new access request (no password hashing)
        access_request = {
            'username': username,
            'email': email,
            'password': password,
            'status': 'pending',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        result = db.access_requests.insert_one(access_request)
        return jsonify({
            'message': 'Access request created successfully',
            'id': str(result.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/access-requests/<username>/status', methods=['GET'])
def check_request_status(username):
    """Check the status of an access request."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        # First check if user is already approved
        approved_user = db.approved_users.find_one({'username': username})
        if approved_user:
            return jsonify({
                'status': 'approved',
                'message': 'User is already approved'
            }), 200

        # Check access request status
        request = db.access_requests.find_one({'username': username})
        if not request:
            return jsonify({
                'status': 'not_found',
                'message': 'No access request found'
            }), 404

        return jsonify({
            'status': request['status'],
            'message': f"Access request is {request['status']}"
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/access-requests', methods=['GET'])
def list_access_requests():
    """List access requests (admin). Optional query param `status` to filter."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status

        cursor = db.access_requests.find(query, {'password': 0})
        results = []
        for r in cursor:
            r['_id'] = str(r.get('_id'))
            # Convert datetimes to isoformat for JSON
            if isinstance(r.get('created_at'), datetime):
                r['created_at'] = r['created_at'].isoformat()
            if isinstance(r.get('updated_at'), datetime):
                r['updated_at'] = r['updated_at'].isoformat()
            if isinstance(r.get('approved_at'), datetime):
                r['approved_at'] = r['approved_at'].isoformat()
            if isinstance(r.get('denied_at'), datetime):
                r['denied_at'] = r['denied_at'].isoformat()
            results.append(r)

        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/access-requests/<username>/approve', methods=['POST'])
def approve_access_request(username):
    """Approve an access request: copy to approved_users and update request status."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        req = db.access_requests.find_one({'username': username})
        if not req:
            return jsonify({'error': 'Access request not found'}), 404

        # Prevent duplicate approved user
        existing = db.approved_users.find_one({'$or': [{'username': username}, {'email': req.get('email')}]})
        if existing:
            # Mark request as approved for audit and return conflict
            db.access_requests.update_one({'username': username}, {'$set': {'status': 'approved', 'updated_at': datetime.utcnow(), 'approved_at': datetime.utcnow()}})
            return jsonify({'message': 'User already exists in approved_users; request marked approved'}), 200

        # Insert into approved_users with original password
        new_user = {
            'username': req['username'],
            'email': req.get('email'),
            'password': req['password'],  # Using original password without hashing
            'role': request.json.get('role') if request.is_json and request.json.get('role') else req.get('role', 'user'),
            'created_at': datetime.utcnow()
        }
        db.approved_users.insert_one(new_user)

        # Update the request status to approved
        db.access_requests.update_one({'username': username}, {'$set': {'status': 'approved', 'updated_at': datetime.utcnow(), 'approved_at': datetime.utcnow()}})

        return jsonify({'message': 'Access request approved and user created'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/access-requests/<username>/deny', methods=['POST'])
def deny_access_request(username):
    """Deny an access request and set a denial reason."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        req = db.access_requests.find_one({'username': username})
        if not req:
            return jsonify({'error': 'Access request not found'}), 404

        reason = None
        if request.is_json:
            reason = request.json.get('reason')

        update = {'status': 'denied', 'updated_at': datetime.utcnow(), 'denied_at': datetime.utcnow()}
        if reason:
            update['denied_reason'] = reason

        db.access_requests.update_one({'username': username}, {'$set': update})

        return jsonify({'message': 'Access request denied'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/classifications', methods=['POST'])
def save_classification():
    """Save classification results to database."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        data = request.get_json()
        predictions = data.get('predictions', [])
        username = data.get('username', 'Anonymous')
        
        if not predictions:
            return jsonify({'error': 'No predictions provided'}), 400

        # Create classification record
        classification_record = {
            'username': username,
            'total_reviews': len(predictions),
            'fraud_count': len([p for p in predictions if p.get('label') == 'Fraud']),
            'legitimate_count': len([p for p in predictions if p.get('label') in ['Legitimate', 'Benign']]),
            'predictions': predictions,
            'created_at': datetime.utcnow()
        }

        result = db.classifications.insert_one(classification_record)
        
        return jsonify({
            'message': 'Classification results saved successfully',
            'id': str(result.inserted_id),
            'total_saved': len(predictions)
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/classifications', methods=['GET'])
def get_classifications():
    """Get classification history. Optional query param: username."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        username = request.args.get('username')
        query = {}
        if username:
            query['username'] = username

        cursor = db.classifications.find(query).sort('created_at', -1).limit(50)
        results = []
        for r in cursor:
            r['_id'] = str(r.get('_id'))
            if isinstance(r.get('created_at'), datetime):
                r['created_at'] = r['created_at'].isoformat()
            results.append(r)

        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/approved-users', methods=['GET'])
def get_approved_users():
    """Get all approved users (admin only)."""
    try:
        db = get_db()
        if db is None:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = db.approved_users.find({'role': {'$ne': 'admin'}}).sort('createdAt', -1)
        results = []
        for user in cursor:
            user['_id'] = str(user.get('_id'))
            if isinstance(user.get('createdAt'), datetime):
                user['createdAt'] = user['createdAt'].isoformat()
            if isinstance(user.get('approvedAt'), datetime):
                user['approvedAt'] = user['approvedAt'].isoformat()
            results.append(user)

        return jsonify(results), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting server on port {port}...")
    app.run(host='127.0.0.1', port=port, debug=True)