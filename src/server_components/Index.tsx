import type { PageData } from "./Layout.js";
import Layout from "./Layout.js";

// The index, like index.html, is the first page loaded
export default function Index(props: PageData) {
    let authOptions;
    if (props.user) {
        authOptions = <div>
            <p><a href="/logout">Log Out</a></p>
            <p><a href="/projects">Projects</a></p>
        </div>;
    } else {
        authOptions = <div>
            <p><a href="/login">Log In</a></p>
            <p><a href="/register">Register</a></p>
        </div>
    }
    return <Layout title={props.title} loggedIn={props.loggedIn}>
        {authOptions}
        <h1>Welcome to Collaborative EPANET!</h1>
        {props.children}
    </Layout>
}