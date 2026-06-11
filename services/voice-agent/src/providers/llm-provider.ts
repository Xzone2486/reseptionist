export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LlmProvider {
  next(messages: LlmMessage[]): Promise<string>;
}

export class GroqLlmProvider implements LlmProvider {
  async next(messages: LlmMessage[]) {
    const last = messages[messages.length - 1]?.content || "";
    // TODO: Call Groq chat completions with tool definitions in production mode.
    return last;
  }
}

