const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export function GET() {
  return Response.json({ version }, { headers: { "cache-control": "no-store, max-age=0" } });
}
