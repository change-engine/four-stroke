#!/usr/bin/env node
"use strict";
import fs from "fs";
import { cmd } from "../src/cmd.mjs";

const isApp = fs.readdirSync(".").some((file) => file.startsWith("vite.config."));

if (fs.existsSync("wrangler.jsonc")) {
  cmd("wrangler types --env-file /dev/null --strict-vars false");
}
if (isApp) {
  cmd("react-router typegen");
  cmd("vite build");
}
cmd("tsc --noEmit");
