import { Control } from "ol/control";
import type MapState from "../state/MapState";
import { useEffect, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";

type NodeView = 'no-view' | 'pressure' | 'elevation';

function DataVisualizationComponent({ mapState }: { mapState: MapState }) {
    const [showLabels, setShowLabels] = useState(true);
    const [pressureLow, setPressureLow] = useState(0.0);
    const [pressureHigh, setPressureHigh] = useState(100.0);
    const [nodeView, setNodeView] = useState<NodeView>('no-view');

    useEffect(() => {
        let pressureOptions = undefined;
        if (nodeView == 'pressure') {
            pressureOptions = {
                low: pressureLow,
                high: pressureHigh,
            }
        }
        mapState.setNodeStyles({ showLabels, pressureOptions })
        return () => {
            //
        }
    }, [showLabels, pressureLow, pressureHigh, nodeView])

    let nodeControls;
    if (nodeView == 'pressure') {
        nodeControls = <>
            <label>Low Pressure: <input type="number" value={pressureLow} onChange={(e) => setPressureLow(Number((e.target as HTMLInputElement).value))} /></label>
            <br />
            <label>High Pressure: <input type="number" value={pressureHigh} onChange={(e) => setPressureHigh(Number((e.target as HTMLInputElement).value))} /></label>
        </>
    }

    return <div>
        <button onClick={() => {
            // openH() and initH() have already been called
            // TODO: synchronize with actual hydraulic state
            // ohhhh there are problems here
            // mapState.epanetState.local gets recreated all the time
            mapState.epanetState.local.solveH();
            setNodeView('pressure');
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

        content.addEventListener('click', () => console.log('data viz control clicked'));
    }
}
