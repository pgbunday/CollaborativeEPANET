import { useState } from "hono/jsx";
import type { Coordinate } from "ol/coordinate.js";
import { longLatToUtm } from "../../coords.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function AddReservoirPopup(props: {
	lngLat: Coordinate;
	project_path: string;
	applyAndSendChange: (msg: ServerboundPacket) => void;
	utm_zone: string;
	remove: () => void;
}) {
	const [elevation, setElevation] = useState(0);
	const [id, setId] = useState("");
	return (
		<form
			method="post"
			action={`${props.project_path}/add_reservoir`}
			onSubmit={(e) => e.preventDefault()}
		>
			<input
				type="number"
				name="longitude"
				value={props.lngLat[0]}
				hidden={true}
			/>
			<input
				type="number"
				name="latitude"
				value={props.lngLat[1]}
				hidden={true}
			/>
			<label>
				ID:{" "}
				<input
					type="text"
					name="id"
					onChange={(e) => setId((e.target as HTMLInputElement).value)}
				/>
			</label>
			<button
				type="submit"
				onClick={async (e) => {
					e.preventDefault();
					const utmCoords = longLatToUtm(
						[props.lngLat[0], props.lngLat[1]],
						props.utm_zone,
					);
					const toSend: ServerboundPacket = {
						type: "epanet_action_sb",
						data: {
							type: "add_reservoir_action",
							id,
							x: utmCoords[0],
							y: utmCoords[1],
						},
					};
					props.applyAndSendChange(toSend);
					props.remove();
				}}
			>
				Create
			</button>
		</form>
	);
}
