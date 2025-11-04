import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { checkHealth } from "./api/client";
import Calendar from "./components/Calendar";
import ErrorDisplay from "./components/ErrorDisplay";
import EventList from "./components/EventList";
import Header from "./components/Header";
import useCalendarEvents from "./hooks/useCalendarEvents";

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const timeZone = "UTC";

  // Check server health
  const { data: isServerHealthy, error: healthError } = useQuery({
    queryFn: checkHealth,
    queryKey: ["server-health"],
    retry: 3,
    retryDelay: 1000,
  });

  const {
    data: events,
    error,
    isLoading,
    refetch,
  } = useCalendarEvents(selectedDate, timeZone);

  function handleHealthRetry(): void {
    window.location.reload();
  }

  // Server health check failed
  if (healthError !== null || isServerHealthy === false) {
    return (
      <ErrorDisplay
        message="Make sure the server is running. Run 'calendar-whisperer web' from the CLI."
        onRetry={handleHealthRetry}
        title="Server Not Running"
      />
    );
  }

  // Server is checking
  const isCheckingServer = isServerHealthy === undefined;
  if (isCheckingServer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-4 text-gray-600">Connecting to server...</p>
        </div>
      </div>
    );
  }

  function handleDateChange(newDate: Date): void {
    setSelectedDate(newDate);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Calendar onDateChange={handleDateChange} selectedDate={selectedDate} />
        <EventList
          date={selectedDate}
          error={error}
          events={events ?? []}
          isLoading={isLoading}
          onRetry={handleRetry}
        />
      </main>
    </div>
  );
}
