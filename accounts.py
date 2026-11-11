"""StudyMate accounts and lesson history. Configure DATABASE_URL for durable cloud storage."""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, UploadFile, File
from pydantic import BaseModel, Field

router = APIRouter(prefix='/api')
DATABASE_URL = os.getenv('DATABASE_URL', '')
SQLITE_PATH = os.getenv('SQLITE_PATH', str(Path(__file__).parent / 'studymate.sqlite3'))
COOKIE = 'studymate_session'

@contextmanager
def db():
    if DATABASE_URL:
        import psycopg
        from psycopg.rows import dict_row
        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            yield conn
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

def query(conn, sql, params=()):
    if DATABASE_URL:
        sql = sql.replace('?', '%s')
    return conn.execute(sql, params)

def init_db():
    with db() as conn:
        query(conn, '''CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at BIGINT NOT NULL)''')
        query(conn, '''CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL DEFAULT '', avatar TEXT NOT NULL DEFAULT '')''')
        query(conn, '''CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at BIGINT NOT NULL)''')
        query(conn, '''CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, level TEXT NOT NULL, payload TEXT NOT NULL, created_at BIGINT NOT NULL)''')

class Credentials(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=200)

class HistoryItem(BaseModel):
    topic: str = Field(min_length=2, max_length=180)
    level: str = Field(default='Beginner', max_length=30)
    lesson: dict

def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 350000).hex()
    return f'{salt}${digest}'

def user_for(request):
    token = request.cookies.get(COOKIE, '')
    if not token:
        return None
    digest = hashlib.sha256(token.encode()).hexdigest()
    with db() as conn:
        row = query(conn, 'SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash=? AND expires_at>?', (digest, int(time.time()))).fetchone()
    return dict(row) if row else None

def public_user(user_id, email):
    with db() as conn:
        profile=query(conn,'SELECT display_name,avatar FROM profiles WHERE user_id=?',(user_id,)).fetchone()
    return {'id':user_id,'email':email,'name':profile['display_name'] if profile else '', 'avatar':profile['avatar'] if profile else ''}

def login_response(user, response):
    token = secrets.token_urlsafe(32)
    with db() as conn:
        query(conn, 'INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), user['id'], int(time.time())+30*86400))
    response.set_cookie(COOKIE, token, max_age=30*86400, httponly=True, secure=os.getenv('ALLOW_HTTP_COOKIES')!='1', samesite='lax', path='/')
    return {'user': public_user(user['id'], user['email'])}

@router.post('/register')
def register(body: Credentials, response: Response):
    email = body.email.strip().lower()
    if '@' not in email or email.startswith('@') or email.endswith('@'):
        raise HTTPException(400, 'Enter a valid email address.')
    user = {'id':secrets.token_hex(16), 'email':email}
    try:
        with db() as conn:
            query(conn, 'INSERT INTO users (id,email,password,created_at) VALUES (?,?,?,?)', (user['id'], email, password_hash(body.password), int(time.time())))
    except Exception as exc:
        if 'unique' in str(exc).lower() or 'duplicate' in str(exc).lower():
            raise HTTPException(409, 'An account with this email already exists.')
        raise
    return login_response(user,response)

@router.post('/login')
def login(body: Credentials, response: Response):
    with db() as conn:
        row = query(conn, 'SELECT * FROM users WHERE email=?', (body.email.strip().lower(),)).fetchone()
    if not row:
        raise HTTPException(401, 'Incorrect email or password.')
    user = dict(row)
    try:
        salt, digest = user['password'].split('$',1)
        verified = hmac.compare_digest(password_hash(body.password,salt).split('$',1)[1],digest)
    except (ValueError, TypeError):
        verified = False
    if not verified:
        raise HTTPException(401, 'Incorrect email or password.')
    return login_response(user,response)

@router.get('/me')
def me(request: Request):
    u=user_for(request)
    return {'user':public_user(u['id'],u['email']) if u else None, 'cloud_history_enabled':bool(DATABASE_URL)}

@router.post('/logout')
def logout(request: Request, response: Response):
    token=request.cookies.get(COOKIE)
    if token:
        with db() as conn:
            query(conn, 'DELETE FROM sessions WHERE token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie(COOKIE, path='/')
    return {'ok':True}

@router.get('/history')
def history(request: Request):
    user=user_for(request)
    if not user:
        raise HTTPException(401, 'Log in to access your history.')
    with db() as conn:
        rows=query(conn,'SELECT id,topic,level,payload,created_at FROM history WHERE user_id=? ORDER BY created_at DESC LIMIT 100',(user['id'],)).fetchall()
    return {'items':[{'id':r['id'],'topic':r['topic'],'level':r['level'],'lesson':json.loads(r['payload']),'created_at':r['created_at']} for r in rows]}

@router.post('/history')
def save_history(body: HistoryItem, request: Request):
    user=user_for(request)
    if not user:
        raise HTTPException(401, 'Log in to save lessons.')
    payload=json.dumps(body.lesson, ensure_ascii=False)
    if len(payload)>200000:
        raise HTTPException(413,'Lesson is too large.')
    item_id=secrets.token_hex(12)
    with db() as conn:
        query(conn,'INSERT INTO history (id,user_id,topic,level,payload,created_at) VALUES (?,?,?,?,?,?)',(item_id,user['id'],body.topic,body.level,payload,int(time.time())))
    return {'id':item_id}

@router.delete('/history/{item_id}')
def delete_history(item_id: str, request: Request):
    user=user_for(request)
    if not user:
        raise HTTPException(401,'Log in first.')
    with db() as conn:
        query(conn,'DELETE FROM history WHERE id=? AND user_id=?',(item_id,user['id']))
    return {'ok':True}


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1,max_length=80)

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12,max_length=200)

@router.patch('/profile')
def update_profile(body: ProfileUpdate, request: Request):
    user=user_for(request)
    if not user: raise HTTPException(401,'Please log in.')
    name=body.name.strip()
    if not name: raise HTTPException(400,'Enter a display name.')
    with db() as conn:
        query(conn,'INSERT INTO profiles(user_id,display_name,avatar) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name',(user['id'],name,''))
    return {'user':public_user(user['id'],user['email'])}

@router.post('/profile/avatar')
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    user=user_for(request)
    if not user: raise HTTPException(401,'Please log in.')
    data=await file.read(400001)
    if len(data)>400000: raise HTTPException(413,'Maximum photo size is 400 KB.')
    import base64
    if data.startswith(b'\x89PNG\r\n\x1a\n'): mime='image/png'
    elif data.startswith(b'\xff\xd8\xff'): mime='image/jpeg'
    elif data.startswith(b'RIFF') and data[8:12]==b'WEBP': mime='image/webp'
    else: raise HTTPException(400,'Use a PNG, JPEG or WebP image.')
    avatar='data:'+mime+';base64,'+base64.b64encode(data).decode()
    with db() as conn:
        query(conn,'INSERT INTO profiles(user_id,display_name,avatar) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar=excluded.avatar',(user['id'],'',avatar))
    return {'user':public_user(user['id'],user['email'])}

@router.delete('/profile/avatar')
def remove_avatar(request: Request):
    user=user_for(request)
    if not user: raise HTTPException(401,'Please log in.')
    with db() as conn:
        query(conn,'UPDATE profiles SET avatar=? WHERE user_id=?',('',user['id']))
    return {'user':public_user(user['id'],user['email'])}

@router.post('/profile/password')
def change_password(body: PasswordUpdate, request: Request):
    user=user_for(request)
    if not user: raise HTTPException(401,'Please log in.')
    with db() as conn:
        row=query(conn,'SELECT password FROM users WHERE id=?',(user['id'],)).fetchone()
        salt,digest=row['password'].split('$',1)
        if not hmac.compare_digest(password_hash(body.current_password,salt).split('$',1)[1],digest):
            raise HTTPException(403,'Current password is incorrect.')
        query(conn,'UPDATE users SET password=? WHERE id=?',(password_hash(body.new_password),user['id']))
        query(conn,'DELETE FROM sessions WHERE user_id=?',(user['id'],))
    return {'ok':True,'message':'Password changed. Please log in again.'}

class EmojiAvatar(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)

@router.post('/profile/emoji')
def set_emoji_avatar(body: EmojiAvatar, request: Request):
    user = user_for(request)
    if not user:
        raise HTTPException(401, 'Please log in')
    allowed = {'🧑‍🎓','👩‍🎓','👨‍💻','👩‍💻','🧠','🦉','🐼','🦊','🚀','⭐','🤖','📚'}
    if body.emoji not in allowed:
        raise HTTPException(400, 'Choose an available avatar')
    # SVG data URL stored as a profile avatar, with the emoji escaped by fixed allowlist.
    import urllib.parse
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#eee8ff"/><text x="48" y="65" font-size="52" text-anchor="middle">{body.emoji}</text></svg>'
    avatar = 'data:image/svg+xml,' + urllib.parse.quote(svg)
    with db() as conn:
        query(conn,'INSERT INTO profiles(user_id,display_name,avatar) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar=excluded.avatar',(user['id'],'',avatar))
    return {'user': public_user(user['id'], user['email'])}

class DeleteAccountRequest(BaseModel):
    password: str

@router.post('/profile/delete-account')
def delete_account(body: DeleteAccountRequest, request: Request, response: Response):
    user = user_for(request)
    if not user:
        raise HTTPException(401, 'Please log in')
    with db() as conn:
        row = query(conn,'SELECT password FROM users WHERE id=?',(user['id'],)).fetchone()
        if not row:
            raise HTTPException(404,'Account not found')
        salt, expected = row['password'].split('$', 1)
        actual = hashlib.pbkdf2_hmac('sha256',body.password.encode(),bytes.fromhex(salt),350000).hex()
        if not hmac.compare_digest(actual, expected):
            raise HTTPException(403,'Incorrect password')
        for table, column in [('history','user_id'),('sessions','user_id'),('profiles','user_id'),('users','id')]:
            query(conn, f'DELETE FROM {table} WHERE {column}=?',(user['id'],))
    response.delete_cookie(COOKIE, path='/')
    return {'deleted': True}
