import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertDeployConfig } = await import("./server/config");
  assertDeployConfig();
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./server/monitoring");
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  await reportError(error, { path: request.path, method: request.method, route: context.routePath, kind: context.routeType, digest });
};
