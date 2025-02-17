import { useState } from "hono/jsx";
import type { ClientActionsSchema } from "../../epanet_types.js";
import { longLatToUtm } from "../../coords.js";

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

        {/* The next input has ts-ignore because e.target.value is type checked
        as undefined, even though it should always be valid. ts-ignore is safe */}
        {/* @ts-ignore */}
        <label>ID: <input type="text" name="id" onChange={(e) => setId(e.target!.value)} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const utmCoords = longLatToUtm([props.lngLat.lng, props.lngLat.lat], props.utm_zone);
            const toSend: ClientActionsSchema = {
                type: "add_reservoir",
                id,
                x: utmCoords[0],
                y: utmCoords[1],
            };
            props.ws.send(JSON.stringify(toSend));
            console.log('Sent add_reservoir');
            props.popup.remove();
        }}>Create</button>
    </form>
}