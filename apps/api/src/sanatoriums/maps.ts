import { fail } from "../common/errors";

// Keep shared map links intact: place IDs and short links need no geocoding key.
export function mapLocation(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    fail(
      "MAP_LINK_INVALID",
      "Google Maps yoki Yandex Maps havolasini kiriting.",
      422,
    );
  }
  const host = url!.hostname.toLowerCase();
  const google =
    ([
      "google.com",
      "www.google.com",
      "google.co.uz",
      "www.google.co.uz",
    ].includes(host) &&
      url!.pathname.startsWith("/maps")) ||
    host === "maps.google.com" ||
    host === "maps.app.goo.gl" ||
    (host === "goo.gl" && url!.pathname.startsWith("/maps/"));
  const yandex =
    ([
      "yandex.com",
      "www.yandex.com",
      "yandex.ru",
      "www.yandex.ru",
      "yandex.uz",
      "www.yandex.uz",
    ].includes(host) &&
      url!.pathname.startsWith("/maps")) ||
    ["maps.yandex.com", "maps.yandex.ru", "maps.yandex.uz"].includes(host);
  if (
    url!.protocol !== "https:" ||
    url!.username ||
    url!.password ||
    url!.port ||
    (!google && !yandex)
  )
    fail(
      "MAP_LINK_INVALID",
      "Faqat Google Maps yoki Yandex Maps HTTPS havolasi qabul qilinadi.",
      422,
    );
  const result: { map_url: string; latitude?: number; longitude?: number } = {
    map_url: url!.href,
  };
  const pair = (text: string | null, reversed = false) => {
    const match =
      /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s|,|$)/.exec(
        text ?? "",
      );
    if (!match) return false;
    const latitude = Number(match[reversed ? 2 : 1]),
      longitude = Number(match[reversed ? 1 : 2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
    Object.assign(result, { latitude, longitude });
    return true;
  };
  if (yandex)
    pair(url!.searchParams.get("pt") ?? url!.searchParams.get("ll"), true);
  else {
    const precise = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(
      url!.pathname,
    );
    if (precise) pair(`${precise[1]},${precise[2]}`);
    else if (
      !pair(url!.searchParams.get("query") ?? url!.searchParams.get("q"))
    ) {
      const center = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(url!.pathname);
      if (center) pair(`${center[1]},${center[2]}`);
    }
  }
  return result;
}

export function withMapLocation(data: Record<string, any>, draft = false) {
  if (data.map_url?.trim()) {
    const { latitude: _lat, longitude: _lon, ...rest } = data;
    try {
      return { ...rest, ...mapLocation(data.map_url) };
    } catch (error) {
      if (draft) return rest;
      throw error;
    }
  }
  return data;
}
