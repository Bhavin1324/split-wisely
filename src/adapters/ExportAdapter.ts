/**
 * Data export utilities for CSV and JSON backup downloads.
 */
export class ExportAdapter {
  /**
   * Exports a simple flat array of records as a single-section CSV file.
   */
  static exportToCSV(data: Record<string, unknown>[], filename: string = 'export.csv'): void {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data
      .map((row) =>
        Object.values(row)
          .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const csvContent = `${headers}\n${rows}`;
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Exports multiple sections of heterogeneous data into a single CSV file.
   * Each section is preceded by a "# Section: <title>" comment row and its
   * own column header row, with a blank line separating sections.
   * This makes multi-schema exports readable in Excel or Google Sheets.
   */
  static exportMultiSectionCSV(
    sections: { title: string; rows: Record<string, unknown>[] }[],
    filename: string = 'export.csv'
  ): void {
    const parts: string[] = [];

    for (const section of sections) {
      if (section.rows.length === 0) continue;

      const headers = Object.keys(section.rows[0]).join(',');
      const rows = section.rows
        .map((row) =>
          Object.values(row)
            .map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

      parts.push(`# Section: ${section.title}\n${headers}\n${rows}`);
    }

    if (parts.length === 0) return;
    const csvContent = parts.join('\n\n');
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Exports a JSON-serializable object as a formatted .json file.
   */
  static exportToJSON(data: unknown, filename: string = 'backup.json'): void {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
