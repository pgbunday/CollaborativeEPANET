import AddPipeState from './AddPipeState.js';
import ClickMode from './ClickMode.js';
import SyncEpanetState from './SyncEpanetState.js';
import { GeocodingControl } from '@maptiler/geocoding-control/openlayers';
import 'ol/ol.css';
import '@maptiler/geocoding-control/style.css';
import { render } from 'hono/jsx/dom';
import JunctionPropertiesPopup from '../components/JunctionPropertiesPopup.js';
import type { ServerboundPacket } from '../../packets/serverbound.js';
import PipePropertiesPopup from '../components/PipePropertiesPopup.js';
import AddJunctionPopup from '../components/AddJunctionPopup.js';
import AddReservoirPopup from '../components/AddReservoirPopup.js';
import AddTankPopup from '../components/AddTankPopup.js';
import type { ClientboundPacket } from '../../packets/clientbound.js';
import GeoJsonState from './GeoJsonState.js';
import clone from '@turf/clone';
import { Map as UiMap, MapBrowserEvent, Overlay, View } from 'ol';
import { useGeographic } from 'ol/proj.js';
import TileLayer from 'ol/layer/Tile.js';
import { XYZ } from 'ol/source.js';
import { Attribution, defaults } from 'ol/control.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import type { FeatureLike } from 'ol/Feature.js';
import Style, { type StyleLike } from 'ol/style/Style.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import RegularShape from 'ol/style/RegularShape.js';
import Text from 'ol/style/Text.js';
import { turbo_color } from '../../colors.js';
import ReservoirPropertiesPopup from '../components/ReservoirPropertiesPopup.js';
import DataVisualizationControl from '../components/DataVisualizationControl.js';

useGeographic();

export default class MapState {
    private addPipeState: AddPipeState
    public readonly clickMode: ClickMode
    private utmZone: string
    public readonly epanetState: SyncEpanetState
    private map: UiMap
    private project_path: string
    private mapLoaded: boolean
    private mapLoadedListenerQueue: { (p: ClientboundPacket): void }[]

    private cursorsSource: VectorSource
    private cursorsLayer: VectorLayer

    private junctionsSource: VectorSource
    private junctionsLayer: VectorLayer

    private tanksSource: VectorSource
    private tanksLayer: VectorLayer

    private reservoirsSource: VectorSource
    private reservoirsLayer: VectorLayer

    private pipesSource: VectorSource
    private pipesLayer: VectorLayer

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

        const attribution = new Attribution({ collapsible: false });

        this.cursorsSource = new VectorSource({});
        this.cursorsLayer = new VectorLayer({
            source: this.cursorsSource,
            style: (feature, resolution) => {
                return new Style({
                    image: new RegularShape({
                        points: 3,
                        radius: 10,
                        stroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 1)',
                        })
                    }),
                    text: new Text({
                        text: feature.getProperties().username,
                        backgroundFill: new Fill({
                            color: 'white',
                        }),
                        backgroundStroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        offsetY: 32,
                        font: '12px sans-serif',
                        padding: [4, 8, 4, 8],
                    })
                })
            }
        });

        this.pipesSource = new VectorSource({});
        this.pipesLayer = new VectorLayer({
            source: this.pipesSource,
            style: new Style({
                stroke: new Stroke({
                    color: 'lightblue',
                    width: 8,
                })
            })
        });

        this.junctionsSource = new VectorSource({});
        this.junctionsLayer = new VectorLayer({
            source: this.junctionsSource,
            style: (feature, resolution) => {
                return new Style({
                    image: new CircleStyle({
                        radius: 14,
                        stroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 1)',
                        })
                    }),
                    text: new Text({
                        text: feature.getProperties().id,
                        backgroundFill: new Fill({
                            color: 'white',
                        }),
                        backgroundStroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        offsetY: 32,
                        font: '12px sans-serif',
                        padding: [4, 8, 4, 8]
                    })
                })
            }
        });

        this.tanksSource = new VectorSource({});
        this.tanksLayer = new VectorLayer({ source: this.tanksSource });

        this.reservoirsSource = new VectorSource({});
        this.reservoirsLayer = new VectorLayer({
            source: this.reservoirsSource,
            style: (feature, resolution) => {
                return new Style({
                    image: new CircleStyle({
                        radius: 14,
                        stroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        fill: new Fill({
                            color: 'rgba(255, 255, 255, 1)',
                        })
                    }),
                    text: new Text({
                        text: feature.getProperties().id,
                        backgroundFill: new Fill({
                            color: 'white',
                        }),
                        backgroundStroke: new Stroke({
                            color: 'black',
                            width: 4,
                        }),
                        offsetY: 32,
                        font: '12px sans-serif',
                        padding: [4, 8, 4, 8]
                    })
                })
            }
        });

        const gc = new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY! });

        this.map = new UiMap({
            target: 'map',
            view: new View({
                center: [args.longitude, args.latitude],
                zoom: args.zoom,
            }),
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: '/tiles/satellite/avif/512/{z}/{x}/{y}.avif',
                        projection: 'EPSG:3857',
                        // Native size is 512. If the URL size is smaller, the
                        // tiles will be stretched to 512, saving bandwidth at
                        // the cost of visual quality.
                        tileSize: 512,
                    })
                }),
                this.pipesLayer,
                this.junctionsLayer,
                this.tanksLayer,
                this.reservoirsLayer,
                this.cursorsLayer,
            ],
            controls: defaults({ attribution: false }).extend([
                attribution,
                gc,
                new DataVisualizationControl(this),
            ]),
        });
        this.map.on('click', (e) => {
            let count = 0;
            this.map.forEachFeatureAtPixel(e.pixel, (feature, layer, geometry) => {
                count += 1;
                if (layer == this.junctionsLayer) {
                    this.handleJunctionsClick(e, feature);
                    console.log('clicked on a junction');
                } else if (layer == this.pipesLayer) {
                    this.handlePipesClick(e, feature);
                } else if (layer == this.reservoirsLayer) {
                    this.handleReservoirsClick(e, feature);
                }
            });
            if (count == 0) {
                // no features clicked: user clicked on the base map
                this.handleBaseMapClick(e);
            }
        });
        this.map.on('pointermove', (e) => {
            this.handleBaseMapMouseMove(e);
        })
        this.map.on('loadend', async () => {
            const listeners = [(p: ClientboundPacket) => this.handleCbPacket(p)];
            for (const queued of this.mapLoadedListenerQueue) {
                listeners.push(queued);
            }
            this.epanetState.subscribe(listeners);
            this.mapLoaded = true;
            this.mapLoadedListenerQueue = [];
        })
    }

    public setNodeStyles({ showLabels, pressureOptions }: { showLabels: boolean, pressureOptions: { low: number, high: number } | undefined }) {
        // Allow nodes to be individually colored
        const m: Map<string, [number, number, number]> = new Map<string, [number, number, number]>();
        if (pressureOptions) {
            const pressures = this.epanetState.local.getNodePressures();
            for (const { id, pressure } of pressures) {
                const clamped = (pressure - pressureOptions.low) / (pressureOptions.high - pressureOptions.low);
                m.set(id, turbo_color(clamped));
            }
        } else {
            // do nothing, the style function will fall back to plain white
        }
        const f: StyleLike = (feature, resolution) => {
            const id = feature.getProperties().id;
            let fillColorStr = 'rgb(255 255 255)';
            if (m.get(id)) {
                const color = m.get(id)!;
                fillColorStr = 'rgb( ' + Math.floor(color[0] * 255) + ' ' + Math.floor(color[1] * 255) + ' ' + Math.floor(color[2] * 255) + ')';
            }
            let text = undefined;
            if (showLabels) {
                text = new Text({
                    text: feature.getProperties().id,
                    backgroundFill: new Fill({
                        color: 'white',
                    }),
                    backgroundStroke: new Stroke({
                        color: 'black',
                        width: 4,
                    }),
                    offsetY: 32,
                    font: '12px sans-serif',
                    padding: [4, 8, 4, 8]
                })
            }
            return new Style({
                image: new CircleStyle({
                    radius: 14,
                    stroke: new Stroke({
                        color: 'black',
                        width: 4,
                    }),
                    fill: new Fill({
                        color: fillColorStr,
                    })
                }),
                text,
            })
        };
        this.junctionsLayer.setStyle(f);
        this.reservoirsLayer.setStyle(f);
        this.tanksLayer.setStyle(f);
    }

    private createBasePopup(): [Overlay, HTMLDivElement, () => void] {
        const container = document.createElement('div');
        container.className = 'ol-popup';

        const content = document.createElement('div');

        const closer = document.createElement('button');
        closer.innerText = 'x';
        closer.className = 'ol-popup-closer';
        const remove = () => {
            if (document.body.contains(container)) {
                container.remove();
            }
        }
        closer.addEventListener('click', remove)

        container.appendChild(closer);
        container.appendChild(content);
        document.body.appendChild(container);

        const popup = new Overlay({
            element: container,
            autoPan: {
                animation: {
                    duration: 250,
                }
            }
        })
        return [popup, content, remove];
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
            console.log(p.snapshot_data?.snapshot_inp);
            // Update all the GeoJSON
            this.syncedGeoJson.loadFromEpanet(this.epanetState.synced);
            // Render new data
            this.junctionsSource = new VectorSource({
                features: new GeoJSON({}).readFeatures(this.syncedGeoJson.junctions)
            });
            this.junctionsLayer.setSource(this.junctionsSource);
            this.tanksSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.tanks) })
            this.tanksLayer.setSource(this.tanksSource);
            this.reservoirsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.reservoirs) });
            this.reservoirsLayer.setSource(this.reservoirsSource);
            this.pipesSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.pipes) });
            this.pipesLayer.setSource(this.pipesSource);
            this.cursorsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.cursors) });
            this.cursorsLayer.setSource(this.cursorsSource);
            // Get local up to speed
            this.localGeoJson = this.syncedGeoJson.clone();
        } else if (p.type == "epanet_edit_cb") {
            if (p.data.action.type == "add_junction_action") {
                this.syncedGeoJson.addJunction(p.data.action);
                this.localGeoJson.junctions = clone(this.syncedGeoJson.junctions);
                this.junctionsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.junctions) });
                this.junctionsLayer.setSource(this.junctionsSource);
            } else if (p.data.action.type == "add_pipe_action") {
                this.syncedGeoJson.addPipe(p.data.action, this.epanetState.synced);
                this.localGeoJson.pipes = clone(this.syncedGeoJson.pipes);
                this.pipesSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.pipes) });
                this.pipesLayer.setSource(this.pipesSource);
            } else if (p.data.action.type == "add_reservoir_action") {
                this.syncedGeoJson.addReservoir(p.data.action);
                this.localGeoJson.reservoirs = clone(this.syncedGeoJson.reservoirs);
                this.reservoirsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.reservoirs) });
                this.reservoirsLayer.setSource(this.reservoirsSource);
            } else if (p.data.action.type == "add_tank_action") {
                this.syncedGeoJson.addTank(p.data.action);
                this.localGeoJson.tanks = clone(this.syncedGeoJson.tanks);
                this.tanksSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.tanks) });
                this.tanksLayer.setSource(this.tanksSource);
            } else if (p.data.action.type == "delete_junction_action") {
                this.syncedGeoJson.deleteJunction(p.data.action.id);
                this.localGeoJson.junctions = clone(this.syncedGeoJson.junctions);
                this.junctionsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.junctions) });
                this.junctionsLayer.setSource(this.junctionsSource);
            } else if (p.data.action.type == "delete_pipe_action") {
                this.syncedGeoJson.deletePipe(p.data.action.id);
                this.localGeoJson.pipes = clone(this.syncedGeoJson.pipes);
                this.pipesSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.pipes) });
                this.pipesLayer.setSource(this.pipesSource);
            } else {
                console.warn('handleCbPacket: unhandled EPANET action,', p);
            }
        } else if (p.type == "mouse_move_cb") {
            this.syncedGeoJson.doMouseMoveCb(p);
            this.localGeoJson.cursors = clone(this.syncedGeoJson.cursors);
            this.cursorsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.cursors) });
            this.cursorsLayer.setSource(this.cursorsSource);
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
                this.junctionsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.localGeoJson.junctions) });
                this.junctionsLayer.setSource(this.junctionsSource);
            } else if (p.data.type == "add_pipe_action") {
                this.localGeoJson.addPipe(p.data, this.epanetState.local);
                this.pipesSource = new VectorSource({ features: new GeoJSON().readFeatures(this.localGeoJson.pipes) });
                this.pipesLayer.setSource(this.pipesSource);
            } else if (p.data.type == "add_reservoir_action") {
                this.localGeoJson.addReservoir(p.data);
                this.reservoirsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.localGeoJson.reservoirs) });
                this.reservoirsLayer.setSource(this.reservoirsSource);
            } else if (p.data.type == "add_tank_action") {
                this.localGeoJson.addTank(p.data);
                this.tanksSource = new VectorSource({ features: new GeoJSON().readFeatures(this.localGeoJson.tanks) });
                this.tanksLayer.setSource(this.tanksSource);
            } else if (p.data.type == "delete_junction_action") {
                this.localGeoJson.deleteJunction(p.data.id);
                this.junctionsSource = new VectorSource({ features: new GeoJSON().readFeatures(this.syncedGeoJson.junctions) });
                this.junctionsLayer.setSource(this.junctionsSource);
            } else if (p.data.type == "delete_pipe_action") {
                this.localGeoJson.deletePipe(p.data.id);
                this.pipesSource = new VectorSource({ features: new GeoJSON().readFeatures(this.localGeoJson.pipes) });
                this.pipesLayer.setSource(this.pipesSource);
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

    private handleBaseMapClick(e: MapBrowserEvent<any>) {
        if (!e.defaultPrevented) {
            e.preventDefault();
            const clickMode = this.clickMode.getClickMode();
            if (clickMode == "add_junction") {
                const [overlay, content, remove] = this.createBasePopup();
                overlay.setPosition(e.coordinate);
                render(<AddJunctionPopup
                    lngLat={e.coordinate}
                    project_path={this.project_path}
                    utm_zone={this.utmZone}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    remove={remove}
                />, content);
                this.map.addOverlay(overlay);
            } else if (clickMode == "add_pipe") {
                // the base map is below any other points, so if the user is in
                // add_pipe mode, they must be adding an intermediate point
                // TODO: show the intermediate points before the pipe is finished?
                // addPipeState.addPoint(e.lngLat.lng, e.lngLat.lat);
                this.addPipeState.addPoint(e.coordinate[0], e.coordinate[1]);
            } else if (clickMode == "add_reservoir") {
                const [overlay, content, remove] = this.createBasePopup();
                overlay.setPosition(e.coordinate);
                render(<AddReservoirPopup
                    lngLat={e.coordinate}
                    project_path={this.project_path}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    utm_zone={this.utmZone}
                    remove={remove}
                />, content);
                this.map.addOverlay(overlay);
            } else if (clickMode == "add_tank") {
                const [overlay, content, remove] = this.createBasePopup();
                overlay.setPosition(e.coordinate);
                render(<AddTankPopup
                    lngLat={e.coordinate}
                    project_path={this.project_path}
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    utm_zone={this.utmZone}
                    remove={remove}
                />, content);
                this.map.addOverlay(overlay);
            } else if (clickMode == "pan") {
                // do nothing, which is how pan is expected to work
            }
        }
    }

    private handleBaseMapMouseMove(e: MapBrowserEvent<any>) {
        const msg: ServerboundPacket = {
            type: 'mouse_move_sb',
            longitude: e.coordinate[0],
            latitude: e.coordinate[1],
        };
        this.epanetState.applyLocalAndSend(msg);
    }

    private handlePipesClick(e: MapBrowserEvent<any>, feature: FeatureLike) {
        const lngLat = e.coordinate;
        if (this.clickMode.getClickMode() == "pan") {
            const [overlay, content, remove] = this.createBasePopup();
            overlay.setPosition(e.coordinate);
            const id = feature.getProperties().id;
            const { diameter, initial_status, length, loss_coefficient, roughness } = this.epanetState.local.getPipeProperties(id);
            render(<PipePropertiesPopup
                diameter={diameter}
                id={id}
                initial_status={initial_status}
                length={length}
                lngLat={lngLat}
                loss_coefficient={loss_coefficient}
                project_path={this.project_path}
                roughness={roughness}
                applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                remove={remove}
            />, content);
            this.map.addOverlay(overlay);
        }
    }

    private handleReservoirsClick(e: MapBrowserEvent<any>, feature: FeatureLike) {
        if (!e.defaultPrevented) {
            e.preventDefault();
            const clickMode = this.clickMode.getClickMode();
            if (clickMode == "add_pipe") {
                try {
                    if (this.addPipeState.start_id == '') {
                        this.addPipeState.start(feature.getProperties().id);
                    } else {
                        this.addPipeState.finish(feature.getProperties().id);
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
            } else if (clickMode == "pan") {
                const lngLat = e.coordinate;
                const [overlay, content, remove] = this.createBasePopup();
                overlay.setPosition(e.coordinate);
                const id = feature.getProperties().id;
                const { total_head } = this.epanetState.local.getReservoirProperties(id);
                render(<ReservoirPropertiesPopup
                    applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                    id={id}
                    lngLat={e.coordinate}
                    project_path={this.project_path}
                    remove={remove}
                    total_head={total_head}
                />, content);
                this.map.addOverlay(overlay);
            }
        }
    }

    private handleJunctionsClick(e: MapBrowserEvent<any>, feature: FeatureLike) {
        console.log('junctions clicked');
        if (!e.defaultPrevented) {
            e.preventDefault();
            const clickMode = this.clickMode.getClickMode();
            switch (clickMode) {
                case "add_pipe":
                    try {
                        if (this.addPipeState.start_id == '') {
                            this.addPipeState.start(feature.getProperties().id);
                        } else {
                            this.addPipeState.finish(feature.getProperties().id);
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
                    const lngLat = e.coordinate;
                    const [overlay, content, remove] = this.createBasePopup();
                    overlay.setPosition(e.coordinate);
                    // const feature = e.features![0];
                    const id = feature.getProperties().id;
                    const { elevation } = this.epanetState.local.getJunctionProperties(id);
                    render(<JunctionPropertiesPopup
                        elevation={elevation}
                        id={id}
                        project_path={this.project_path}
                        applyAndSendChange={(msg) => { this.renderSbPacket(msg); this.epanetState.applyLocalAndSend(msg) }}
                        remove={remove}
                    />, content);
                    this.map.addOverlay(overlay);
                    break;
                }
                default:
                    console.log('WARNING: unhandled clickMode for junctions-layer:', clickMode);
                    break;
            }
        }
    }
}
