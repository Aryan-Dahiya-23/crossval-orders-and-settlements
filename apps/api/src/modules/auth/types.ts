import type { ObjectId } from "mongodb";

import type { Viewer } from "@crossval/contracts";

export interface AuthenticationContext {
  sessionId: ObjectId;
  userId: ObjectId;
  viewer: Viewer;
}

export interface SessionCookieConfiguration {
  name: string;
  ttlSeconds: number;
  secure: boolean;
}
