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
}
