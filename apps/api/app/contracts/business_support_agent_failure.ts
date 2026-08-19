import type { BusinessSupportAgentError } from "#services/business_support_agent";
import type { AttentionStoreUnavailable } from "#actions/sync-reschedule-attention";
import type { HttpContext } from "@adonisjs/core/http";

export function reportBusinessSupportAgentError(
  error: BusinessSupportAgentError | AttentionStoreUnavailable,
  logger: HttpContext["logger"],
  context: Record<string, unknown>,
  message: string
) {
  error.match({
    AgentUnavailable: (failure) => logger.error({ ...context, err: failure }, message),
    AgentRequestRejected: (failure) => logger.error({ ...context, err: failure }, message),
    InvalidAgentResponse: (failure) => logger.error({ ...context, err: failure }, message),
    EmptyAgentStream: (failure) => logger.error({ ...context, err: failure }, message),
    AttentionStoreUnavailable: (failure) => logger.error({ ...context, err: failure }, message),
  });
}
