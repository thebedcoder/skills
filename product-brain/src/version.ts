// Build identity. In the production bundle, esbuild's `define` injects
// these as compile-time constants. In dev (tsx), the env vars aren't
// set, so we fall back to a static dev marker — running tests or
// `tsx src/cli.ts` shouldn't depend on filesystem layout.

export const VERSION: string = process.env["PB_VERSION"] ?? "0.0.0-dev";
export const BUILD_ID: string = process.env["PB_BUILD_ID"] ?? "dev";
export const BUILD_TIME: string = process.env["PB_BUILD_TIME"] ?? "dev";
