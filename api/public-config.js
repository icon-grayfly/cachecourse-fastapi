import { handlePublicConfig } from "../src/public-config.js";

export default {
  fetch(request) {
    return handlePublicConfig(request);
  }
};
