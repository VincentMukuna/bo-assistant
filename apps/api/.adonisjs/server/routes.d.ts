import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'demo_sessions.store': { paramsTuple?: []; params?: {} }
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversation_messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'approval_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'approval_decisions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agent_booking_searches.store': { paramsTuple?: []; params?: {} }
    'agent_booking_reschedules.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.store': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'sessions.destroy': { paramsTuple?: []; params?: {} }
    'customers.index': { paramsTuple?: []; params?: {} }
    'customers.store': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inbox_conversations.index': { paramsTuple?: []; params?: {} }
    'inbox_conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversation_ownerships.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'owner_conversation_messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'attention_decisions.store': { paramsTuple: [ParamValue,ParamValue]; params: {'conversationId': ParamValue,'attentionId': ParamValue} }
    'inbox_events.index': { paramsTuple?: []; params?: {} }
    'agent_activities.index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'approval_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'customers.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inbox_conversations.index': { paramsTuple?: []; params?: {} }
    'inbox_conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inbox_events.index': { paramsTuple?: []; params?: {} }
    'agent_activities.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'conversations.index': { paramsTuple?: []; params?: {} }
    'conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'approval_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'customers.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inbox_conversations.index': { paramsTuple?: []; params?: {} }
    'inbox_conversations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'inbox_events.index': { paramsTuple?: []; params?: {} }
    'agent_activities.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'demo_sessions.store': { paramsTuple?: []; params?: {} }
    'conversations.store': { paramsTuple?: []; params?: {} }
    'conversation_messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'approval_decisions.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'agent_booking_searches.store': { paramsTuple?: []; params?: {} }
    'agent_booking_reschedules.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.store': { paramsTuple?: []; params?: {} }
    'customers.store': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
    'owner_conversation_messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'attention_decisions.store': { paramsTuple: [ParamValue,ParamValue]; params: {'conversationId': ParamValue,'attentionId': ParamValue} }
  }
  DELETE: {
    'sessions.destroy': { paramsTuple?: []; params?: {} }
    'customers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'conversation_ownerships.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}