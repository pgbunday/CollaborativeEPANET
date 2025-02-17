import { useState } from "hono/jsx";
import type { ClientActionsSchema } from "../../epanet_types.js";
import { longLatToUtm } from "../../coords.js";
import type { DbProjectSchema } from "../../db_project.js";

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
        {/* The next two inputs have ts-ignore because e.target.value is type
        checked as undefined, even though it should always be valid. ts-ignore
        is safe */}
        <label>ID: <input type="text" name="id" onChange={(e) => { setId(e.target.value); }} /></label>
        {/* @ts-ignore */}
        <label>Elevation: <input type="number" name="z" onChange={(e) => setZ(Number(e.target.value))} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const utm_coords = longLatToUtm([props.lngLat.lng, props.lngLat.lat], props.utm_zone);
            const toSend: ClientActionsSchema = {
                type: "add_junction",
                id,
                x: utm_coords[0],
                y: utm_coords[1],
                elevation: z,
            }
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Create</button>
    </form >
}