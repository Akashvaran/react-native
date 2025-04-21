import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';

const AudioRecorder = ({ onRecordingComplete, onCancel }) => {
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef(null);

  const cleanupRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (err) {
      console.log(err);
      
      }
    }
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    setRecording(null);
    setRecordingDuration(0);
  };

  const startRecording = async () => {
    try {
      await cleanupRecording();

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access to record audio.');
        onCancel();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setRecordingDuration(0);

      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
      onCancel();
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      if (recordingDuration < 1) {
        Alert.alert('Too short', 'Recording must be at least 1 second');
        await cleanupRecording();
        onCancel();
        return;
      }

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(uri);

      onRecordingComplete({
        audio: base64Audio,
        duration: recordingDuration,
        uri: uri,
        size: fileInfo.size,
        mimeType: 'audio/m4a',
        fileName: `audio_${Date.now()}.m4a`
      });

      await cleanupRecording();
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to stop recording');
      await cleanupRecording();
      onCancel();
    }
  };

  const handleCancel = async () => {
    await cleanupRecording();
    onCancel();
  };

  useEffect(() => {
    startRecording();
    return () => {
      cleanupRecording();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.recordingContainer}>
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording</Text>
        </View>

        <Text style={styles.durationText}>
          {formatTime(recordingDuration)}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.stopButton}
          onPress={stopRecording}
        >
          <MaterialIcons name="stop" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  recordingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: 'red',
  },
  durationText: {
    fontSize: 16,
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 15,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  stopButton: {
    backgroundColor: 'red',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AudioRecorder;
