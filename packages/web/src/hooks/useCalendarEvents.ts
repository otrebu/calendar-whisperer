import { useQuery } from "@tanstack/react-query";

import { getCalendarEvents } from "../api/client";

/**
 * Hook to fetch calendar events using TanStack Query
 */
export default function useCalendarEvents(date: Date, timeZone: string) {
  return useQuery({
    queryFn: async () => getCalendarEvents(date, timeZone),
    queryKey: ["calendar-events", date, timeZone],
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
    staleTime: 60_000,
  });
}
