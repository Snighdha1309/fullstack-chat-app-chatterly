import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "/api", // Very important!
  withCredentials: true
});
