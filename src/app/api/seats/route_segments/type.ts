// src/app/api/seats/route_segments/types.ts
export interface StationSegment {
  from_station_id: number;
  to_station_id: number;
}

export type GetStationSegments = (
  trainID: number,
  fromStationId: number,
  toStationId: number
) => Promise<StationSegment[]>;

export interface SeatAvailability {
  seat_number: string;
  is_available: boolean;
}

export interface CoachSeats {
  coach: string;
  seat_numbers: SeatAvailability[];
}

export interface SeatTypeResult {
  seat_type: string;
  available: number;
  price: number;
  coaches: CoachSeats[];
}
