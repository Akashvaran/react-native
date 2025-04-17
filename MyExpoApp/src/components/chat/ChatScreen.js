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
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Axios from '../axios/Axios';
import moment from 'moment';
import { AuthContext } from '../productedRoute/AuthanticationContext';
import { SocketContext } from './SocketContext';
import { useNavigation, useRoute } from '@react-navigation/native';

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
  
  const handleEditMessage = (message) => {
    setSelectedMessage(message);
    setShowOptions(true);
  };

  const handleEdit = () => {
    setEditingMessage(selectedMessage);
    setNewMessage(selectedMessage.text);
    setShowOptions(false);
  };

  const handleDelete = () => {
    setShowOptions(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const success = await deleteMessage(selectedMessage._id);
      if (success) {
        setMessages(prev => prev.filter(msg => msg._id !== selectedMessage._id));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete message');
      console.error('Error deleting message:', error);
    } finally {
      setShowDeleteConfirm(false);
      setSelectedMessage(null);
    }
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setNewMessage('');
    textInputRef.current?.focus();
  };

  const closeOptions = () => {
    setShowOptions(false);
    setSelectedMessage(null);
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.message,
      item.sender === userId ? styles.sentMessage : styles.receivedMessage,
      item.status === 'failed' && styles.failedMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.timeText}>
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
            <TouchableOpacity 
              onPress={() => handleEditMessage(item)}
              style={styles.editButton}
            >
              <MaterialIcons name="more-vert" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  

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

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerInfo: {
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
    borderTopRightRadius: 0,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    borderTopLeftRadius: 0,
  },
  failedMessage: {
    backgroundColor: '#FFCCCC',
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#007AFF',
    marginRight: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    padding: 15,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  cancelOptionText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 5,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confirmContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: '80%',
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 16,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    padding: 10,
    marginLeft: 15,
  },
  deleteButton: {
    backgroundColor: 'red',
    borderRadius: 5,
    paddingHorizontal: 15,
  },
  confirmButtonText: {
    fontSize: 16,
  },
});

export default ChatScreen;