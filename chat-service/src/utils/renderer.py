
from .models import CodeReview


SEVERITY_BADGES = {
    "P0": '<span style="background-color:red;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Critical</span>',
    "P1": '<span style="background-color:orange;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Major</span>',
    "P2": '<span style="background-color:yellow;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Minor</span>',
    "P3": '<span style="background-color:#e1f5fe;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Nit</span>',
}


def render_markdown(review: CodeReview) -> str:
    sections = [
        "# Code Review",
        "",
        "## Summary",
        review.summary,
        "",
        "## Findings",
        "",
    ]

    regular = [f for f in review.findings if f.severity != "P3"]
    nits = [f for f in review.findings if f.severity == "P3"]

    def render_finding(finding) -> list[str]:
        lines = [
            f"### {SEVERITY_BADGES[finding.severity]} {finding.title}",
        ]

        lines.extend([
            "",
            finding.issue,
            "",
            f"**Impact:** {finding.impact}",
            "",
            f"**Suggested Fix:** {finding.suggested_fix}",
            "",
            f"**Evidence:** `{finding.evidence}`",
            "",
        ])

        if finding.fix_code.strip():
            fence = "```"
            while fence in finding.fix_code:
                fence += "`"

            lines.extend([
                "<details>",
                "<summary>View Fix</summary>",
                "",
                f"{fence}python",
                finding.fix_code,
                fence,
                "",
                "</details>",
                "",
            ])

        return lines

    for finding in regular:
        sections.extend(render_finding(finding))

    if not regular:
        sections.extend(["No major issues found.", ""])

    if nits:
        sections.extend([
            "<details>",
            f"<summary>Show Nitpicks ({len(nits)})</summary>",
            "",
        ])

        for finding in nits:
            sections.extend(render_finding(finding))

        sections.extend(["</details>", ""])

    return "\n".join(sections)
