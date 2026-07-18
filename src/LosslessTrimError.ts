import { TrimErrorCode } from "./LosslessTrim.types";

/**
 * Error thrown by {@link trimAsync}. The `code` field is stable and safe to
 * branch on; the `message` is human-readable and may change.
 */
export class TrimError extends Error {
  readonly code: TrimErrorCode;

  constructor(code: TrimErrorCode, message: string) {
    super(message);
    this.name = "TrimError";
    this.code = code;
    // Restore the prototype chain when compiled down to ES5 targets.
    Object.setPrototypeOf(this, TrimError.prototype);
  }
}
