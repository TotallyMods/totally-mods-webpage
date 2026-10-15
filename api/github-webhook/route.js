export async function POST(request) {
  const body = await request.json();

  console.log("GitHub webhook received:", body);

  return Response.json({ ok: true });
}
