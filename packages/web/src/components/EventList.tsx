import type { CalendarEvent } from "@calendar-whisperer/core";

import { formatFullDate, formatTime } from "../lib/formatters";

interface EventListProperties {
  date: Date;
  error: Error | null;
  events: Array<CalendarEvent>;
  isLoading: boolean;
  onRetry?: () => void;
}

function EventItem({ event }: { event: CalendarEvent }) {
  const startTime = formatTime(event.start.dateTime);
  const endTime = formatTime(event.end.dateTime);

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900">
            {event.subject}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {startTime} - {endTime}
          </p>
          {event.organizer?.emailAddress.name !== undefined &&
            event.organizer.emailAddress.name !== "" && (
              <p className="text-sm text-gray-500 mt-2">
                Organizer: {event.organizer.emailAddress.name}
              </p>
            )}
        </div>
        <div className="flex flex-col gap-1 ml-4">
          {event.isAllDay === true && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              All Day
            </span>
          )}
          {event.isCancelled === true && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              Cancelled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EventList({
  date,
  error,
  events,
  isLoading,
  onRetry,
}: EventListProperties) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
        <p className="mt-4 text-gray-600">Loading events...</p>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-800">
          <strong className="block text-lg mb-2">Error</strong>
          <p className="mb-4">{error.message}</p>
          {onRetry !== undefined && (
            <button
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              onClick={onRetry}
              type="button"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">
          No events found for {formatFullDate(date.toISOString())}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Events for {formatFullDate(date.toISOString())}
      </h2>
      <div className="space-y-4">
        {events.map((event) => (
          <EventItem event={event} key={event.id} />
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-6 text-center">
        Total: {events.length} event{events.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default EventList;
