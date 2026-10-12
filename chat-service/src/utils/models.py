
from typing import Literal

from pydantic import BaseModel, Field


class Finding(BaseModel):
    severity: Literal["P0", "P1", "P2", "P3"]
    title: str
    file: str
    line: int = Field(gt=0)
    side: Literal["RIGHT", "LEFT"] = "RIGHT"
    issue: str
    impact: str
    suggested_fix: str
    evidence: str
    fix_code: str = ""


class CodeReview(BaseModel):
    summary: str
    findings: list[Finding] = Field(default_factory=list)
