/**
 * Normaliza un texto para comparaciones insensibles a mayúsculas y tildes.
 * "Árbol" → "arbol", "Palmera" → "palmera"
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')                    // descompone "á" en "a" + acento
    .replace(/[\u0300-\u036f]/g, '');   // elimina los acentos
}
