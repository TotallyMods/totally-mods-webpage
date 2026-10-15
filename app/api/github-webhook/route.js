export async function GET() {
  return new Response("Webhook route is alive", {
    status: 200,
  });
}

export async function POST() {
  return new Response("OK", {
    status: 200,
  });
}
