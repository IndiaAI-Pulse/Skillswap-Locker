"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Only allow messaging between users who have a session together OR matched via matchmaker
async function canMessage(senderId: string, receiverId: string): Promise<boolean> {
  const session = await prisma.skillSession.findFirst({
    where: {
      OR: [
        { teacherId: senderId, learnerId: receiverId },
        { teacherId: receiverId, learnerId: senderId },
      ],
    },
  });
  if (session) return true;

  // Also allow if they already have a message history (already connected)
  const existing = await prisma.message.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });
  return !!existing;
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  if (!content.trim()) return { error: "Message cannot be empty" };

  const allowed = await canMessage(senderId, receiverId);
  if (!allowed) return { error: "You can only message users you have matched with or have sessions with." };

  const message = await prisma.message.create({
    data: { senderId, receiverId, content: content.trim() },
  });

  revalidatePath("/");
  return { success: true, message };
}

export async function getConversation(userId: string, otherUserId: string) {
  return await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markMessagesRead(userId: string, otherUserId: string) {
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: userId, read: false },
    data: { read: true },
  });
  revalidatePath("/");
}

export async function getConversationsList(userId: string) {
  const allMessages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  const map = new Map<string, any>();
  for (const msg of allMessages) {
    const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
    if (!map.has(otherUser.id)) {
      map.set(otherUser.id, {
        user: otherUser,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount: 0,
      });
    }
    if (msg.receiverId === userId && !msg.read) {
      map.get(otherUser.id).unreadCount += 1;
    }
  }

  return Array.from(map.values());
}

// Get users this person can message (has sessions with)
export async function getMessageableUsers(userId: string) {
  const sessions = await prisma.skillSession.findMany({
    where: { OR: [{ teacherId: userId }, { learnerId: userId }] },
    include: {
      teacher: { select: { id: true, name: true, image: true } },
      learner: { select: { id: true, name: true, image: true } },
    },
  });

  const map = new Map<string, any>();
  sessions.forEach((s) => {
    const other = s.teacherId === userId ? s.learner : s.teacher;
    if (!map.has(other.id)) map.set(other.id, other);
  });

  return Array.from(map.values());
}