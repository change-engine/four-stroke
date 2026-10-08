import { spawnSync } from "child_process";

/**
 * @param {string} program
 * @param {string[]} [args]
 */
export function cmd(program, args = []) {
  const [executable = "", ...programArgs] = program.split(" ");
  const { error, status } = spawnSync(executable, [...programArgs, ...args], {
    stdio: "inherit",
  });
  if (status) process.exit(status);
  if (error) throw error;
}
