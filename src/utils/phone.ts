/** Normalize a phone number for comparison: digits only, leading 0 → 62 (ID). */
export function normalizePhone(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}
