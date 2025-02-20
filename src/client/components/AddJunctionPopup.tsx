import { useState } from "hono/jsx";
import { longLatToUtm } from "../../coords.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function AddJunctionPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    ws: WebSocket,
    utm_zone: string,
}) {
    const [z, setZ] = useState(0);
    const [id, setId] = useState("");
    return <form method="post" action={props.project_path + "/add_junction"} onSubmit={(e) => {
        e.preventDefault();
    }}>
        <input type="number" name="lng" value={props.lngLat.lng} hidden={true} />
        <input type="number" name="lat" value={props.lngLat.lat} hidden={true} />
        <label>ID: <input type="text" name="id" onChange={(e) => { setId((e.target as HTMLInputElement).value); }} /></label>
        <label>Elevation: <input type="number" name="z" onChange={(e) => setZ(Number((e.target as HTMLInputElement).value))} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const utm_coords = longLatToUtm([props.lngLat.lng, props.lngLat.lat], props.utm_zone);
            const toSend: ServerboundPacket = {
                type: "add_junction_sb",
                data: {
                    id,
                    x: utm_coords[0],
                    y: utm_coords[1],
                    elevation: z,
                }
            }
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Create</button>
    </form >
}