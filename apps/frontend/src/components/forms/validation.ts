'use client';

import { useCallback, useRef } from 'react';
import type { Validate } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * Shared zod schemas for form validation.
 *
 * All forms in apps/frontend should define their validation rules as zod
 * schemas and wire them up with `zodResolver` (see `createFormResolver`).
 * This keeps validation logic in one place, reusable across components and
 * testable in isolation.
 */

/**
 * Token restrictions schema — shared across forms that accept user-provided
 * tokens (e.g. API keys, invite codes). Mirrors the historical ad-hoc rules:
 * required, trimmed, no whitespace, and a bounded length.
 */
export const tokenRestrictionsSchema = z
  .string({ required_error: 'Token is required' })
  .trim()
  .min(1, 'Token is required')
  .max(256, 'Token must be at most 256 characters')
  .regex(/^\S+$/, 'Token must not contain whitespace');

/**
 * Email schema — shared across auth and profile forms.
 */
export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

/**
 * Password schema — shared across auth forms.
 */
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters');

/**
 * Convenience helper that wraps a zod schema in a react-hook-form resolver.
 * Use it when passing `resolver` to `useForm`:
 *
 *   const form = useForm({ resolver: createFormResolver(loginSchema) });
 */
export function createFormResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema
) {
  return zodResolver(schema);
}

/**
 * Debounced async validator factory. Use as a `validate` rule on a field:
 *
 *   const checkEmail = useAsyncValidator(async (email) => {
 *     const r = await fetch(`/api/users/exists?email=${email}`);
 *     const { exists } = await r.json();
 *     return !exists || 'Email is already taken';
 *   }, 400);
 *
 *   <TextField name="email" rules={{ validate: checkEmail }} />
 *
 * Returns true | string | Promise<true | string>. Returning a string marks
 * the field invalid with that message — same contract as react-hook-form.
 */
export function useAsyncValidator<TValue>(
  fn: (value: TValue) => Promise<true | string>,
  debounceMs = 300
): Validate<TValue, Record<string, unknown>> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (value: TValue) => {
      if (timer.current) clearTimeout(timer.current);
      return new Promise<true | string>((resolve) => {
        timer.current = setTimeout(async () => {
          try {
            resolve(await fn(value));
          } catch {
            resolve('Validation failed');
          }
        }, debounceMs);
      });
    },
    [fn, debounceMs]
  );
}