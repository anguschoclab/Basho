// Enforces bun as the only package manager for this repo.
//
// package.json declares "packageManager": "bun@1.3.14" and bun.lock is the
// canonical committed lockfile. npm/yarn/pnpm installs are blocked here so a
// stray `npm install` can't recreate the divergent package-lock.json problem
// (see docs/audit V5-B08).
//
// Runs as the root `preinstall` script. npm/yarn/pnpm always set
// npm_config_user_agent, so they are reliably caught. bun sets the same
// variable to "bun/<version>" when running lifecycle scripts; if it is absent
// we allow rather than risk blocking a valid bun install.

const userAgent = process.env.npm_config_user_agent ?? "";
const agent = userAgent.split(" ")[0];

if (agent && !agent.startsWith("bun/")) {
  console.error(`
ERROR: this project uses bun, not ${agent.split("/")[0]}.

  bun.lock is the canonical lockfile — other lockfiles are gitignored and will
  silently diverge from what CI and other developers install.

  Install bun (https://bun.sh) and run:

    bun install
`);
  process.exit(1);
}
