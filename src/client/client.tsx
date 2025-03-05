import 'maplibre-gl/dist/maplibre-gl.css';
import "./client.css"
import { render, useEffect, useRef, useState, type RefObject } from 'hono/jsx/dom';
import MapState from './state/MapState.js';
import type { ClickModes } from './state/ClickMode.js';
import type { JSX } from 'hono/jsx/jsx-runtime';
import type { TrackEditSb } from '../packets/serverbound';

// proj4.defs('utm15n', '+proj=utm +zone=15 +datum=WGS84 +units=m +no_defs +type=crs');

const metaLatitude = document.querySelector('meta[name="map-center-lat"]')?.getAttribute('value');
const metaLongitude = document.querySelector('meta[name="map-center-lng"]')?.getAttribute('value');
const metaZoom = document.querySelector('meta[name="map-zoom"]')?.getAttribute('value');
const metaProjectName = document.querySelector('meta[name="project-name"]')?.getAttribute('value');
const metaUtmZone = document.querySelector('meta[name="utm-zone"]')?.getAttribute('value');

// Some non-React globals: store at least the project URL and UUID for use in
// fetch requests, without needing to pass them everywhere
const project_url = document.location.href;
const project_path = document.location.pathname;
const [_, project_uuid] = project_url.split('/projects/');

const glyphsUrlFull = new URL(window.location.href);
glyphsUrlFull.pathname = '/';
const glyphsUrl = glyphsUrlFull.href + 'font/{fontstack}/{range}.pbf';

const mapState = new MapState({
    utm_zone: String(metaUtmZone),
    glyphsUrl,
    latitude: Number(metaLatitude),
    longitude: Number(metaLongitude),
    project_path,
    project_url,
    zoom: Number(metaZoom),
});

function ClickModeRadio(props: {
    name: string,
    value: ClickModes,
    checked?: boolean,
}) {
    return <label>
        <input type="radio" name="click_mode" value={props.value} checked={props.checked} onInput={(e) => {
            mapState.clickMode.setClickMode(props.value);
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
                <label>Username: <input type="text" name="username" onChange={(e) => setUsername((e.target as HTMLInputElement).value)} /></label>
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

function editTreeToElementArray(closeDialog: () => void): JSX.Element[] {
    const edits = mapState.epanetState.editTree.edits.values().toArray();
    edits.sort((a, b) => {
        if (a.edit_id < b.edit_id) {
            return -1;
        } else if (a.edit_id > b.edit_id) {
            return 1;
        } else {
            return 0;
        }
    });
    const items = edits.map(edit => {
        return <li key={edit.edit_id}>
            {edit.created_at.toISOString()}
            {' '}
            {edit.action.type}
            <button onClick={async () => {
                const toSend: TrackEditSb = {
                    type: "track_edit_sb",
                    edit_id: edit.edit_id,
                };
                mapState.epanetState.applyLocalAndSend(toSend);
                closeDialog();
            }}>Restore</button>
        </li>
    });
    console.log('editTreeToElementArray return:', items);
    return items;
}

function HistoryModal(props: { dialogRef: RefObject<HTMLDialogElement | null> }) {
    const [listItems, setListItems] = useState<JSX.Element[]>([]);
    useEffect(() => {
        setListItems(editTreeToElementArray(() => props.dialogRef.current?.close()));
        mapState.subscribeAfterLoad((p) => {
            if (p.type == "epanet_action_cb" || p.type == "track_edit_cb") {
                setListItems(editTreeToElementArray(() => props.dialogRef.current?.close()));
            }
        });
        return () => { }
    }, []);
    console.log(listItems);
    return (
        <div>
            <button onClick={() => props.dialogRef.current?.showModal()}>History</button>
            <dialog class="history-dialog" ref={props.dialogRef}>
                <ul>{listItems}</ul>
                <button onClick={() => props.dialogRef.current?.close()}>Close</button>
            </dialog>
        </div>
    )
}

function Toolbar() {
    const dialogRef = useRef(null);
    const historyDialogRef = useRef(null);
    return <div class="toolbar">
        <div class="toolbar-left">
            <h3 class="project-name">{metaProjectName}</h3>
            <ClickModes />
        </div>
        <div class="toolbar-right">
            <ShareModal dialogRef={dialogRef} />
            <HistoryModal dialogRef={historyDialogRef} />
            <h3 class="back-button"><a href="/projects">Back</a></h3>
        </div>
    </div>
}

const toolbar = document.getElementById('toolbar')!;
render(<Toolbar />, toolbar);
