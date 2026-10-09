import { handleAdminAuth } from "../../src/admin-auth.js";

export default {
  fetch(request) {
    return handleAdminAuth(request);
  }
};
