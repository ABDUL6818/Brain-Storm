/**
 * Typed API client wrapper — issue #969
 *
 * Wraps the raw axios `api` instance in a discriminated-union Result<T> shape
 * so every call site gets a consistent `{ ok, data } | { ok, error }` return
 * value instead of relying on ad-hoc try/catch + error-message extraction.
 *
 * Usage:
 *   const result = await apiClient.get<Course[]>('/courses');
 *   if (!result.ok) { console.error(result.error.message); return; }
 *   const courses = result.data;
 */

import type { AxiosRequestConfig } from 'axios';

import type {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
  PaginationQuery,
  QueryOptions,
} from '@brain-storm/types';

import api from './api';

// Re-export the shared contract types so components can import everything
// API-related from this single module.
export type { ApiResponse, ErrorResponse, PaginatedResponse, PaginationQuery, QueryOptions };

// ── Result type ───────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/**
 * Coarse classification of a failed request, so callers can branch on the
 * failure type without inspecting raw HTTP status codes.
 */
export type ApiErrorKind =
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409
  | 'validation' // other 4xx
  | 'server' // 5xx
  | 'network' // no response received
  | 'unknown';

export interface ApiError {
  ok: false;
  error: {
    message: string;
    kind: ApiErrorKind;
    /** HTTP status code, if the server responded */
    status?: number;
    /** Raw response body, when available */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal shape of an Axios error response — avoids importing the full axios types here. */
interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      message?: unknown;
      error?: unknown;
    };
  };
  message?: string;
}

function toAxiosLike(err: unknown): AxiosLikeError {
  return err as AxiosLikeError;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    // Axios error — prefer the server's message field
    const axiosErr = toAxiosLike(err);
    const serverMessage: unknown =
      axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.error ?? axiosErr?.message;
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      return serverMessage;
    }
    if (typeof serverMessage === 'object' && serverMessage !== null) {
      return JSON.stringify(serverMessage);
    }
  }
  return 'An unexpected error occurred.';
}

/** Maps a backend {@link ErrorResponse} `code` onto an {@link ApiErrorKind}. */
export function classifyErrorCode(code: string | undefined): ApiErrorKind | undefined {
  if (!code) return undefined;
  const normalized = code.toUpperCase();
  if (normalized.includes('UNAUTHORIZED') || normalized.includes('UNAUTHENTICATED')) {
    return 'unauthorized';
  }
  if (normalized.includes('FORBIDDEN')) return 'forbidden';
  if (normalized.includes('NOT_FOUND')) return 'not_found';
  if (normalized.includes('CONFLICT') || normalized.includes('ALREADY_EXISTS')) return 'conflict';
  if (normalized.includes('VALIDATION') || normalized.includes('INVALID')) return 'validation';
  if (normalized.includes('INTERNAL') || normalized.includes('SERVER')) return 'server';
  return undefined;
}

function extractErrorCode(err: unknown): string | undefined {
  const data = toAxiosLike(err)?.response?.data as ErrorResponse | undefined;
  return typeof data?.code === 'string' ? data.code : undefined;
}

function extractStatus(err: unknown): number | undefined {
  return toAxiosLike(err)?.response?.status;
}

function extractRaw(err: unknown): unknown {
  return toAxiosLike(err)?.response?.data;
}

/** Maps an HTTP status (or its absence) onto an {@link ApiErrorKind}. */
export function classifyStatus(status: number | undefined): ApiErrorKind {
  if (status === undefined) return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  return 'unknown';
}

async function wrap<T>(promise: Promise<{ data: T }>): Promise<ApiResult<T>> {
  try {
    const response = await promise;
    return { ok: true, data: response.data };
  } catch (err) {
    const status = extractStatus(err);
    const kind = classifyErrorCode(extractErrorCode(err)) ?? classifyStatus(status);
    return {
      ok: false,
      error: {
        message: extractMessage(err),
        kind,
        status,
        raw: extractRaw(err),
      },
    };
  }
}

// ── Public surface ────────────────────────────────────────────────────────────

/**
 * Typed wrapper around the project's axios instance.
 *
 * Every method returns `Promise<ApiResult<T>>` — callers check `result.ok`
 * before accessing `result.data`, and never have to write try/catch.
 */
export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.get<T>(url, config));
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.post<T>(url, data, config));
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.patch<T>(url, data, config));
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.put<T>(url, data, config));
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return wrap<T>(api.delete<T>(url, config));
  },
};

// ── Typed endpoint map ────────────────────────────────────────────────────────

/** Query params accepted by list endpoints. */
export type ListQuery = QueryOptions & PaginationQuery;

/** Credentials submitted to the login endpoint. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload returned by the login endpoint. */
export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user?: UserProfile;
}

/** Minimal authenticated-user profile. */
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
}

/** A course as returned by the courses endpoints. */
export interface Course {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Typed endpoint map — the single service layer for the frontend.
 *
 * Each method delegates to the generic {@link apiClient} methods above, so
 * callers get the same `ApiResult<T>` shape while request/response types are
 * declared in one place.
 */
export const ApiRoutes = {
  auth: {
    login(credentials: LoginRequest): Promise<ApiResult<LoginResponse>> {
      return apiClient.post<LoginResponse>('/auth/login', credentials);
    },
    logout(): Promise<ApiResult<void>> {
      return apiClient.post<void>('/auth/logout');
    },
  },

  users: {
    me(): Promise<ApiResult<UserProfile>> {
      return apiClient.get<UserProfile>('/users/me');
    },
  },

  courses: {
    list(query?: ListQuery): Promise<ApiResult<PaginatedResponse<Course>>> {
      return apiClient.get<PaginatedResponse<Course>>('/courses', { params: query });
    },
    get(id: string): Promise<ApiResult<Course>> {
      return apiClient.get<Course>(`/courses/${encodeURIComponent(id)}`);
    },
    create(payload: Partial<Course>): Promise<ApiResult<Course>> {
      return apiClient.post<Course>('/courses', payload);
    },
    update(id: string, payload: Partial<Course>): Promise<ApiResult<Course>> {
      return apiClient.patch<Course>(`/courses/${encodeURIComponent(id)}`, payload);
    },
    remove(id: string): Promise<ApiResult<void>> {
      return apiClient.delete<void>(`/courses/${encodeURIComponent(id)}`);
    },
  },
} as const;

export default apiClient;
