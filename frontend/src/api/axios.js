import axios from "axios"

const BASE_URL = import.meta.env.VITE_API_URL || ""

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

export default api
