export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export type ReviewSide = 'RIGHT' | 'LEFT';

export interface Finding {
    severity: Severity;
    title: string;
    file: string;
    line: number;
    side: ReviewSide;
    issue: string;
    impact: string;
    suggested_fix: string;
    evidence: string;
    fix_code: string;
}

export interface CodeReview {
    summary: string;
    findings: Finding[];
}