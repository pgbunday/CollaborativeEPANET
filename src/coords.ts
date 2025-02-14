import proj4 from "proj4";

for (let i = 1; i <= 60; ++i) {
    proj4.defs('utm' + i + 'n', `+proj=utm +zone=${i} +datum=WGS84 +units=m +no_defs +type=crs`);
    proj4.defs('utm' + i + 's', `+proj=utm +zone=${i} +south +datum=WGS84 +units=m +no_defs +type=crs`);
}

// Ported from https://github.com/Turbo87/utm/blob/master/utm/conversion.py
export function getUtmZone(longitude: number, latitude: number): { zone: number, north: boolean } {
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
    return { zone, north: latitude > 0 }
}
