export type GpsStatus = 'online' | 'offline' | 'suspicious'

export interface GpsPing {
  id: string
  salesmanId: string
  salesmanName: string
  lat: number
  lng: number
  /** ISO timestamp of when the ping was recorded. */
  timestamp: string
  speedKmh: number
  /** Reported GPS accuracy in metres (0 = no fix / spoofed). */
  accuracy: number
  /** Device reported a mock-location provider. */
  mockProvider: boolean
  status: GpsStatus
}

export interface FakeLocationAlert {
  id: string
  salesmanId: string
  salesmanName: string
  timestamp: string
  lat: number
  lng: number
  /** Human-readable heuristics that flagged this ping. */
  reasons: string[]
  status: 'suspicious'
}
