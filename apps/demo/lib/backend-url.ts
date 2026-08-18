export function getBackendUrl() {
  return (process.env.ADONIS_URL ?? "http://localhost:3333").replace(/\/$/, "");
}
