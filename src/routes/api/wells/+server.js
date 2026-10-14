export async function GET() {
  const res = await fetch('https://nedews.nrcc.cornell.edu/data/wells.json');

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  const json = await res.json();
  return new Response(JSON.stringify(json), {
    headers: { 'content-type': 'application/json' }
  });
}