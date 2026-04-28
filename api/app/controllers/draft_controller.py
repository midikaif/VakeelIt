from fastapi import HTTPException
from app.core.database import client
from typing import Dict, Any

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
        templates_collection = db["draft_templates"]
        template = await templates_collection.find_one({"id": template_id}, {"_id": 0})

        if not template:
            raise HTTPException(status_code=404, detail="Template not found")

        content = template["content_template"]

        for key, value in user_inputs.items():
            content = content.replace("{{" + key + "}}", str(value))

        return content

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating document: {str(e)}")