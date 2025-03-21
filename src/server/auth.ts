import bcryptjs from "bcryptjs";
import { getDb } from "./db.js";
import { randomUUID } from "crypto";
import { z } from "zod"; // zod is a general javascript library for validating incoming data

/**Hashes the password to secure the data.
 * @param password the password of a user
 * @returns a number generated by the hash function
 */
async function hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    const hashed = await bcryptjs.hash(password, salt);
    return hashed;
}

/**A node of all the data of a user
 */
export const DbUserSchema = z.object({ // how user's table is formatted in database
    username: z.string(),
    hashed_password: z.string(),
    uuid: z.string(),
    created_at: z.coerce.date(), // when account was created
    last_active: z.coerce.date(), // last login
    auth_token: z.string(), // string to send to server to say "I have logged in"
});
export type DbUserSchema = z.infer<typeof DbUserSchema>;

/**Gets the User by the username and password (checking if valid).
 * @param username the string of the username
 * @param password the string of the password
 * @returns a DBUserSchema of the user being searched up.
 */
export async function getUserByUsernamePassword(username: string, password: string): Promise<DbUserSchema | null> {
    const db = getDb();
    try {
        const maybe_user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        const ret = DbUserSchema.parse(maybe_user);
        if (await bcryptjs.compare(password, ret.hashed_password)) {
            return ret;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}

/**Gets the User by the username only (checking if valid).
 * @param username the string of the username
 * @returns a DBUserSchema of the user being searched up.
 */
export function getUserByUsername(username: string): DbUserSchema | null {
    const db = getDb();
    try {
        const maybe_user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        const ret = DbUserSchema.parse(maybe_user);
        return ret;
    } catch (err) {
        return null;
    }
}

/**Inserts the User if it is a new user
 * @param username the string of the username
 * @param password the string of the password
 * @returns a new DBUserSchema with the given username and password
 */
export async function insertUser(username: string, password: string): Promise<DbUserSchema | null> {
    const hashed_password = await hashPassword(password);
    const db = getDb();
    const now = new Date();
    const now_str = now.toISOString();
    const uuid = randomUUID();
    const auth_token = randomUUID();
    try {
        const result = db.prepare('INSERT INTO users (username, hashed_password, uuid, created_at, last_active, auth_token) VALUES (@username, @hashed_password, @uuid, @now_str, @now_str, @auth_token)').run({
            username,
            hashed_password,
            now_str,
            uuid,
            auth_token,
        });
        if (result.changes == 1) {
            return {
                created_at: now,
                hashed_password,
                last_active: now,
                username,
                uuid,
                auth_token,
            }
        } else {
            return null;
        }
    } catch (err) {
        console.log('insertUser error:', err);
        return null;
    }
}

/**Gets the User by the AuthToken (checking if valid).
 * @param auth_token the string of the authtoken
 * @returns a DBUserSchema searched up based on authtoken.
 */
export function getUserByAuthToken(auth_token: string): DbUserSchema | null {
    if (auth_token == null || auth_token == '') {
        return null;
    }
    const db = getDb();
    try {
        const user = db.prepare('SELECT * FROM users WHERE auth_token = ?').get(auth_token);
        const dbUser = DbUserSchema.parse(user);
        return dbUser;
    } catch (err) {
        console.log('getUserByAuthToken error:', err);
        return null;
    }
}