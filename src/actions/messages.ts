"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  if (!content.trim()) return { error: "Message cannot be empty" };

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

// Returns list of conversations: each connected user + last message + unread count
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