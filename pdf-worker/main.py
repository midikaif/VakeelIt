from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import base64
import logging
try:
    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration
    font_config = FontConfiguration()
    weasyprint_available = True
except ImportError:
    HTML = None
    font_config = None
    weasyprint_available = False
    logging.warning("weasyprint not installed. PDF generation will be unavailable.")
from services.document_service import extract_text_from_pdf, extract_text_from_image
from services.draft_service import generate_formatted_draft_pdf
import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger("uvicorn.error")

# Register Devanagari Fonts Globally for xhtml2pdf and ReportLab
base_dir = os.path.dirname(os.path.abspath(__file__))
font_regular_path = os.path.join(base_dir, 'assets', 'fonts', 'Mukta-Regular.ttf')
font_bold_path = os.path.join(base_dir, 'assets', 'fonts', 'Mukta-Bold.ttf')

if os.path.exists(font_regular_path):
    pdfmetrics.registerFont(TTFont('Mukta', font_regular_path))
    pdfmetrics.registerFont(TTFont('Mukta-Bold', font_bold_path))
    logger.info("Mukta fonts registered globally for PDF generation.")
else:
    logger.error("Mukta fonts not found at " + font_regular_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BytesIO = io.BytesIO

class PDFRequest(BaseModel):
    html_content: str

class DraftPDFRequest(BaseModel):
    content: str

class OCRRequest(BaseModel):
    image_base64: str

class ExtractTextRequest(BaseModel):
    pdf_base64: str

@app.get("/health")
async def health_check():
    return {"status": "pdf-worker healthy"}

@app.post("/generate-pdf")
async def generate_pdf(request: PDFRequest):
    if not weasyprint_available:
        raise HTTPException(status_code=501, detail="PDF generation with weasyprint is not available on this server.")
    
    try:
        logger.info("Generating PDF with WeasyPrint...")
        # Resolve base URL so relative assets (like fonts) work perfectly
        base_url = os.path.dirname(os.path.abspath(__file__))
        
        pdf_bytes = HTML(string=request.html_content, base_url=base_url).write_pdf(font_config=font_config)
        logger.info("PDF generated successfully")
        
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        logger.info("PDF base64 encoded successfully")
        return {"pdf_base64": pdf_base64}
        
    except Exception as e:
        logger.error(f"weasyprint error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")

@app.post("/generate-draft-pdf")
async def generate_draft_pdf(request: DraftPDFRequest):
    pdf_bytes = generate_formatted_draft_pdf(request.content)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Draft PDF Generation Failed.")
    
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    return {"pdf_base64": pdf_base64}

@app.post("/ocr")
async def perform_ocr(request: OCRRequest):
    text = extract_text_from_image(request.image_base64)
    if not text:
        raise HTTPException(status_code=500, detail="OCR processing failed")
    return {"text": text}

@app.post("/extract-text")
async def extract_text(request: ExtractTextRequest):
    try:
        pdf_bytes = base64.b64decode(request.pdf_base64)
        text = extract_text_from_pdf(pdf_bytes)
        return {"text": text}
    except Exception as e:
        logger.error(f"Text extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Text extraction failed")