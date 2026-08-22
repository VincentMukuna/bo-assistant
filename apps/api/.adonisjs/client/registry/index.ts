/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'demo_resets.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/demo/reset',
    tokens: [{"old":"/api/v1/demo/reset","type":0,"val":"api","end":""},{"old":"/api/v1/demo/reset","type":0,"val":"v1","end":""},{"old":"/api/v1/demo/reset","type":0,"val":"demo","end":""},{"old":"/api/v1/demo/reset","type":0,"val":"reset","end":""}],
    types: placeholder as Registry['demo_resets.show']['types'],
  },
  'demo_sessions.store': {
    methods: ["POST"],
    pattern: '/api/v1/demo/session',
    tokens: [{"old":"/api/v1/demo/session","type":0,"val":"api","end":""},{"old":"/api/v1/demo/session","type":0,"val":"v1","end":""},{"old":"/api/v1/demo/session","type":0,"val":"demo","end":""},{"old":"/api/v1/demo/session","type":0,"val":"session","end":""}],
    types: placeholder as Registry['demo_sessions.store']['types'],
  },
  'customer_accounts.store': {
    methods: ["POST"],
    pattern: '/api/v1/demo/account',
    tokens: [{"old":"/api/v1/demo/account","type":0,"val":"api","end":""},{"old":"/api/v1/demo/account","type":0,"val":"v1","end":""},{"old":"/api/v1/demo/account","type":0,"val":"demo","end":""},{"old":"/api/v1/demo/account","type":0,"val":"account","end":""}],
    types: placeholder as Registry['customer_accounts.store']['types'],
  },
  'customer_email_verifications.store': {
    methods: ["POST"],
    pattern: '/api/v1/demo/email-verifications',
    tokens: [{"old":"/api/v1/demo/email-verifications","type":0,"val":"api","end":""},{"old":"/api/v1/demo/email-verifications","type":0,"val":"v1","end":""},{"old":"/api/v1/demo/email-verifications","type":0,"val":"demo","end":""},{"old":"/api/v1/demo/email-verifications","type":0,"val":"email-verifications","end":""}],
    types: placeholder as Registry['customer_email_verifications.store']['types'],
  },
  'conversations.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/support/conversations',
    tokens: [{"old":"/api/v1/support/conversations","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"conversations","end":""}],
    types: placeholder as Registry['conversations.index']['types'],
  },
  'conversations.store': {
    methods: ["POST"],
    pattern: '/api/v1/support/conversations',
    tokens: [{"old":"/api/v1/support/conversations","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations","type":0,"val":"conversations","end":""}],
    types: placeholder as Registry['conversations.store']['types'],
  },
  'conversations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/support/conversations/:id',
    tokens: [{"old":"/api/v1/support/conversations/:id","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations/:id","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations/:id","type":0,"val":"conversations","end":""},{"old":"/api/v1/support/conversations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['conversations.show']['types'],
  },
  'conversation_messages.store': {
    methods: ["POST"],
    pattern: '/api/v1/support/conversations/:id/messages',
    tokens: [{"old":"/api/v1/support/conversations/:id/messages","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations/:id/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations/:id/messages","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations/:id/messages","type":0,"val":"conversations","end":""},{"old":"/api/v1/support/conversations/:id/messages","type":1,"val":"id","end":""},{"old":"/api/v1/support/conversations/:id/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['conversation_messages.store']['types'],
  },
  'approval_requests.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/support/conversations/:id/approval-request',
    tokens: [{"old":"/api/v1/support/conversations/:id/approval-request","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations/:id/approval-request","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations/:id/approval-request","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations/:id/approval-request","type":0,"val":"conversations","end":""},{"old":"/api/v1/support/conversations/:id/approval-request","type":1,"val":"id","end":""},{"old":"/api/v1/support/conversations/:id/approval-request","type":0,"val":"approval-request","end":""}],
    types: placeholder as Registry['approval_requests.show']['types'],
  },
  'approval_decisions.store': {
    methods: ["POST"],
    pattern: '/api/v1/support/conversations/:id/approval-decisions',
    tokens: [{"old":"/api/v1/support/conversations/:id/approval-decisions","type":0,"val":"api","end":""},{"old":"/api/v1/support/conversations/:id/approval-decisions","type":0,"val":"v1","end":""},{"old":"/api/v1/support/conversations/:id/approval-decisions","type":0,"val":"support","end":""},{"old":"/api/v1/support/conversations/:id/approval-decisions","type":0,"val":"conversations","end":""},{"old":"/api/v1/support/conversations/:id/approval-decisions","type":1,"val":"id","end":""},{"old":"/api/v1/support/conversations/:id/approval-decisions","type":0,"val":"approval-decisions","end":""}],
    types: placeholder as Registry['approval_decisions.store']['types'],
  },
  'agent_booking_searches.store': {
    methods: ["POST"],
    pattern: '/api/v1/agent/booking-searches',
    tokens: [{"old":"/api/v1/agent/booking-searches","type":0,"val":"api","end":""},{"old":"/api/v1/agent/booking-searches","type":0,"val":"v1","end":""},{"old":"/api/v1/agent/booking-searches","type":0,"val":"agent","end":""},{"old":"/api/v1/agent/booking-searches","type":0,"val":"booking-searches","end":""}],
    types: placeholder as Registry['agent_booking_searches.store']['types'],
  },
  'agent_booking_reschedules.store': {
    methods: ["POST"],
    pattern: '/api/v1/agent/booking-reschedules',
    tokens: [{"old":"/api/v1/agent/booking-reschedules","type":0,"val":"api","end":""},{"old":"/api/v1/agent/booking-reschedules","type":0,"val":"v1","end":""},{"old":"/api/v1/agent/booking-reschedules","type":0,"val":"agent","end":""},{"old":"/api/v1/agent/booking-reschedules","type":0,"val":"booking-reschedules","end":""}],
    types: placeholder as Registry['agent_booking_reschedules.store']['types'],
  },
  'agent_booking_creations.store': {
    methods: ["POST"],
    pattern: '/api/v1/agent/booking-creations',
    tokens: [{"old":"/api/v1/agent/booking-creations","type":0,"val":"api","end":""},{"old":"/api/v1/agent/booking-creations","type":0,"val":"v1","end":""},{"old":"/api/v1/agent/booking-creations","type":0,"val":"agent","end":""},{"old":"/api/v1/agent/booking-creations","type":0,"val":"booking-creations","end":""}],
    types: placeholder as Registry['agent_booking_creations.store']['types'],
  },
  'agent_operations_conversations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/agent/operations/conversations/:id',
    tokens: [{"old":"/api/v1/agent/operations/conversations/:id","type":0,"val":"api","end":""},{"old":"/api/v1/agent/operations/conversations/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/agent/operations/conversations/:id","type":0,"val":"agent","end":""},{"old":"/api/v1/agent/operations/conversations/:id","type":0,"val":"operations","end":""},{"old":"/api/v1/agent/operations/conversations/:id","type":0,"val":"conversations","end":""},{"old":"/api/v1/agent/operations/conversations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['agent_operations_conversations.show']['types'],
  },
  'agent_operations_bookings.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/agent/operations/bookings/:id',
    tokens: [{"old":"/api/v1/agent/operations/bookings/:id","type":0,"val":"api","end":""},{"old":"/api/v1/agent/operations/bookings/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/agent/operations/bookings/:id","type":0,"val":"agent","end":""},{"old":"/api/v1/agent/operations/bookings/:id","type":0,"val":"operations","end":""},{"old":"/api/v1/agent/operations/bookings/:id","type":0,"val":"bookings","end":""},{"old":"/api/v1/agent/operations/bookings/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['agent_operations_bookings.show']['types'],
  },
  'auth.sessions.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.sessions.store']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/profile',
    tokens: [{"old":"/api/v1/profile","type":0,"val":"api","end":""},{"old":"/api/v1/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'sessions.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/session',
    tokens: [{"old":"/api/v1/session","type":0,"val":"api","end":""},{"old":"/api/v1/session","type":0,"val":"v1","end":""},{"old":"/api/v1/session","type":0,"val":"session","end":""}],
    types: placeholder as Registry['sessions.destroy']['types'],
  },
  'customers.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/customers',
    tokens: [{"old":"/api/v1/customers","type":0,"val":"api","end":""},{"old":"/api/v1/customers","type":0,"val":"v1","end":""},{"old":"/api/v1/customers","type":0,"val":"customers","end":""}],
    types: placeholder as Registry['customers.index']['types'],
  },
  'customers.store': {
    methods: ["POST"],
    pattern: '/api/v1/customers',
    tokens: [{"old":"/api/v1/customers","type":0,"val":"api","end":""},{"old":"/api/v1/customers","type":0,"val":"v1","end":""},{"old":"/api/v1/customers","type":0,"val":"customers","end":""}],
    types: placeholder as Registry['customers.store']['types'],
  },
  'customers.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/customers/:id',
    tokens: [{"old":"/api/v1/customers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"customers","end":""},{"old":"/api/v1/customers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['customers.show']['types'],
  },
  'customers.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/customers/:id',
    tokens: [{"old":"/api/v1/customers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"customers","end":""},{"old":"/api/v1/customers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['customers.update']['types'],
  },
  'customers.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/customers/:id',
    tokens: [{"old":"/api/v1/customers/:id","type":0,"val":"api","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/customers/:id","type":0,"val":"customers","end":""},{"old":"/api/v1/customers/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['customers.destroy']['types'],
  },
  'bookings.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/bookings',
    tokens: [{"old":"/api/v1/bookings","type":0,"val":"api","end":""},{"old":"/api/v1/bookings","type":0,"val":"v1","end":""},{"old":"/api/v1/bookings","type":0,"val":"bookings","end":""}],
    types: placeholder as Registry['bookings.index']['types'],
  },
  'bookings.store': {
    methods: ["POST"],
    pattern: '/api/v1/bookings',
    tokens: [{"old":"/api/v1/bookings","type":0,"val":"api","end":""},{"old":"/api/v1/bookings","type":0,"val":"v1","end":""},{"old":"/api/v1/bookings","type":0,"val":"bookings","end":""}],
    types: placeholder as Registry['bookings.store']['types'],
  },
  'bookings.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/bookings/:id',
    tokens: [{"old":"/api/v1/bookings/:id","type":0,"val":"api","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"bookings","end":""},{"old":"/api/v1/bookings/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['bookings.show']['types'],
  },
  'bookings.update': {
    methods: ["PUT","PATCH"],
    pattern: '/api/v1/bookings/:id',
    tokens: [{"old":"/api/v1/bookings/:id","type":0,"val":"api","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"bookings","end":""},{"old":"/api/v1/bookings/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['bookings.update']['types'],
  },
  'bookings.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/bookings/:id',
    tokens: [{"old":"/api/v1/bookings/:id","type":0,"val":"api","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/bookings/:id","type":0,"val":"bookings","end":""},{"old":"/api/v1/bookings/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['bookings.destroy']['types'],
  },
  'inbox_conversations.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/inbox/conversations',
    tokens: [{"old":"/api/v1/inbox/conversations","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations","type":0,"val":"conversations","end":""}],
    types: placeholder as Registry['inbox_conversations.index']['types'],
  },
  'inbox_conversations.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/inbox/conversations/:id',
    tokens: [{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"conversations","end":""},{"old":"/api/v1/inbox/conversations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['inbox_conversations.show']['types'],
  },
  'inbox_conversations.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/inbox/conversations/:id',
    tokens: [{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations/:id","type":0,"val":"conversations","end":""},{"old":"/api/v1/inbox/conversations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['inbox_conversations.destroy']['types'],
  },
  'conversation_ownerships.update': {
    methods: ["PUT"],
    pattern: '/api/v1/inbox/conversations/:id/ownership',
    tokens: [{"old":"/api/v1/inbox/conversations/:id/ownership","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations/:id/ownership","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations/:id/ownership","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations/:id/ownership","type":0,"val":"conversations","end":""},{"old":"/api/v1/inbox/conversations/:id/ownership","type":1,"val":"id","end":""},{"old":"/api/v1/inbox/conversations/:id/ownership","type":0,"val":"ownership","end":""}],
    types: placeholder as Registry['conversation_ownerships.update']['types'],
  },
  'owner_conversation_messages.store': {
    methods: ["POST"],
    pattern: '/api/v1/inbox/conversations/:id/messages',
    tokens: [{"old":"/api/v1/inbox/conversations/:id/messages","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations/:id/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations/:id/messages","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations/:id/messages","type":0,"val":"conversations","end":""},{"old":"/api/v1/inbox/conversations/:id/messages","type":1,"val":"id","end":""},{"old":"/api/v1/inbox/conversations/:id/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['owner_conversation_messages.store']['types'],
  },
  'attention_decisions.store': {
    methods: ["POST"],
    pattern: '/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions',
    tokens: [{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"conversations","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":1,"val":"conversationId","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"attention","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":1,"val":"attentionId","end":""},{"old":"/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions","type":0,"val":"decisions","end":""}],
    types: placeholder as Registry['attention_decisions.store']['types'],
  },
  'inbox_events.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/inbox/events',
    tokens: [{"old":"/api/v1/inbox/events","type":0,"val":"api","end":""},{"old":"/api/v1/inbox/events","type":0,"val":"v1","end":""},{"old":"/api/v1/inbox/events","type":0,"val":"inbox","end":""},{"old":"/api/v1/inbox/events","type":0,"val":"events","end":""}],
    types: placeholder as Registry['inbox_events.index']['types'],
  },
  'agent_activities.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/agent-activities',
    tokens: [{"old":"/api/v1/agent-activities","type":0,"val":"api","end":""},{"old":"/api/v1/agent-activities","type":0,"val":"v1","end":""},{"old":"/api/v1/agent-activities","type":0,"val":"agent-activities","end":""}],
    types: placeholder as Registry['agent_activities.index']['types'],
  },
  'owner_briefs.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/owner-briefs',
    tokens: [{"old":"/api/v1/owner-briefs","type":0,"val":"api","end":""},{"old":"/api/v1/owner-briefs","type":0,"val":"v1","end":""},{"old":"/api/v1/owner-briefs","type":0,"val":"owner-briefs","end":""}],
    types: placeholder as Registry['owner_briefs.index']['types'],
  },
  'owner_assistant_messages.store': {
    methods: ["POST"],
    pattern: '/api/v1/owner-assistant/messages',
    tokens: [{"old":"/api/v1/owner-assistant/messages","type":0,"val":"api","end":""},{"old":"/api/v1/owner-assistant/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/owner-assistant/messages","type":0,"val":"owner-assistant","end":""},{"old":"/api/v1/owner-assistant/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['owner_assistant_messages.store']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
