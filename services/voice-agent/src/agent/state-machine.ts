export type ConversationStage =
  | "greeting"
  | "consent"
  | "intent"
  | "collect_details"
  | "lookup"
  | "offer_slot"
  | "confirm"
  | "book"
  | "handoff"
  | "end";

export interface ExtractedBookingDetails {
  patientName?: string;
  phone?: string;
  email?: string;
  preferredDate?: string;
  preferredTime?: string;
  department?: string;
  reason?: string;
  confirmed?: boolean;
}

export interface AgentDecision {
  stage: ConversationStage;
  say: string;
  outcome?: "appointment_booked" | "declined" | "retry" | "do_not_call" | "wrong_number" | "no_answer" | "follow_up_needed";
  handoffReason?: string;
}

export function classifyUtterance(text: string) {
  const lower = text.toLowerCase();
  if (/(human|person|receptionist|staff|doctor se baat|agent|operator)/.test(lower)) return "human_request";
  if (/(wrong number|not my number)/.test(lower)) return "wrong_number";
  if (/(do not call|don't call|remove my number)/.test(lower)) return "do_not_call";
  if (/(angry|irritated|complaint|shut up|stop bothering|fraud|scam)/.test(lower)) return "angry";
  if (/(not interested|no thanks|stop calling)/.test(lower)) return "declined";
  if (/(call later|busy|not now|tomorrow)/.test(lower)) return "call_later";
  if (/(yes|sure|okay|book|appointment)/.test(lower)) return "positive";
  if (/(who is this|where are you calling from)/.test(lower)) return "identity";
  if (/(medicine|pain|symptom|treatment|diagnosis|prescription|blood|fever|chest|pregnan|medical report)/.test(lower)) return "medical";
  if (/(insurance|billing|refund|address|job|lab report|test result|emergency|ambulance)/.test(lower)) return "outside_booking";
  return "unclear";
}

export function handoffDecision(reason: string): AgentDecision {
  return {
    stage: "handoff",
    say: "I will ask a clinic staff member to follow up with you. Thank you.",
    outcome: "follow_up_needed",
    handoffReason: reason
  };
}

export function nextDecision(stage: ConversationStage, utterance: string): AgentDecision {
  const intent = classifyUtterance(utterance);
  if (intent === "wrong_number") return { stage: "end", say: "Sorry about that. We will not call this number again.", outcome: "wrong_number" };
  if (intent === "do_not_call") return { stage: "end", say: "Understood. We will not call again. Take care.", outcome: "do_not_call" };
  if (intent === "human_request") return handoffDecision("user_asked_for_person");
  if (intent === "angry") return handoffDecision("user_angry");
  if (intent === "medical") return handoffDecision("medical_details");
  if (intent === "outside_booking") return handoffDecision("outside_appointment_booking");
  if (intent === "declined") return { stage: "end", say: "No problem. Thank you for your time.", outcome: "declined" };
  if (intent === "call_later") return { stage: "end", say: "Sure, I can call you later. Thank you.", outcome: "retry" };
  if (intent === "identity") return { stage: "consent", say: "This is the appointment assistant from your clinic, calling because you recently showed interest on the website. Is this a good time?" };
  if (intent === "unclear" && stage !== "greeting") return handoffDecision("bot_confused");

  switch (stage) {
    case "greeting":
      return { stage: "consent", say: "Namaste, main [Clinic Name] se appointment assistant bol rahi hoon. Aapne recently doctor appointment ke liye website visit ki thi. Kya abhi baat karna theek rahega?" };
    case "consent":
      return intent === "positive"
        ? { stage: "intent", say: "Kya aap doctor appointment book karna chahenge?" }
        : { stage: "end", say: "Theek hai, main baad mein call kar leti hoon.", outcome: "retry" };
    case "intent":
      return { stage: "collect_details", say: "Sure. Aapka naam aur appointment ka reason ya department bata dijiye." };
    case "collect_details":
      return { stage: "lookup", say: "Thanks. Aapko kaunsi date aur time prefer rahega?" };
    case "lookup":
      return { stage: "offer_slot", say: "Ek moment, main available slots check kar rahi hoon." };
    case "offer_slot":
      return { stage: "confirm", say: "Ek available slot mil gaya hai. Kya main ye aapke liye book kar du?" };
    case "confirm":
      return intent === "positive"
        ? { stage: "book", say: "Thanks, main appointment abhi book kar deti hoon.", outcome: "appointment_booked" }
        : { stage: "lookup", say: "Theek hai. Kaunsa dusra time better rahega?" };
    default:
      return { stage: "end", say: "Thank you. Have a good day." };
  }
}
