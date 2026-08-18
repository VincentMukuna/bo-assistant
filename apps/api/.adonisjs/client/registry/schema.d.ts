/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'demo_chat': {
    methods: ["POST"]
    pattern: '/api/v1/demo/chat'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/demo_chat_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/demo_chat_controller').default['handle']>>>
    }
  }
  'agent_bookings.find': {
    methods: ["POST"]
    pattern: '/api/v1/agent/bookings/find'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_bookings_controller').default['find']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_bookings_controller').default['find']>>>
    }
  }
  'agent_bookings.reschedule': {
    methods: ["POST"]
    pattern: '/api/v1/agent/bookings/reschedule'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/agent_bookings_controller').default['reschedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/agent_bookings_controller').default['reschedule']>>>
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
}
