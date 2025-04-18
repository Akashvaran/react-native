import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const LocationSharingModal = ({ visible, onClose, onSend, isSending }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in settings to share your location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to share your location',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (currentLocation) {
      const locationMessage = `My location: https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      onSend(locationMessage);
    }
  };

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    } else {
      setCurrentLocation(null);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Share Location</Text>
          <TouchableOpacity onPress={handleSend} disabled={!currentLocation || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : currentLocation ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
              pinColor="#007AFF"
            />
          </MapView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Could not get your location</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
  },
});

export default LocationSharingModal;