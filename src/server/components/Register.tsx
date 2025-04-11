import Layout from "./Layout.js";

// Server-rendered register page
export default function Register() {
	return (
		<Layout title="Register">
			<h1>Register</h1>
			<form method="post" action="/register">
				<label>
					Username: <input type="text" name="username" />
				</label>
				<label>
					Password: <input type="password" name="password" />
				</label>
				<button type="submit">Register</button>
			</form>
			<p>
				Already have an account? <a href="/login">Log In!</a>
			</p>
		</Layout>
	);
}
