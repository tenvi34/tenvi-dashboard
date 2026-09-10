import { getGoogleMapsSearchUrl } from './travelMapLinks.js'

export default function TravelGoogleMapsLink({ place, query, region, t, search = false }) {
  const href = getGoogleMapsSearchUrl({ ...place, query, region: place?.region || region })
  if (!href) return null
  return <a className="travel-external-link" href={href} target="_blank" rel="noopener noreferrer"
    aria-label={`${search ? t.googleMapsSearch : t.googleMapsOpen} (${t.newTab})`}>
    {search ? t.googleMapsSearch : t.googleMapsOpen} <span aria-hidden="true">↗</span>
  </a>
}
