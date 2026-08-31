import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeProphetConfigInput } from "@/lib/prophet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "run_prophet.py");
const TIMEOUT_MS = 120_000;

export async function POST(request: NextRequest) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const config = sanitizeProphetConfigInput(
    isRecord(body) ? body.config : undefined,
  );

  try {
    const dataset = await runProphet(config);

    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel recalcular o Prophet.",
      },
      { status: 500 },
    );
  }
}

function runProphet(config: Record<string, unknown>) {
  return new Promise<unknown>((resolve, reject) => {
    const child = spawn("python3", [SCRIPT_PATH], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let didTimeout = false;

    const timeout = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (didTimeout) {
        reject(new Error("O Prophet demorou demais para responder."));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || `O script Prophet terminou com codigo ${code}.`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("O Python retornou um JSON invalido para o grafico."));
      }
    });

    child.stdin.end(JSON.stringify(config));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
