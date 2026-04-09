/**
 * Smoke tests for Docker compose setups.
 *
 * Tests both docker-compose.yml (dev) and docker-compose.prod.yml (production)
 * to verify that containers build, start, and respond correctly.
 *
 * Run: npm run docker:smoke
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { after, before, describe, it } from "node:test";

const DEV_PROJECT = "bmad-todo";
const PROD_PROJECT = "bmad-todo-smoke";
const PROD_COMPOSE_FILE = "docker-compose.prod.yml";

const WEB_URL = "http://localhost:8090";
const API_URL = "http://localhost:3001";

const READINESS_TIMEOUT_MS = 60_000;
const READINESS_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Docker Compose helpers
// ---------------------------------------------------------------------------

function compose(command: string): void {
  // --env-file /dev/null prevents Docker Compose from loading the root .env
  // (which has dev values like DATABASE_URL pointing to 127.0.0.1).
  // The compose file's ${VAR:-default} fallbacks provide the correct values.
  execSync(
    `docker-compose -p ${PROD_PROJECT} -f ${PROD_COMPOSE_FILE} --env-file /dev/null ${command}`,
    { stdio: "inherit" },
  );
}

function devCompose(command: string): void {
  execSync(`docker-compose -p ${DEV_PROJECT} ${command}`, {
    stdio: "inherit",
  });
}

function isDevPostgresRunning(): boolean {
  try {
    const output = execSync(
      `docker-compose -p ${DEV_PROJECT} ps --status running -q`,
      { encoding: "utf-8" },
    );
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

async function waitForReady(url: string): Promise<void> {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status > 0) return;
    } catch {
      // Connection refused — service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, READINESS_INTERVAL_MS));
  }

  throw new Error(
    `${url} did not become ready within ${READINESS_TIMEOUT_MS / 1_000}s`,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let devWasRunning = false;

describe("docker-compose.yml (dev)", { concurrency: 1 }, () => {
  before(() => {
    devWasRunning = isDevPostgresRunning();
    if (!devWasRunning) {
      devCompose("up -d");
    }
  });

  after(() => {
    if (!devWasRunning) {
      devCompose("down");
    }
  });

  it("starts Postgres and accepts connections", () => {
    const output = execSync(
      `docker-compose -p ${DEV_PROJECT} ps --status running -q`,
      { encoding: "utf-8" },
    );
    assert.ok(output.trim().length > 0, "No running containers found");

    assert.doesNotThrow(
      () =>
        execSync(
          `docker exec ${DEV_PROJECT}-postgres-1 pg_isready -U postgres`,
          { stdio: "pipe" },
        ),
      "Postgres is not accepting connections",
    );
  });
});

describe("docker-compose.prod.yml (production)", { concurrency: 1 }, () => {
  before(async () => {
    // Stop dev Postgres to free port 5432
    if (isDevPostgresRunning()) {
      devCompose("stop");
    }

    compose("up -d --build");
    await waitForReady(WEB_URL);
    await waitForReady(API_URL);
  });

  after(() => {
    compose("down --volumes --remove-orphans");

    // Restore dev Postgres if it was running before
    if (devWasRunning) {
      devCompose("start");
    }
  });

  it("web serves the SPA", async () => {
    const response = await fetch(WEB_URL);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.ok(body.includes("<!doctype html"), "Response is not HTML");
  });

  it("API responds directly", async () => {
    const response = await fetch(`${API_URL}/todos`);

    // 400 is expected — the endpoint requires an x-user-id header
    assert.equal(response.status, 400);
  });

  it("Nginx proxies API routes to the API service", async () => {
    const response = await fetch(`${WEB_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "smoke-test" }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.ok(body.id, "Response missing user id");
  });
});
