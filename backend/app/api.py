import re, secrets, os
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_session
from .security import create_access_token, decode_token, hash_password, verify_password, valid_email
from .config import settings
from .email_service import send_password_reset_email, send_verification_email, send_welcome_email

router=APIRouter(prefix="/api")
UPLOAD_DIR=Path(settings.UPLOAD_DIR); UPLOAD_DIR.mkdir(parents=True,exist_ok=True)
ALLOWED={"image/jpeg","image/png","image/jpg","application/pdf"}

async def current_user(request:Request,session:AsyncSession=Depends(get_session)):
    h=request.headers.get("authorization","")
    if not h.startswith("Bearer "): raise HTTPException(401,"Authentication required")
    p=decode_token(h[7:])
    r=(await session.execute(text("SELECT id,username,email,created_at,updated_at FROM users WHERE id=:id"),{"id":p.get("id")})).mappings().first()
    if not r: raise HTTPException(401,"Invalid token")
    return dict(r)

def row(r): return dict(r) if r else None

@router.post("/auth/register",status_code=201)
async def register(request:Request,session=Depends(get_session)):
    b=await request.json(); email=b.get("email"); password=b.get("password"); username=b.get("username")
    if not email or not password: raise HTTPException(400,"Email and password are required")
    if len(password)<8: raise HTTPException(400,"Password must be at least 8 characters long")
    if not valid_email(email): raise HTTPException(400,"Invalid email format")
    if username and not re.fullmatch(r"[A-Za-z0-9_]{3,20}",username): raise HTTPException(400,"Username must be 3-20 characters (letters, numbers, underscores only)")
    if username and (await session.execute(text("SELECT 1 FROM users WHERE username=:v"),{"v":username})).first(): raise HTTPException(409,"Username already taken")
    if (await session.execute(text("SELECT 1 FROM users WHERE email=:v"),{"v":email})).first(): raise HTTPException(409,"Email already registered")
    username=username or email.split("@")[0]
    r=(await session.execute(text("INSERT INTO users(username,email,password) VALUES(:u,:e,:p) RETURNING id,username,email,created_at,updated_at"),{"u":username,"e":email,"p":hash_password(password)})).mappings().first()
    await session.commit(); u=row(r); return {"message":"User registered successfully","user":u,"token":create_access_token(u)}

@router.post("/auth/login")
async def login(request:Request,session=Depends(get_session)):
    b=await request.json(); ident=b.get("email") or b.get("emailOrUsername"); password=b.get("password")
    if not ident or not password: raise HTTPException(400,"Email/username and password are required")
    r=(await session.execute(text("SELECT * FROM users WHERE email=:v OR username=:v LIMIT 1"),{"v":ident})).mappings().first()
    if not r or not verify_password(password,r["password"]): raise HTTPException(401,"Invalid credentials")
    u={k:r[k] for k in ("id","username","email","created_at","updated_at")}; return {"message":"Login successful","user":u,"token":create_access_token(u)}

@router.get("/auth/profile")
async def profile(user=Depends(current_user)): return {"user":user}

@router.put("/auth/profile")
async def update_profile(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); username=b.get("username"); email=b.get("email")
    if not username and not email: raise HTTPException(400,"At least one field (username or email) is required")
    if email and email!=user["email"]:
        if not valid_email(email): raise HTTPException(400,"Invalid email format")
        if (await session.execute(text("SELECT 1 FROM users WHERE email=:v AND id<>:id"),{"v":email,"id":user["id"]})).first(): raise HTTPException(409,"Email already in use")
    if username and username!=user["username"]:
        if not re.fullmatch(r"[A-Za-z0-9_]{3,20}",username): raise HTTPException(400,"Username must be 3-20 characters (letters, numbers, underscores only)")
        if (await session.execute(text("SELECT 1 FROM users WHERE username=:v AND id<>:id"),{"v":username,"id":user["id"]})).first(): raise HTTPException(409,"Username already taken")
    r=(await session.execute(text("UPDATE users SET username=:u,email=:e,updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id,username,email,created_at,updated_at"),{"u":username or user["username"],"e":email or user["email"],"id":user["id"]})).mappings().first()
    await session.commit(); u=row(r); return {"message":"Profile updated successfully","user":u,"token":create_access_token(u)}

@router.put("/auth/change-password")
async def change_password(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); cur=b.get("currentPassword"); new=b.get("newPassword")
    if not cur or not new: raise HTTPException(400,"Current password and new password are required")
    if len(new)<8: raise HTTPException(400,"New password must be at least 8 characters long")
    r=(await session.execute(text("SELECT password FROM users WHERE id=:id"),{"id":user["id"]})).mappings().first()
    if not r or not verify_password(cur,r["password"]): raise HTTPException(401,"Current password is incorrect")
    await session.execute(text("UPDATE users SET password=:p,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"p":hash_password(new),"id":user["id"]}); await session.commit(); return {"message":"Password changed successfully"}

@router.post("/auth/logout")
async def logout(user=Depends(current_user)): return {"message":"Logout successful"}

@router.post("/auth/request-password-reset")
async def request_reset(request:Request,session=Depends(get_session)):
    email=(await request.json()).get("email")
    if not email: raise HTTPException(400,"Email is required")
    r=(await session.execute(text("SELECT id,email,username FROM users WHERE email=:e"),{"e":email})).mappings().first()
    if r:
        token=secrets.token_hex(32); exp=datetime.now(timezone.utc).replace(tzinfo=None)+timedelta(hours=1)
        await session.execute(text("UPDATE users SET reset_token=:t,reset_token_expires=:x,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"t":token,"x":exp,"id":r["id"]}); await session.commit()
        try: send_password_reset_email(r["email"],token,r["username"])
        except Exception: raise HTTPException(500,"Failed to send password reset email")
    return {"message":"If the email exists, a password reset link has been sent"}

@router.post("/auth/reset-password")
async def reset_password(request:Request,session=Depends(get_session)):
    b=await request.json(); token=b.get("token"); new=b.get("newPassword")
    if not token or not new: raise HTTPException(400,"Token and new password are required")
    if len(new)<8: raise HTTPException(400,"Password must be at least 8 characters long")
    r=(await session.execute(text("SELECT * FROM users WHERE reset_token=:t"),{"t":token})).mappings().first()
    if not r or not r["reset_token_expires"] or datetime.now(timezone.utc).replace(tzinfo=None)>r["reset_token_expires"]: raise HTTPException(400,"Invalid or expired reset token")
    await session.execute(text("UPDATE users SET password=:p,reset_token=NULL,reset_token_expires=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"p":hash_password(new),"id":r["id"]}); await session.commit(); return {"message":"Password reset successfully"}

@router.post("/auth/send-verification")
async def send_verification(user=Depends(current_user),session=Depends(get_session)):
    r=(await session.execute(text("SELECT * FROM users WHERE id=:id"),{"id":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"User not found")
    if r["email_verified"]: raise HTTPException(400,"Email already verified")
    token=secrets.token_hex(32); exp=datetime.now(timezone.utc).replace(tzinfo=None)+timedelta(hours=24)
    await session.execute(text("UPDATE users SET verification_token=:t,verification_token_expires=:x,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"t":token,"x":exp,"id":user["id"]}); await session.commit()
    try: send_verification_email(r["email"],token,r["username"])
    except Exception: raise HTTPException(500,"Failed to send verification email")
    return {"message":"Verification email sent successfully"}

@router.post("/auth/verify-email")
async def verify_email(request:Request,session=Depends(get_session)):
    token=(await request.json()).get("token")
    if not token: raise HTTPException(400,"Verification token is required")
    r=(await session.execute(text("SELECT * FROM users WHERE verification_token=:t"),{"t":token})).mappings().first()
    if not r: raise HTTPException(400,"Invalid or expired verification token")
    if r["verification_token_expires"] and datetime.now(timezone.utc).replace(tzinfo=None)>r["verification_token_expires"]: raise HTTPException(400,"Verification token has expired")
    await session.execute(text("UPDATE users SET email_verified=1,verification_token=NULL,verification_token_expires=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=:id"),{"id":r["id"]}); await session.commit()
    try: send_welcome_email(r["email"],r["username"])
    except Exception: pass
    return {"message":"Email verified successfully"}

@router.get("/accounts")
async def accounts(user=Depends(current_user),session=Depends(get_session)):
    return [row(x) for x in (await session.execute(text("SELECT * FROM accounts WHERE user_id=:u ORDER BY created_at DESC"),{"u":user["id"]})).mappings().all()]

@router.get("/accounts/{id}")
async def account(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=(await session.execute(text("SELECT * FROM accounts WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Account not found")
    return row(r)

@router.post("/accounts",status_code=201)
async def create_account(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); r=(await session.execute(text("INSERT INTO accounts(user_id,name,type,balance,currency) VALUES(:u,:n,:t,:b,:c) RETURNING *"),{"u":user["id"],"n":b.get("name"),"t":b.get("type"),"b":b.get("balance",0),"c":b.get("currency","USD")})).mappings().first(); await session.commit(); return row(r)

@router.put("/accounts/{id}")
async def update_account(id:int,request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); r=(await session.execute(text("UPDATE accounts SET name=:n,type=:t,balance=:b,currency=:c,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u RETURNING *"),{"n":b.get("name"),"t":b.get("type"),"b":b.get("balance"),"c":b.get("currency"),"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Account not found")
    await session.commit(); return row(r)

@router.delete("/accounts/{id}",status_code=204)
async def delete_account(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=await session.execute(text("DELETE FROM accounts WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]}); await session.commit()
    if r.rowcount==0: raise HTTPException(404,"Account not found")

@router.get("/categories")
async def categories(request:Request,user=Depends(current_user),session=Depends(get_session)):
    typ=request.query_params.get("type"); q="SELECT * FROM categories WHERE (user_id=:u OR user_id IS NULL)"; p={"u":user["id"]}
    if typ: q+=" AND type=:t"; p["t"]=typ
    rows=[row(x) for x in (await session.execute(text(q+" ORDER BY type,name"),p)).mappings().all()]; seen=set(); out=[]
    for x in rows:
        k=f"{str(x['type']).lower()}:{str(x['name']).strip().lower()}"
        if k not in seen: seen.add(k); out.append(x)
    return out

@router.get("/categories/{id}")
async def category(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=(await session.execute(text("SELECT * FROM categories WHERE id=:id AND (user_id=:u OR user_id IS NULL)"),{"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Category not found")
    return row(r)

@router.post("/categories",status_code=201)
async def create_category(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); r=(await session.execute(text("INSERT INTO categories(user_id,name,type,color,icon,is_default) VALUES(:u,:n,:t,:c,:i,:d) RETURNING *"),{"u":user["id"],"n":b.get("name"),"t":b.get("type"),"c":b.get("color"),"i":b.get("icon"),"d":b.get("is_default",0)})).mappings().first(); await session.commit(); return row(r)

@router.put("/categories/{id}")
async def update_category(id:int,request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json(); r=(await session.execute(text("UPDATE categories SET name=:n,type=:t,color=:c,icon=:i,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u RETURNING *"),{"n":b.get("name"),"t":b.get("type"),"c":b.get("color"),"i":b.get("icon"),"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Category not found")
    await session.commit(); return row(r)

@router.delete("/categories/{id}",status_code=204)
async def delete_category(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=await session.execute(text("DELETE FROM categories WHERE id=:id AND user_id=:u AND is_default=0"),{"id":id,"u":user["id"]}); await session.commit()
    if r.rowcount==0: raise HTTPException(404,"Category not found")
