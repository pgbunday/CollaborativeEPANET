import { useState } from "hono/jsx";
import type { Coordinate } from "ol/coordinate";
import type { ServerboundPacket } from "../../packets/serverbound";

export default function ReservoirPropertiesPopup({
	lngLat,
	project_path,
	id,
	total_head,
	applyAndSendChange,
	remove,
}: {
	lngLat: Coordinate;
	project_path: string;
	id: string;
	total_head: number;
	applyAndSendChange: (msg: ServerboundPacket) => void;
	remove: () => void;
}) {
	const [totalHead, setTotalHead] = useState(total_head);
	return (
		<form
			method="post"
			action={`${project_path}/reservoir_properties`}
			onSubmit={(e) => e.preventDefault()}
		>
			<label>
				Total Head:{" "}
				<input
					type="number"
					name="total_head"
					value={totalHead}
					onChange={(e) =>
						setTotalHead(Number((e.target as HTMLInputElement).value))
					}
				/>
			</label>
			<button
				type="submit"
				onClick={async (e) => {
					e.preventDefault();
					const toSend: ServerboundPacket = {
						type: "epanet_action_sb",
						data: {
							type: "set_reservoir_properties_action",
							new_id: id,
							old_id: id,
							total_head: totalHead,
						},
					};
					applyAndSendChange(toSend);
					remove();
				}}
			>
				Update
			</button>
			<button
				type="submit"
				onClick={async (e) => {
					e.preventDefault();
					const toSend: ServerboundPacket = {
						type: "epanet_action_sb",
						data: {
							type: "delete_reservoir_action",
							id,
						},
					};
					applyAndSendChange(toSend);
					remove();
				}}
			>
				Delete
			</button>
		</form>
	);
}
