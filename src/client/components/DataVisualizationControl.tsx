import { useEffect, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";
import type { JSX } from "hono/jsx/jsx-runtime";
import { Control } from "ol/control";
import type { SimulationStatus } from "../../epanet/EpanetWrapper";
import {
	type Pressure,
	convert_pressure,
	kpa,
	meter_pressure_head,
	psi,
} from "../../units";
import type MapState from "../state/MapState";

type NodeView = "no-view" | "pressure" | "elevation";
type PressureUnits = "psi" | "kpa" | "m";

function integerInclusiveRange(begin: number, end: number) {
	const output = [];
	for (let i = begin; i <= end; ++i) {
		output.push(i);
	}
	return output;
}

function getOutFn(units: PressureUnits) {
	if (units === "kpa") {
		return kpa;
	}
	if (units === "m") {
		return meter_pressure_head;
	}
	return psi;
}

function DataVisualizationComponent({ mapState }: { mapState: MapState }) {
	const [showLabels, setShowLabels] = useState(true);
	const [nodeView, setNodeView] = useState<NodeView>("no-view");
	const modelPressureUnits: PressureUnits =
		mapState.epanetState.local.getFlowUnits().metric ? "m" : "psi";
	// The creation units don't actually matter because they will always be passed to a conversion function
	const [pressureLow, setPressureLow] = useState(psi(0.0));
	const [pressureHigh, setPressureHigh] = useState(psi(100.0));
	const [pressureUnits, setPressureUnits] =
		useState<PressureUnits>(modelPressureUnits);
	const [simulationResults, setSimulationResults] = useState<
		SimulationStatus[]
	>([]);
	const [hydraulicTimeIndex, setHydraulicTimeIndex] = useState(-1);
	const [hydraulicTimeOptions, setHydraulicTimeOptions] = useState<
		JSX.Element[]
	>([]);

	useEffect(() => {
		let pressureOptions = undefined;
		if (nodeView === "pressure") {
			pressureOptions = {
				low: pressureLow,
				high: pressureHigh,
				unit_fn: getOutFn(pressureUnits),
			};
		}
		mapState.setStyles({
			showLabels,
			pressureOptions,
			data: simulationResults,
			hydraulicTimeIndex,
		});
		return () => {
			//
		};
	}, [
		showLabels,
		pressureLow,
		pressureHigh,
		nodeView,
		pressureUnits,
		simulationResults,
		hydraulicTimeIndex,
		hydraulicTimeOptions,
	]);

	return (
		<div>
			<button
				type="button"
				onClick={() => {
					setNodeView("pressure");
					const results = mapState.epanetState.local.runSimulation();
					console.log("simulationResults:", results);
					setSimulationResults(results);
					setHydraulicTimeIndex(0);
					const hydraulicOptions: JSX.Element[] = [];
					for (let i = 0; i < results.length; ++i) {
						// hTime is progress through the whole simulation, in seconds
						const hTime = results[i].hydraulicTime;
						const totalMinutes = Math.floor(hTime / 60);
						const minutes = totalMinutes % 60;
						const hours = Math.floor((totalMinutes - minutes) / 60);
						const option = (
							<option value={i}>
								{hours}:{String(minutes).padStart(2, "0")}
							</option>
						);
						hydraulicOptions.push(option);
					}
					setHydraulicTimeOptions(hydraulicOptions);
				}}
			>
				Run Hydraulics
			</button>
			<br />
			<label>
				Node Labels{" "}
				<input
					type="checkbox"
					checked={showLabels}
					onClick={() => {
						setShowLabels(!showLabels);
					}}
				/>
			</label>
			<br />
			<select
				value={nodeView}
				onChange={(e) =>
					setNodeView((e.target as HTMLInputElement).value as NodeView)
				}
			>
				<option value="no-view">No View</option>
				<option value="pressure">Pressure</option>
				<option value="elevation">Elevation</option>
			</select>
			<br />
			{nodeView === "pressure" && (
				<>
					<select
						value={hydraulicTimeIndex}
						onChange={(e) => {
							const newIndex = Number((e.target as HTMLOptionElement).value);
							setHydraulicTimeIndex(newIndex);
						}}
					>
						{hydraulicTimeOptions}
					</select>
					<label>
						Low Pressure:{" "}
						<input
							type="number"
							value={convert_pressure(pressureLow, getOutFn(pressureUnits))}
							onChange={(e) => {
								const inputVal = Number((e.target as HTMLInputElement).value);
								setPressureLow(getOutFn(pressureUnits)(inputVal));
							}}
						/>
					</label>
					<br />
					<label>
						High Pressure:{" "}
						<input
							type="number"
							value={convert_pressure(pressureHigh, getOutFn(pressureUnits))}
							onChange={(e) => {
								const inputVal = Number((e.target as HTMLInputElement).value);
								setPressureHigh(getOutFn(pressureUnits)(inputVal));
							}}
						/>
					</label>
					<select
						value={pressureUnits}
						onChange={(e) => {
							const newUnits = (e.target as HTMLOptionElement)
								.value as PressureUnits;
							setPressureUnits(newUnits);
							const newOutFn = getOutFn(newUnits);
							setPressureLow(newOutFn(convert_pressure(pressureLow, newOutFn)));
							setPressureHigh(
								newOutFn(convert_pressure(pressureHigh, newOutFn)),
							);
						}}
					>
						<option value="psi">PSI</option>
						<option value="kpa">kPa</option>
						<option value="m">Meter</option>
					</select>
				</>
			)}
		</div>
	);
}

export default class DataVisualizationControl extends Control {
	constructor(mapState: MapState) {
		const content = document.createElement("div");
		render(<DataVisualizationComponent mapState={mapState} />, content);

		const container = document.createElement("div");
		container.className = "ol-control data-visualization-control";
		container.appendChild(content);

		super({
			element: container,
		});
	}
}
