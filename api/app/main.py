from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime
from contextlib import asynccontextmanager
import traceback
import httpx
import asyncio
import os

from app.core.database import client
from app.routers import auth, contract, case, procedure, lawyer, draft

app = FastAPI()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Global exception handler caught: {exc}"
    logger.error(error_msg)
    
    # Extract full traceback
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.error(f"Traceback: {tb_str}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error_message": str(exc),
            "traceback": tb_str
        },
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[
        "https://legal-sahayak-ten.vercel.app",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:19000",
        "http://localhost:19006",
        "*"
    ],
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

async def ping_pdf_worker():
    pdf_worker_url = os.getenv("PDF_WORKER_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient() as client:
            await client.get(f"{pdf_worker_url}/health", timeout=3.0)
            logger.info("Successfully pinged PDF worker to wake it up.")
    except Exception as e:
        logger.error(f"PDF worker wake-up ping failed (it might still be waking up): {e}")

@app.get("/api/health")
async def health_check():
    # Ensure PDF worker is awake before responding
    await ping_pdf_worker()
    return {"status": "healthy", "timestamp": datetime.utcnow()}
