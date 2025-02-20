import { useState } from "hono/jsx";
import { LinkStatus } from "../../packets/common.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function PipePropertiesPopup(props: {
    lngLat: maplibregl.LngLat,
    popup: maplibregl.Popup,
    project_path: string,
    ws: WebSocket,
    length: number,
    diameter: number,
    roughness: number,
    loss_coefficient: number,
    initial_status: LinkStatus,
    id: string,
}) {
    const [length, setLength] = useState(props.length);
    const [diameter, setDiameter] = useState(props.diameter);
    const [roughness, setRoughness] = useState(props.roughness);
    const [lossCoefficient, setLossCoefficient] = useState(props.loss_coefficient);
    const [initialStatus, setInitialStatus] = useState(props.initial_status);
    return <form method="post" action={props.project_path + "/add_tank"} onSubmit={(e) => e.preventDefault()}>
        <input type="number" name="longitude" value={props.lngLat.lng} hidden={true} />
        <input type="number" name="latitude" value={props.lngLat.lat} hidden={true} />
        <label>Length: <input type="number" name="length" value={props.length} onChange={(e) => { setLength(Number((e.target as HTMLInputElement).value)) }} /></label>
        <label>Diameter: <input type="number" name="diameter" value={props.diameter} onChange={(e) => { setDiameter(Number((e.target as HTMLInputElement).value)) }} /></label>
        <label>Roughness: <input type="number" name="roughness" value={props.roughness} onChange={(e) => { setRoughness(Number((e.target as HTMLInputElement).value)) }} /></label>
        <label>Loss Coefficient: <input type="number" name="lossCoefficient" value={props.loss_coefficient} onChange={(e) => { setLossCoefficient(Number((e.target as HTMLInputElement).value)) }} /></label>
        {/* TODO:  display the actual default, not just always Open */}
        <label>Initial Status: <select name="initialStatus" value={props.initial_status} onChange={(e) => { setInitialStatus(LinkStatus.parse((e.target as HTMLInputElement).value)) }}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
        </select></label>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "pipe_properties_sb",
                data: {
                    old_id: props.id,
                    new_id: props.id,
                    diameter,
                    initial_status: initialStatus,
                    length,
                    loss_coefficient: lossCoefficient,
                    roughness,
                }
            };
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Update</button>
        <button type="submit" onClick={async (e) => {
            e.preventDefault();
            const toSend: ServerboundPacket = {
                type: "delete_pipe_sb",
                id: props.id,
            };
            props.ws.send(JSON.stringify(toSend));
            props.popup.remove();
        }}>Delete</button>
    </form>
}