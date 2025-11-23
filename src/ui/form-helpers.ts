export function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function isEmptyString(s: unknown): boolean {
  const v = String(s ?? '')
  return v.trim().length === 0
}

export function setDefaultNumber(
  input: HTMLInputElement,
  defaultValue: number
) {
  input.value = String(defaultValue)
}

export function parseNumberOrDefault(
  raw: unknown,
  defaultValue: number
): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

export function getNumberInputOrDefault(
  input: HTMLInputElement,
  defaultValue: number
): number {
  return parseNumberOrDefault(input.value, defaultValue)
}
