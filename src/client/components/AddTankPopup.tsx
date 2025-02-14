import { useState } from "hono/jsx";
import type { ClientActionsSchema } from "../../epanet_types.js";

export default function AddTankPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    ws: WebSocket,
}) {
    const [elevation, setElevation] = useState(0);
    const [id, setId] = useState("");
    return <form method="post" action={props.project_path + "/add_tank"} onSubmit={(e) => e.preventDefault()}>
        <input type="number" name="longitude" value={props.lngLat.lng} hidden={true} />
        <input type="number" name="latitude" value={props.lngLat.lat} hidden={true} />
        {/* The next two inputs have ts-ignore because e.target.value is type
        checked as undefined, even though it should always be valid. ts-ignore
        is safe. */}
        {/* @ts-ignore */}
        <label>ID: <input type="text" name="id" onChange={(e) => setId(e.target.value)} /></label>
        {/* @ts-ignore */}
        <label>Elevation: <input type="number" name="elevation" onChange={(e) => setElevation(Number(e.target.value))} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ClientActionsSchema = {
                type: "add_tank",
                id,
                longitude: props.lngLat.lng,
                latitude: props.lngLat.lat,
                elevation,
            };
            props.ws.send(JSON.stringify(toSend));
            console.log('Sent add_tank');
            props.popup.remove();
        }}>Create</button>
    </form>
}