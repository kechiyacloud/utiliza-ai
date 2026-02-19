import axios from "axios"

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 5000, // 5 second timeout — fail fast when backend is offline
  headers: {
    "Content-Type": "application/json",
  },
})

export default api
