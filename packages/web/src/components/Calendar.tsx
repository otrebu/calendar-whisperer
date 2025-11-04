import { formatInputDate } from "../lib/formatters";

interface CalendarProperties {
  onDateChange: (date: Date) => void;
  selectedDate: Date;
}

export default function Calendar({
  onDateChange,
  selectedDate,
}: CalendarProperties) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <label
        className="block text-sm font-medium text-gray-700 mb-2"
        htmlFor="date-picker"
      >
        Select Date
      </label>
      <input
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
        id="date-picker"
        onChange={(event) => {
          const dateString = event.target.value;
          if (dateString === "") return;

          const date = new Date(`${dateString}T00:00:00`);
          if (!Number.isNaN(date.getTime())) {
            onDateChange(date);
          }
        }}
        type="date"
        value={formatInputDate(selectedDate)}
      />
    </div>
  );
}
