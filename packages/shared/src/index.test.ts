import { describe, expect, it } from "vitest";
import { defaultRetryRules, leadImportSchema, slotUploadSchema } from "./index.js";

describe("shared schemas", () => {
  it("validates slot uploads and retry defaults", () => {
    const row = slotUploadSchema.parse({
      slot_id: "S1",
      doctor_name: "Dr A",
      department: "General",
      date: "2026-06-15",
      start_time: "10:00",
      end_time: "10:30",
      status: "held"
    });
    expect(row.slot_id).toBe("S1");
    expect(row.status).toBe("held");
    expect(defaultRetryRules.no_answer.maxAttempts).toBe(3);
    expect(leadImportSchema.parse({ name: "A", phone: "+919999999999", email: "", source: "website" }).email).toBeUndefined();
  });

  it("exposes MVP call and slot statuses", () => {
    expect(slotUploadSchema.parse({
      slot_id: "S2",
      doctor_name: "Dr B",
      department: "General",
      date: "2026-06-15",
      start_time: "11:00",
      end_time: "11:30",
      status: "cancelled"
    }).status).toBe("cancelled");
  });
});
