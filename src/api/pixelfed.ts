import type { AuthState } from './auth';

async function uploadOne(auth: AuthState, blob: Blob, description: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'meenow.jpg');
  form.append('description', description);

  const res = await fetch(`https://${auth.instance}/api/v1/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Media upload failed (${res.status})`);
  const media = await res.json() as { id: string; url: string | null };

  if (media.url !== null) return media.id;

  // Poll until the instance finishes processing
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const poll = await fetch(`https://${auth.instance}/api/v1/media/${media.id}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (!poll.ok) throw new Error(`Media poll failed (${poll.status})`);
    const m = await poll.json() as { url: string | null };
    if (m.url !== null) return media.id;
  }
  throw new Error('Media processing timed out');
}

export async function postMeenow(
  auth: AuthState,
  composite: Blob,
  backPhoto: Blob,
  frontPhoto: Blob,
): Promise<string> {
  // Upload all three. Composite is first so it appears as the lead image.
  const [compositeId, backId, frontId] = await Promise.all([
    uploadOne(auth, composite, 'meenow — daily photo'),
    uploadOne(auth, backPhoto, 'meenow — surroundings'),
    uploadOne(auth, frontPhoto, 'meenow — selfie'),
  ]);

  const res = await fetch(`https://${auth.instance}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: '#meenowApp',
      media_ids: [compositeId, backId, frontId],
      visibility: 'private', // followers only
    }),
  });
  if (!res.ok) throw new Error(`Post failed (${res.status})`);
  const status = await res.json() as { url: string };
  return status.url;
}
