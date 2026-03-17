export type StationRecord = {
  StationId: number;
  StationCode: string;
  StationName: string;
  StationType: number;
  Address: string;
  StationOrder: number;
  StationDirection: number;
  RouteId: number;
  Lat: number;
  Lng: number;
  pathPoints: string;
};

export type RouteSchedule = {
  RouteId: number;
  RouteNo: string;
  RouteName: string;
  RouteType: number;
  TimeTableIn: string;
  TimeTableOut: string;
};

export type RouteInfo = {
  RouteId: number;
  RouteNo: string;
  RouteName: string;
  Orgs: string;
  OutBoundDescription: string;
  InBoundDescription: string;
  NormalTicket: string;
  Headway: string;
  OperationTime: string;
  Type: string;
  TimeOfTrip: string;
  TotalTrip: string;
};

export type GroupedStation = {
  key: string;
  lat: number;
  lng: number;
  stationNames: string[];
  addresses: string[];
  routeIds: number[];
};
