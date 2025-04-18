import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Linking
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Axios from '../axios/Axios';
import moment from 'moment';
import { AuthContext } from '../productedRoute/AuthanticationContext';
import { SocketContext } from './SocketContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import LocationSharingModal from './LocationSharingModel';
import AudioRecorder from './AudioRecorder';

const ChatScreen = () => {
  const route = useRoute();
  const { user } = route.params;
  const { userId } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const { socket, onlineUsers, typingUsers, sendMessage, startTyping, markAsRead, editMessage, deleteMessage } = useContext(SocketContext);
  const flatListRef = useRef(null);
  const textInputRef = useRef(null);
  const navigation = useNavigation();
  const maxWord = 100;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await Axios.get(`/chat/messages/${userId}/${user._id}`);
        setMessages(response.data.map(msg => ({
          _id: msg._id,
          text: msg.message,
          sender: msg.sender,
          receiver: msg.receiver,
          createdAt: msg.createdAt,
          status: msg.read ? 'viewed' : 'delivered',
          isEdited: msg.isEdited 
        })));
        markAsRead(user._id);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [user._id, userId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages(prev => {
        if (prev.some(msg => msg._id === message._id)) return prev;
        
        return [...prev, {
          _id: message._id,
          text: message.text || message.message,
          sender: message.senderId,
          receiver: message.receiverId,
          createdAt: message.createdAt || new Date(),
          status: message.status || 'delivered',
          isEdited: message.isEdited
        }];
      });
    
      if (message.senderId === user._id) {
        markAsRead(user._id);
      }
    };

    const handleMessageEdited = (editedMessage) => {
      setMessages(prev => prev.map(msg => 
        msg._id === editedMessage._id ? {
          ...msg,
          text: editedMessage.text,
          isEdited: true
        } : msg
      ));
    };
  
    const handleMessageDeleted = (deletedMessageId) => {
      setMessages(prev => prev.filter(msg => msg._id !== deletedMessageId));
    };

    socket.on('receiveMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [socket, user._id, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || newMessage.length > maxWord || isSending) return;
    
    setIsSending(true);
    
    try {
      if (editingMessage) {
        await editMessage(editingMessage._id, newMessage);
        setEditingMessage(null);
      } else {
        const tempMessage = {
          _id: Date.now().toString(),
          text: newMessage,
          sender: userId,
          receiver: user._id,
          createdAt: new Date(),
          status: 'sending',
          isEdited: false
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        const response = await sendMessage(user._id, newMessage);
        
        if (response?.data?._id) {
          setMessages(prev => prev.map(msg => 
            msg._id === tempMessage._id ? {
              ...msg,
              _id: response.data._id,
              status: onlineUsers.includes(user._id) ? 'viewed' : 'delivered',
              createdAt: response.data.createdAt || new Date()
            } : msg
          ));
        }
      }
      setNewMessage('');
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.status === 'sending' ? {
          ...msg,
          status: 'failed'
        } : msg
      ));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAudio = async (audioData) => {
    try {
      setIsSending(true);
      
      const tempMessage = {
        _id: Date.now().toString(),
        text: '[Audio message]',
        audio: audioData.audio,
        duration: audioData.duration,
        sender: userId,
        receiver: user._id,
        createdAt: new Date(),
        status: 'sending',
        isEdited: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      const response = await sendMessage(user._id, '[Audio message]', audioData);
      
      if (response?.data?._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage._id ? {
            ...msg,
            _id: response.data._id,
            status: onlineUsers.includes(user._id) ? 'viewed' : 'delivered',
            createdAt: response.data.createdAt || new Date()
          } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      setMessages(prev => prev.map(msg => 
        msg.status === 'sending' ? {
          ...msg,
          status: 'failed'
        } : msg
      ));
      Alert.alert('Error', 'Failed to send audio message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendLocation = async (locationMessage) => {
    try {
      setIsSending(true);
      
      const tempMessage = {
        _id: Date.now().toString(),
        text: locationMessage,
        sender: userId,
        receiver: user._id,
        createdAt: new Date(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      const response = await sendMessage(user._id, locationMessage);
      
      if (response?.data?._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === tempMessage._id ? {
            ...msg,
            _id: response.data._id,
            status: onlineUsers.includes(user._id) ? 'viewed' : 'delivered',
            createdAt: response.data.createdAt || new Date()
          } : msg
        ));
      }
      
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error sending location:', error);
      setMessages(prev => prev.map(msg => 
        msg.status === 'sending' ? {
          ...msg,
          status: 'failed'
        } : msg
      ));
      Alert.alert('Error', 'Failed to send location');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = (message) => {
    setSelectedMessage(message);
    setShowOptions(true);
  };

  const handleEdit = () => {
    setEditingMessage(selectedMessage);
    setNewMessage(selectedMessage.text);
    setShowOptions(false);
    textInputRef.current?.focus();
  };

  const handleDelete = () => {
    setShowOptions(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteMessage(selectedMessage._id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const closeOptions = () => {
    setShowOptions(false);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.message,
      item.sender === userId ? styles.sentMessage : styles.receivedMessage,
      item.status === 'failed' && styles.failedMessage
    ]}>
      {item.text.startsWith('My location:') ? (
        <TouchableOpacity 
          onPress={() => {
            const url = item.text.split('My location:')[1].trim();
            Linking.openURL(url).catch(err => {
              console.error('Failed to open URL:', err);
              Alert.alert('Error', 'Could not open map');
            });
          }}
        >
          <Text style={[
            item.sender === userId ? styles.sentMessageText : styles.messageText,
            { color: '#007AFF', textDecorationLine: 'underline' }
          ]}>
            View Location on Map
          </Text>
        </TouchableOpacity>
      ) : item.audio ? (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert('Audio Message', `Audio duration: ${item.duration} seconds`);
          }}
          style={styles.audioMessage}
        >
          <MaterialIcons name="play-circle-filled" size={36} color="#007AFF" />
          <Text style={styles.audioDuration}>{formatAudioTime(item.duration)}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={item.sender === userId ? styles.sentMessageText : styles.messageText}>
          {item.text}
        </Text>
      )}
      <View style={styles.messageFooter}>
        <Text style={item.sender === userId ? styles.sentTimeText : styles.timeText}>
          {moment(item.createdAt).format('h:mm A')}
          {item.isEdited && ' • Edited'}
        </Text>
        {item.sender === userId && (
          <View style={styles.messageActions}>
            {item.status === 'failed' ? (
              <MaterialIcons name="error" size={16} color="red" />
            ) : (
              <>
                {item.status === 'viewed' || onlineUsers.includes(item.receiver) ? (
                  <MaterialIcons name="done-all" size={16} color={item.status === 'viewed' ? 'blue' : '#ccc'} />
                ) : (
                  <MaterialIcons name="done" size={16} color="#ccc" />
                )}
              </>
            )}
            {!item.audio && (
              <TouchableOpacity 
                onPress={() => handleEditMessage(item)}
                style={styles.editButton}
              >
                <MaterialIcons name="more-vert" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const formatAudioTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 50 })}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerText}>{user.name}</Text>
            <Text style={styles.statusText}>
              {onlineUsers.includes(user._id) ? 'Online' : 'Offline'}
              {typingUsers.includes(user._id) && ' • typing...'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => setShowLinkModal(true)}
          >
            <FontAwesome name="link" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() => setShowAudioRecorder(true)}
          >
            <MaterialIcons name="keyboard-voice" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TextInput
            ref={textInputRef}
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            onFocus={() => startTyping(user._id)}
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            placeholderTextColor="#999"
            multiline
          />
          {editingMessage && (
            <TouchableOpacity onPress={cancelEditing}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || newMessage.length > maxWord || isSending) && styles.disabledButton
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || newMessage.length > maxWord || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendButtonText}>
                {editingMessage ? 'Update' : 'Send'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {newMessage.length > maxWord && (
          <Text style={styles.errorText}>Message limit is {maxWord} characters</Text>
        )}

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
                <FontAwesome name="map-marker" size={24} color="#007AFF" />
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
                <MaterialIcons name="keyboard-voice" size={24} color="#007AFF" />
                <Text style={styles.linkOptionText}>Send Audio</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity 
                onPress={() => setShowLinkModal(false)} 
                style={styles.linkOptionButton}
              >
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showAudioRecorder} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <AudioRecorder 
              onRecordingComplete={handleSendAudio}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </View>
        </Modal>

        <LocationSharingModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onSend={handleSendLocation}
          isSending={isSending}
        />

        <Modal visible={showOptions} transparent animationType="fade" onRequestClose={closeOptions}>
          <Pressable style={styles.modalOverlay} onPress={closeOptions}>
            <View style={styles.optionsContainer}>
              <TouchableOpacity onPress={handleEdit} style={styles.optionButton}>
                <MaterialIcons name="edit" size={20} color="#007AFF" />
                <Text style={styles.optionText}>Edit Message</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.optionButton}>
                <MaterialIcons name="delete" size={20} color="red" />
                <Text style={[styles.optionText, { color: 'red' }]}>Delete Message</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity onPress={closeOptions} style={styles.optionButton}>
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showDeleteConfirm} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmTitle}>Delete Message?</Text>
              <Text style={styles.confirmText}>This message will be deleted for everyone.</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.confirmButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.deleteButton]} 
                  onPress={confirmDelete}
                >
                  <Text style={[styles.confirmButtonText, { color: 'white' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    padding: 15,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 0,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 0,
  },
  failedMessage: {
    backgroundColor: '#ffcccc',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  sentMessageText: {
    color: '#000',
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioDuration: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  sentTimeText: {
    color: 'rgba(26, 23, 23, 0.7)',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  linkButton: {
    marginRight: 10,
  },
  audioButton: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#007AFF',
    marginLeft: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginLeft: 15,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  linkOptionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    padding: 0,
  },
  linkOptionButton: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkOptionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  cancelOptionText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
  },
  optionButton: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confirmContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginLeft: 10,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  deleteButton: {
    backgroundColor: 'red',
    borderRadius: 5,
  },
});

export default ChatScreen;