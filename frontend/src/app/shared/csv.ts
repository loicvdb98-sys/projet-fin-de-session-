/**
 * Export CSV lisible par Excel en français : séparateur « ; », nombres décimaux avec
 * une virgule, UTF-8 avec BOM (accents conservés) et fins de ligne CRLF.
 *
 * Un texte qui commence par = + - @ (ou une tabulation) est préfixé d'une apostrophe :
 * sans cela, Excel l'interpréterait comme une formule (« injection de formules CSV »),
 * par exemple un titre de séance saisi sous la forme =LIEN_HYPERTEXTE(...).
 */
import { saveFile } from './download';

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function formatCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'number' ? String(value).replace('.', ',') : value;
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Contenu CSV complet (en-têtes puis lignes). */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return '﻿' + [headers, ...rows].map((row) => row.map(formatCell).join(';')).join('\r\n') + '\r\n';
}

/** Génère le CSV et propose son enregistrement ; le nom de fichier reçoit la date du jour. */
export function saveCsv(name: string, headers: string[], rows: CsvCell[][]): void {
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  saveFile(new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' }), `sportplan-${name}-${stamp}.csv`);
}

/** Date locale au format français (01/10/2026), ou chaîne vide si absente. */
export function csvDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/** Heure locale (19:32), ou chaîne vide si absente. */
export function csvTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
}
