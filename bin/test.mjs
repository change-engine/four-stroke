#!/usr/bin/env node
"use strict";
import { cmd } from "../src/cmd.mjs";

cmd("vitest", [
  ...(!process.argv.slice(2).includes("-w") && !process.argv.slice(2).includes("--watch")
    ? ["--run"]
    : []),
  ...process.argv.slice(2),
]);
