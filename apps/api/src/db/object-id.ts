import { ObjectId } from "mongodb";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export class InvalidObjectIdError extends Error {
  public constructor() {
    super("Resource identifier must be a 24-character hexadecimal ObjectId.");
    this.name = "InvalidObjectIdError";
  }
}

export const parseObjectId = (value: string): ObjectId | null => {
  if (!objectIdPattern.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

export const requireObjectId = (value: string): ObjectId => {
  const objectId = parseObjectId(value);

  if (objectId === null) {
    throw new InvalidObjectIdError();
  }

  return objectId;
};

export const serializeObjectId = (value: ObjectId): string =>
  value.toHexString();
