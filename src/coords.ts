import proj4 from "proj4";

for (let i = 1; i <= 60; ++i) {
    proj4.defs('utm' + i + 'n', `+proj=utm +zone=${i} +datum=WGS84 +units=m +no_defs +type=crs`);
    proj4.defs('utm' + i + 's', `+proj=utm +zone=${i} +south +datum=WGS84 +units=m +no_defs +type=crs`);
}

/**Determines the utm zone a given coordinate is in
 * @param longitude the longitude in degrees
 * @param latitude the latitude in degrees
 * @returns the name of the utm zone
 */
// Ported from https://github.com/Turbo87/utm/blob/master/utm/conversion.py
export function getUtmZone(longitude: number, latitude: number): string {
    // Normalize longitude to be in the range [-180, 180)
    longitude = (longitude % 360 + 540) % 360 - 180

    // Not actually possible to get zone 0
    let zone: number = 0;
    // Special zone for Norway
    if (56 <= latitude && latitude < 64 && 3 <= longitude && longitude < 12) {
        zone = 32
    }
    // Special zones for Svalbard
    else if (72 <= latitude && latitude <= 84 && longitude >= 0) {
        if (longitude < 9) {
            zone = 31
        }
        else if (longitude < 21) {
            zone = 33
        } else if (longitude < 33) {
            zone = 35
        } else if (longitude < 42) {
            zone = 37
        }
    } else {
        zone = Math.ceil((longitude + 180) / 6);
    }
    return 'utm' + zone + (latitude > 0 ? "n" : "s");
}

/** Takes utm coords that are xy and zones and transforms them to longitude and latitude.
 * 'EPSG:4326' is a standardized numbering system for coordinate systems.
 * @param utm_coords number array of [x,y] or more arguments
 * @param utm_zone the central area of the zone
 * @returns the longitude and latitute in a number array
 */
export function utmToLongLat(utm_coords: number[], utm_zone: string): number[] {
    return proj4(utm_zone, 'EPSG:4326', utm_coords);
}

/**Takes longitude and latitude coords and transforms them to xy.
 * @param long_lat number array of longitude and latitude degrees
 * @param utm_zone name of the central area of the zone
 * @returns the xy coordinates in a number array
 */
export function longLatToUtm(long_lat: number[], utm_zone: string): number[] {
    return proj4('EPSG:4326', utm_zone, long_lat);
}
