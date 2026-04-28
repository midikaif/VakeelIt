from fastapi import APIRouter
from typing import List
from app.schemas.draft import DraftGenerateRequest, DocumentTemplate
from app.controllers.draft_controller import generate_draft, fetch_all_templates

router = APIRouter(prefix="/draft", tags=["Drafting"])


@router.get("/templates", response_model=List[DocumentTemplate])
async def get_templates():
    return await fetch_all_templates()

@router.post("/generate")
async def create_draft(request: DraftGenerateRequest) -> dict:
    return {"content": await generate_draft(request.template_id, request.user_inputs)}
