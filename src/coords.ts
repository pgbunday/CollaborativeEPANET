
import { addCoordinateTransforms, addProjection, getTransform, Projection, transform } from "ol/proj.js";

const wgs84 = 'EPSG:4326';

for (let i = 1; i <= 60; ++i) {
    const northEpsg = 'EPSG:326' + String(i).padStart(2, '0');
    const southEpsg = 'EPSG:327' + String(i).padStart(2, '0');
    const northUtmToLongLat = getTransform(northEpsg, wgs84);
    const northLongLatToUtm = getTransform(wgs84, northEpsg);
    const southUtmToLongLat = getTransform(southEpsg, wgs84);
    const southLongLatToUtm = getTransform(wgs84, southEpsg);
    addProjection(new Projection({
        code: 'utm' + i + 'n',
    }));
    addCoordinateTransforms('utm' + i + 'n', wgs84, northUtmToLongLat, northLongLatToUtm);
    addProjection(new Projection({
        code: 'utm' + i + 's'
    }));
    addCoordinateTransforms('utm' + i + 's', wgs84, southUtmToLongLat, southLongLatToUtm);
}

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

export function utmToLongLat(utm_coords: number[], utm_zone: string): number[] {
    return transform(utm_coords, utm_zone, wgs84);
}

export function longLatToUtm(long_lat: number[], utm_zone: string): number[] {
    return transform(long_lat, wgs84, utm_zone);
}
