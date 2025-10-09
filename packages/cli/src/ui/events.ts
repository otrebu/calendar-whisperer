import type { CalendarEvent } from "@calendar-whisperer/core";

import chalk from "chalk";
import { format, parseISO } from "date-fns";

/* eslint-disable no-console */
export default function showEvents(
  events: Array<CalendarEvent>,
  date: Date,
): void {
  console.log(
    `\n${chalk.bold(`Events for ${format(date, "EEEE, MMMM d, yyyy")}`)}`,
  );
  console.log(chalk.dim("─".repeat(60)));

  if (events.length === 0) {
    console.log(chalk.dim("No events found for this date."));
    return;
  }

  for (const event of events) {
    const startTime = format(parseISO(event.start.dateTime), "HH:mm");
    const endTime = format(parseISO(event.end.dateTime), "HH:mm");

    console.log(
      `\n${chalk.cyan(startTime)} - ${chalk.cyan(endTime)} ${chalk.bold(event.subject)}`,
    );

    const organizerName = event.organizer?.emailAddress.name ?? "";
    if (organizerName !== "") {
      console.log(chalk.dim(`  Organizer: ${organizerName}`));
    }

    if (event.isAllDay === true) {
      console.log(chalk.yellow("  All-day event"));
    }

    if (event.isCancelled === true) {
      console.log(chalk.red("  CANCELLED"));
    }
  }

  console.log(`\n${chalk.dim("─".repeat(60))}`);
  console.log(
    chalk.bold(
      `Total: ${events.length} event${events.length === 1 ? "" : "s"}`,
    ),
  );
}

export { showEvents };
