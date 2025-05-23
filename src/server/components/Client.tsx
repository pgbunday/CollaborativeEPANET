import Layout from "./Layout.js";

export default function Client(props: {
	lng: number;
	lat: number;
	zoom: number;
	project_name: string;
	utm_zone: string;
}) {
	return (
		<Layout
			title="Map"
			loggedIn={true}
			head={<link rel="stylesheet" href="/static/client.css" />}
		>
			<meta name="map-center-lng" value={props.lng} />
			<meta name="map-center-lat" value={props.lat} />
			<meta name="map-zoom" value={props.zoom} />
			<meta name="project-name" value={props.project_name} />
			<meta name="utm-zone" value={props.utm_zone} />
			<script src="/static/client.js" type="module" />
			<div id="app-container" class="app-container">
				<div id="toolbar" class="container toolbar-container" />
				<div id="map" class="container map-container" />
			</div>
		</Layout>
	);
}
