const defaultMediaBaseUrl =
  "https://pub-9c95999dffa64e63a418ca19ce18d047.r2.dev";
const mediaBaseUrl = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL || defaultMediaBaseUrl
).replace(/\/+$/, "");

export function getMediaUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${mediaBaseUrl}/${normalizedPath}`;
}
