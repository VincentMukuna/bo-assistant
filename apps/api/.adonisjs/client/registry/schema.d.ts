/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'demo_sessions.store': {
    methods: ["POST"]
    pattern: '/api/v1/demo/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/demo_sessions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/demo_sessions_controller').default['store']>>>
    }
  }
  'conversations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/support/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['index']>>>
    }
  }
  'conversations.store': {
    methods: ["POST"]
    pattern: '/api/v1/support/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['store']>>>
    }
  }
  'conversations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/support/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/support_conversations_controller').default['show']>>>
    }
  }
  'conversation_messages.store': {
    methods: ["POST"]
    pattern: '/api/v1/support/conversations/:id/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/support').createConversationMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/support').createConversationMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversation_messages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversation_messages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'approval_requests.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/support/conversations/:id/approval-request'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/approval_requests_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/approval_requests_controller').default['show']>>>
    }
  }
  'approval_decisions.store': {
    methods: ["POST"]
    pattern: '/api/v1/support/conversations/:id/approval-decisions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/support').createApprovalDecisionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/support').createApprovalDecisionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/approval_decisions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/approval_decisions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'agent_booking_searches.store': {
    methods: ["POST"]
    pattern: '/api/v1/agent/booking-searches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_booking_searches_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_booking_searches_controller').default['store']>>>
    }
  }
  'agent_booking_reschedules.store': {
    methods: ["POST"]
    pattern: '/api/v1/agent/booking-reschedules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_booking_reschedules_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_booking_reschedules_controller').default['store']>>>
    }
  }
  'agent_booking_creations.store': {
    methods: ["POST"]
    pattern: '/api/v1/agent/booking-creations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_booking_creations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_booking_creations_controller').default['store']>>>
    }
  }
  'auth.sessions.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'sessions.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['destroy']>>>
    }
  }
  'customers.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/customers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['index']>>>
    }
  }
  'customers.store': {
    methods: ["POST"]
    pattern: '/api/v1/customers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/customer').createCustomerValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/customer').createCustomerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'customers.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/customers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['show']>>>
    }
  }
  'customers.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/customers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/customer').updateCustomerValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/customer').updateCustomerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'customers.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/customers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['destroy']>>>
    }
  }
  'bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['index']>>>
    }
  }
  'bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['show']>>>
    }
  }
  'bookings.update': {
    methods: ["PUT","PATCH"]
    pattern: '/api/v1/bookings/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').updateBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').updateBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'bookings.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/bookings_controller').default['destroy']>>>
    }
  }
  'inbox_conversations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/inbox/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workspace_conversations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workspace_conversations_controller').default['index']>>>
    }
  }
  'inbox_conversations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/inbox/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workspace_conversations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workspace_conversations_controller').default['show']>>>
    }
  }
  'conversation_ownerships.update': {
    methods: ["PUT"]
    pattern: '/api/v1/inbox/conversations/:id/ownership'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/inbox').updateConversationOwnershipValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/inbox').updateConversationOwnershipValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/conversation_ownerships_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/conversation_ownerships_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'owner_conversation_messages.store': {
    methods: ["POST"]
    pattern: '/api/v1/inbox/conversations/:id/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/inbox').createOwnerMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/inbox').createOwnerMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/owner_conversation_messages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/owner_conversation_messages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'attention_decisions.store': {
    methods: ["POST"]
    pattern: '/api/v1/inbox/conversations/:conversationId/attention/:attentionId/decisions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/inbox').createAttentionDecisionValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { conversationId: ParamValue; attentionId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/inbox').createAttentionDecisionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/attention_decisions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/attention_decisions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'inbox_events.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/inbox/events'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/inbox_events_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/inbox_events_controller').default['index']>>>
    }
  }
  'agent_activities.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/agent-activities'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_activities_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_activities_controller').default['index']>>>
    }
  }
}
