/**
 * HTTP client for Go scheduling service communication.
 * Handles conflict detection and resource availability queries.
 */

const SCHEDULING_SERVICE_URL = process.env.SCHEDULING_SERVICE_URL || 'http://localhost:8080';
const TIMEOUT_MS = 5000;

// Types matching Go service responses
export interface Conflict {
  resource_id: number;
  resource_name: string;
  conflicting_event_id: number;
  conflicting_event_name: string;
  conflicting_task_id?: number;
  conflicting_task_title?: string;
  existing_start_time: string;
  existing_end_time: string;
  requested_start_time: string;
  requested_end_time: string;
  message: string;
}

export interface CheckConflictsResponse {
  has_conflicts: boolean;
  conflicts: Conflict[];
}

export interface ScheduleEntry {
  id: number;
  resource_id: number;
  event_id: number;
  event_name: string;
  task_id?: number;
  task_title?: string;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceAvailabilityResponse {
  resource_id: number;
  entries: ScheduleEntry[];
}

export interface CheckConflictsInput {
  resource_ids: number[];
  start_time: Date;
  end_time: Date;
  exclude_schedule_id?: number;
}

export interface GetAvailabilityInput {
  resource_id: number;
  start_date: Date;
  end_date: Date;
}

class SchedulingClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'SchedulingClientError';
  }
}

/**
 * Makes a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Scheduling client for Go service communication
 */
export const schedulingClient = {
  /**
   * Check for scheduling conflicts for the given resources and time range
   */
  async checkConflicts(input: CheckConflictsInput): Promise<CheckConflictsResponse> {
    const url = `${SCHEDULING_SERVICE_URL}/api/v1/scheduling/check-conflicts`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_ids: input.resource_ids,
          start_time: input.start_time.toISOString(),
          end_time: input.end_time.toISOString(),
          exclude_schedule_id: input.exclude_schedule_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SchedulingClientError(
          errorData.message || `Scheduling service error: ${response.status}`,
          response.status,
          errorData.error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SchedulingClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SchedulingClientError('Scheduling service timeout', undefined, 'TIMEOUT');
      }
      throw new SchedulingClientError(
        `Failed to connect to scheduling service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'CONNECTION_ERROR'
      );
    }
  },

  /**
   * Get resource availability/schedule for a date range
   */
  async getResourceAvailability(input: GetAvailabilityInput): Promise<ResourceAvailabilityResponse> {
    const params = new URLSearchParams({
      resource_id: input.resource_id.toString(),
      start_date: input.start_date.toISOString(),
      end_date: input.end_date.toISOString(),
    });

    const url = `${SCHEDULING_SERVICE_URL}/api/v1/scheduling/resource-availability?${params}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SchedulingClientError(
          errorData.message || `Scheduling service error: ${response.status}`,
          response.status,
          errorData.error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof SchedulingClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SchedulingClientError('Scheduling service timeout', undefined, 'TIMEOUT');
      }
      throw new SchedulingClientError(
        `Failed to connect to scheduling service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'CONNECTION_ERROR'
      );
    }
  },

  /**
   * Check if the scheduling service is healthy
   */
  async healthCheck(): Promise<boolean> {
    const url = `${SCHEDULING_SERVICE_URL}/api/v1/health`;

    try {
      const response = await fetchWithTimeout(url, { method: 'GET' }, 2000);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },
};

export { SchedulingClientError };
