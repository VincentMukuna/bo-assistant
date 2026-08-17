/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
