import { client } from "./client";

export type Friend = {
  id: string;
  username: string;
  email?: string;
  status: 'online' | 'offline' | 'in_game';
  currentGameId?: string;
  avatar?: string;
};

export type FriendRequest = {
  id: string;
  senderId: string;
  senderName: string;
  mutualFriends?: number;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  username: string;
  email: string;
  mutualFriends?: number;
};

export async function getFriends(userId: string): Promise<Friend[]> {
  const result = await client.get<Friend[]>(`/users/${userId}/friends`);
  if (result.result === true) {
    return result.data;
  }
  return [];
}

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  const result = await client.get<FriendRequest[]>(`/users/${userId}/friend-requests`);
  if (result.result === true) return result.data;
  return [];
}

export async function searchUsers(query: string): Promise<SearchResult[]> {
  const result = await client.get<SearchResult[]>(`/users/search`, {
    params: { q: query }
  });
  if (result.result === true) return result.data;
  return [];
}

export async function sendFriendRequest(
  userId: string,
  targetId: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.post(`/users/${userId}/friend-requests/${targetId}`);
  
  if (result.result === true) {
    return { success: true };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to send friend request" 
    };
  }
}

export async function acceptFriendRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.post(`/users/${userId}/friend-requests/${requestId}/accept`);
  
  if (result.result === true) {
    return { success: true };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to accept friend request" 
    };
  }
}

export async function declineFriendRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.post(`/users/${userId}/friend-requests/${requestId}/decline`);
  
  if (result.result === true) {
    return { success: true };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to decline friend request" 
    };
  }
}