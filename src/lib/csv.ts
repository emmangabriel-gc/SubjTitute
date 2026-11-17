export function parseCsvRows(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inQuotes) {
      if (character === '"') {
        if (value[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && value[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
    } else if (character === '"' && !closedQuote) {
      if (field.trim()) throw new Error("Unexpected quote in CSV data.");
      field = "";
      inQuotes = true;
    } else if (closedQuote && !/\s/.test(character)) {
      throw new Error("Unexpected text after a quoted CSV value.");
    } else if (!closedQuote) {
      field += character;
    }
  }

  if (inQuotes) throw new Error("A quoted CSV value was not closed.");
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function normalizeCsvHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z]/g, "");
}
