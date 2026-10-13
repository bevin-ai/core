import type { CodeReview, Finding } from './models';

const badge = (alt: string, url: string) =>
    `<img align="absbottom" width="58" height="18" alt="${alt}" src="${url}" />`;

const SEVERITY_BADGES: Record<Finding['severity'], string> = {
    P0: badge('Critical', 'https://github.com/user-attachments/assets/4a17f27d-77f6-4ee7-876a-32c39e111f35'),
    P1: badge('Major', 'https://github.com/user-attachments/assets/43077017-37c9-4d7f-8f28-68923e6e5829'),
    P2: badge('Minor', 'https://github.com/user-attachments/assets/ada6b986-2bff-47f8-9aab-5addcacb753f'),
    P3: badge('Nit', 'https://github.com/user-attachments/assets/b0a2f9ea-b708-43ee-a663-702cf4102f67'),
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
        `<h3>${SEVERITY_BADGES[finding.severity]} ${finding.title}</h3>`,
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
        '',
        '## Summary',
        '',
        review.summary,
        '',
    ];

    return sections.join('\n');
}