// import 'maplibre-gl/dist/maplibre-gl.css';
import {
	type RefObject,
	render,
	useEffect,
	useRef,
	useState,
} from "hono/jsx/dom";
import type { JSX } from "hono/jsx/jsx-runtime";
import type { TrackEditSb } from "../packets/serverbound";
import HistoryModal from "./components/HistoryModal";
import type { ClickModes } from "./state/ClickMode.js";
import MapState from "./state/MapState.js";
import "./client.css";

const metaLatitude = document
	.querySelector('meta[name="map-center-lat"]')
	?.getAttribute("value");
const metaLongitude = document
	.querySelector('meta[name="map-center-lng"]')
	?.getAttribute("value");
const metaZoom = document
	.querySelector('meta[name="map-zoom"]')
	?.getAttribute("value");
const metaProjectName = document
	.querySelector('meta[name="project-name"]')
	?.getAttribute("value");
const metaUtmZone = document
	.querySelector('meta[name="utm-zone"]')
	?.getAttribute("value");

// Some non-React globals: store at least the project URL and UUID for use in
// fetch requests, without needing to pass them everywhere
const project_url = document.location.href;
const project_path = document.location.pathname;
const [_, project_uuid] = project_url.split("/projects/");

const glyphsUrlFull = new URL(window.location.href);
glyphsUrlFull.pathname = "/";
const glyphsUrl = `${glyphsUrlFull.href}font/{fontstack}/{range}.pbf`;

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
	name: string;
	value: ClickModes;
	checked?: boolean;
}) {
	return (
		<label>
			<input
				type="radio"
				name="click_mode"
				value={props.value}
				checked={props.checked}
				onInput={(e) => {
					mapState.clickMode.setClickMode(props.value);
				}}
			/>
			<span>{props.name}</span>
		</label>
	);
}

function ClickModeMenu() {
	return (
		<div class="click-modes">
			<ClickModeRadio name="Pan" value="pan" checked />
			<ClickModeRadio name="Add Junction" value="add_junction" />
			<ClickModeRadio name="Add Reservoir" value="add_reservoir" />
			<ClickModeRadio name="Add Tank" value="add_tank" />
			<ClickModeRadio name="Add Pipe" value="add_pipe" />
		</div>
	);
}

function ShareModal({
	open,
	setOpen,
}: { open: boolean; setOpen: (value: boolean) => void }) {
	const dialogRef: RefObject<HTMLDialogElement | null> = useRef(null);
	const [username, setUsername] = useState("");
	return (
		<div>
			<button
				type="button"
				onClick={() => {
					dialogRef.current?.showModal();
					setOpen(true);
				}}
			>
				Share
			</button>
			<dialog class="share-dialog" ref={dialogRef} open={open}>
				<label>
					Username:{" "}
					<input
						type="text"
						name="username"
						onChange={(e) => setUsername((e.target as HTMLInputElement).value)}
					/>
				</label>
				<button
					type="submit"
					onClick={async (e) => {
						console.log("attempting to share with user:", username);
						const response = await fetch(`${project_path}/add_user`, {
							body: JSON.stringify({
								username,
							}),
							headers: [["Content-Type", "application/json"]],
							method: "POST",
						});
						// TODO: display success or failure by parsing response
						dialogRef.current?.close();
						setOpen(false);
					}}
				>
					Share
				</button>
				<button
					type="button"
					onClick={() => {
						dialogRef.current?.close();
						setOpen(false);
					}}
				>
					Close
				</button>
			</dialog>
		</div>
	);
}

function Toolbar() {
	const [shareOpen, setShareOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	return (
		<div class="toolbar">
			<div class="toolbar-left">
				<h3 class="project-name">{metaProjectName}</h3>
				<ClickModeMenu />
			</div>
			<div class="toolbar-right">
				<ShareModal open={shareOpen} setOpen={setShareOpen} />
				<HistoryModal
					open={historyOpen}
					setOpen={setHistoryOpen}
					mapState={mapState}
				/>
				<h3 class="back-button">
					<a href="/projects">Back</a>
				</h3>
			</div>
		</div>
	);
}

const toolbar = document.getElementById("toolbar")!;
render(<Toolbar />, toolbar);
