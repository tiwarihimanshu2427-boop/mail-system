import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    console.log("API REQUEST:", {
      url: config.url,
      method: config.method,
      tokenExists: !!token,
      tokenLength: token ? token.length : 0,
    });

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // =====================================================
    // IMPORTANT: FILE UPLOAD / FORMDATA
    // Browser ko multipart boundary khud set karne do.
    // =====================================================

    if (config.data instanceof FormData) {
      console.log("=================================");
      console.log("FORMDATA DETECTED");
      console.log("FILES/FORMDATA WILL BE SENT AS MULTIPART");
      console.log("=================================");

      // AxiosHeaders aur normal object dono cases handle karo
      if (
        config.headers &&
        typeof config.headers.delete === "function"
      ) {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }

      // Make absolutely sure lowercase version is also removed
      delete config.headers["content-type"];
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    console.log("API RESPONSE ERROR:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message,
    });

    return Promise.reject(error);
  }
);

export default api;