// Persian digits helper
const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[0-9]/g, (d) => FA[parseInt(d, 10)]);
}

export function fa(n: number | string | null | undefined): string {
  return toPersianDigits(n);
}
