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

async def tx_payload(request):
    if request.headers.get("content-type","").startswith("multipart/"):
        form=await request.form(); data=dict(form); upload=data.pop("attachment",None); return data,upload
    return await request.json(),None

async def save_upload(upload):
    if not isinstance(upload,UploadFile): return None
    if upload.content_type not in ALLOWED: raise HTTPException(400,"Invalid attachment type")
    data=await upload.read()
    if len(data)>5*1024*1024: raise HTTPException(400,"Attachment exceeds 5MB limit")
    name=f"{int(datetime.now().timestamp()*1000)}_{secrets.token_hex(6)}_{Path(upload.filename or 'attachment').name.replace(' ','_')}"
    p=UPLOAD_DIR/name; p.write_bytes(data); return str(p)

def tx_cast(b):
    for k in ("account_id","category_id"): b[k]=int(b[k])
    b["amount"]=Decimal(str(b["amount"]))
    b.setdefault("description",None); b.setdefault("tags",None); return b

@router.get("/transactions")
async def transactions(request:Request,user=Depends(current_user),session=Depends(get_session)):
    q="SELECT t.*,a.name account_name,a.type account_type,c.name category_name,c.color category_color,c.icon category_icon FROM transactions t LEFT JOIN accounts a ON t.account_id=a.id LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=:u"; p={"u":user["id"]}
    for k,op in [("type","="),("account_id","="),("category_id","="),("start_date",">="),("end_date","<=")]:
        v=request.query_params.get(k)
        if v: q+=f" AND t.{k} {op} :{k}"; p[k]=v
    lim=request.query_params.get("limit")
    if lim:
        try: lim=int(lim)
        except ValueError: lim=0
        if lim<1 or lim>1000: raise HTTPException(400,"Invalid limit parameter. Must be a positive integer between 1 and 1000.")
        q+=" LIMIT :limit"; p["limit"]=lim
    q+=" ORDER BY t.date DESC,t.created_at DESC"
    return [row(x) for x in (await session.execute(text(q),p)).mappings().all()]

@router.get("/transactions/{id}")
async def transaction(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=(await session.execute(text("SELECT t.*,a.name account_name,a.type account_type,c.name category_name,c.color category_color,c.icon category_icon FROM transactions t LEFT JOIN accounts a ON t.account_id=a.id LEFT JOIN categories c ON t.category_id=c.id WHERE t.id=:id AND t.user_id=:u"),{"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Transaction not found")
    return row(r)

@router.post("/transactions",status_code=201)
async def create_transaction(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b,upload=await tx_payload(request); b=tx_cast(b); b["attachment_path"]=await save_upload(upload) or b.get("attachment_path")
    r=(await session.execute(text("INSERT INTO transactions(user_id,date,amount,type,description,account_id,category_id,tags,attachment_path) VALUES(:u,:d,:a,:t,:x,:ai,:ci,:g,:p) RETURNING id"),{"u":user["id"],"d":b["date"],"a":b["amount"],"t":b["type"],"x":b["description"],"ai":b["account_id"],"ci":b["category_id"],"g":b["tags"],"p":b["attachment_path"]})).scalar_one()
    delta=b["amount"] if b["type"]=="income" else -b["amount"]
    await session.execute(text("UPDATE accounts SET balance=balance+:d,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u"),{"d":delta,"id":b["account_id"],"u":user["id"]}); await session.commit()
    return await transaction(r,user,session)

@router.put("/transactions/{id}")
async def update_transaction(id:int,request:Request,user=Depends(current_user),session=Depends(get_session)):
    old=(await session.execute(text("SELECT * FROM transactions WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]})).mappings().first()
    if not old: raise HTTPException(404,"Transaction not found")
    b,upload=await tx_payload(request); b=tx_cast(b); b["attachment_path"]=await save_upload(upload) or b.get("attachment_path")
    olddelta=-old["amount"] if old["type"]=="income" else old["amount"]; newdelta=b["amount"] if b["type"]=="income" else -b["amount"]
    await session.execute(text("UPDATE accounts SET balance=balance+:d,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u"),{"d":olddelta,"id":old["account_id"],"u":user["id"]})
    await session.execute(text("UPDATE accounts SET balance=balance+:d,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u"),{"d":newdelta,"id":b["account_id"],"u":user["id"]})
    await session.execute(text("UPDATE transactions SET date=:d,amount=:a,type=:t,description=:x,account_id=:ai,category_id=:ci,tags=:g,attachment_path=:p,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u"),{"d":b["date"],"a":b["amount"],"t":b["type"],"x":b["description"],"ai":b["account_id"],"ci":b["category_id"],"g":b["tags"],"p":b["attachment_path"],"id":id,"u":user["id"]}); await session.commit()
    return await transaction(id,user,session)

@router.delete("/transactions/{id}",status_code=204)
async def delete_transaction(id:int,user=Depends(current_user),session=Depends(get_session)):
    old=(await session.execute(text("SELECT * FROM transactions WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]})).mappings().first()
    if not old: raise HTTPException(404,"Transaction not found")
    delta=-old["amount"] if old["type"]=="income" else old["amount"]
    await session.execute(text("UPDATE accounts SET balance=balance+:d,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u"),{"d":delta,"id":old["account_id"],"u":user["id"]})
    await session.execute(text("DELETE FROM transactions WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]}); await session.commit()

async def budget_row(id,user,session):
    r=(await session.execute(text("SELECT b.*,c.name category_name,c.color category_color,c.icon category_icon FROM budgets b LEFT JOIN categories c ON b.category_id=c.id WHERE b.id=:id AND b.user_id=:u"),{"id":id,"u":user["id"]})).mappings().first()
    if not r: raise HTTPException(404,"Budget not found")
    return row(r)

async def budget_progress_value(b,user_id,session):
    spent=(await session.execute(text("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=:u AND category_id=:c AND type='expense' AND date BETWEEN :s AND :e"),{"u":user_id,"c":b["category_id"],"s":b["start_date"],"e":b["end_date"]})).scalar_one()
    b["spent"]=spent; b["remaining"]=b["amount"]-spent; b["percentage"]=(spent/b["amount"]*100) if b["amount"] else 0; return b

@router.get("/budgets")
async def budgets(user=Depends(current_user),session=Depends(get_session)):
    return [row(x) for x in (await session.execute(text("SELECT b.*,c.name category_name,c.color category_color,c.icon category_icon FROM budgets b LEFT JOIN categories c ON b.category_id=c.id WHERE b.user_id=:u ORDER BY b.start_date DESC"),{"u":user["id"]})).mappings().all()]

@router.get("/budgets/active")
async def active_budgets(request:Request,user=Depends(current_user),session=Depends(get_session)):
    d=request.query_params.get("date") or date.today().isoformat()
    return [row(x) for x in (await session.execute(text("SELECT b.*,c.name category_name,c.color category_color,c.icon category_icon FROM budgets b LEFT JOIN categories c ON b.category_id=c.id WHERE b.user_id=:u AND :d BETWEEN b.start_date AND b.end_date ORDER BY c.name"),{"u":user["id"],"d":d})).mappings().all()]

@router.get("/budgets/progress")
async def all_budget_progress(request:Request,user=Depends(current_user),session=Depends(get_session)):
    return [await budget_progress_value(x,user["id"],session) for x in await active_budgets(request,user,session)]

@router.get("/budgets/{id}/progress")
async def one_budget_progress(id:int,user=Depends(current_user),session=Depends(get_session)):
    return await budget_progress_value(await budget_row(id,user,session),user["id"],session)

@router.get("/budgets/{id}")
async def get_budget(id:int,user=Depends(current_user),session=Depends(get_session)): return await budget_row(id,user,session)

@router.post("/budgets",status_code=201)
async def create_budget(request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json()
    r=(await session.execute(text("INSERT INTO budgets(user_id,category_id,amount,period,start_date,end_date) VALUES(:u,:c,:a,:p,:s,:e) RETURNING id"),{"u":user["id"],"c":b.get("category_id"),"a":b.get("amount"),"p":b.get("period"),"s":b.get("start_date"),"e":b.get("end_date")})).scalar_one()
    await session.commit(); return await budget_row(r,user,session)

@router.put("/budgets/{id}")
async def update_budget(id:int,request:Request,user=Depends(current_user),session=Depends(get_session)):
    b=await request.json()
    r=(await session.execute(text("UPDATE budgets SET category_id=:c,amount=:a,period=:p,start_date=:s,end_date=:e,updated_at=CURRENT_TIMESTAMP WHERE id=:id AND user_id=:u RETURNING id"),{"c":b.get("category_id"),"a":b.get("amount"),"p":b.get("period"),"s":b.get("start_date"),"e":b.get("end_date"),"id":id,"u":user["id"]})).scalar_one_or_none()
    if not r: raise HTTPException(404,"Budget not found")
    await session.commit(); return await budget_row(id,user,session)

@router.delete("/budgets/{id}",status_code=204)
async def delete_budget(id:int,user=Depends(current_user),session=Depends(get_session)):
    r=await session.execute(text("DELETE FROM budgets WHERE id=:id AND user_id=:u"),{"id":id,"u":user["id"]}); await session.commit()
    if r.rowcount==0: raise HTTPException(404,"Budget not found")

@router.get("/reports/summary")
async def report_summary(request:Request,user=Depends(current_user),session=Depends(get_session)):
    q="SELECT type,COUNT(*) count,SUM(amount) total,AVG(amount) average FROM transactions WHERE user_id=:u"; p={"u":user["id"]}
    for k,op in [("start_date",">="),("end_date","<=")]:
        v=request.query_params.get(k)
        if v:q+=f" AND date {op} :{k}"; p[k]=v
    rows=[row(x) for x in (await session.execute(text(q+" GROUP BY type"),p)).mappings().all()]
    inc=next((x for x in rows if x["type"]=="income"),{"count":0,"total":0,"average":0}); exp=next((x for x in rows if x["type"]=="expense"),{"count":0,"total":0,"average":0})
    return {"income":inc,"expense":exp,"netIncome":inc["total"]-exp["total"]}

@router.get("/reports/by-category")
async def report_category(request:Request,user=Depends(current_user),session=Depends(get_session)):
    q="SELECT c.id,c.name,c.color,c.icon,t.type,COUNT(*) count,SUM(t.amount) total FROM transactions t LEFT JOIN categories c ON t.category_id=c.id WHERE t.user_id=:u"; p={"u":user["id"]}
    for k,op in [("type","="),("start_date",">="),("end_date","<=")]:
        v=request.query_params.get(k)
        if v:q+=f" AND t.{k} {op} :{k}"; p[k]=v
    return [row(x) for x in (await session.execute(text(q+" GROUP BY c.id,c.name,c.color,c.icon,t.type ORDER BY total DESC"),p)).mappings().all()]
