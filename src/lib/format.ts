const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

/** Formats an ISO yyyy-mm-dd date in UTC so output never depends on the local zone. */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`));
}
