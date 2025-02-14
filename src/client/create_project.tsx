import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './create_project.css';
import '@maptiler/geocoding-control/style.css';
import { render, useState } from 'hono/jsx/dom';
import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';

const map = new maplibregl.Map({
    container: 'map',
    style: {
        sources: {
            'satellite': {
                type: 'raster',
                tiles: ['/tiles/satellite/{z}/{x}/{y}.jpg'],
                attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
            }
        },
        version: 8,
        layers: [
            {
                id: 'satellite',
                source: 'satellite',
                type: 'raster',
            }
        ]
    },
    center: [-102, 39],
    zoom: 4,
});

map.on('load', () => {
    const gc = new GeocodingControl({ apiKey: process.env.MAPTILER_API_KEY, maplibregl });
    map.addControl(gc);
})

function Toolbar() {
    const [projectName, setProjectName] = useState("");
    return <>
        <a href="/projects">Back</a>
        <form method="post" action="/create_project" onSubmit={(e) => {
            const longitude = document.getElementById('longitude')!;
            const latitude = document.getElementById('latitude')!;
            const zoom = document.getElementById('zoom')!;
            longitude.value = map.getCenter().lng;
            latitude.value = map.getCenter().lat;
            zoom.value = map.getZoom();
        }}>
            <input id="longitude" name="longitude" hidden={true} />
            <input id="latitude" name="latitude" hidden={true} />
            <input id="zoom" name="zoom" hidden={true} />
            <label>Name: <input type="text" name="name" id="project-name" onChange={(e) => {
                setProjectName(e.target.value);
            }} /></label>
            <button type="submit">Create</button>
        </form>
    </>
}

const toolbar = document.getElementById('toolbar')!;
render(<Toolbar />, toolbar);