import { useState } from "hono/jsx";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function JunctionPropertiesPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    elevation: number,
    id: string,
    applyAndSendChange: (msg: ServerboundPacket) => void,
}) {
    const [elevation, setElevation] = useState(props.elevation);
    return <form method="post" action={props.project_path + "/add_tank"} onSubmit={(e) => e.preventDefault()}>
        <label>Elevation: <input type="number" name="elevation" value={props.elevation} onChange={(e) => { setElevation(Number((e.target as HTMLInputElement).value)) }} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "epanet_action_sb",
                data: {
                    type: "set_junction_properties_action",
                    old_id: props.id,
                    new_id: props.id,
                    elevation,
                }
            };
            props.applyAndSendChange(toSend);
            props.popup.remove();
        }}>Update</button>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "epanet_action_sb",
                data: {
                    type: "delete_junction_action",
                    id: props.id,
                }
            };
            props.applyAndSendChange(toSend);
            props.popup.remove();
        }}>Delete</button>
    </form >
}