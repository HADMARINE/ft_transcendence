import { client } from "./client";

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  authority: "NORMAL" | "ADMIN";
};

export async function getCurrentUser(): Promise<UserProfile | null> {
  const result = await client.get<UserProfile>(`/users/me`);
  if (result.result === true) return result.data;
  return null;
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const result = await client.get<UserProfile>(`/users/${id}`);
  if (result.result === true) return result.data;
  return null;
}

export async function updateUserEmail(
  newEmail: string, 
  currentPassword: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.patch(`/users/me/email`, {
    email: newEmail,
    currentPassword,
  });
  
  if (result.result === true) {
    return { success: true };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to update email" 
    };
  }
}

export async function updateUserPassword(
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  const result = await client.patch(`/users/me/password`, {
    currentPassword,
    newPassword,
  });
  
  if (result.result === true) {
    return { success: true };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to update password" 
    };
  }
}

export async function updateUserNickname(
  nickname: string
): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
  const result = await client.patch<UserProfile>(`/users/me`, { nickname });
  
  if (result.result === true) {
    return { success: true, user: result.data };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to update nickname" 
    };
  }
}

export async function updateUserProfile(
  data: Partial<UserProfile>
): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
  const result = await client.patch<UserProfile>(`/users/me`, data);
  
  if (result.result === true) {
    return { success: true, user: result.data };
  } else {
    return { 
      success: false, 
      message: result.data?.message || "Failed to update profile" 
    };
  }
}

export async function updateUserStatus(
  status: 'online' | 'offline' | 'in_game'
): Promise<{ success: boolean; status?: string }> {
  const result = await client.patch<{ success: boolean; status?: string }>(
    '/users/me/status',
    { status }
  );
  
  if (result.result === true && result.data) {
    return result.data;
  }
  return { success: false };
}