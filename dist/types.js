"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFacingError = void 0;
class UserFacingError extends Error {
    constructor(message) {
        super(message);
        this.name = "UserFacingError";
    }
}
exports.UserFacingError = UserFacingError;
//# sourceMappingURL=types.js.map