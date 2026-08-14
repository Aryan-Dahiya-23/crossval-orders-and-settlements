import type { LoginRequest, SignupRequest, Viewer } from "@crossval/contracts";
import { MongoServerError, ObjectId, type Db } from "mongodb";

import { getCollections } from "../../db/collections.js";
import { AppError } from "../../errors/app-error.js";
import { toViewer } from "./mapper.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSession, hashSessionToken } from "./session.js";
import type {
  AuthenticationContext,
  SessionCookieConfiguration,
} from "./types.js";

export interface AuthenticationResult {
  viewer: Viewer;
  token: string;
  expiresAt: Date;
}

export class AuthService {
  public constructor(
    private readonly database: Db,
    private readonly sessionConfiguration: SessionCookieConfiguration,
  ) {}

  public async signup(input: SignupRequest): Promise<AuthenticationResult> {
    const { users } = getCollections(this.database);
    const timestamp = new Date();
    const user = {
      _id: new ObjectId(),
      email: input.email,
      passwordHash: await hashPassword(input.password),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await users.insertOne(user);
    } catch (error: unknown) {
      if (error instanceof MongoServerError && error.code === 11_000) {
        throw new AppError({
          status: 409,
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists.",
        });
      }
      throw error;
    }

    try {
      const { session, token } = await createSession(
        this.database,
        user._id,
        this.sessionConfiguration,
      );
      return { viewer: toViewer(user), token, expiresAt: session.expiresAt };
    } catch (error: unknown) {
      await users.deleteOne({ _id: user._id }).catch(() => undefined);
      throw error;
    }
  }

  public async login(
    input: LoginRequest,
    currentToken: string | undefined,
  ): Promise<AuthenticationResult> {
    const { users, sessions } = getCollections(this.database);
    const user = await users.findOne({ email: input.email });
    const matches = await verifyPassword(
      user?.passwordHash ?? null,
      input.password,
    );

    if (user === null || !matches) {
      throw new AppError({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    const { session, token } = await createSession(
      this.database,
      user._id,
      this.sessionConfiguration,
    );

    if (currentToken !== undefined) {
      await sessions.deleteOne({ tokenHash: hashSessionToken(currentToken) });
    }

    return { viewer: toViewer(user), token, expiresAt: session.expiresAt };
  }

  public async logout(token: string | undefined): Promise<void> {
    if (token === undefined) {
      return;
    }

    await getCollections(this.database).sessions.deleteOne({
      tokenHash: hashSessionToken(token),
    });
  }

  public async authenticate(
    token: string | undefined,
  ): Promise<AuthenticationContext | null> {
    if (token === undefined) {
      return null;
    }

    const { sessions, users } = getCollections(this.database);
    const session = await sessions.findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (session === null) {
      return null;
    }

    const user = await users.findOne({ _id: session.userId });
    if (user === null) {
      await sessions.deleteOne({ _id: session._id });
      return null;
    }

    return {
      sessionId: session._id,
      userId: user._id,
      viewer: toViewer(user),
    };
  }
}
