// Record schemas for data/evidence/. Source of truth: docs/research/evidence-protocol.md §2–§4, §7, §10.
import { z } from 'zod';

export const Tier = z.enum(['A', 'B', 'C', 'D', 'E']);
export const Reuse = z.enum([
  'public_domain',
  'open_attribution',
  'open_share_alike',
  'reference_only',
  'licensed',
  'unknown',
]);
export const ClaimStatus = z.enum(['lead', 'sourced', 'verified', 'disputed', 'rejected', 'superseded']);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

// YAML reads a bare year (2012) as a number, so accept both and normalise to a string.
const isoDate = z
  .union([z.string(), z.number().int()])
  .transform(String)
  .pipe(z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'expected YYYY, YYYY-MM or YYYY-MM-DD'));
const id = z.string().regex(/^[a-z0-9_.-]+$/, 'ids are lower-case: a-z 0-9 _ . -');

export const Source = z
  .object({
    id,
    title: z.string().min(1),
    issuer: z.string().optional(),
    authors: z.array(z.string()).optional(),
    doc_date: isoDate.optional(),
    published: z.object({ where: z.string(), date: isoDate.optional() }).optional(),
    url: z.string().url().optional(),
    retrieved: isoDate.optional(),
    local_copy: z.object({ path: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).optional(),
    tier: Tier,
    language: z.string().optional(),
    reuse: Reuse,
    access: z.enum(['open', 'login_wall', 'not_reached', 'search_summary_only']).default('open'),
    notes: z.string().optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

export const Assessment = z
  .object({
    // "person:<name>" for human sign-off, "ai:<agent>" for machine checks
    by: z.string().regex(/^(person|ai):.+/),
    date: isoDate,
    method: z.string(),
    result: z.enum(['pass', 'fail', 'note']),
    note: z.string().optional(),
  })
  .strict();

export const Claim = z
  .object({
    id,
    source: id.optional(), // absent only for leads with no source at all
    origin: z.string().optional(), // where a lead came from: review_v3, search_summary, memory …
    locator: z.string().optional(),
    quote: z.string().optional(),
    value_raw: z.string().optional(),
    value: z.union([z.number(), z.string(), z.boolean()]).optional(),
    unit: z.string().optional(),
    definition: z.string().optional(),
    geography: z.string().optional(),
    reference_period: z.union([isoDate, z.string()]).optional(),
    date: z
      .object({
        value: isoDate.optional(),
        decision: isoDate.optional(),
        effective: isoDate.optional(),
        precision: z.enum(['day', 'month', 'quarter', 'year', 'approx']).optional(),
      })
      .optional(),
    summary: z.string().optional(),
    status: ClaimStatus,
    extracted_by: z.string().optional(),
    log_row: z.string().optional(), // e.g. V10 in docs/research/verification-log-2026-11.md
    superseded_by: id.optional(),
    assessments: z.array(Assessment).default([]),
    notes: z.string().optional(),
  })
  .strict();
export type Claim = z.infer<typeof Claim>;

export const Conflict = z
  .object({
    id,
    subject: z.string(),
    claims: z.array(id).min(2),
    diagnosis: z.string().optional(),
    resolution: z.record(z.string()).default({}),
    status: z.enum(['open', 'resolved']),
  })
  .strict();
export type Conflict = z.infer<typeof Conflict>;

/** Uses and the minimum claim status each one needs (protocol §4). */
export const MIN_STATUS = {
  calibration_target: 'verified',
  anchor_date: 'verified',
  fiscal_rule: 'verified',
  geometry: 'sourced',
  route_building: 'verified',
  encyclopedia: 'sourced',
  design_note: 'lead', // flavour or design inspiration only; never shown as fact
} as const satisfies Record<string, ClaimStatus>;
export type Use = keyof typeof MIN_STATUS;
export const USES = Object.keys(MIN_STATUS) as Use[];

const RANK: Record<ClaimStatus, number> = {
  rejected: -1,
  superseded: -1,
  lead: 0,
  disputed: 0,
  sourced: 1,
  verified: 2,
};

/** True when a claim's status is good enough for a use. Rejected and superseded claims never are. */
export function meetsMinimum(status: ClaimStatus, use: Use): boolean {
  return RANK[status] >= 0 && RANK[status] >= RANK[MIN_STATUS[use]];
}
