export const VENUE_NAME = 'Shri Nandi Garden and Clubhouse'
// Plain google.com "cid" link to the place, not a maps.app.goo.gl short
// link: those ran on Firebase Dynamic Links (shut down Aug 2025) and show
// "unsupported" on iPhones. This one opens the Google Maps app if
// installed, otherwise Maps in Safari. assets/venue-location-qr.png
// encodes this same URL - regenerate it if this ever changes.
export const VENUE_MAPS_URL = 'https://maps.google.com/?cid=11062990341312853521'
