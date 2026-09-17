import type { AuthUser } from "@workdeal/shared";
import type { AssistantChatInput, ProposalDraftInput, ResponseDraftInput } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { agentsService } from "../services/agents.service.js";

export const agentsController = {
  async chatAssistant(user: AuthUser, input: AssistantChatInput) {
    const result = await agentsService.chatAssistant(user, input);
    return { body: ok(result), status: 200 as const };
  },
  /** Devolve o handle de stream — a rota bombeia os deltas em SSE. */
  async chatAssistantStream(user: AuthUser, input: AssistantChatInput) {
    return agentsService.chatAssistantStream(user, input);
  },
  async draftProposal(user: AuthUser, input: ProposalDraftInput) {
    const result = await agentsService.draftProposal(user, input);
    return { body: ok(result), status: 200 as const };
  },
  async draftResponse(user: AuthUser, input: ResponseDraftInput) {
    const result = await agentsService.draftResponse(user, input);
    return { body: ok(result), status: 200 as const };
  },
};
