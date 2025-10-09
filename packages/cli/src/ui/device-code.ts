import boxen from "boxen";
import chalk from "chalk";

/* eslint-disable no-console */
export default function showDeviceCode(deviceCodeInfo: {
  message: string;
  userCode: string;
  verificationUri: string;
}): void {
  const message = [
    chalk.bold("Authentication Required"),
    "",
    `1. Visit: ${chalk.cyan(deviceCodeInfo.verificationUri)}`,
    `2. Enter code: ${chalk.yellow.bold(deviceCodeInfo.userCode)}`,
    "",
    chalk.dim("Waiting for you to complete authentication..."),
  ].join("\n");

  console.log(
    boxen(message, {
      borderColor: "blue",
      borderStyle: "round",
      margin: 1,
      padding: 1,
    }),
  );
}

export { showDeviceCode };
