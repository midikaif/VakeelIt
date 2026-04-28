from typing import Any, List, Dict
from pydantic import BaseModel

class TemplateFields(BaseModel):
    name: str
    label: str
    type: str
    required: bool = True

class DocumentTemplate(BaseModel):
    id: str
    title: str
    description: str
    content_template: str
    fields: List[TemplateFields]

class DraftGenerateRequest(BaseModel):
    template_id: str
    user_inputs: Dict[str, Any]