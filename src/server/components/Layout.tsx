import type { DbUserSchema } from "../auth.js"

// Basic props to serve to all server-rendered pages
export interface PageData {
    title: string,
    loggedIn?: boolean,
    user?: DbUserSchema,
    head?: any,
    children?: any
}

// Base layout for server-rendered pages
export default function Layout(props: PageData) {
    return (
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                {props.head}
                <title>{props.title}</title>
            </head>
            <body>{props.children}</body>
        </html>
    )
}