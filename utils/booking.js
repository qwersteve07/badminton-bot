function normalizeBaseUrl(baseUrl) {
  return new URL(baseUrl).href;
}

export function buildBookingUrl({ baseUrl, homePath, date, time, qpid }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return new URL(
    `${homePath}?module=net_booking&files=booking_place&StepFlag=25&QPid=${qpid}&PT=1&D=${date}&QTime=${time}`,
    normalizedBaseUrl,
  ).href;
}

export function buildRedirectUrl({ baseUrl, redirectPath }) {
  return new URL(redirectPath, normalizeBaseUrl(baseUrl)).href;
}

export function extractRedirectPath(html) {
  const locationMatches = [
    html.match(/(?:location(?:\.href)?|window\.location(?:\.href)?)\s*=\s*['"]([^'"]+)['"]/i),
    html.match(/(?:url|href)\s*[:=]\s*['"]([^'"]+)['"]/i),
    html.match(/((?:\.\.\/)+[^'"<>\s]+)/i),
  ];

  const match = locationMatches.find(Boolean);
  return match?.[1] ?? null;
}

export function parseBookingResponse(html) {
  if (/預約成功/.test(html)) {
    return { status: "success", reason: "success-marker" };
  }

  const redirectPath = extractRedirectPath(html);
  if (redirectPath) {
    return { status: "redirect", redirectPath, reason: "redirect-script" };
  }

  if (/預約失敗|額滿|已滿|無法|錯誤|error/i.test(html)) {
    return { status: "failure", reason: "failure-marker" };
  }

  return { status: "unknown", reason: "unrecognized-response" };
}
