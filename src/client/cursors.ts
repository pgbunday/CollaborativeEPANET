import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { MouseMoveCb } from "../packets/clientbound.js";
import type { GeoJSONSource } from "maplibre-gl";

const geojson: FeatureCollection<Geometry, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: [],
};

// TODO: find the bottleneck for cursors. I'm guessing it's GeoJSON. Maplibre
// may not be optimized for GeoJSON source updates 60 times per second, so
// instead, cut out Maplibre from the rendering portion. I can use only
// important functionality, like map.getBounds() to tell if a cursor is within
// bounds, and if so, render that cursor as an absolutely positioned element
// with a z-index over the map.
// https://maplibre.org/maplibre-native/docs/book/design/coordinate-system.html
// see above link for coordinate system info. should get me most of the way there.

// Thankfully, I was wrong! I completely missed the clone() call in applySynced,
// which always ran whether or not the received message was a mouse move. Now that
// logic is placed at the end of the private apply() function instead.

export function handleMouseMovePacket(mouse_move: MouseMoveCb, map: maplibregl.Map) {
    let existing = false;
    map
    for (const feature of geojson.features) {
        if (feature.properties?.user_id == mouse_move.user_id) {
            existing = true;
            feature.geometry = {
                type: "Point",
                coordinates: [mouse_move.longitude, mouse_move.latitude],
            }
            break;
        }
    }
    if (!existing) {
        geojson.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [mouse_move.longitude, mouse_move.latitude],
            },
            properties: {
                user_id: mouse_move.user_id,
                username: mouse_move.username,
            }
        });
    }
    (map.getSource('cursors-source') as GeoJSONSource).setData(geojson);
}
