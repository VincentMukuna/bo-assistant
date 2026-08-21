/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  demoSessions: {
    store: typeof routes['demo_sessions.store']
  }
  conversations: {
    index: typeof routes['conversations.index']
    store: typeof routes['conversations.store']
    show: typeof routes['conversations.show']
  }
  conversationMessages: {
    store: typeof routes['conversation_messages.store']
  }
  approvalRequests: {
    show: typeof routes['approval_requests.show']
  }
  approvalDecisions: {
    store: typeof routes['approval_decisions.store']
  }
  agentBookingSearches: {
    store: typeof routes['agent_booking_searches.store']
  }
  agentBookingReschedules: {
    store: typeof routes['agent_booking_reschedules.store']
  }
  agentBookingCreations: {
    store: typeof routes['agent_booking_creations.store']
  }
  auth: {
    sessions: {
      store: typeof routes['auth.sessions.store']
    }
  }
  profile: {
    show: typeof routes['profile.show']
  }
  sessions: {
    destroy: typeof routes['sessions.destroy']
  }
  customers: {
    index: typeof routes['customers.index']
    store: typeof routes['customers.store']
    show: typeof routes['customers.show']
    update: typeof routes['customers.update']
    destroy: typeof routes['customers.destroy']
  }
  bookings: {
    index: typeof routes['bookings.index']
    store: typeof routes['bookings.store']
    show: typeof routes['bookings.show']
    update: typeof routes['bookings.update']
    destroy: typeof routes['bookings.destroy']
  }
  inboxConversations: {
    index: typeof routes['inbox_conversations.index']
    show: typeof routes['inbox_conversations.show']
  }
  conversationOwnerships: {
    update: typeof routes['conversation_ownerships.update']
  }
  ownerConversationMessages: {
    store: typeof routes['owner_conversation_messages.store']
  }
  attentionDecisions: {
    store: typeof routes['attention_decisions.store']
  }
  inboxEvents: {
    index: typeof routes['inbox_events.index']
  }
  agentActivities: {
    index: typeof routes['agent_activities.index']
  }
}
