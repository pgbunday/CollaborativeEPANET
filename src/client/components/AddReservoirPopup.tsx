import { useState } from "hono/jsx";
import { longLatToUtm } from "../../coords.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function AddReservoirPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    ws: WebSocket,
    utm_zone: string,
}) {
    const [elevation, setElevation] = useState(0);
    const [id, setId] = useState("");
    return <form method="post" action={props.project_path + "/add_reservoir"} onSubmit={(e) => e.preventDefault()}>
        <input type="number" name="longitude" value={props.lngLat.lng} hidden={true} />
        <input type="number" name="latitude" value={props.lngLat.lat} hidden={true} />
        <label>ID: <input type="text" name="id" onChange={(e) => setId((e.target as HTMLInputElement).value)} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const utmCoords = longLatToUtm([props.lngLat.lng, props.lngLat.lat], props.utm_zone);
            const toSend: ServerboundPacket = {
                type: "add_reservoir_sb",
                data: {
                    id,
                    x: utmCoords[0],
                    y: utmCoords[1],
                }
            };
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Create</button>
    </form>
}