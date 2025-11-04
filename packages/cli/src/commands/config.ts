import { loadConfig } from "@calendar-whisperer/core";
import { Command } from "@commander-js/extra-typings";
import boxen from "boxen";
import chalk from "chalk";

/* eslint-disable no-console */

const configCommand = new Command("config")
  .description("Manage configuration settings")
  .addCommand(
    new Command("show")
      .description("Display current work schedule configuration")
      .action(() => {
        try {
          const config = loadConfig();

          const workDaysNames = config.work.workDays
            .map((day) => {
              const days = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ];
              return days[day];
            })
            .join(", ");

          const configText = [
            chalk.bold("Work Schedule Configuration"),
            "",
            `${chalk.cyan("Hours per week:")} ${config.work.hoursPerWeek}`,
            `${chalk.cyan("Days per week:")} ${config.work.daysPerWeek}`,
            `${chalk.cyan("Work days:")} ${workDaysNames}`,
            `${chalk.cyan("Work hours:")} ${config.work.startHour}:00 - ${config.work.endHour}:00`,
          ].join("\n");

          console.log(
            `\n${boxen(configText, {
              borderColor: "cyan",
              borderStyle: "round",
              margin: 1,
              padding: 1,
            })}`,
          );
        } catch (error) {
          if (error instanceof Error) {
            console.error(chalk.red("\n✖ Error:"), error.message);
          } else {
            console.error(chalk.red("\n✖ An unexpected error occurred"));
          }
          process.exit(1);
        }
      }),
  );

export default configCommand;
export { configCommand };
