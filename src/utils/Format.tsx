// src/utils/format.ts
export function formatPeso(amount?: number | null) {
  const safeAmount =
    typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  return `₱${safeAmount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
  })}`;
}