import type { CodeReview, Finding } from './models';

const SEVERITY_BADGES: Record<Finding['severity'], string> = {
  P0: '<span style="background-color:red;color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Critical</span>',
  P1: '<span style="background-color:orange;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Major</span>',
  P2: '<span style="background-color:yellow;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Minor</span>',
  P3: '<span style="background-color:#e1f5fe;color:black;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:bold;">Nit</span>',
};

function renderDiff(originalCode: string, fixCode: string): string {
  return [
    '```diff',
...originalCode.split('\n').map((line) => `- ${line}`),
...fixCode.split('\n').map((line) => `+ ${line}`),
    '```',
].join('\n');
}

function renderFinding(finding: Finding & { original_code?: string }): string[] {
    const lines = [
        `### ${SEVERITY_BADGES[finding.severity]} ${finding.title}`,
        '',
        `**File:** \`${finding.file}:${finding.line}\``,
        '',
        finding.issue,
        '',
        `**Impact:** ${finding.impact}`,
        '',
        '<details>',
        '<summary>Suggested Fix</summary>',
        '',
        finding.suggested_fix,
    ];

    if (finding.fix_code?.trim()) {
        lines.push(
            '',
            renderDiff(finding.original_code ?? '', finding.fix_code),
        );
    }

    lines.push('', '</details>');

    if (finding.evidence) {
        lines.push(
            '',
            '<details>',
            '<summary>Evidence</summary>',
            '',
            '```text',
            finding.evidence,
            '```',
            '',
            '</details>',
        );
    }

    return lines;
}

// Used for each individual GitHub inline review comment.
export function renderInlineFinding(
    finding: Finding & { original_code?: string },
): string {
    return renderFinding(finding).join('\n');
}

// Used for the overall GitHub pull request review comment.
export function renderMarkdown(review: CodeReview): string {
    const sections = [
        '# Bevin Code Review',
        '',
        '## Summary',
        '',
        review.summary,
        '',
        '---',
        '',
        '## Findings',
        '',
    ];

    const findings = review.findings.filter((f) => f.severity !== 'P3');
    const nits = review.findings.filter((f) => f.severity === 'P3');

    for (const finding of findings) {
        sections.push(...renderFinding(finding), '', '---', '');
    }

    if (findings.length === 0) {
        sections.push('No major issues found.', '');
    }

    if (nits.length > 0) {
        sections.push(
            '<details>',
            `<summary>Show Nitpicks (${nits.length})</summary>`,
            '',
        );

        for (const finding of nits) {
            sections.push(...renderFinding(finding), '');
        }

        sections.push('</details>', '');
    }

    return sections.join('\n');
}