import axios from "axios";
import config from "../config";

const api = axios.create({
  baseURL: config.api.url,
  auth: {
    username: config.api.username,
    password: config.api.password,
  },
});

export { api };
