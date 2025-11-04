import type { MeetingAnalytics } from "@calendar-whisperer/core";

import boxen from "boxen";
import chalk from "chalk";
import { format } from "date-fns";

/* eslint-disable no-console */

export default function showAnalytics(analytics: MeetingAnalytics): void {
  const summary = [
    chalk.bold("Meeting Analytics"),
    "",
    `${chalk.cyan("Total Meetings:")} ${analytics.totalMeetings}`,
    `${chalk.cyan("Total Meeting Time:")} ${(analytics.totalMeetingMinutes / 60).toFixed(1)}h`,
    `${chalk.cyan("Meeting %:")} ${analytics.meetingPercentage.toFixed(1)}%`,
    `${chalk.cyan("Focus Time %:")} ${analytics.focusPercentage.toFixed(1)}%`,
  ].join("\n");

  console.log(
    `\n${boxen(summary, {
      borderColor: "cyan",
      borderStyle: "round",
      margin: 1,
      padding: 1,
    })}`,
  );

  // Daily breakdown
  if (analytics.dailyBreakdown.length > 0) {
    console.log(chalk.bold("\nDaily Breakdown:"));
    console.log(chalk.dim("─".repeat(60)));

    for (const day of analytics.dailyBreakdown) {
      const dateString = format(new Date(day.date), "EEE, MMM d");
      const meetingHours = (day.meetingMinutes / 60).toFixed(1);
      const focusHours = (day.focusMinutes / 60).toFixed(1);
      const meetingPct =
        day.workMinutes > 0
          ? ((day.meetingMinutes / day.workMinutes) * 100).toFixed(0)
          : "0";

      console.log(`\n${chalk.bold(dateString)}`);
      console.log(
        `  ${chalk.yellow("Meetings:")} ${meetingHours}h (${meetingPct}%) | ${chalk.green("Focus:")} ${focusHours}h`,
      );
    }

    console.log(`\n${chalk.dim("─".repeat(60))}\n`);
  }
}

export { showAnalytics };
