import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:8000" || "http://127.0.0.1:8000",
  withCredentials: true,
  timeout: 5000, // 5 second timeout — fail fast when backend is offline
  headers: {
    "Content-Type": "application/json",
  },
})

export default api
