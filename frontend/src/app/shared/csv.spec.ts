import { csvDate, toCsv } from './csv';

describe('toCsv', () => {
  it('writes an Excel-friendly file: BOM, semicolons, decimal comma and CRLF', () => {
    const csv = toCsv(['Séance', 'Score'], [['Yoga & récupération', 80.5], ['Circuit', 92]]);

    expect(csv).toBe('﻿Séance;Score\r\nYoga & récupération;80,5\r\nCircuit;92\r\n');
  });

  it('quotes cells containing separators, quotes or line breaks', () => {
    const csv = toCsv(['Notes'], [['Bien; très "dur"'], ['ligne 1\nligne 2']]);

    expect(csv).toContain('"Bien; très ""dur"""');
    expect(csv).toContain('"ligne 1\nligne 2"');
  });

  it('neutralises text that Excel would run as a formula', () => {
    const csv = toCsv(['Titre'], [['=HYPERLINK("http://pirate.example")'], ['+33 6 12'], ['@SUM(A1)']]);

    expect(csv).toContain(`"'=HYPERLINK(""http://pirate.example"")"`);
    expect(csv).toContain("'+33 6 12");
    expect(csv).toContain("'@SUM(A1)");
  });

  it('keeps negative numbers as numbers and leaves missing values empty', () => {
    expect(toCsv(['A', 'B', 'C'], [[-5, null, undefined]])).toBe('﻿A;B;C\r\n-5;;\r\n');
  });

  it('formats dates the French way', () => {
    expect(csvDate('2026-10-01T17:32:00Z')).toMatch(/^\d{2}\/10\/2026$/);
    expect(csvDate(null)).toBe('');
  });
});
