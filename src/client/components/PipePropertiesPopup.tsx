import { useState } from "hono/jsx";
import type { Coordinate } from "ol/coordinate.js";
import { LinkStatus } from "../../packets/common.js";
import type { ServerboundPacket } from "../../packets/serverbound.js";

export default function PipePropertiesPopup(props: {
	lngLat: Coordinate;
	project_path: string;
	length: number;
	diameter: number;
	roughness: number;
	loss_coefficient: number;
	initial_status: LinkStatus;
	id: string;
	applyAndSendChange: (msg: ServerboundPacket) => void;
	remove: () => void;
}) {
	const [length, setLength] = useState(props.length);
	const [diameter, setDiameter] = useState(props.diameter);
	const [roughness, setRoughness] = useState(props.roughness);
	const [lossCoefficient, setLossCoefficient] = useState(
		props.loss_coefficient,
	);
	const [initialStatus, setInitialStatus] = useState(props.initial_status);
	return (
		<form
			method="post"
			action={`${props.project_path}/add_tank`}
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
				Length:{" "}
				<input
					type="number"
					name="length"
					value={props.length}
					onChange={(e) => {
						setLength(Number((e.target as HTMLInputElement).value));
					}}
				/>
			</label>
			<label>
				Diameter:{" "}
				<input
					type="number"
					name="diameter"
					value={props.diameter}
					onChange={(e) => {
						setDiameter(Number((e.target as HTMLInputElement).value));
					}}
				/>
			</label>
			<label>
				Roughness:{" "}
				<input
					type="number"
					name="roughness"
					value={props.roughness}
					onChange={(e) => {
						setRoughness(Number((e.target as HTMLInputElement).value));
					}}
				/>
			</label>
			<label>
				Loss Coefficient:{" "}
				<input
					type="number"
					name="lossCoefficient"
					value={props.loss_coefficient}
					onChange={(e) => {
						setLossCoefficient(Number((e.target as HTMLInputElement).value));
					}}
				/>
			</label>
			{/* TODO:  display the actual default, not just always Open */}
			<label>
				Initial Status:{" "}
				<select
					name="initialStatus"
					value={props.initial_status}
					onChange={(e) => {
						setInitialStatus(
							LinkStatus.parse((e.target as HTMLInputElement).value),
						);
					}}
				>
					<option value="open">Open</option>
					<option value="closed">Closed</option>
				</select>
			</label>
			<button
				type="submit"
				onClick={async (e) => {
					e.preventDefault();
					const toSend: ServerboundPacket = {
						type: "epanet_action_sb",
						data: {
							type: "set_pipe_properties_action",
							old_id: props.id,
							new_id: props.id,
							diameter,
							initial_status: initialStatus,
							length,
							loss_coefficient: lossCoefficient,
							roughness,
						},
					};
					props.applyAndSendChange(toSend);
					props.remove();
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
							type: "delete_pipe_action",
							id: props.id,
						},
					};
					props.applyAndSendChange(toSend);
					props.remove();
				}}
			>
				Delete
			</button>
		</form>
	);
}
