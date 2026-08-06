/**
 * Data export utilities for CSV and JSON backup downloads.
 */
export class ExportAdapter {
  static exportToCSV(data: Record<string, unknown>[], filename: string = 'export.csv'): void {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const csvContent = `${headers}\n${rows}`;
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

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
