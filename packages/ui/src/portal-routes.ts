export function portalSection(pathname: string, basePath = "") {
  const path =
    basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))
      ? pathname.slice(basePath.length)
      : pathname;
  return path.split("/")[1] || "dashboard";
}

export function portalUrl(
  section: string,
  basePath = "",
  params?: Record<string, string>,
) {
  const path = basePath + (section === "dashboard" ? "" : "/" + section) || "/";
  const query = params && new URLSearchParams(params).toString();
  return path + (query ? "?" + query : "");
}
