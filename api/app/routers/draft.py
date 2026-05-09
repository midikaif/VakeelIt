from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import logging
from app.services.ai_service import get_ai_analysis
from app.services.pdf_client import call_draft_pdf_worker
from app.core.database import get_db

router = APIRouter(prefix="/draft", tags=["draft"])
logger = logging.getLogger("uvicorn.error")

db = get_db()

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

DRAFT_CONFIGS = {
    "vakalatnama": {
        "title_en": "VAKALATNAMA",
        "title_hi": "वकालतनामा",
        "description": "Authorization letter from client to lawyer",
        "structure_instructions": "Format MUST include:\n- 'IN THE COURT OF [COURT NAME]'\n- Suit/Case No.\n- Cause Title (Plaintiff/Applicant vs. Defendant/Respondent)\n- 'KNOW ALL MEN by these presents that I/We...'\n- Explicit clauses authorizing the Advocate to appear, plead, act, file documents, and compromise.\n- Signatures of Executant(s) and 'ACCEPTED' section with Advocate's signature.",
    },
    "bail_application": {
        "title_en": "APPLICATION FOR BAIL",
        "title_hi": "जमानत के लिए आवेदन",
        "description": "Application for bail before court",
        "structure_instructions": "Format MUST include:\n- 'IN THE COURT OF [COURT NAME]'\n- FIR No., U/S (Under Section), P.S. (Police Station)\n- Cause Title (Applicant vs. State)\n- 'MOST RESPECTFULLY SHOWETH:' followed by numbered paragraphs stating facts, applicant's innocence, readiness to furnish surety, and non-tampering with evidence.\n- PRAYER clause clearly requesting bail.\n- Verification/Signatures: Place, Date, Applicant's Signature (Through Counsel).",
    },
    "legal_notice": {
        "title_en": "LEGAL NOTICE",
        "title_hi": "कानूनी नोटिस",
        "description": "Formal legal notice to a party",
        "structure_instructions": "Format MUST include:\n- 'BY REGISTERED POST A/D' at the top.\n- Date of Notice.\n- Addressee Details (To, [Name, Address]).\n- Opening: 'Under instructions from and on behalf of my client [Client Name], I do hereby serve upon you with the following notice:'\n- Numbered paragraphs detailing the facts, breach/dispute, and the specific demand.\n- A strict deadline (e.g., 15 days) to comply with the demand.\n- Warning of legal consequences (civil/criminal action) if the demand is not met.\n- Signature of the Advocate issuing the notice.",
    },
    "affidavit": {
        "title_en": "AFFIDAVIT",
        "title_hi": "शपथ पत्र",
        "description": "Sworn statement before court",
        "structure_instructions": "Format MUST include:\n- 'IN THE COURT OF [COURT NAME]' (if filed in court).\n- Cause Title (if any).\n- Deponent details: 'AFFIDAVIT OF [Name], S/O [Father's Name], AGED ABOUT [Age] YEARS, R/O [Address]'.\n- Oath: 'I, the above-named deponent, do hereby solemnly affirm and declare as under:'\n- Numbered paragraphs stating the sworn facts.\n- 'DEPONENT' signature block.\n- VERIFICATION clause: 'Verified at [Place] on this [Date] that the contents of the above affidavit are true and correct to my knowledge...'\n- Second 'DEPONENT' signature block after verification.",
    },
    "written_statement": {
        "title_en": "WRITTEN STATEMENT",
        "title_hi": "लिखित बयान",
        "description": "Defendant's reply to plaint",
        "structure_instructions": "Format MUST include:\n- 'IN THE COURT OF [COURT NAME]'\n- Suit No. / Case Details.\n- Cause Title (Plaintiff vs. Defendant).\n- 'PRELIMINARY OBJECTIONS:' numbered paragraphs (e.g., lack of cause of action, limitation).\n- 'PARAWISE REPLY ON MERITS:' numbered paragraphs matching the plaintiff's plaint.\n- PRAYER clause requesting dismissal of the suit with costs.\n- Verification clause stating which paragraphs are true to knowledge and which are based on legal advice.\n- Place, Date, Defendant's Signature, Advocate's Signature.",
    },
    "mou": {
        "title_en": "MEMORANDUM OF UNDERSTANDING",
        "title_hi": "समझौता ज्ञापन",
        "description": "MOU between two or more parties",
        "structure_instructions": "Format MUST include:\n- Execution Date and Place.\n- Details of 'First Party' and 'Second Party' (Names, Addresses, Representation).\n- 'WHEREAS:' recitals setting out the background, intent, and context of the agreement.\n- 'NOW THEREFORE, the Parties agree as follows:'\n- Numbered clauses for Terms and Conditions (scope of work, obligations, payment, duration, termination, dispute resolution).\n- Signature blocks for 'First Party', 'Second Party', and two Witnesses.",
    },
    "power_of_attorney": {
        "title_en": "POWER OF ATTORNEY",
        "title_hi": "मुख्तारनामा",
        "description": "Authority granted from one person to another",
        "structure_instructions": "Format MUST include:\n- 'KNOW ALL MEN BY THESE PRESENTS THAT I, [Name], S/O [Father], R/O [Address]...'\n- '...do hereby appoint, nominate and constitute [Attorney Name] as my true and lawful attorney...'\n- Numbered list of specific powers granted (e.g., to manage property, represent in court, sign documents).\n- 'AND I hereby agree to ratify and confirm all acts done by my said attorney...'\n- Execution block: 'IN WITNESS WHEREOF...'\n- Date, Place, Signature of Executant, Signatures of two Witnesses.",
    },
    "demand_letter": {
        "title_en": "DEMAND LETTER",
        "title_hi": "मांग पत्र",
        "description": "Formal letter demanding payment or action",
        "structure_instructions": "Format MUST include:\n- Sender Details & Date.\n- Addressee Details.\n- Subject Line clearly stating the demand (e.g., 'SUBJECT: DEMAND FOR OUTSTANDING PAYMENT').\n- Formal salutation.\n- Body detailing the background of the transaction/dispute, the exact outstanding amount or required action, and reference to any previous correspondence.\n- A strict deadline to comply.\n- Notice that failure to comply will result in further legal action.\n- Sign-off and Signature of Sender.",
    },
}

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
    structure_instructions = config["structure_instructions"]
    
    return f"""Generate a complete, court-ready document for Indian courts.
{lang_instruction}

STRICT FORMATTING RULES:
1. Ensure the draft follows standard Indian legal formats for a {title}.
2. TITLE REQUIREMENT: You MUST explicitly include the title "{title}" prominently centered at the top of the document.
3. SPECIFIC DOCUMENT STRUCTURE:
{structure_instructions}
4. OUTPUT FORMAT: You MUST generate the output as clean, well-structured HTML.
   - Use proper HTML tags (<center>, <b>, <u>, <p>, <br>, etc.) to format the document EXACTLY as it should appear on paper.
   - For example, Court Details, Cause Title, and Document Title should typically be centered and bold.
   - The body paragraphs should be justified.
   - Do NOT wrap the HTML in markdown blocks (e.g. ```html). Just output the raw HTML code.

Details provided:
{inputs_text}

Generate the COMPLETE document HTML exactly as it would appear on paper.
Do NOT add any introductory explanation or markdown. Just the raw HTML code."""

@router.post("/generate")
async def generate_draft(request: DraftRequest):
    """Generate a legal draft document and return as PDF via worker"""

    if request.draft_type not in DRAFT_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown draft type. Valid types: {', '.join(DRAFT_CONFIGS.keys())}"
        )

    if request.language not in ["english", "hindi"]:
        raise HTTPException(status_code=400, detail="Language must be 'english' or 'hindi'")

    # Build prompt and get AI content
    prompt = build_draft_prompt(request.draft_type, request.language, request.inputs)
    # logger.info(f"Draft prompt: {prompt}")
    html_content = await get_ai_analysis(prompt)

    # Clean markdown if AI included it
    import re
    match = re.search(r'```(?:html)?(.*?)```', html_content, re.DOTALL | re.IGNORECASE)
    if match:
        html_content = match.group(1).strip()
    else:
        # Fallback to stripping if no code block found
        html_content = html_content.strip()
        if html_content.startswith("<!DOCTYPE html>"):
            pass # Keep it
        elif html_content.startswith("<html"):
            pass # Keep it
        else:
            # Maybe just raw HTML tags without wrapper
            pass

    full_html = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @font-face {{
                font-family: 'Mukta';
                src: url('assets/fonts/Mukta-Regular.ttf');
                font-weight: normal;
            }}
            @font-face {{
                font-family: 'Mukta';
                src: url('assets/fonts/Mukta-Bold.ttf');
                font-weight: bold;
            }}
            body {{
                font-family: 'Mukta', Helvetica, Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
            }}
            p {{ text-align: justify; margin-bottom: 15px; }}
            .center {{ text-align: center; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Generate PDF by delegating to worker
    from app.services.pdf_client import call_pdf_worker
    try:
        logger.info("==============================Before PDF generation==============================")
        pdf_base64 = await call_pdf_worker(full_html)
        logger.info("==============================After PDF generation==============================")
    except Exception as e:
        logger.error(f"PDF generation error (delegated): {str(e)}")
        pdf_base64 = ""

    # Save to DB
    draft_record = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "draft_type": request.draft_type,
        "language": request.language,
        "inputs": request.inputs,
        "content": html_content,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.drafts.insert_one(draft_record)

    return {
        "id": draft_record["id"],
        "draft_type": request.draft_type,
        "language": request.language,
        "content": html_content,
        "pdf_base64": pdf_base64,
    }

@router.get("/history/{user_id}")
async def get_draft_history(user_id: str):
    drafts = await db.drafts.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    for d in drafts:
        d.pop('_id', None)
        d.pop('pdf_base64', None)
    return drafts

@router.get("/types")
async def get_draft_types():
    return [{"key": k, **v} for k, v in DRAFT_CONFIGS.items()]
