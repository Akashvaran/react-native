import { useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../productedRoute/AuthanticationContext';
import { Alert } from 'react-native';
// import { useNavigation } from '@react-navigation/native';


const AxiosInterceptor = () => {
  const { logout } = useContext(AuthContext);
//   const Navigation = useNavigation()

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          Alert.alert('Session Expired', 'Please log in again.');
          await logout();
        //   Navigation.navigate('Auth') 
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  return null;
};

export default AxiosInterceptor;
