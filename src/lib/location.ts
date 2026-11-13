export type Place = { city: string; region: string; regionCode: string; country: string };

export const PLACE_KEY = "internagent.place";

// Asks the browser for the user's position, then turns it into a city/state with
// BigDataCloud's free client-side lookup. Only the city/state is kept, never coordinates.
export async function locateMe(): Promise<Place> {
  if (!("geolocation" in navigator)) throw new Error("Your browser doesn't support location.");
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15_000, maximumAge: 3_600_000 }),
  ).catch((e: GeolocationPositionError) => {
    throw new Error(e.code === 1 ? "Location permission was blocked. You can allow it in your browser's site settings." : "Couldn't get your location. Try again.");
  });
  const { latitude, longitude } = pos.coords;
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&localityLanguage=en`,
  );
  if (!res.ok) throw new Error("Couldn't look up your city. Try again.");
  const d = await res.json();
  return {
    city: d.city || d.locality || "",
    region: d.principalSubdivision || "",
    regionCode: (d.principalSubdivisionCode || "").split("-").pop() || "",
    country: d.countryCode || "",
  };
}

export function placeLabel(p: Place) {
  return [p.city, p.regionCode || p.region].filter(Boolean).join(", ");
}

export const isRemote = (location: string) => /remote/i.test(location);

// "Near me" = same city or same state/province as the user.
export function isNear(location: string, p: Place) {
  const loc = location.toLowerCase();
  if (p.city && loc.includes(p.city.toLowerCase())) return true;
  if (p.region && loc.includes(p.region.toLowerCase())) return true;
  return !!p.regionCode && new RegExp(`,\\s*${p.regionCode}\\b`).test(location);
}
