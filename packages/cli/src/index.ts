#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { eventsCommand } from "./commands/events.js";

// Load .env from monorepo root
const DIRNAME = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(DIRNAME, "../../../.env") });

const program = new Command()
  .name("calendar-whisperer")
  .description("Provide insights about time spent in meetings and focus work")
  .version("0.1.0");

program.addCommand(eventsCommand);

program.parse();
