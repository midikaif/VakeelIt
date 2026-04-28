from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from app.core.database import client
from app.routers import auth, contract, case, procedure, lawyer, draft

app = FastAPI()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[ "https://legal-sahayak-r3l77iuvn-midikaifs-projects.vercel.app", 
        "http://localhost:8081",
        "http://127.0.0.1:8081"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(contract.router, prefix="/api")
app.include_router(case.router, prefix="/api")
app.include_router(procedure.router, prefix="/api")
app.include_router(lawyer.router, prefix="/api")
app.include_router(draft.router, prefix="/api")

@app.get("/api/")
async def root():
    return {"message": "VakeelIt API - Your Legal Assistant"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
