import maplibregl, { GeoJSONSource } from 'maplibre-gl';
import AddPipeState from './AddPipeState.js';
import ClickMode from './ClickMode.js';
import SyncEpanetState from './SyncEpanetState.js';
import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import { render } from 'hono/jsx/dom';
import JunctionPropertiesPopup from '../components/JunctionPropertiesPopup.js';
import type { ServerboundPacket } from '../../packets/serverbound.js';
import PipePropertiesPopup from '../components/PipePropertiesPopup.js';
import AddJunctionPopup from '../components/AddJunctionPopup.js';
import AddReservoirPopup from '../components/AddReservoirPopup.js';
import AddTankPopup from '../components/AddTankPopup.js';
import '@maptiler/geocoding-control/style.css';
import type { ClientboundPacket } from '../../packets/clientbound.js';
import GeoJsonState from './GeoJsonState.js';
import clone from '@turf/clone';

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
    const elem = new Image();
    elem.src = biggerDataUrl;
    return await new Promise((resolve) => {
        elem.addEventListener('load', async () => {
            const bitmap = await createImageBitmap(elem);
            resolve(bitmap);
        })
    });
}

function createBasePopup(e: maplibregl.MapMouseEvent & Object): maplibregl.Popup {
    const popup = new maplibregl.Popup({ closeOnClick: false })
    popup.setLngLat(e.lngLat);
    popup.setHTML('<div></div>');
    return popup;
}

export default class MapState {
    private addPipeState: AddPipeState
    public readonly clickMode: ClickMode
    private utmZone: string
    public readonly epanetState: SyncEpanetState
    private map: maplibregl.Map
    private project_path: string
    private mapLoaded: boolean
    private mapLoadedListenerQueue: { (p: ClientboundPacket): void }[]

    private localGeoJson: GeoJsonState
    private syncedGeoJson: GeoJsonState

    constructor(args: {
        utm_zone: string,
        longitude: number,
        latitude: number,
        zoom: number,
        glyphsUrl: string,
        project_url: string,
        project_path: string
    }) {
        this.mapLoaded = false;
        this.mapLoadedListenerQueue = [];
        this.utmZone = args.utm_zone;
        this.localGeoJson = new GeoJsonState(this.utmZone);
        this.syncedGeoJson = new GeoJsonState(this.utmZone);
        this.addPipeState = new AddPipeState('');
        this.clickMode = new ClickMode();
        const ws = new WebSocket(args.project_url + '/ws');
        this.epanetState = new SyncEpanetState(ws, this.utmZone);
        this.project_path = args.project_path;

        this.map = new maplibregl.Map({
            container: 'map',
            center: [args.longitude, args.latitude],
            zoom: args.zoom,
            style: {
                version: 8,
                sources: {
                    'satellite': {
                        type: 'raster',
                        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
                        tiles: ['/tiles/satellite/{z}/{x}/{y}.jpg'],
                        tileSize: 512,
                        maxzoom: 18,
                    }
                },
                layers: [
                    {
                        id: 'satellite',
                        source: 'satellite',
                        type: 'raster',
                    }
                ],
                glyphs: args.glyphsUrl
            }
        });
        this.map.on('load', async () => {
            const gc = new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY! });
            this.map.addControl(gc);

            // From https://iconoir.com/ , Shapes: circle. Copy download link
            const circleDataUrl = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHN0cm9rZS13aWR0aD0iMS41IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgY29sb3I9IiMwMDAwMDAiPjxwYXRoIGQ9Ik0xMiAyMkMxNy41MjI4IDIyIDIyIDE3LjUyMjggMjIgMTJDMjIgNi40NzcxNSAxNy41MjI4IDIgMTIgMkM2LjQ3NzE1IDIgMiA2LjQ3NzE1IDIgMTJDMiAxNy41MjI4IDYuNDc3MTUgMjIgMTIgMjJaIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvcGF0aD48L3N2Zz4=';
            const circleBitmap = await renderSvgData(circleDataUrl, 256, 256);
            this.map.addImage('circle', circleBitmap);

            const cursorDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHN0cm9rZS13aWR0aD0iMS41IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIGNvbG9yPSIjMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTIwLjg2NyA4LjI4N2MxLjYuNjUgMS40NzcgMi45NTQtLjE4MiAzLjQzbC04LjM3MiAyLjQwOEw4LjQ5IDIxLjk1Yy0uNzU4IDEuNTUyLTMuMDQ5IDEuMjcyLTMuNDEtLjQxNkwxLjE4MSAzLjM1N0MuODc2IDEuOTMxIDIuMjkuNzQzIDMuNjQyIDEuMjkyWiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuOTkyIi8+PC9zdmc+Cg==';
            const cursorBitmap = await renderSvgData(cursorDataUrl, 256, 256);
            this.map.addImage('cursor', cursorBitmap);

            this.map.addSource('cursors-source', {
                type: 'geojson',
                data: this.localGeoJson.cursors,
                cluster: false,
            });
            this.map.addLayer({
                id: 'cursors-layer',
                type: 'symbol',
                source: 'cursors-source',
                layout: {
                    'icon-image': 'cursor',
                    'icon-size': 0.25,
                    'icon-allow-overlap': true,
                    'icon-offset': [0.25 * 256, 0.25 * 256],
                    'text-field': ['get', 'username'],
                    'text-anchor': 'top',
                    'text-allow-overlap': true,
                },
                paint: {
                    'text-color': '#FFFFFF',
                }
            })

            this.map.addSource('junctions-source', {
                type: "geojson",
                data: this.localGeoJson.junctions,
                cluster: false,
            })
            this.map.addLayer({
                id: 'junctions-layer',
                type: "symbol",
                source: 'junctions-source',
                layout: {
                    'icon-image': 'circle',
                    'icon-size': 0.2,
                    'icon-allow-overlap': true,
                }
            });
            this.map.on('click', 'junctions-layer', (e) => {
                this.handleJunctionsClick(e);
            })

            this.map.addSource('tanks-source', {
                type: "geojson",
                data: this.localGeoJson.tanks,
                cluster: false,
            });
            this.map.addLayer({
                id: 'tanks-layer',
                type: 'symbol',
                source: 'tanks-source',
                layout: {
                    'icon-image': 'circle',
                    'icon-size': 0.5,
                    'icon-allow-overlap': true
                },
            });

            this.map.addSource('reservoirs-source', {
                type: "geojson",
                data: this.localGeoJson.reservoirs,
                cluster: false,
            });
            this.map.addLayer({
                id: 'reservoirs-layer',
                type: 'symbol',
                source: 'reservoirs-source',
                layout: {
                    'icon-image': 'circle',
                    'icon-size': 0.5,
                    'icon-allow-overlap': true
                },
            });

            this.map.addSource('pipes-source', {
                type: "geojson",
                data: this.localGeoJson.pipes,
                cluster: false,
            });
            this.map.addLayer({
                id: 'pipes-layer',
                type: 'line',
                source: 'pipes-source',
                layout: {
                    'line-join': "round",
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#FF0',
                    'line-width': 5,
                }
            });
            this.map.on('click', 'pipes-layer', (e) => {
                this.handlePipesClick(e);
            });

            this.map.on('click', (e) => {
                this.handleBaseMapClick(e);
            });

            this.map.on('mousemove', (e) => {
                this.handleBaseMapMouseMove(e);
            });

            const listeners = [(p: ClientboundPacket) => this.handleCbPacket(p)];
            // listeners.push(this.mapLoadedListenerQueue);
            for (const queued of this.mapLoadedListenerQueue) {
                listeners.push(queued);
            }
            this.epanetState.subscribe(listeners);
            this.mapLoaded = true;
            this.mapLoadedListenerQueue = [];
        })
    }

    public subscribeAfterLoad(listener: (p: ClientboundPacket) => void) {
        if (this.mapLoaded) {
            this.epanetState.subscribe([listener]);
        } else {
            this.mapLoadedListenerQueue.push(listener);
        }
    }

    private handleCbPacket(p: ClientboundPacket) {
        // Don't call into this.epanetState.applySynced() because it will already
        // be up to date. The WebSocket handler, handleServerMessage, always
        // calls applySynced() anyways, so we would just run into duplication
        // errors if there was also a call here.
        // For certain types of packets, update GeoJSON
        if (p.type == "track_edit_cb") {
            // Update all the GeoJSON
            this.syncedGeoJson.loadFromEpanet(this.epanetState.synced);
            // Render new data
            (this.map.getSource('junctions-source') as GeoJSONSource).setData(this.syncedGeoJson.junctions);
            (this.map.getSource('tanks-source') as GeoJSONSource).setData(this.syncedGeoJson.tanks);
            (this.map.getSource('reservoirs-source') as GeoJSONSource).setData(this.syncedGeoJson.reservoirs);
            (this.map.getSource('pipes-source') as GeoJSONSource).setData(this.syncedGeoJson.pipes);
            (this.map.getSource('cursors-source') as GeoJSONSource).setData(this.syncedGeoJson.cursors);
            // Get local up to speed
            this.localGeoJson = this.syncedGeoJson.clone();
        } else if (p.type == "epanet_edit_cb") {
            if (p.data.action.type == "add_junction_action") {
                this.syncedGeoJson.addJunction(p.data.action);
                this.localGeoJson.junctions = clone(this.syncedGeoJson.junctions);
                (this.map.getSource('junctions-source') as GeoJSONSource).setData(this.syncedGeoJson.junctions);
            } else if (p.data.action.type == "add_pipe_action") {
                this.syncedGeoJson.addPipe(p.data.action, this.epanetState.synced);
                this.localGeoJson.pipes = clone(this.syncedGeoJson.pipes);
                (this.map.getSource('pipes-source') as GeoJSONSource).setData(this.syncedGeoJson.pipes);
            } else if (p.data.action.type == "add_reservoir_action") {
                this.syncedGeoJson.addReservoir(p.data.action);
                this.localGeoJson.reservoirs = clone(this.syncedGeoJson.reservoirs);
                (this.map.getSource('reservoirs-source') as GeoJSONSource).setData(this.syncedGeoJson.reservoirs);
            } else if (p.data.action.type == "add_tank_action") {
                this.syncedGeoJson.addTank(p.data.action);
                this.localGeoJson.tanks = clone(this.syncedGeoJson.tanks);
                (this.map.getSource('tanks-source') as GeoJSONSource).setData(this.syncedGeoJson.tanks);
            } else if (p.data.action.type == "delete_junction_action") {
                this.syncedGeoJson.deleteJunction(p.data.action.id);
                this.localGeoJson.junctions = clone(this.syncedGeoJson.junctions);
                (this.map.getSource('junctions-source') as GeoJSONSource).setData(this.syncedGeoJson.junctions);
            } else if (p.data.action.type == "delete_pipe_action") {
                this.syncedGeoJson.deletePipe(p.data.action.id);
                this.localGeoJson.pipes = clone(this.syncedGeoJson.pipes);
                (this.map.getSource('pipes-source') as GeoJSONSource).setData(this.syncedGeoJson.pipes);
            } else {
                console.warn('handleCbPacket: unhandled EPANET action,', p);
            }
        } else if (p.type == "mouse_move_cb") {
            this.syncedGeoJson.doMouseMoveCb(p);
            this.localGeoJson.cursors = clone(this.syncedGeoJson.cursors);
            (this.map.getSource('cursors-source') as GeoJSONSource).setData(this.syncedGeoJson.cursors);
        } else if (p.type == "empty_cb") {
            // explicitly do nothing
        } else {
            console.warn('Warning: MapState.handleIncomingPacket, unhandled packet:', p);
        }
    }

    private renderSbPacket(p: ServerboundPacket) {
        if (p.type == "epanet_action_sb") {
            if (p.data.type == "add_junction_action") {
                this.localGeoJson.addJunction(p.data);
                (this.map.getSource('junctions-source') as GeoJSONSource).setData(this.localGeoJson.junctions);
            } else if (p.data.type == "add_pipe_action") {
                this.localGeoJson.addPipe(p.data, this.epanetState.local);
                (this.map.getSource('pipes-source') as GeoJSONSource).setData(this.localGeoJson.pipes);
            } else if (p.data.type == "add_reservoir_action") {
                this.localGeoJson.addReservoir(p.data);
                (this.map.getSource('reservoirs-source') as GeoJSONSource).setData(this.localGeoJson.reservoirs);
            } else if (p.data.type == "add_tank_action") {
                this.localGeoJson.addTank(p.data);
                (this.map.getSource('tanks-source') as GeoJSONSource).setData(this.localGeoJson.tanks);
            } else if (p.data.type == "delete_junction_action") {
                this.localGeoJson.deleteJunction(p.data.id);
                (this.map.getSource('junctions-source') as GeoJSONSource).setData(this.localGeoJson.junctions);
            } else if (p.data.type == "delete_pipe_action") {
                this.localGeoJson.deletePipe(p.data.id);
                (this.map.getSource('pipes-source') as GeoJSONSource).setData(this.localGeoJson.pipes);
            } else if (
                p.data.type == "set_junction_properties_action"
                || p.data.type == "set_pipe_properties_action"
            ) {
                // Ignore, these aren't relevant for rendering (yet)
            } else {
                console.warn('Unhandled EPANET action in renderSbPacket:', p);
            }
        } else {
            console.warn('Warning: unhandled packet in renderSbPacket:', p);
        }
    }

    private handleBaseMapClick(e: maplibregl.MapMouseEvent & Object) {
        if (!e.defaultPrevented) {
            e.preventDefault();
            const clickMode = this.clickMode.getClickMode();
            if (clickMode == "add_junction") {
                const popup = createBasePopup(e);
                // Safety: popup._content.firstChild will be valid because of the
                // popup.setHTML() call in createBasePopup
                render(<AddJunctionPopup
                    lngLat={e.lngLat}
                    popup={popup}
                    project_path={this.project_path}
                    utm_zone={this.utmZone}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                // @ts-ignore
                />, popup._content.firstChild);
                popup.addTo(this.map);
            } else if (clickMode == "add_pipe") {
                // the base map is below any other points, so if the user is in
                // add_pipe mode, they must be adding an intermediate point
                // TODO: show the intermediate points before the pipe is finished?
                // addPipeState.addPoint(e.lngLat.lng, e.lngLat.lat);
                this.addPipeState.addPoint(e.lngLat.lng, e.lngLat.lat);
            } else if (clickMode == "add_reservoir") {
                const popup = createBasePopup(e);
                // Safety: popup._content.firstChild will be valid because of the
                // popup.setHTML() call in createBasePopup
                render(<AddReservoirPopup
                    lngLat={e.lngLat}
                    popup={popup}
                    project_path={this.project_path}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    utm_zone={this.utmZone}
                // @ts-ignore
                />, popup._content.firstChild);
                popup.addTo(this.map);
            } else if (clickMode == "add_tank") {
                const popup = createBasePopup(e);
                // Safety: popup._content.firstChild will be valid because of the
                // popup.setHTML() call in createBasePopup
                render(<AddTankPopup
                    lngLat={e.lngLat}
                    popup={popup}
                    project_path={this.project_path}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    utm_zone={this.utmZone}
                // @ts-ignore
                />, popup._content.firstChild);
                popup.addTo(this.map);
            } else if (clickMode == "pan") {
                // do nothing, which is how pan is expected to work
            }
        }
    }

    private handleBaseMapMouseMove(e: maplibregl.MapMouseEvent & Object) {
        const msg: ServerboundPacket = {
            type: 'mouse_move_sb',
            longitude: e.lngLat.lng,
            latitude: e.lngLat.lat,
        };
        this.epanetState.applyLocalAndSend(msg);
    }

    private handlePipesClick(e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] } & Object) {
        const lngLat = e.lngLat;
        if (this.clickMode.getClickMode() == "pan") {
            const popup = createBasePopup(e);
            const feature = e.features![0];
            const id = feature.properties.id;
            const { diameter, initial_status, length, loss_coefficient, roughness } = this.epanetState.local.getPipeProperties(id);
            render(<PipePropertiesPopup
                diameter={diameter}
                id={id}
                initial_status={initial_status}
                length={length}
                lngLat={lngLat}
                loss_coefficient={loss_coefficient}
                popup={popup}
                project_path={this.project_path}
                roughness={roughness}
                applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
            // Safety: setHTML() in createBasePopup() ensures that firstChild is valid
            // @ts-ignore
            />, popup._content.firstChild);
            popup.addTo(this.map);
        }
    }

    private handleJunctionsClick(e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] } & Object) {
        if (!e.defaultPrevented) {
            e.preventDefault();
            if (!e.features || e.features.length != 1) {
                return;
            }
            const clickMode = this.clickMode.getClickMode();
            switch (clickMode) {
                case "add_pipe":
                    try {
                        if (this.addPipeState.start_id == '') {
                            this.addPipeState.start(e.features[0].properties.id);
                        } else {
                            this.addPipeState.finish(e.features[0].properties.id);
                            // hmm
                            // I'm realizing that the "P" + Math.random() pipe naming
                            // scheme is falling apart
                            // To fix, rather than sending a packet now, add a popup
                            // for add pipe
                            const toSend: ServerboundPacket = {
                                type: "epanet_action_sb",
                                data: this.addPipeState.toAddPipeData(this.utmZone, this.epanetState.local, "P" + Math.random()),
                            };
                            this.addPipeState.reset();
                            this.renderSbPacket(toSend);
                            this.epanetState.applyLocalAndSend(toSend);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                    break;
                case "pan": {
                    console.log('should be showing a popup...');
                    const lngLat = e.lngLat;
                    const popup = createBasePopup(e);
                    const feature = e.features![0];
                    const id = feature.properties.id;
                    const { elevation } = this.epanetState.local.getJunctionProperties(id);
                    render(<JunctionPropertiesPopup
                        elevation={elevation}
                        id={id}
                        lngLat={lngLat}
                        popup={popup}
                        project_path={this.project_path}
                        applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    // Safety: setHTML() in createBasePopup() ensures that firstChild is valid
                    // @ts-ignore
                    />, popup._content.firstChild);
                    popup.addTo(this.map);
                    break;
                }
                default:
                    console.log('WARNING: unhandled clickMode for junctions-layer:', clickMode);
                    break;
            }
        }
    }
}
