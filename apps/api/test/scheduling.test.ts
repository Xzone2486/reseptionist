import { describe, expect, it } from "vitest";
import { FileSchedulingProvider } from "../src/modules/scheduling/provider.js";

describe("FileSchedulingProvider", () => {
  it("parses valid CSV slots", async () => {
    const provider = new FileSchedulingProvider();
    const rows = await provider.parseSlotFile(
      Buffer.from("slot_id,doctor_name,department,date,start_time,end_time,status\nS1,Dr A,General,2026-06-15,10:00,10:30,available\n"),
      "slots.csv"
    );
    expect(rows[0].slot_id).toBe("S1");
    expect(rows[0].status).toBe("available");
  });

  it("parses held slots for database-backed hold flow", async () => {
    const provider = new FileSchedulingProvider();
    const rows = await provider.parseSlotFile(
      Buffer.from("slot_id,doctor_name,department,date,start_time,end_time,status\nS2,Dr A,General,2026-06-15,10:30,11:00,held\n"),
      "slots.csv"
    );
    expect(rows[0].status).toBe("held");
  });
});
