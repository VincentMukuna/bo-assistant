import { TaggedError } from "better-result";

export class CustomerNotFound extends TaggedError("CustomerNotFound")<{
  customerId: number;
  message: string;
}> {}

export class CustomerStoreUnavailable extends TaggedError("CustomerStoreUnavailable")<{
  operation: "create" | "update" | "delete";
  customerId?: number;
  cause: unknown;
  message: string;
}> {}
