// ABOUTME: Typed API client for /api/v1/profiles endpoints, wraps the shared Axios instance.
// ABOUTME: Throws through — callers handle error.response.data.error.code for UX branching.

import api from './api';
import {
  Profile,
  CreateProfileInput,
  UpdateProfileInput,
} from '@/types/profile';

export const profileService = {
  async create(input: CreateProfileInput): Promise<Profile> {
    const { data } = await api.post('/profiles', input);
    return data.data.profile;
  },

  async getMe(): Promise<Profile> {
    const { data } = await api.get('/profiles/me');
    return data.data.profile;
  },

  async getById(id: string): Promise<Profile> {
    const { data } = await api.get(`/profiles/${id}`);
    return data.data.profile;
  },

  async update(input: UpdateProfileInput): Promise<Profile> {
    const { data } = await api.patch('/profiles/me', input);
    return data.data.profile;
  },

  async deleteMe(): Promise<void> {
    await api.delete('/profiles/me');
  },

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/profiles/me/avatar', formData, {
      headers: { 'Content-Type': undefined },
    });
    return data.data.avatar;
  },

  async uploadCover(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/profiles/me/cover', formData, {
      headers: { 'Content-Type': undefined },
    });
    return data.data.coverImage;
  },
};
