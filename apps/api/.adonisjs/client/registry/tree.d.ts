/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  demoChats: {
    store: typeof routes['demo_chats.store']
  }
  demoApprovals: {
    store: typeof routes['demo_approvals.store']
  }
  agentBookings: {
    find: typeof routes['agent_bookings.find']
    reschedule: typeof routes['agent_bookings.reschedule']
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
