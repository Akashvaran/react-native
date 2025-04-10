import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { SocketContext } from './SocketContext';
import AddGroupMember from './AddGroupMember';

const GroupInfoModal = ({
  visible,
  onClose,
  group,
  userId,
  navigation,
}) => {
  const [showMembers, setShowMembers] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const { addGroupMember, promoteToAdmin, removeGroupMember, leaveGroup} = useContext(SocketContext);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const members = group?.members ;
  const currentUserRole = members.find(m => m.user?._id === userId)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isGroupCreator = group?.createdBy?._id === userId;

  const getRandomColor = (id) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63'];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleLeaveGroup = () => {
    leaveGroup(group._id);
    onClose();
    navigation.goBack();
  };

  const showMemberActionModal = (member) => {
    setSelectedMember(member);
    setShowMemberActions(true);
  };

  const handlePromoteToAdmin = () => {
    if (!selectedMember) return;
    promoteToAdmin(group._id, selectedMember.user._id);
    setShowMemberActions(false);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    removeGroupMember(group._id, selectedMember.user._id);
    setShowMemberActions(false);
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleMemberAdded = (newMemberId) => {
    addGroupMember(group._id, newMemberId);
    setShowAddMemberModal(false);
  };

  const renderMemberItem = ({ item }) => {
    const user = item.user || {};
    const displayName = user.name || 'Unknown';
    const roleColor = item.role === 'admin' ? '#4CAF50' : '#2196F3';

    return (
      <View style={styles.memberItem}>
        <View style={[styles.memberAvatar, { backgroundColor: getRandomColor(user._id) }]}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{displayName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        {(isAdmin || isGroupCreator) && user._id !== userId && (
          <TouchableOpacity onPress={() => showMemberActionModal(item)}>
            <Icon name="more-vert" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.fullscreenModal}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Group Info</Text>
              <View style={styles.closeButton} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupAvatar, { backgroundColor: getRandomColor(group._id) }]}>
                  <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMembersCount}>{members.length} members</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Icon name="info" size={20} color="#4CAF50" style={styles.infoIcon} />
                  <View>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{group.description || 'No description'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Icon name="event" size={20} color="#4CAF50" style={styles.infoIcon} />
                  <View>
                    <Text style={styles.infoLabel}>Created on</Text>
                    <Text style={styles.infoValue}>
                      {moment(group.createdAt).format('MMMM D, YYYY')}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Icon name="person" size={20} color="#4CAF50" style={styles.infoIcon} />
                  <View>
                    <Text style={styles.infoLabel}>Created by</Text>
                    <Text style={styles.infoValue}>{group.createdBy?.name || 'Unknown'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowMembers(!showMembers)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Members</Text>
                <Icon
                  name={showMembers ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#4CAF50"
                />
              </TouchableOpacity>

              {showMembers && (
                <View style={styles.membersCard}>
                  <FlatList
                    data={members}
                    keyExtractor={(item) => item._id}
                    renderItem={renderMemberItem}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {(isAdmin || isGroupCreator) && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#2196F3', marginBottom: 10 }]}
                  onPress={handleAddMember}
                >
                  <Text style={styles.buttonText}>Add Member</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#F44336' }]} 
                onPress={handleLeaveGroup}
              >
                <Text style={styles.buttonText}>Leave Group</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showMemberActions}
        onRequestClose={() => setShowMemberActions(false)}
      >
        <View style={styles.centeredModal}>
          <View style={styles.memberActionsModal}>
            <Text style={styles.memberActionsTitle}>
              {selectedMember?.user?.name || 'Member'} Actions
            </Text>
            
            {isGroupCreator && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handlePromoteToAdmin}
              >
                <Text style={styles.buttonText}>
                  {selectedMember?.role === 'admin' ? 'Demote from Admin' : 'Make Admin'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              onPress={handleRemoveMember}
            >
              <Text style={styles.buttonText}>Remove from Group</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#9E9E9E' }]}
              onPress={() => setShowMemberActions(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <AddGroupMember
          groupId={group._id}
          onMemberAdded={handleMemberAdded}
          navigation={navigation}
          groupMembers={members}
          onClose={() => setShowAddMemberModal(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fullscreenModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    height: '85%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    width: 24,
  },
  modalContent: {
    padding: 20,
  },
  groupHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupAvatarText: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  groupMembersCount: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  membersCard: {
    marginTop: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#FFF',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  memberActionsModal: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  memberActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default GroupInfoModal;