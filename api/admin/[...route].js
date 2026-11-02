import { handleAdminAPI } from "../../src/admin-api.js";

export default {
  fetch(request) {
    return handleAdminAPI(request);
  }
};
