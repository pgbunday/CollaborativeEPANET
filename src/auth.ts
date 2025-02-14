import * as bcrypt from "bcrypt";
import { getDb } from "./db.js";
import { randomUUID } from "crypto";
import { z } from "zod";

// TODO: db management?
// export interface DbUser {
//     username: string,
//     hashed_password: string,
//     uuid: string,
//     created_at: Date,
//     last_active: Date,
//     auth_token?: string,
// }

async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    return hashed;
}

export const DbUserSchema = z.object({
    username: z.string(),
    hashed_password: z.string(),
    uuid: z.string(),
    created_at: z.coerce.date(),
    last_active: z.coerce.date(),
    auth_token: z.string(),
});
export type DbUserSchema = z.infer<typeof DbUserSchema>;

export async function getUserByUsernamePassword(username: string, password: string): Promise<DbUserSchema | null> {
    const db = getDb();
    try {
        const maybe_user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        const ret = DbUserSchema.parse(maybe_user);
        if (await bcrypt.compare(password, ret.hashed_password)) {
            return ret;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}

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

export async function insertUser(username: string, password: string): Promise<DbUserSchema | null> {
    const hashed_password = await hashPassword(password);
    const db = getDb();
    const now = new Date();
    const now_str = now.toISOString();
    const uuid = randomUUID();
    // TODO: maybe different code for auth_token?
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