/**
 * Token-restriction rule schema — issue #966
 *
 * ⚠️  WARNING: Adding a new restriction type only requires adding an entry here.
 * The TokenRestrictionsPanel renders generically from this schema — no UI code change needed.
 *
 * Shared with the SDK layer: import from '@/components/features/token-restrictions/schema'
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive value types a restriction can carry
// ---------------------------------------------------------------------------
export type RestrictionValueType = 'amount' | 'address' | 'percentage' | 'duration' | 'boolean';

// ---------------------------------------------------------------------------
// A single restriction-rule descriptor
// ---------------------------------------------------------------------------
export interface RestrictionRule {
  /** Stable machine-readable key (matches on-chain contract field names). */
  key: string;
  /** Human-readable label shown in the panel header. */
  label: string;
  /** Short description rendered as secondary text below the label. */
  description: string;
  /** Controls how the value is formatted in the row. */
  valueType: RestrictionValueType;
  /** Tailwind colour classes applied to the value badge. */
  badgeClass?: string;
}

// ---------------------------------------------------------------------------
// Registry — extend by adding entries here only
// ---------------------------------------------------------------------------
export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    key: 'transfer_locked',
    label: 'Transfer Lock',
    description: 'Prevents token holders from transferring tokens.',
    valueType: 'boolean',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    key: 'max_balance',
    label: 'Maximum Balance',
    description: 'Upper bound on the amount a single account may hold.',
    valueType: 'amount',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    key: 'min_hold_duration',
    label: 'Minimum Hold Duration',
    description: 'Minimum time tokens must be held before transfer.',
    valueType: 'duration',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    key: 'allowlist_only',
    label: 'Allowlist Only',
    description: 'Restricts transfers to addresses on the allowlist.',
    valueType: 'boolean',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    key: 'burn_rate',
    label: 'Burn Rate',
    description: 'Percentage of each transfer automatically burned.',
    valueType: 'percentage',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
];

// ---------------------------------------------------------------------------
// Zod schemas for restriction values — shared with forms via zodResolver
// ---------------------------------------------------------------------------

/** Amount: non-negative finite number (accepts numeric strings from inputs). */
export const amountValueSchema = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite('Amount must be a finite number')
  .nonnegative('Amount must be zero or greater');

/** Address: non-empty string, optionally validated as a Stellar-style address. */
export const addressValueSchema = z
  .string()
  .trim()
  .min(1, 'Address is required')
  .max(128, 'Address is too long');

/** Percentage: number between 0 and 100 inclusive. */
export const percentageValueSchema = z.coerce
  .number({ invalid_type_error: 'Percentage must be a number' })
  .finite('Percentage must be a finite number')
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100');

/** Duration: non-negative integer number of seconds. */
export const durationValueSchema = z.coerce
  .number({ invalid_type_error: 'Duration must be a number' })
  .int('Duration must be a whole number of seconds')
  .nonnegative('Duration must be zero or greater');

/** Boolean: accepts real booleans or the strings "true"/"false" from inputs. */
export const booleanValueSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

/** Map of valueType → schema, so forms can pick the right validator by rule. */
export const RESTRICTION_VALUE_SCHEMAS = {
  amount: amountValueSchema,
  address: addressValueSchema,
  percentage: percentageValueSchema,
  duration: durationValueSchema,
  boolean: booleanValueSchema,
} as const satisfies Record<RestrictionValueType, z.ZodTypeAny>;

/** Return the zod schema for a given restriction value type. */
export function getValueSchema(valueType: RestrictionValueType): z.ZodTypeAny {
  return RESTRICTION_VALUE_SCHEMAS[valueType];
}

/** Schema for a single restriction entry (key + value validated by its rule). */
export const restrictionEntrySchema = z
  .object({
    key: z.string().min(1, 'Restriction key is required'),
    value: z.unknown(),
  })
  .superRefine((entry, ctx) => {
    const rule = findRule(entry.key);
    if (!rule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['key'],
        message: `Unknown restriction key: ${entry.key}`,
      });
      return;
    }
    const result = getValueSchema(rule.valueType).safeParse(entry.value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['value', ...issue.path] });
      }
    }
  });

/** Schema for a full set of restriction entries. */
export const restrictionEntriesSchema = z.array(restrictionEntrySchema);

export type RestrictionEntry = z.infer<typeof restrictionEntrySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a rule descriptor by its key. Returns undefined for unknown keys. */
export function findRule(key: string): RestrictionRule | undefined {
  return RESTRICTION_RULES.find((r) => r.key === key);
}

/** Format a raw value according to the rule's valueType. */
export function formatValue(value: unknown, valueType: RestrictionValueType): string {
  switch (valueType) {
    case 'boolean':
      return value ? 'Enabled' : 'Disabled';
    case 'amount':
      return typeof value === 'number' || typeof value === 'string'
        ? `${Number(value).toLocaleString()} tokens`
        : String(value);
    case 'percentage':
      return typeof value === 'number' || typeof value === 'string' ? `${value}%` : String(value);
    case 'duration':
      if (typeof value === 'number') {
        const days = Math.floor(value / 86400);
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
        const hours = Math.floor(value / 3600);
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        return `${value}s`;
      }
      return String(value);
    case 'address':
      if (typeof value === 'string' && value.length > 12) {
        return `${value.slice(0, 6)}…${value.slice(-4)}`;
      }
      return String(value);
    default:
      return String(value);
  }
}
