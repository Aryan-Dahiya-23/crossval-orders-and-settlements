import { createHash, randomBytes } from "node:crypto";

import { parseCookie, stringifySetCookie } from "cookie";
import type { Request, Response } from "express";
import { ObjectId, type Db } from "mongodb";

import { getCollections } from "../../db/collections.js";
import type { SessionDocument } from "../../db/documents.js";
import type { SessionCookieConfiguration } from "./types.js";

export const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const readSessionToken = (
  request: Request,
  configuration: SessionCookieConfiguration,
): string | undefined => {
  const cookieHeader = request.header("cookie");
  if (cookieHeader === undefined) {
    return undefined;
  }

  return parseCookie(cookieHeader)[configuration.name];
};

export const createSession = async (
  database: Db,
  userId: ObjectId,
  configuration: SessionCookieConfiguration,
): Promise<{ session: SessionDocument; token: string }> => {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const session: SessionDocument = {
    _id: new ObjectId(),
    userId,
    tokenHash: hashSessionToken(token),
    createdAt,
    expiresAt: new Date(createdAt.getTime() + configuration.ttlSeconds * 1_000),
  };

  await getCollections(database).sessions.insertOne(session);
  return { session, token };
};

export const setSessionCookie = (
  response: Response,
  token: string,
  expiresAt: Date,
  configuration: SessionCookieConfiguration,
): void => {
  response.append(
    "Set-Cookie",
    stringifySetCookie({
      name: configuration.name,
      value: token,
      httpOnly: true,
      secure: configuration.secure,
      sameSite: "lax",
      path: "/",
      maxAge: configuration.ttlSeconds,
      expires: expiresAt,
    }),
  );
};

export const clearSessionCookie = (
  response: Response,
  configuration: SessionCookieConfiguration,
): void => {
  response.append(
    "Set-Cookie",
    stringifySetCookie({
      name: configuration.name,
      value: "",
      httpOnly: true,
      secure: configuration.secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    }),
  );
};
