export interface ReleaseCandidate {
  id: string
  title: string
  artist: string
  firstReleaseDate: string
  primaryType: string
  artworkUrl: string
  releaseUrl: string
}

function escapeQuery(value: string): string { return value.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&') }

export async function findReleaseArtwork(album: string, artist: string): Promise<ReleaseCandidate[]> {
  const query = `releasegroup:${escapeQuery(album)} AND artist:${escapeQuery(artist)}`
  const params = new URLSearchParams({ query, fmt: 'json', limit: '8' })
  const response = await fetch(`https://musicbrainz.org/ws/2/release-group/?${params}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`MusicBrainz returned ${response.status}`)
  const data = await response.json() as { 'release-groups'?: Array<{ id: string; title?: string; 'first-release-date'?: string; 'primary-type'?: string; 'artist-credit'?: Array<{ name?: string }> }> }
  return (data['release-groups'] ?? []).map((item) => ({
    id: item.id,
    title: item.title || 'Untitled release',
    artist: item['artist-credit']?.map((credit) => credit.name).filter(Boolean).join(', ') || artist,
    firstReleaseDate: item['first-release-date'] || 'Date unknown',
    primaryType: item['primary-type'] || 'Release group',
    artworkUrl: `https://coverartarchive.org/release-group/${item.id}/front-500`,
    releaseUrl: `https://musicbrainz.org/release-group/${item.id}`,
  }))
}
