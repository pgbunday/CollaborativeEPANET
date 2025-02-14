import Layout from "./Layout.js"

// Server-rendered login page
export default function Login() {
    return <Layout title="Login">
        <h1>Login</h1>
        <form method="post" action="/login">
            <label>Username: <input type="text" name="username" /></label>
            <label>Password: <input type="password" name="password" /></label>
            <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <a href="/register">Register!</a></p>
    </Layout>
}