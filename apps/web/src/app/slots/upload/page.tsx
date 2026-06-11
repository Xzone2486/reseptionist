import { AppShell } from "../../../components/AppShell";
import { UploadBox } from "../../../components/UploadBox";

export default function SlotUploadPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Upload Slots</h1>
      <p className="mt-2 text-sm text-gray-600">Columns: slot_id, doctor_name, department, date, start_time, end_time, status.</p>
      <div className="mt-4"><UploadBox endpoint="/slots/upload" label="Upload CSV or Excel appointment slots" /></div>
    </AppShell>
  );
}

