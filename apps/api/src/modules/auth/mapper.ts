import type { Viewer } from "@crossval/contracts";

import { serializeObjectId } from "../../db/object-id.js";
import type { UserDocument } from "../../db/documents.js";

export const toViewer = (user: UserDocument): Viewer => ({
  id: serializeObjectId(user._id),
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});
