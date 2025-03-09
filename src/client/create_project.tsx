// import maplibregl from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';
import 'ol/ol.css';
import '@maptiler/geocoding-control/style.css';
import './create_project.css';
import { render, useState } from 'hono/jsx/dom';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import { GeocodingControl } from '@maptiler/geocoding-control/openlayers';
import { Attribution, defaults } from 'ol/control';
import { useGeographic } from 'ol/proj';
// import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';

useGeographic();

const attribution = new Attribution({ collapsible: false });

const map = new Map({
    target: 'map',
    layers: [
        new TileLayer({
            source: new XYZ({
                url: '/tiles/satellite/{z}/{x}/{y}.jpg',
                projection: 'EPSG:3857',
                tileSize: 512,
            })
        })
    ],
    controls: defaults({ attribution: false }).extend([
        attribution,
        // new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY! }),
    ]),
    view: new View({
        constrainResolution: true,
        center: [-102, 39],
        zoom: 4,
    }),
    // style: {
    //     sources: {
    //         'satellite': {
    //             type: 'raster',
    //             tiles: ['/tiles/satellite/{z}/{x}/{y}.jpg'],
    //             attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    //         }
    //     },
    //     version: 8,
    //     layers: [
    //         {
    //             id: 'satellite',
    //             source: 'satellite',
    //             type: 'raster',
    //         }
    //     ]
    // },
});

const gc = new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY! });
map.addControl(gc);

function Toolbar() {
    const [projectName, setProjectName] = useState("");
    return <>
        <a href="/projects">Back</a>
        <form method="post" action="/create_project" onSubmit={(e) => {
            const longitude = document.getElementById('longitude') as HTMLInputElement;
            const latitude = document.getElementById('latitude') as HTMLInputElement;
            const zoom = document.getElementById('zoom') as HTMLInputElement;
            longitude.value = String(map.getView().getCenter()![0]);
            latitude.value = String(map.getView().getCenter()![1]);
            zoom.value = String(map.getView().getZoom());
        }}>
            <input id="longitude" name="longitude" hidden={true} />
            <input id="latitude" name="latitude" hidden={true} />
            <input id="zoom" name="zoom" hidden={true} />
            <label>Name: <input type="text" name="name" id="project-name" onChange={(e) => {
                setProjectName((e.target as HTMLInputElement).value);
            }} /></label>
            <button type="submit">Create</button>
        </form>
    </>
}

const toolbar = document.getElementById('toolbar')!;
render(<Toolbar />, toolbar);