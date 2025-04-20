import axios from "axios";

const Axios = axios.create({
  baseURL: 'http://192.168.1.2:8000',
  withCredentials: true, 
});

export default Axios;