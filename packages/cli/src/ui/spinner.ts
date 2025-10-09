import ora, { type Ora } from "ora";

export default function createSpinner(text: string): Ora {
  return ora({
    color: "cyan",
    text,
  });
}

export { createSpinner };
