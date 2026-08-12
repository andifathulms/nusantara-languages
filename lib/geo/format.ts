import type { Position } from './types'

/**
 * Coordinates for reading, in the cartographic convention: hemisphere letters rather than a
 * minus sign, longitude first because that is the order the data is stored in.
 *
 * The order is stated in the parameter name and the output is labelled, so `[lon, lat]`
 * cannot be silently misread as `[lat, lon]` at this boundary either.
 */
export function formatCoordinate([lon, lat]: Position, decimals = 4): string {
  const eastWest = lon < 0 ? 'W' : 'E'
  const northSouth = lat < 0 ? 'S' : 'N'
  return `${Math.abs(lon).toFixed(decimals)}°${eastWest}, ${Math.abs(lat).toFixed(decimals)}°${northSouth}`
}
