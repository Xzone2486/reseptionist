import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { slotUploadSchema, type SlotUploadRow } from "@receptionist/shared";

export interface SchedulingProvider {
  parseSlotFile(buffer: Buffer, filename: string): Promise<SlotUploadRow[]>;
}

export class FileSchedulingProvider implements SchedulingProvider {
  async parseSlotFile(buffer: Buffer, filename: string): Promise<SlotUploadRow[]> {
    const lower = filename.toLowerCase();
    const rows = lower.endsWith(".xlsx") || lower.endsWith(".xls")
      ? await this.parseExcel(buffer)
      : this.parseCsv(buffer);
    return rows.map((row) => slotUploadSchema.parse(row));
  }

  private parseCsv(buffer: Buffer): unknown[] {
    return parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  }

  private async parseExcel(buffer: Buffer): Promise<unknown[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
    const headers = headerValues.map((value: ExcelJS.CellValue) => String(value ?? "").trim());

    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const item: Record<string, unknown> = {};
      headers.forEach((header: string, index: number) => {
        if (header) {
          item[header] = values[index] ?? "";
        }
      });
      rows.push(item);
    });

    return rows;
  }
}

export class GoogleCalendarSchedulingProvider implements SchedulingProvider {
  async parseSlotFile(): Promise<SlotUploadRow[]> {
    throw new Error("Google Calendar provider does not parse files. TODO: implement OAuth and free-busy sync.");
  }

  async syncAvailability() {
    throw new Error("TODO: integrate Google Calendar freebusy and event creation.");
  }
}
