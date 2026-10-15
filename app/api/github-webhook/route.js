export async function GET() {
  return new Response('Webhook route is alive', {
    status: 200,
  });
}

export async function POST(request) {
  try {
    const event = request.headers.get('x-github-event') || 'unknown';
    const delivery = request.headers.get('x-github-delivery') || 'unknown';
    const body = await request.json();

    const repo = body?.repository?.full_name || 'unknown repo';
    const ref = body?.ref || null;
    const headCommit = body?.head_commit || null;

    console.log('GitHub webhook received', {
      event,
      delivery,
      repo,
      ref,
      headCommit,
    });

    if (event === 'ping') {
      return Response.json({
        ok: true,
        event,
        message: 'pong',
        repo,
      });
    }

    if (event === 'push') {
      return Response.json({
        ok: true,
        event,
        repo,
        branch: ref?.replace('refs/heads/', '') || null,
        commit: headCommit
          ? {
              id: headCommit.id,
              message: headCommit.message,
              author: headCommit.author?.name,
              url: headCommit.url,
            }
          : null,
      });
    }

    return Response.json({
      ok: true,
      event,
      repo,
      message: 'Event received',
    });
  } catch (error) {
    console.error('Webhook error:', error);

    return Response.json(
      {
        ok: false,
        error: 'Webhook processing failed',
      },
      { status: 400 }
    );
  }
}
