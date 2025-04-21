import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

const MessageInput = ({
  value,
  onChangeText,
  onSend,
  onSendAudio,
  onSendLocation,
  isSending = false,
  placeholder = "Type a message...",
  isEditing = false,
  onCancelEdit,
  maxLength = 500,
  style,
  buttonColor = '#4CAF50'
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (value.trim() && !isSending) {
      onSend();
      inputRef.current?.blur();
    }
  };

  return (
    <>
      <View style={[styles.inputContainer, style]}>
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => setShowLinkModal(true)}
        >
          <Ionicons name="add" size={24} color={buttonColor} />
        </TouchableOpacity>
        
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={maxLength}
        />
        
        {isEditing ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancelEdit}
          >
            <Text style={[styles.cancelButtonText, { color: buttonColor }]}>Cancel</Text>
          </TouchableOpacity>
        ) : value.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={buttonColor} />
            ) : (
              <Icon name="send" size={24} color={buttonColor} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() => setShowAudioRecorder(true)}
          >
            <Icon name="keyboard-voice" size={24} color={buttonColor} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showLinkModal} transparent animationType="fade" onRequestClose={() => setShowLinkModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLinkModal(false)}>
          <View style={styles.linkOptionsContainer}>
            <TouchableOpacity 
              onPress={() => {
                setShowLinkModal(false);
                setShowLocationModal(true);
              }} 
              style={styles.linkOptionButton}
            >
              <Icon name="location-on" size={24} color={buttonColor} />
              <Text style={styles.linkOptionText}>Share Location</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              onPress={() => {
                setShowLinkModal(false);
                setShowAudioRecorder(true);
              }}
              style={styles.linkOptionButton}
            >
              <Icon name="keyboard-voice" size={24} color={buttonColor} />
              <Text style={styles.linkOptionText}>Send Audio</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              onPress={() => setShowLinkModal(false)} 
              style={styles.linkOptionButton}
            >
              <Text style={[styles.cancelOptionText, { color: buttonColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {showLocationModal && (
        <LocationSharingModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSend={onSendLocation}
          isSending={isSending}
        />
      )}

      {showAudioRecorder && (
        <AudioRecorder 
          onRecordingComplete={(audioData) => {
            onSendAudio(audioData);
            setShowAudioRecorder(false);
          }}
          onCancel={() => setShowAudioRecorder(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    alignItems: 'center',
  },
  linkButton: {
    padding: 8,
    marginRight: 5,
  },
  audioButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    padding: 10,
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  linkOptionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
  },
  linkOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  linkOptionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  cancelOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 5,
  },
});

export default MessageInput;