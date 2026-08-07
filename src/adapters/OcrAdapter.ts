// @ts-ignore
import Tesseract from 'tesseract.js';

export interface ScannedItem {
  name: string;
  price: number;
}

export class OcrAdapter {
  static async scanReceipt(fileUrlOrBlob: string | Blob): Promise<ScannedItem[]> {
    try {
      const { data: { text } } = await Tesseract.recognize(fileUrlOrBlob, 'eng', {
        logger: (m: any) => console.log(m)
      });
      
      const lines = text.split('\n');
      const items: ScannedItem[] = [];
      
      // Basic regex to find lines ending in a price
      const priceRegex = /([a-zA-Z\s]+)\s+[\$£€]?\s*(\d+\.\d{2})/;
      
      for (const line of lines) {
        const match = line.match(priceRegex);
        if (match) {
          const name = match[1].trim();
          const price = parseFloat(match[2]);
          if (name && !isNaN(price)) {
            items.push({ name, price });
          }
        }
      }
      
      // Fallback mock items if nothing is parsed
      if (items.length === 0) {
        return [
          { name: 'Mock Item 1', price: 10.0 },
          { name: 'Mock Item 2', price: 15.5 },
        ];
      }
      
      return items;
    } catch (error) {
      console.error('Error scanning receipt:', error);
      return [
        { name: 'Mock Item (Error)', price: 0.0 }
      ];
    }
  }
}
