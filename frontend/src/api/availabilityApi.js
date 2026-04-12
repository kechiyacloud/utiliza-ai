import api from "./axios"

export const getAvailabilityData = async (filters = {}) => {
  try {
    const response = await api.get("/availability/all", { params: filters })
    return response.data
  } catch (error) {
    console.error("Error fetching availability data:", error)
    throw error
  }
}

export const getAvailabilityFilters = async () => {
  try {
    const response = await api.get("/availability/filters")
    return response.data
  } catch (error) {
    console.error("Error fetching availability filters:", error)
    throw error
  }
}
