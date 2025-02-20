import { useState } from "hono/jsx";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function JunctionPropertiesPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    ws: WebSocket,
    elevation: number,
    id: string,
}) {
    const [elevation, setElevation] = useState(props.elevation);
    return <form method="post" action={props.project_path + "/add_tank"} onSubmit={(e) => e.preventDefault()}>
        <label>Elevation: <input type="number" name="elevation" value={props.elevation} onChange={(e) => { setElevation(Number((e.target as HTMLInputElement).value)) }} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "junction_properties_sb",
                data: {
                    old_id: props.id,
                    new_id: props.id,
                    elevation,
                }
            };
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Update</button>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "delete_junction_sb",
                id: props.id,
            };
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Delete</button>
    </form >
}