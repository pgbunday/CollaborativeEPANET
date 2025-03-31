import { Control } from "ol/control";
import type MapState from "../state/MapState";
import { useEffect, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";
import { convert_pressure, kpa, meter_pressure_head, psi, type Pressure } from "../../units";
import { type SimulationStatus } from "../../epanet/EpanetWrapper";
import type { JSX } from "hono/jsx/jsx-runtime";

type NodeView = 'no-view' | 'pressure' | 'elevation';
type PressureUnits = 'psi' | 'kpa' | 'm';

function integerInclusiveRange(begin: number, end: number) {
    const output = [];
    for (let i = begin; i <= end; ++i) {
        output.push(i);
    }
    return output;
}

function getOutFn(units: PressureUnits) {
    if (units == 'kpa') {
        return kpa;
    } else if (units == 'm') {
        return meter_pressure_head;
    } else {
        return psi;
    }
}

function DataVisualizationComponent({ mapState }: { mapState: MapState }) {
    const [showLabels, setShowLabels] = useState(true);
    const [nodeView, setNodeView] = useState<NodeView>('no-view');
    const modelPressureUnits: PressureUnits = mapState.epanetState.local.getFlowUnits().metric ? 'm' : 'psi';
    // The creation units don't actually matter because they will always be passed to a conversion function
    const [pressureLow, setPressureLow] = useState(psi(0.0));
    const [pressureHigh, setPressureHigh] = useState(psi(100.0));
    const [pressureUnits, setPressureUnits] = useState<PressureUnits>(modelPressureUnits);
    const [simulationResults, setSimulationResults] = useState<SimulationStatus[]>([]);
    const [hydraulicTimeIndex, setHydraulicTimeIndex] = useState(-1);

    useEffect(() => {
        let pressureOptions = undefined;
        if (nodeView == 'pressure') {
            pressureOptions = {
                low: pressureLow,
                high: pressureHigh,
                unit_fn: getOutFn(pressureUnits),
            }
        }
        console.log('in useEffect');
        console.log('hydraulicTimeIndex:', hydraulicTimeIndex);
        mapState.setStyles({ showLabels, pressureOptions, data: simulationResults, hydraulicTimeIndex })
        return () => {
            //
        }
    }, [showLabels, pressureLow, pressureHigh, nodeView, pressureUnits, simulationResults, hydraulicTimeIndex])

    let nodeControls;
    if (nodeView == 'pressure') {
        const hydraulicTimeOptions: JSX.Element[] = [];
        simulationResults.entries().map(([i, r]) => {
            const item = <option key={String(i)} value={String(i)}>{r.hydraulicTime}</option>;
            hydraulicTimeOptions.push(item);
        });
        console.log('hydraulicTimeOptions:', hydraulicTimeOptions)
        nodeControls = <>
            <select value={hydraulicTimeIndex} onChange={(e) => {
                const newIndex = Number((e.target as HTMLOptionElement).value);
                setHydraulicTimeIndex(newIndex);
            }}>
                {hydraulicTimeOptions}
            </select>
            <label>Low Pressure: <input type="number" value={convert_pressure(pressureLow, getOutFn(pressureUnits))} onChange={(e) => {
                const inputVal = Number((e.target as HTMLInputElement).value);
                setPressureLow(getOutFn(pressureUnits)(inputVal));
            }} /></label>
            <br />
            <label>High Pressure: <input type="number" value={convert_pressure(pressureHigh, getOutFn(pressureUnits))} onChange={(e) => {
                const inputVal = Number((e.target as HTMLInputElement).value);
                setPressureHigh(getOutFn(pressureUnits)(inputVal));
            }} /></label>
            <select value={pressureUnits} onChange={e => {
                const newUnits = (e.target as HTMLOptionElement).value as PressureUnits;
                setPressureUnits(newUnits);
                const newOutFn = getOutFn(newUnits);
                setPressureLow(newOutFn(convert_pressure(pressureLow, newOutFn)));
                setPressureHigh(newOutFn(convert_pressure(pressureHigh, newOutFn)));
            }}>
                <option value="psi">PSI</option>
                <option value="kpa">kPa</option>
                <option value="m">Meter</option>
            </select>
        </>
    }
    console.log('nodeControls: ', nodeControls);

    return <div>
        <button onClick={() => {
            // openH() and initH() have already been called
            // TODO: synchronize with actual hydraulic state
            // ohhhh there are problems here
            // mapState.epanetState.local gets recreated all the time, so I'll need
            // to somehow keep track of where in the hydraulic simulation is being
            // rendered, and step through to that point if hydraulics were closed.
            //
            // Current implementation may not have that issue, but I'll leave the
            // above comments just in case
            setNodeView('pressure');
            const results = mapState.epanetState.local.runSimulation();
            console.log('simulationResults:', results);
            setSimulationResults(results);
            setHydraulicTimeIndex(0);
        }}>Run Hydraulics</button>
        <br />
        <label>Node Labels <input type="checkbox" checked={showLabels} onClick={() => {
            setShowLabels(!showLabels);
        }} /></label>
        <br />
        <select value={nodeView} onChange={e => setNodeView((e.target as HTMLInputElement).value as NodeView)} >
            <option value="no-view">No View</option>
            <option value="pressure">Pressure</option>
            <option value="elevation">Elevation</option>
        </select>
        <br />
        {nodeControls}
    </div>
}

export default class DataVisualizationControl extends Control {
    constructor(mapState: MapState) {
        const content = document.createElement('div');
        render(<DataVisualizationComponent mapState={mapState} />, content)

        const container = document.createElement('div');
        container.className = 'ol-control data-visualization-control';
        container.appendChild(content);

        super({
            element: container,
        });
    }
}
