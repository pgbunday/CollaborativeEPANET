import { useState } from "hono/jsx";
import { longLatToUtm } from "../../coords.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";
import type { Coordinate } from "ol/coordinate.js";

export default function AddJunctionPopup(props: {
    lngLat: Coordinate,
    project_path: string,
    applyAndSendChange: (msg: ServerboundPacket) => void,
    utm_zone: string,
    remove: () => void,
}) {
    const [z, setZ] = useState(0);
    const [id, setId] = useState("");
    return <form method="post" action={props.project_path + "/add_junction"} onSubmit={(e) => {
        e.preventDefault();
    }}>
        <input type="number" name="lng" value={props.lngLat[0]} hidden={true} />
        <input type="number" name="lat" value={props.lngLat[1]} hidden={true} />
        <label>ID: <input type="text" name="id" onChange={(e) => { setId((e.target as HTMLInputElement).value); }} /></label>
        <label>Elevation: <input type="number" name="z" onChange={(e) => setZ(Number((e.target as HTMLInputElement).value))} /></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const utm_coords = longLatToUtm([props.lngLat[0], props.lngLat[1]], props.utm_zone);
            const toSend: ServerboundPacket = {
                type: "epanet_action_sb",
                data: {
                    type: "add_junction_action",
                    id,
                    x: utm_coords[0],
                    y: utm_coords[1],
                    elevation: z,
                }
            }
            props.applyAndSendChange(toSend);
            props.remove();
        }}>Create</button>
    </form >
}