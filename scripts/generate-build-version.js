#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildEnvPath = path.join(__dirname, "..", ".env.build");

const utcDate = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, "0")}.${String(now.getUTCDate()).padStart(2, "0")}`;
};

const writeBuildEnv = (version) => {
  const content = `VITE_BUILD_VERSION=${version}\n`;
  fs.writeFileSync(buildEnvPath, content, "utf-8");
};

const parseNumeric = (value) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const readExistingBuildVersion = () => {
  if (!fs.existsSync(buildEnvPath)) return undefined;
  const content = fs.readFileSync(buildEnvPath, "utf-8");
  const match = content.match(/^VITE_BUILD_VERSION=(.+)$/m);
  return match ? match[1].trim() : undefined;
};

const parseVersionParts = (version) => {
  const match = /^v(\d{4}\.\d{2}\.\d{2})-(\d+)$/.exec(version);
  if (!match) return undefined;
  return { date: match[1], count: Number(match[2]) };
};

const asUtcDay = (value) => {
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`;
};

const getBuildNumberFromVercelApi = async (projectId, teamId) => {
  const token = process.env.VERCEL_TOKEN || process.env.VC_TOKEN;
  if (!token) return undefined;
  if (!projectId) return undefined;

  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("limit", "100");
  url.searchParams.set("target", "production");

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  let buildsToday = 0;
  let cursor;
  const targetDay = utcDate();

  for (let page = 0; page < 5; page += 1) {
    if (cursor) url.searchParams.set("until", cursor);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    if (!Array.isArray(data.deployments)) return undefined;

    for (const deployment of data.deployments) {
      const created = asUtcDay(deployment.created);
      if (created === targetDay) {
        buildsToday += 1;
      }
    }

    cursor = data.pagination?.cursor;
    if (!cursor || data.deployments.length === 0) break;
  }

  return buildsToday + 1;
};

const run = async () => {
  const manual = process.env.VITE_BUILD_VERSION?.trim();
  if (manual?.length) {
    writeBuildEnv(manual);
    return;
  }

  const dateString = utcDate();
  let buildNumber;

  const explicitVercelNumber = parseNumeric(process.env.VERCEL_BUILD_NUMBER || process.env.BUILD_NUMBER);
  if (explicitVercelNumber) {
    buildNumber = explicitVercelNumber;
  }

  const explicitVercelId = parseNumeric(process.env.VERCEL_BUILD_ID);
  if (!buildNumber && explicitVercelId) {
    buildNumber = explicitVercelId;
  }

  if (!buildNumber && process.env.VERCEL_PROJECT_ID) {
    const maybeNumber = await getBuildNumberFromVercelApi(process.env.VERCEL_PROJECT_ID, process.env.VERCEL_TEAM_ID);
    if (maybeNumber) buildNumber = maybeNumber;
  }

  if (!buildNumber) {
    const existingVersion = readExistingBuildVersion();
    const parsed = existingVersion ? parseVersionParts(existingVersion) : undefined;
    if (parsed?.date === dateString) {
      buildNumber = parsed.count + 1;
    }
  }

  if (!buildNumber) {
    buildNumber = 1;
  }

  const version = `v${dateString}-${buildNumber}`;
  writeBuildEnv(version);
};

run().catch((error) => {
  console.error("Failed to generate build version:", error);
  process.exit(1);
});
