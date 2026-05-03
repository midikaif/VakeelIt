
# ==================== DRAFT GENERATION ROUTES ====================
from fastapi import APIRouter, HTTPException
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import re
import logging
from app.services.ai_service import get_ai_analysis
from io import BytesIO
import base64

from app.core.database import get_db

router = APIRouter(prefix="/draft", tags=["draft"])
logger = logging.getLogger(__name__)

db = get_db()

# ---- Pydantic model (add with other models) ----

class DraftRequest(BaseModel):
    draft_type: str       # e.g. "vakalatnama", "bail_application"
    language: str         # "english" or "hindi"
    inputs: dict          # dynamic fields depending on draft_type
    user_id: str

class DraftResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    draft_type: str
    language: str
    content: str          # Full text content
    pdf_base64: str       # Base64 encoded PDF
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ---- Draft config: defines required fields per draft type ----

DRAFT_CONFIGS = {
    "vakalatnama": {
        "title_en": "VAKALATNAMA",
        "title_hi": "वकालतनामा",
        "description": "Authorization letter from client to lawyer",
    },
    "bail_application": {
        "title_en": "APPLICATION FOR BAIL",
        "title_hi": "जमानत के लिए आवेदन",
        "description": "Application for bail before court",
    },
    "legal_notice": {
        "title_en": "LEGAL NOTICE",
        "title_hi": "कानूनी नोटिस",
        "description": "Formal legal notice to a party",
    },
    "affidavit": {
        "title_en": "AFFIDAVIT",
        "title_hi": "शपथ पत्र",
        "description": "Sworn statement before court",
    },
    "written_statement": {
        "title_en": "WRITTEN STATEMENT",
        "title_hi": "लिखित बयान",
        "description": "Defendant's reply to plaint",
    },
    "mou": {
        "title_en": "MEMORANDUM OF UNDERSTANDING",
        "title_hi": "समझौता ज्ञापन",
        "description": "MOU between two or more parties",
    },
    "power_of_attorney": {
        "title_en": "POWER OF ATTORNEY",
        "title_hi": "मुख्तारनामा",
        "description": "Authority granted from one person to another",
    },
    "demand_letter": {
        "title_en": "DEMAND LETTER",
        "title_hi": "मांग पत्र",
        "description": "Formal letter demanding payment or action",
    },
}

# ---- AI prompt builder ----

def build_draft_prompt(draft_type: str, language: str, inputs: dict) -> str:
    lang_instruction = (
        "Generate this document ENTIRELY in Hindi (Devanagari script). "
        "Use formal court Hindi as used in Indian district courts."
        if language == "hindi"
        else "Generate this document in formal English as used in Indian courts."
    )

    inputs_text = "\n".join([f"- {k.replace('_', ' ').title()}: {v}" for k, v in inputs.items()])

    config = DRAFT_CONFIGS[draft_type]
    title = config["title_hi"] if language == "hindi" else config["title_en"]
    
    prompts = {
        "vakalatnama": f"""Generate a complete, court-ready VAKALATNAMA for Indian courts.
        Use "{title}" as the document title. Do not add any other language title.
    
{lang_instruction}

Details provided:
{inputs_text}

The VAKALATNAMA must include:
1. Title ({title})
2. Court name and jurisdiction
3. Case title and number
4. Full authorization text from client to advocate
5. Scope of authority (appear, plead, act, sign)
6. Undertaking by client
7. Signature blocks for both client and advocate with date and place
8. Advocate's bar council enrollment number
9. Standard undertaking clause as per Bar Council of India Rules

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "bail_application": f"""Generate a complete, court-ready BAIL APPLICATION for Indian courts under CrPC.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The {title} must include:
1. Court heading with full case details
2. Application title
3. "MOST RESPECTFULLY SHOWETH" section
4. Detailed grounds for bail (at least 6 strong legal grounds)
5. Cite relevant CrPC sections (436, 437, or 439 as applicable)
6. Reference to relevant Supreme Court judgements on bail
7. Prayer clause
8. Verification
9. Place and date
10. Advocate signature block

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "legal_notice": f"""Generate a complete, formal LEGAL NOTICE as used in Indian legal practice.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The notice must include:
1. Advocate's letterhead block (name, enrollment number, address)
2. Notice number and date
3. Addressee details
4. Subject line
5. "UNDER INSTRUCTION FROM MY CLIENT" opener
6. Detailed facts and legal basis
7. Specific legal provisions violated
8. Clear demand/relief sought
9. Consequence of non-compliance (legal proceedings)
10. Timeline given (usually 15-30 days)
11. Advocate signature with seal note

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "affidavit": f"""Generate a complete, court-ready AFFIDAVIT for Indian courts.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The affidavit must include:
1. Court heading
2. "AFFIDAVIT" title
3. Deponent details (full name, age, address, occupation)
4. "I, the above-named deponent do hereby solemnly affirm and state as under:"
5. Numbered paragraphs with facts
6. Verification clause: "Verified at [place] on [date]..."
7. Deponent signature block
8. Notary/Oath Commissioner section

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "written_statement": f"""Generate a complete WRITTEN STATEMENT (reply to plaint) for Indian civil courts.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The written statement must include:
1. Court heading with case number
2. "WRITTEN STATEMENT ON BEHALF OF DEFENDANT"
3. Preliminary objections (jurisdiction, limitation, maintainability)
4. Reply to each allegation paragraph-by-paragraph
5. Additional pleas
6. Prayer clause
7. Verification by defendant
8. Advocate signature

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "mou": f"""Generate a complete MEMORANDUM OF UNDERSTANDING (MOU) as used in Indian legal practice.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The MOU must include:
1. Title and date
2. Parties section with full details
3. Recitals/Background (WHEREAS clauses)
4. Definitions
5. Scope and purpose
6. Obligations of each party
7. Duration and termination
8. Confidentiality clause
9. Dispute resolution (arbitration under Arbitration & Conciliation Act 1996)
10. Governing law (Indian law, specific jurisdiction)
11. Signature blocks for all parties with witnesses

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "power_of_attorney": f"""Generate a complete POWER OF ATTORNEY(POA) as used in Indian legal practice.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The POA must include:
1. Title: {title}
2. Date and place of execution
3. Grantor's full details
4. Attorney's full details
5. KNOW ALL MEN BY THESE PRESENTS opening
6. Specific powers granted (numbered list)
7. Ratification clause
8. Revocation clause
9. Execution on stamp paper note
10. Signature of grantor
11. Two witness signature blocks
12. Notary acknowledgment section

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",

        "demand_letter": f"""Generate a complete DEMAND LETTER as used in Indian legal practice.
        Use "{title}" as the document title. Do not add any other language title.

{lang_instruction}

Details provided:
{inputs_text}

The demand letter must include:
1. Sender's/Advocate's letterhead
2. Date
3. Recipient details
4. Subject line
5. Reference to previous communications if any
6. Clear statement of the dispute/issue
7. Legal basis for the demand
8. Specific demand (payment, action, or both)
9. Deadline (typically 15 days)
10. Consequences of non-compliance
11. Without prejudice note if applicable
12. Signature

Generate the COMPLETE document text exactly as it would appear on paper.
Do NOT add any explanation or JSON. Just the raw document text.""",
    }

    return prompts.get(draft_type, f"""Generate a complete {draft_type.replace('_', ' ').upper()} document for Indian courts.
{lang_instruction}
Details: {inputs_text}
Generate the COMPLETE formal document text. No explanation, just the document.""")


# ---- PDF Generator ----

def generate_pdf(content: str, draft_type: str, language: str) -> bytes:
    """Generate a properly formatted PDF from draft content"""
    import json
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib import colors

    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles matching court document look
    title_style = ParagraphStyle(
        'CourtTitle',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=6,
        spaceBefore=6,
        textColor=colors.black,
    )
    heading_style = ParagraphStyle(
        'CourtHeading',
        parent=styles['Normal'],
        fontSize=11,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4,
        spaceBefore=4,
    )
    body_style = ParagraphStyle(
        'CourtBody',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        spaceBefore=2,
        leading=16,
    )
    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        alignment=TA_RIGHT,
        spaceAfter=4,
        spaceBefore=12,
    )

    story = []

    # Top border line
    story.append(HRFlowable(width="100%", thickness=2, color=colors.black))
    story.append(Spacer(1, 0.2 * cm))

    # Process content line by line
    
    # Strip markdown bold/italic symbols
    content = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', content)
    # Strip markdown headers
    content = re.sub(r'^#{1,6}\s*', '', content, flags=re.MULTILINE)
    lines = content.split('\n')
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 0.25 * cm))
            continue

        # Detect line type and apply appropriate style
        is_title = (
            stripped.isupper() and len(stripped) > 3
            or any(stripped.startswith(t) for t in [
                'VAKALATNAMA', 'APPLICATION FOR', 'LEGAL NOTICE',
                'AFFIDAVIT', 'WRITTEN STATEMENT', 'MEMORANDUM',
                'POWER OF ATTORNEY', 'DEMAND LETTER',
                'वकालतनामा', 'शपथ पत्र', 'कानूनी नोटिस',
            ])
        )
        is_heading = (
            stripped.startswith('IN THE') or
            stripped.startswith('BEFORE THE') or
            stripped.startswith('WHEREAS') or
            stripped.startswith('PRAYER') or
            stripped.startswith('VERIFICATION') or
            stripped.startswith('TO,') or
            stripped.startswith('Yours faithfully') or
            stripped.startswith('Yours sincerely')
        )
        is_signature = (
            'Advocate' in stripped or
            'Deponent' in stripped or
            'Signature' in stripped or
            stripped.startswith('Place:') or
            stripped.startswith('Date:')
        )

        # Escape special chars for reportlab
        safe_line = (stripped
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;'))

        if is_title:
            story.append(Paragraph(safe_line, title_style))
        elif is_heading:
            story.append(Paragraph(safe_line, heading_style))
        elif is_signature:
            story.append(Paragraph(safe_line, signature_style))
        else:
            story.append(Paragraph(safe_line, body_style))

    # Bottom border
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))

    doc.build(story)
    return buffer.getvalue()


# ---- API Route ----

@router.post("/generate")
async def generate_draft(request: DraftRequest):
    """Generate a legal draft document and return as PDF"""

    if request.draft_type not in DRAFT_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown draft type. Valid types: {', '.join(DRAFT_CONFIGS.keys())}"
        )

    if request.language not in ["english", "hindi"]:
        raise HTTPException(status_code=400, detail="Language must be 'english' or 'hindi'")

    # Build prompt and get AI content
    prompt = build_draft_prompt(request.draft_type, request.language, request.inputs)
    
    content = await get_ai_analysis(prompt)

    # Generate PDF
    try:
        pdf_bytes = generate_pdf(content, request.draft_type, request.language)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        pdf_base64 = ""

    # Save to DB
    draft_record = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "draft_type": request.draft_type,
        "language": request.language,
        "inputs": request.inputs,
        "content": content,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.drafts.insert_one(draft_record)

    return {
        "id": draft_record["id"],
        "draft_type": request.draft_type,
        "language": request.language,
        "content": content,
        "pdf_base64": pdf_base64,
    }


@router.get("/history/{user_id}")
async def get_draft_history(user_id: str):
    """Get past drafts for a user"""
    drafts = await db.drafts.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    for d in drafts:
        d.pop('_id', None)
        d.pop('pdf_base64', None)  # Don't return heavy PDF in list
    return drafts


@router.get("/types")
async def get_draft_types():
    """Return list of supported draft types"""
    return [
        {"key": k, **v} for k, v in DRAFT_CONFIGS.items()
    ]



# ===========================================
# ===========================================
# ===========================================
# ===========================================

# from fastapi import APIRouter, Response
# from typing import List
# from app.schemas.draft import DraftGenerateRequest, DocumentTemplate
# from app.controllers.draft_controller import generate_draft, fetch_all_templates

# router = APIRouter(prefix="/draft", tags=["Drafting"])


# @router.get("/templates", response_model=List[DocumentTemplate])
# async def get_templates():
#     return await fetch_all_templates()

# @router.post("/generate", response_class=Response)
# async def create_draft(request: DraftGenerateRequest):
#     return await generate_draft(request.template_id, request.user_inputs)