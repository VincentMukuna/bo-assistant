import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
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
  }
  GET: {
    'profile.show': { paramsTuple?: []; params?: {} }
    'customers.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.show': { paramsTuple?: []; params?: {} }
    'customers.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.index': { paramsTuple?: []; params?: {} }
    'bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.sessions.store': { paramsTuple?: []; params?: {} }
    'customers.store': { paramsTuple?: []; params?: {} }
    'bookings.store': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'sessions.destroy': { paramsTuple?: []; params?: {} }
    'customers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}