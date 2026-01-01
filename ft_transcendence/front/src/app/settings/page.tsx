"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiLock, FiUsers, FiUserPlus, FiSettings, FiCheck, FiX, FiBarChart2, FiCamera } from 'react-icons/fi';
import { getCurrentUser, updateUserEmail, updateUserPassword, updateUserStatus, updateUserProfile, updateUserNickname, uploadAvatar, UserProfile } from '../../api/users';
import { getFriends, getFriendRequests, searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, SearchResult, FriendRequest as ApiFriendRequest, Friend } from '../../api/friends';
import { getUserStats, UserStats } from '../../api/stats';
import { logout as logoutApi } from '../../api/auth';
import { useGameData } from '@/util/useGameData';

const ProfilePage = () => {
  const router = useRouter();
  const gameData = useGameData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [friendRequests, setFriendRequests] = useState<ApiFriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const [stats, setStats] = useState<UserStats | null>(null);
  
  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    setIsLoading(true);
    try {
      console.log('Loading current user...');
      const profile = await getCurrentUser();
      console.log('Profile loaded:', profile);
      if (profile) {
        setUserId(profile.id);
        setUserProfile(profile);
        setEmail(profile.email);
        setUsername(profile.username);
        await updateUserStatus('online');
      } else {
        console.log('No profile found, redirecting to login');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    if (userId) {
      loadFriends();
      loadFriendRequests();
      loadStats();
    }
  }, [userId]);
  
  useEffect(() => {
    if (activeTab === 'friends' && userId) {
      const interval = setInterval(() => {
        loadFriends();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    if (!gameData?.client || !userId) {
      return;
    }

    const handleStatusUpdate = (data: { userId: string; status: 'offline' | 'online' | 'in_game' }) => {
      if (activeTab === 'friends') {
        loadFriends();
      }
    };

    gameData.client.on("user-status-updated", handleStatusUpdate);

    return () => {
      gameData.client?.off("user-status-updated", handleStatusUpdate);
    };
  }, [gameData?.client, activeTab, userId]);
  
  async function loadFriends() {
    if (!userId) return;
    try {
      const friendsList = await getFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }
  
  async function loadFriendRequests() {
    if (!userId) return;
    try {
      const requests = await getFriendRequests(userId);
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  }
  
  async function loadStats() {
    if (!userId) return;
    try {
      const userStats = await getUserStats(userId);
      if (userStats) {
        setStats(userStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    console.log('Attempting to update email:', { newEmail, hasPassword: !!currentPassword });
    
    setIsLoading(true);
    try {
      const result = await updateUserEmail(newEmail, currentPassword);
      console.log('Update email result:', result);
      
      if (result.success) {
        setEmail(newEmail);
        setNewEmail('');
        setCurrentPassword('');
        alert('Adresse email mise à jour avec succès!');
        await loadCurrentUser();
      } else {
        alert(`Erreur: ${result.message || 'Échec de la mise à jour'}`);
      }
    } catch (error) {
      console.error('Error updating email:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas!');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await updateUserPassword(currentPassword, newPassword);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Mot de passe mis à jour avec succès!');
      } else {
        alert(`Erreur: ${result.message || 'Échec de la mise à jour'}`);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newUsername) return;
    
    setIsLoading(true);
    try {
      const result = await updateUserNickname(newUsername);
      if (result.success) {
        setUsername(newUsername);
        setNewUsername('');
        if (result.user) {
          setUserProfile(result.user);
        }
        alert('Nom d\'utilisateur mis à jour avec succès!');
        await loadCurrentUser();
      } else {
        alert(`Erreur: ${result.message || 'Échec de la mise à jour'}`);
      }
    } catch (error) {
      console.error('Error updating username:', error);
      alert('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await updateUserStatus('offline');
      await logoutApi();
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Erreur lors de la déconnexion');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file);
      console.log('Upload result:', result);
      if (result.success && result.avatarUrl) {
        setAvatarTimestamp(Date.now());
        await loadCurrentUser();
        setUserProfile(prev => prev ? { ...prev, avatar: result.avatarUrl } : null);
        console.log('Avatar URL:', result.avatarUrl);
        alert('Photo de profil mise à jour avec succès!');
      } else {
        console.error('Upload failed:', result);
        alert(`Erreur: ${result.message || 'Échec de l\'upload'}`);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Une erreur est survenue lors de l\'upload');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !userId) return;
    
    try {
      const results = await searchUsers(searchQuery);
      const filteredResults = results.filter(
        result => result.id !== userId && 
        !friends.some(friend => friend.id === result.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };
  
  const handleSendFriendRequest = async (targetId: string) => {
    if (!userId) return;
    
    try {
      const result = await sendFriendRequest(userId, targetId);
      if (result.success) {
        const targetUser = searchResults.find(u => u.id === targetId);
        alert(`Demande d'ami envoyée à ${targetUser?.username}`);
        setSearchResults(searchResults.filter(u => u.id !== targetId));
        loadFriends();
      } else {
        alert(`Erreur: ${result.message || 'Échec de l\'envoi'}`);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };
  
  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!userId) return;
    
    try {
      const result = await acceptFriendRequest(userId, requestId);
      if (result.success) {
        const request = friendRequests.find(r => r.id === requestId);
        if (request) {
          setFriendRequests(friendRequests.filter(r => r.id !== requestId));
          loadFriends();
          alert(`Vous êtes maintenant ami avec ${request.senderName}!`);
        }
      } else {
        alert(`Erreur: ${result.message || 'Échec de l\'acceptation'}`);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!userId) return;
    
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${friend.username} de vos amis?`)) {
      return;
    }
    
    try {
      const result = await removeFriend(userId, friendId);
      if (result.success) {
        setFriends(friends.filter(f => f.id !== friendId));
        alert(`${friend.username} a été supprimé de vos amis`);
      } else {
        alert(`Erreur: ${result.message || 'Échec de la suppression'}`);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };
  
  const handleDeclineFriendRequest = async (requestId: string) => {
    if (!userId) return;
    
    try {
      const result = await declineFriendRequest(userId, requestId);
      if (result.success) {
        setFriendRequests(friendRequests.filter(r => r.id !== requestId));
      } else {
        alert(`Erreur: ${result.message || 'Échec du refus'}`);
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#e6e6e6',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  };

  const cardStyle = {
    background: 'rgba(30, 30, 46, 0.7)',
    borderRadius: '15px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(76, 201, 240, 0.2)',
  };

  const buttonStyle = {
    background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
    border: 'none',
    color: 'white',
    padding: '12px 25px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid rgba(76, 201, 240, 0.3)',
    background: 'rgba(22, 33, 62, 0.5)',
    color: '#fff',
    marginBottom: '15px',
    fontSize: '16px',
  };

  if (!userProfile && isLoading) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ color: '#4cc9f0', fontSize: '1.5rem' }}>Chargement du profil...</div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ color: '#f72585', fontSize: '1.5rem' }}>Erreur: Profil non disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#4cc9f0', textShadow: '0 0 10px rgba(76, 201, 240, 0.7)' }}>
            Mon Profil
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => router.push('/home')}
              style={{
                ...buttonStyle,
                background: 'rgba(247, 37, 133, 0.2)',
                border: '1px solid rgba(247, 37, 133, 0.5)'
              }}
            >
              Retour à l'accueil
            </button>
            <button
              onClick={handleLogout}
              style={{
                ...buttonStyle,
                background: 'rgba(255, 77, 109, 0.2)',
                border: '1px solid rgba(255, 77, 109, 0.5)',
                opacity: isLoggingOut ? 0.7 : 1,
                cursor: isLoggingOut ? 'not-allowed' : 'pointer'
              }}
              disabled={isLoggingOut}
            >
              Déconnexion
            </button>
          </div>
        </div>

        {}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'profile' ? 'rgba(76, 201, 240, 0.3)' : 'rgba(76, 201, 240, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser /> Profil
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'username' ? 'rgba(76, 240, 200, 0.3)' : 'rgba(76, 240, 200, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('username')}
          >
            <FiUser /> Changer le pseudo
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'email' ? 'rgba(247, 37, 133, 0.3)' : 'rgba(247, 37, 133, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('email')}
          >
            <FiMail /> Changer l'email
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'password' ? 'rgba(106, 76, 240, 0.3)' : 'rgba(106, 76, 240, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('password')}
          >
            <FiLock /> Changer le mot de passe
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'friends' ? 'rgba(76, 240, 110, 0.3)' : 'rgba(76, 240, 110, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('friends')}
          >
            <FiUsers /> Amis
          </button>
          <button 
            style={{ 
              ...buttonStyle, 
              background: activeTab === 'stats' ? 'rgba(240, 184, 76, 0.3)' : 'rgba(240, 184, 76, 0.1)',
              padding: '10px 20px',
            }}
            onClick={() => setActiveTab('stats')}
          >
            <FiBarChart2 /> Statistiques
          </button>
        </div>

        {}
        {activeTab === 'profile' && userProfile && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUser /> Informations du compte
            </h2>
            
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4cc9f0' }}>Nom d'utilisateur</label>
                  <div style={{ padding: '12px', background: 'rgba(22, 33, 62, 0.5)', borderRadius: '8px' }}>
                    {userProfile.username || 'N/A'}
                  </div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4cc9f0' }}>Adresse email</label>
                  <div style={{ padding: '12px', background: 'rgba(22, 33, 62, 0.5)', borderRadius: '8px' }}>
                    {userProfile.email}
                  </div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4cc9f0' }}>Rôle</label>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(22, 33, 62, 0.5)', 
                    borderRadius: '8px',
                    color: userProfile.authority === 'ADMIN' ? '#f72585' : '#4cc9f0'
                  }}>
                    {userProfile.authority === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
                  </div>
                </div>
              </div>
              
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ position: 'relative', width: '120px', margin: '0 auto 25px' }}>
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    backgroundColor: userProfile.avatar ? 'transparent' : '#4cc9f0',
                    backgroundImage: userProfile.avatar 
                      ? `url(${process.env.NEXT_PUBLIC_API_URI || 'http:
                      : 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    overflow: 'hidden',
                  }}>
                    {!userProfile.avatar && (userProfile.username ? userProfile.username.charAt(0).toUpperCase() : '?')}
                  </div>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                      border: '2px solid #1a1a2e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                      opacity: isUploadingAvatar ? 0.6 : 1,
                    }}
                  >
                    <FiCamera size={20} color="white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
                
                {isUploadingAvatar && (
                  <div style={{ textAlign: 'center', color: '#4cc9f0', marginBottom: '15px' }}>
                    Upload en cours...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'username' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUser /> Changer le nom d'utilisateur
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(76, 240, 200, 0.1)', borderRadius: '10px' }}>
              <p><strong>Pseudo actuel:</strong> {username}</p>
            </div>
            
            <form onSubmit={handleUsernameChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4cf0c8' }}>Nouveau nom d'utilisateur</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Entrez votre nouveau nom d'utilisateur"
                />
              </div>
              
              <button 
                type="submit" 
                style={{ 
                  ...buttonStyle,
                  background: 'linear-gradient(45deg, #4cf0c8, #00d9ff)',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Traitement en cours...' : 'Mettre à jour mon pseudo'}
              </button>
            </form>
          </div>
        )}

        {}
        {activeTab === 'email' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiMail /> Changer l'adresse email
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(247, 37, 133, 0.1)', borderRadius: '10px' }}>
              <p><strong>Email actuel:</strong> {email}</p>
            </div>
            
            <form onSubmit={handleEmailChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#f72585' }}>Nouvelle adresse email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Entrez votre nouvelle adresse email"
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#f72585' }}>Confirmez votre mot de passe</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Entrez votre mot de passe actuel"
                />
              </div>
              
              <button 
                type="submit" 
                style={{ 
                  ...buttonStyle,
                  background: 'linear-gradient(45deg, #f72585, #b5179e)',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Traitement en cours...' : 'Mettre à jour mon email'}
              </button>
            </form>
          </div>
        )}

        {}
        {activeTab === 'password' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiLock /> Changer le mot de passe
            </h2>
            
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#7209b7' }}>Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Entrez votre mot de passe actuel"
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#7209b7' }}>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Entrez votre nouveau mot de passe"
                />
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#7209b7' }}>Confirmez le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Confirmez votre nouveau mot de passe"
                />
              </div>
              
              <button 
                type="submit" 
                style={{ 
                  ...buttonStyle,
                  background: 'linear-gradient(45deg, #7209b7, #560bad)',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Traitement en cours...' : 'Mettre à jour mon mot de passe'}
              </button>
            </form>
          </div>
        )}

        {}
        {activeTab === 'friends' && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiUsers /> Gérer mes relations
            </h2>
            
            {}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiUserPlus /> Ajouter des amis
              </h3>
              
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                  placeholder="Rechercher par nom ou email"
                />
                <button 
                  type="submit" 
                  style={{ 
                    ...buttonStyle, 
                    background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                    padding: '10px 20px',
                  }}
                >
                  Rechercher
                </button>
              </form>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {searchResults.map(user => (
                  <div key={user.id} style={{ 
                    background: 'rgba(22, 33, 62, 0.5)', 
                    padding: '15px', 
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                      <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                        {user.email}
                      </div>
                      {user.mutualFriends !== undefined && (
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                          {user.mutualFriends} ami{user.mutualFriends !== 1 ? 's' : ''} en commun
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleSendFriendRequest(user.id)}
                      style={{ 
                        background: 'rgba(76, 240, 110, 0.2)', 
                        border: '1px solid rgba(76, 240, 110, 0.5)',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <FiUserPlus style={{ color: '#4cf06e' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Mes amis */}
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '15px' }}>Mes amis ({friends.length})</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {friends.map(friend => (
                  <div key={friend.id} style={{ 
                    background: 'rgba(22, 33, 62, 0.5)', 
                    padding: '15px', 
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{friend.username}</div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: friend.status === 'online' ? '#4cf06e' : friend.status === 'in_game' ? '#f0b84c' : '#aaa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {friend.status === 'online' && 'En ligne'}
                        {friend.status === 'offline' && 'Hors ligne'}
                        {friend.status === 'in_game' && 'En jeu'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      style={{
                        background: 'rgba(255, 77, 109, 0.3)',
                        border: '1px solid rgba(255, 77, 109, 0.5)',
                        color: '#ff4d6d',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255, 77, 109, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255, 77, 109, 0.3)';
                      }}
                    >
                      Supprimer
                    </button>
                    {(friend.status === 'online' || friend.status === 'in_game') && (
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: friend.status === 'in_game' ? '#f0b84c' : '#4cf06e',
                        boxShadow: friend.status === 'in_game' 
                          ? '0 0 10px rgba(240, 184, 76, 0.7)' 
                          : '0 0 10px rgba(76, 240, 110, 0.7)'
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'stats' && stats && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiBarChart2 /> Statistiques de jeu
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '25px',
              marginBottom: '30px'
            }}>
              {}
              <div style={{ 
                background: 'rgba(22, 33, 62, 0.5)', 
                borderRadius: '15px', 
                padding: '20px',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#4cc9f0' }}>
                  Performances globales
                </h3>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f0b84c', margin: '20px 0' }}>
                  {stats.winRate}%
                </div>
                <div style={{ color: '#aaa', marginBottom: '20px' }}>Taux de victoire</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4cc9f0' }}>
                      {stats.totalGames}
                    </div>
                    <div style={{ color: '#aaa' }}>Parties jouées</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4cf06e' }}>
                      {Math.round(stats.totalGames * stats.winRate / 100)}
                    </div>
                    <div style={{ color: '#aaa' }}>Victoires</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f72585' }}>
                      {stats.totalGames - Math.round(stats.totalGames * stats.winRate / 100)}
                    </div>
                    <div style={{ color: '#aaa' }}>Défaites</div>
                  </div>
                </div>
              </div>
              
              {/* Détails par jeu */}
              <div style={{ 
                background: 'rgba(22, 33, 62, 0.5)', 
                borderRadius: '15px', 
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', color: '#4cc9f0' }}>
                  Détails par jeu
                </h3>
                
                {stats.games.map((game, index) => {
                  const winRate = game.played ? Math.round((game.won / game.played) * 100) : 0;
                  return (
                    <div key={index} style={{ marginBottom: '25px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{game.game}</span>
                        <span style={{ color: winRate >= 50 ? '#4cf06e' : '#f72585' }}>
                          {winRate}% de victoires
                        </span>
                      </div>
                      
                      <div style={{ 
                        height: '10px', 
                        width: '100%', 
                        background: 'rgba(76, 201, 240, 0.1)', 
                        borderRadius: '5px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${winRate}%`, 
                          background: 'linear-gradient(90deg, #4cc9f0, #4361ee)',
                          borderRadius: '5px'
                        }} />
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.9rem',
                        color: '#aaa',
                        marginTop: '5px'
                      }}>
                        <div>{game.played} parties</div>
                        <div>{game.won} victoires</div>
                        <div>{game.lost} défaites</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {}
            <div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', color: '#4cc9f0' }}>
                Historique des parties
              </h3>
              
              <div style={{ 
                background: 'rgba(22, 33, 62, 0.5)', 
                borderRadius: '15px', 
                padding: '20px',
                overflowX: 'auto' 
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(76, 201, 240, 0.3)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4cc9f0' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4cc9f0' }}>Jeu</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4cc9f0' }}>Résultat</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4cc9f0' }}>Adversaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.history.map((match) => (
                      <tr key={match.id} style={{ borderBottom: '1px solid rgba(76, 201, 240, 0.1)' }}>
                        <td style={{ padding: '12px' }}>{match.date}</td>
                        <td style={{ padding: '12px' }}>{match.game}</td>
                        <td style={{ padding: '12px', color: match.result === 'win' ? '#4cf06e' : '#f72585' }}>
                          {match.result === 'win' ? 'Victoire' : 'Défaite'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '30px', 
                              height: '30px', 
                              borderRadius: '50%', 
                              background: 'linear-gradient(45deg, #4cc9f0, #4361ee)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                            }}>
                              {match.opponentName.charAt(0).toUpperCase()}
                            </div>
                            {match.opponentName}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {stats.history.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>
                    Aucune partie enregistrée
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;