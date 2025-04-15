import axiosInstance from './axiosInstance';

export const getCustomers = () => {
  return axiosInstance.get('/customers')
}

export const getCustomer = (id) => {
  return axiosInstance.get(`/customers/${id}`)
}

export const createCustomer = (customerData) => {
  return axiosInstance.post('/customers', customerData)
}

export const updateCustomer = (id, customerData) => {
  return axiosInstance.put(`/customers/${id}`, customerData)
}

export const deleteCustomer = (id) => {
  return axiosInstance.delete(`/customers/${id}`)
}