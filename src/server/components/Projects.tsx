import type { DbProject } from "../db.js";
import Layout from "./Layout.js";

export default (props: { projects: DbProject[] }) => {
	return (
		<Layout
			title="Projects"
			loggedIn={true}
			head={<link rel="stylesheet" href="/static/projects.css" />}
		>
			<h1>Projects!</h1>
			<ul>
				{props.projects.map((item) => {
					return (
						<li key={item.uuid}>
							<a href={`/projects/${item.uuid}`}>{item.name}</a>
						</li>
					);
				})}
			</ul>
			<p>
				<a href="/create_project">Create Project</a>
			</p>
		</Layout>
	);
};
