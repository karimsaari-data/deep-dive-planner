export interface XlsxSheet {
  name: string;
  columns: { header: string; width?: number }[];
  rows: (string | number | null)[][];
}

// exceljs est chargé à la demande pour ne pas alourdir le bundle initial
export async function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  sheets.forEach((s) => {
    const ws = wb.addWorksheet(s.name.slice(0, 31));
    ws.columns = s.columns.map((c) => ({ header: c.header, width: c.width ?? 20 }));
    ws.addRows(s.rows);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  });
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
