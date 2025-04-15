
import axiosInstance from './axiosInstance'

export const loginUser = (email, password) => {
  return axiosInstance.post('/users/login', { email, password })
}

export const registerUser = (userData) => {
  return axiosInstance.post('/users/register', userData)
}

export const getCurrentUser = () => {
  return axiosInstance.get('/users/me')
}

export const updateUserDetails = (userData) => {
  return axiosInstance.put('/users/me', userData)
}

export const updatePassword = (passwordData) => {
  return axiosInstance.put('/users/updatepassword', passwordData)
}