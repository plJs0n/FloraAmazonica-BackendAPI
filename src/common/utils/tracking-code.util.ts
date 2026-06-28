/**
 * Genera código de seguimiento con formato FAM-YYYY-NNNNN
 * @param sequence número secuencial para el año en curso
 */
export function generateTrackingCode(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `FAM-${year}-${padded}`;
}
