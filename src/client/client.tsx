
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import "./client.css"
import { render, useRef, useState, type RefObject } from 'hono/jsx/dom';
import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import '@maptiler/geocoding-control/style.css';
import { EpanetChangeSchema, type ClientActionsSchema } from '../epanet_types.js';
import { z } from 'zod';
import { SyncState } from './sync.js';
import AddJunctionPopup from './components/AddJunctionPopup.js';
import AddReservoirPopup from './components/AddReservoirPopup.js';
import proj4 from 'proj4';
import AddTankPopup from './components/AddTankPopup.js';
import PipePropertiesPopup from './components/PipePropertiesPopup.js';
import { longLatToUtm } from '../coords.js';

proj4.defs('utm15n', '+proj=utm +zone=15 +datum=WGS84 +units=m +no_defs +type=crs');
console.log(proj4('EPSG:4326', 'utm15n', [-90.8889, 14.7416]));

const metaLatitude = document.querySelector('meta[name="map-center-lat"]')?.getAttribute('value');
const metaLongitude = document.querySelector('meta[name="map-center-lng"]')?.getAttribute('value');
const metaZoom = document.querySelector('meta[name="map-zoom"]')?.getAttribute('value');
const metaProjectName = document.querySelector('meta[name="project-name"]')?.getAttribute('value');
const metaUtmZone = document.querySelector('meta[name="utm-zone"]')?.getAttribute('value');
const utm_zone = String(metaUtmZone);


// Some non-React globals: store at least the project URL and UUID for use in
// fetch requests, without needing to pass them everywhere
const project_url = document.location.href;
const project_path = document.location.pathname;
const [_, project_uuid] = project_url.split('/projects/');


const syncState = new SyncState(utm_zone);

const ws = new WebSocket(project_path + '/ws');
ws.onopen = () => {
    console.log('ws opened');
}
ws.onerror = (e) => {
    console.log('ws error:', e);
}
ws.onclose = (e) => {
    console.log('ws closed:', e);
}
const noMessageHandlerQueue: any[] = [];
ws.onmessage = (e) => {
    // On start, a fake message handler just stores data. The real message
    // handler is set at the end of map.on('load', () => ...), so that any
    // actions that use map layers work properly. All messages in the queue
    // are handled first.
    noMessageHandlerQueue.push(e.data);
}

const map = new maplibregl.Map({
    container: 'map',
    center: [Number(metaLongitude), Number(metaLatitude)],
    zoom: Number(metaZoom),
    style: {
        version: 8,
        sources: {
            'satellite': {
                type: 'raster',
                attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
                tiles: ['/tiles/satellite/{z}/{x}/{y}.jpg'],
                tileSize: 512,
            }
        },
        layers: [
            {
                id: 'satellite',
                source: 'satellite',
                type: 'raster',
            }
        ],
    },
});

// TODO: if using icons from iconoir, also change color?
// But most likely, do a bit of drawing to make my own. Scrap this stuff.
async function renderSvgData(embed_url: string, width: number, height: number): Promise<ImageBitmap> {
    const [_, svgBase64] = embed_url.split('base64,');
    const svgText = atob(svgBase64);
    // div is used to switch between SVG DOM node and innerHTML (text).
    const div = document.createElement('div');
    div.innerHTML = svgText.trim();
    const circleSvg = div.lastElementChild!;
    // Set width and height to respective values
    circleSvg.setAttribute('width', `${width}px`);
    circleSvg.setAttribute('height', `${height}px`);

    const biggerSvgText = div.innerHTML;
    const biggerSvgBase64 = btoa(biggerSvgText);
    const biggerDataUrl = `data:image/svg+xml;base64,${biggerSvgBase64}`;
    console.log('biggerDataUrl:', biggerDataUrl);
    const elem = new Image();
    elem.src = biggerDataUrl;
    return await new Promise((resolve) => {
        elem.addEventListener('load', async () => {
            const bitmap = await createImageBitmap(elem);
            resolve(bitmap);
        })
    });
}

class AddPipeState {
    start_id: string
    end_id: string
    intermediate_coordinates: {
        longitude: number,
        latitude: number,
    }[]
    constructor(start_id: string) {
        this.start_id = start_id;
        this.end_id = '';
        this.intermediate_coordinates = [];
    }
    start(start_id: string) {
        this.start_id = start_id;
    }
    addPoint(longitude: number, latitude: number) {
        this.intermediate_coordinates.push({ longitude, latitude });
    }
    finish(end_id: string) {
        this.end_id = end_id;
    }
}

let addPipeState = new AddPipeState('');

map.on('load', async (e) => {
    const gc = new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY, maplibregl });
    map.addControl(gc);

    // From https://iconoir.com/ , Shapes: circle. Copy download link
    const circleDataUrl = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHN0cm9rZS13aWR0aD0iMS41IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgY29sb3I9IiMwMDAwMDAiPjxwYXRoIGQ9Ik0xMiAyMkMxNy41MjI4IDIyIDIyIDE3LjUyMjggMjIgMTJDMjIgNi40NzcxNSAxNy41MjI4IDIgMTIgMkM2LjQ3NzE1IDIgMiA2LjQ3NzE1IDIgMTJDMiAxNy41MjI4IDYuNDc3MTUgMjIgMTIgMjJaIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=';
    const circleBitmap = await renderSvgData(circleDataUrl, 256, 256);
    map.addImage('circle', circleBitmap);
    map.addSource('junctions-source', {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: [],
        },
        cluster: false,
    })
    map.addLayer({
        id: 'junctions-layer',
        type: "symbol",
        source: 'junctions-source',
        layout: {
            'icon-image': 'circle',
            'icon-size': 0.2,
            'icon-allow-overlap': true,
        }
    })
    map.on('click', 'junctions-layer', (e) => {
        e.preventDefault();
        if (!e.features || e.features.length != 1) {
            return;
        }
        switch (clickMode) {
            case "add_pipe":
                try {
                    //
                    if (addPipeState.start_id == '') {
                        addPipeState.start(e.features[0].properties.id);
                    } else {
                        addPipeState.finish(e.features[0].properties.id);
                        const vertices = [];
                        for (const latLng of addPipeState.intermediate_coordinates) {
                            const utmCoords = longLatToUtm([latLng.longitude, latLng.latitude], utm_zone);
                            vertices.push({ x: utmCoords[0], y: utmCoords[1] });
                            // vertices.push({ x: latLng.longitude, y: latLng.latitude });
                        }
                        // Auto length algorithm: either find the distance between start and finish,
                        // or start and first intermediate, plus last intermediate and finish, plus
                        // all the intermediate lengths
                        let length = 0;
                        const startCoords = syncState.getNodeCoords(addPipeState.start_id);
                        const endCoords = syncState.getNodeCoords(addPipeState.end_id);
                        if (vertices.length == 0) {
                            const xDiff = startCoords.x - endCoords.x;
                            const yDiff = startCoords.y - endCoords.y;
                            length += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
                        } else {
                            // Calculate the length of the first segment, from the start
                            // node to the first intermediate vertex
                            const startXDiff = startCoords.x - vertices[0].x;
                            const startYDiff = startCoords.y - vertices[0].y;
                            length += Math.sqrt(startXDiff * startXDiff + startYDiff * startYDiff);
                            // Calculate the length of the last segment, from the last node
                            // to the last intermediate vertex
                            const endXDiff = endCoords.x - vertices[vertices.length - 1].x;
                            const endYDiff = endCoords.y - vertices[vertices.length - 1].y;
                            length += Math.sqrt(endXDiff * endXDiff + endYDiff * endYDiff);
                            // Also add the lengths of all intermediate segments
                            for (let i = 0; i < vertices.length - 1; ++i) {
                                const p1 = vertices[i];
                                const p2 = vertices[i + 1];
                                const xDiff = p1.x - p2.x;
                                const yDiff = p1.y - p2.y;
                                length += Math.sqrt(xDiff * xDiff + yDiff * yDiff);
                            }
                        }
                        const toSend: ClientActionsSchema = {
                            type: "add_pipe",
                            start_node: addPipeState.start_id,
                            end_node: addPipeState.end_id,
                            vertices,
                            length,
                            id: 'Pipe' + Math.random(),
                        };
                        syncState.applyLocal(toSend, map);
                        addPipeState = new AddPipeState('');
                        ws.send(JSON.stringify(toSend));
                    }
                } catch (e) {
                    console.log(e);
                }
                break;
            default:
                console.log('WARNING: unhandled clickMode for junctions-layer:', clickMode);
                break;
        }
    });

    map.addSource('tanks-source', {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: false,
    });
    map.addLayer({
        id: 'tanks-layer',
        type: 'symbol',
        source: 'tanks-source',
        layout: {
            'icon-image': 'circle',
            'icon-size': 0.5,
            'icon-allow-overlap': true
        },
    });

    map.addSource('reservoirs-source', {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: false,
    });
    map.addLayer({
        id: 'reservoirs-layer',
        type: 'symbol',
        source: 'reservoirs-source',
        layout: {
            'icon-image': 'circle',
            'icon-size': 0.5,
            'icon-allow-overlap': true
        },
    });

    map.addSource('pipes-source', {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: false,
    });
    map.addLayer({
        id: 'pipes-layer',
        type: 'line',
        source: 'pipes-source',
        layout: {
            'line-join': "round",
            'line-cap': 'round',
        },
        paint: {
            'line-color': '#FF0',
            'line-width': 3,
        }
    });
    // map.on('click', 'pipes-layer', (e) => {
    //     const lngLat = e.lngLat;
    //     if (clickMode == "pan") {
    //         const popup = createBasePopup(e);
    //         const feature = e.features![0];
    //         const id = feature.properties.id;
    //         // TODO: figure out a decent way of getting the default/existing
    //         // values for diameter, intial_status, loss_coefficient (MinorLoss),
    //         // and roughness. Do I store them in GeoJSON properties? Get them
    //         // all here? idk, something to sleep on until tomorrow.
    //         render(<PipePropertiesPopup
    //             diameter={diameter}
    //             id={id}
    //             initial_status={initial_status}
    //             length={length}
    //             lngLat={lngLat}
    //             loss_coefficient={loss_coefficient}
    //             popup={popup}
    //             project_path={project_path}
    //             roughness={roughness}
    //             ws={ws}
    //         />, popup._content.firstChild);
    //     }
    // })

    map.on('click', (e) => {
        // Only run events relative to the base map if no other layers caught it
        if (!e.defaultPrevented) {
            handleMapClick(e);
        }
        return;
    });

    // Finally, handle messages that were received before the map was
    // initialized, and set up a handler for future messages
    function handleIncomingMessage(data: any) {
        const str = z.string().parse(data);
        const obj = JSON.parse(str);
        const changeData = EpanetChangeSchema.parse(obj);
        const change = changeData.change;
        syncState.applySynced(change, map);
    }
    for (const unhandled of noMessageHandlerQueue) {
        handleIncomingMessage(unhandled);
    }
    ws.onmessage = (e) => {
        handleIncomingMessage(e.data);
    }
})

function createBasePopup(e: maplibregl.MapMouseEvent & Object): maplibregl.Popup {
    const popup = new maplibregl.Popup({ closeOnClick: false })
    popup.setLngLat(e.lngLat);
    popup.setHTML('<div></div>');
    return popup;
}
function handleMapClick(e: maplibregl.MapMouseEvent & Object) {
    if (clickMode == "add_junction") {
        const popup = createBasePopup(e);
        // Safety: popup._content.firstChild will be valid because of the
        // popup.setHTML() call in createBasePopup
        render(<AddJunctionPopup
            lngLat={e.lngLat}
            popup={popup}
            project_path={project_path}
            ws={ws}
            utm_zone={utm_zone}
        // @ts-ignore
        />, popup._content.firstChild);
        popup.addTo(map);
    } else if (clickMode == "add_pipe") {
        // the base map is below any other points, so if the user is in
        // add_pipe mode, they must be adding an intermediate point
        // TODO: show the intermediate points before the pipe is finished?
        addPipeState.addPoint(e.lngLat.lng, e.lngLat.lat);
    } else if (clickMode == "add_reservoir") {
        const popup = createBasePopup(e);
        // Safety: popup._content.firstChild will be valid because of the
        // popup.setHTML() call in createBasePopup
        render(<AddReservoirPopup
            lngLat={e.lngLat}
            popup={popup}
            project_path={project_path}
            ws={ws}
            utm_zone={utm_zone}
        // @ts-ignore
        />, popup._content.firstChild);
        popup.addTo(map);
    } else if (clickMode == "add_tank") {
        const popup = createBasePopup(e);
        // Safety: popup._content.firstChild will be valid because of the
        // popup.setHTML() call in createBasePopup
        render(<AddTankPopup
            lngLat={e.lngLat}
            popup={popup}
            project_path={project_path}
            ws={ws}
            utm_zone={utm_zone}
        // @ts-ignore
        />, popup._content.firstChild);
        popup.addTo(map);
    } else if (clickMode == "pan") {
        // do nothing, which is how pan is expected to work
    }
}

type ClickModes = "pan" | "add_junction" | "add_reservoir" | "add_tank" | "add_pipe"

let clickMode: ClickModes = "pan";
function changeClickMode(to: ClickModes) {
    if (clickMode === to) {
        // no op if modes are the same
        return;
    }
    // TODO: clean up state for clickMode (current), then set up state for to
    clickMode = to;
}

function ClickModeRadio(props: {
    name: string,
    value: ClickModes,
    checked?: boolean,
}) {
    return <label>
        <input type="radio" name="click_mode" value={props.value} checked={props.checked} onInput={(e) => {
            changeClickMode(props.value);
        }} />
        <span>{props.name}</span>
    </label>
}

function ClickModes() {
    return <div class="click-modes">
        <ClickModeRadio name="Pan" value="pan" checked />
        <ClickModeRadio name="Add Junction" value="add_junction" />
        <ClickModeRadio name="Add Reservoir" value="add_reservoir" />
        <ClickModeRadio name="Add Tank" value="add_tank" />
        <ClickModeRadio name="Add Pipe" value="add_pipe" />
    </div>
}

function ShareModal(props: { dialogRef: RefObject<HTMLDialogElement | null> }) {
    const [username, setUsername] = useState("");
    return (
        <div>
            <button onClick={() => props.dialogRef.current?.showModal()}>Share</button>
            <dialog class="share-dialog" ref={props.dialogRef}>
                <label>Username: <input type="text" name="username" onChange={(e) => setUsername(e.target.value)} /></label>
                <button type="submit" onClick={async (e) => {
                    const response = await fetch(project_path + '/add_user', {
                        body: JSON.stringify({
                            username,
                        }),
                        headers: [
                            ['Content-Type', 'application/json']
                        ],
                        method: 'POST',
                    });
                    // TODO: display success or failure by parsing response
                    props.dialogRef.current?.close();
                }}>Share</button>
                <button onClick={() => props.dialogRef.current?.close()}>Close</button>
            </dialog>
        </div>
    )
}

function Toolbar() {
    const dialogRef = useRef(null);
    return <div class="toolbar">
        <div class="toolbar-left">
            <h3 class="project-name">{metaProjectName}</h3>
            <ClickModes />
        </div>
        <div class="toolbar-right">
            <ShareModal dialogRef={dialogRef} />
            <h3 class="back-button"><a href="/projects">Back</a></h3>
        </div>
    </div>
}

const toolbar = document.getElementById('toolbar')!;
render(<Toolbar />, toolbar);
