export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Record<string, any>> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>{columns.map((column) => <th className="table-cell font-medium" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-gray-50">
              {columns.map((column) => <td className="table-cell" key={column}>{String(row[column] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

