import Layout from "./Layout.js";

export default function CreateProject() {
	return (
		<Layout
			title="Create Project"
			loggedIn={true}
			head={<link rel="stylesheet" href="/static/create_project.css" />}
		>
			<script src="/static/create_project.js" type="module" />
			<div id="app-container" class="app-container">
				<div id="toolbar" class="container toolbar-container" />
				<div id="map" class="container map-container" />
			</div>
		</Layout>
	);
}
