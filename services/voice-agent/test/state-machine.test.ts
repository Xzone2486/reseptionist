import { describe, expect, it } from "vitest";
import { classifyUtterance, nextDecision } from "../src/agent/state-machine.js";

describe("voice state machine", () => {
  it("marks do-not-call requests as terminal", () => {
    expect(classifyUtterance("do not call me again")).toBe("do_not_call");
    expect(nextDecision("consent", "wrong number").outcome).toBe("wrong_number");
  });

  it("hands off medical questions instead of continuing the booking flow", () => {
    const decision = nextDecision("collect_details", "what medicine should I take for pain?");
    expect(decision.outcome).toBe("follow_up_needed");
    expect(decision.handoffReason).toBe("medical_details");
  });

  it("hands off person requests, anger, unclear input, and outside-booking questions", () => {
    expect(nextDecision("intent", "I want to talk to a person").handoffReason).toBe("user_asked_for_person");
    expect(nextDecision("intent", "this is a scam stop bothering me").handoffReason).toBe("user_angry");
    expect(nextDecision("intent", "what about my insurance refund?").handoffReason).toBe("outside_appointment_booking");
    expect(nextDecision("intent", "garbled words").handoffReason).toBe("bot_confused");
  });
});
