import io
from fastapi import HTTPException, Response
from app.core.database import client
from typing import Dict, Any
from xhtml2pdf import pisa
from app.services.ai_service import get_ai_analysis


db = client.get_database("vakeelit_db")

async def fetch_all_templates():
    try:
        templates_collection = db["draft_templates"]
        templates = await templates_collection.find({}, {"_id": 0}).to_list(length=100)

        if not templates:
            raise HTTPException(status_code=404, detail="No templates found")
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching templates: {str(e)}")

async def generate_draft(template_id: str, user_inputs: Dict[str, Any]):
    try:
        # 1. Fetch template
        templates_collection = db["draft_templates"]
        template = await templates_collection.find_one({"id": template_id}, {"_id": 0})

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        template_name = template.get("name", "Legal Document")

        # 2. AI Prompt
        prompt = f"""
        Your task is to draft a highly professional, legally binding '{template_name}'.
        
        Please carefully incorporate the following details provided by the client:
        {user_inputs}
        
        OUTPUT FORMAT REQUIREMENTS:
        - Output ONLY clean, perfectly formatted HTML.
        - Do NOT include markdown code blocks (like ```html). 
        - Use proper <h1>, <h2>, and <p> tags. 
        - Use <div style="text-align: center;"> for main titles.
        """

        # 3. Call AI
        html_content = await get_ai_analysis(prompt=prompt)

        # 4. Clean up HTML
        html_content = html_content.strip()
        if html_content.startswith("```html"):
            html_content = html_content[7:-3].strip()
        elif html_content.startswith("```"):
            html_content = html_content[3:-3].strip()

        # ---------------------------------------------------------
        # 5. NEW: Convert HTML to PDF using xhtml2pdf
        # ---------------------------------------------------------
        pdf_buffer = io.BytesIO()
        
        # pisa.CreatePDF takes the HTML string and writes it to the buffer
        pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
        
        # If there was an error during generation, raise it
        if pisa_status.err:
            raise HTTPException(status_code=500, detail="Failed to convert HTML to PDF")

        # Extract the raw bytes from the buffer
        pdf_bytes = pdf_buffer.getvalue()
        # ---------------------------------------------------------

        # 6. Send to frontend
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f'attachment; filename="{template_name.replace(" ", "_")}.pdf"'}
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error generating document: {str(e)}")