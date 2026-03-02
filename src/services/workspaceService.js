import api from './api';
import { API } from '../utils/constants';

// ── Workspaces ──────────────────────────────────────────

export const createWorkspace = async (data) => {
  const res = await api.post(API.WORKSPACES.CREATE, data);
  return res.data;
};

export const getUserWorkspaces = async () => {
  const res = await api.get(API.WORKSPACES.LIST);
  return res.data;
};

export const getWorkspace = async (id) => {
  const res = await api.get(API.WORKSPACES.GET(id));
  return res.data;
};

export const updateWorkspace = async (id, data) => {
  const res = await api.put(API.WORKSPACES.UPDATE(id), data);
  return res.data;
};

export const deleteWorkspace = async (id) => {
  const res = await api.delete(API.WORKSPACES.DELETE(id));
  return res.data;
};

export const validateMembership = async (id) => {
  const res = await api.get(API.WORKSPACES.ME(id));
  return res.data;
};

export const checkWorkspaceSlug = async (slug) => {
  const res = await api.get(API.WORKSPACES.CHECK_SLUG(slug));
  return res.data;
};

// ── Members ─────────────────────────────────────────────

export const getMembers = async (workspaceId, params = {}) => {
  const res = await api.get(API.WORKSPACES.MEMBERS(workspaceId), { params });
  return res.data;
};

export const updateMemberRole = async (workspaceId, userId, role) => {
  const res = await api.put(API.WORKSPACES.MEMBER(workspaceId, userId), { role });
  return res.data;
};

export const removeMember = async (workspaceId, userId) => {
  const res = await api.delete(API.WORKSPACES.MEMBER(workspaceId, userId));
  return res.data;
};

export const leaveWorkspace = async (workspaceId) => {
  const res = await api.delete(API.WORKSPACES.LEAVE(workspaceId));
  return res.data;
};

// ── Invites ─────────────────────────────────────────────

export const createInvite = async (workspaceId, data) => {
  const res = await api.post(API.WORKSPACES.INVITES(workspaceId), data);
  return res.data;
};

export const getInvites = async (workspaceId, params = {}) => {
  const res = await api.get(API.WORKSPACES.INVITES(workspaceId), { params });
  return res.data;
};

export const revokeInvite = async (workspaceId, inviteId) => {
  const res = await api.delete(API.WORKSPACES.INVITE(workspaceId, inviteId));
  return res.data;
};

export const resendInvite = async (workspaceId, inviteId) => {
  const res = await api.post(API.WORKSPACES.RESEND_INVITE(workspaceId, inviteId));
  return res.data;
};

// ── Invite acceptance (public) ──────────────────────────

export const validateInviteToken = async (token) => {
  const res = await api.get(API.INVITES.VALIDATE, { params: { token } });
  return res.data;
};

export const acceptInvite = async (token) => {
  const res = await api.post(API.INVITES.ACCEPT, { token });
  return res.data;
};
