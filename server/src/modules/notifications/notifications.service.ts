import { prisma } from "../../lib/prisma.js";
import { Role } from "@prisma/client";
import { emitNotification } from "../../ws/gateway.js";

export class NotificationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "NotificationError";
    this.statusCode = statusCode;
  }
}

export class NotificationsService {
  /**
   * Retrieves notifications for the authenticated user/role (PRD 20.1, 20.3)
   */
  async listNotifications(user: { id: string; role: Role }, unreadOnly = false) {
    const where: any = {
      OR: [
        { recipientUserId: user.id },
        { recipientRole: user.role },
        { AND: [{ recipientUserId: null }, { recipientRole: null }] },
      ],
    };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        OR: [
          { recipientUserId: user.id },
          { recipientRole: user.role },
          { AND: [{ recipientUserId: null }, { recipientRole: null }] },
        ],
        isRead: false,
      },
    });

    return { notifications, unreadCount };
  }

  /**
   * Marks a single notification as read (PRD 20.1.1)
   */
  async markAsRead(id: string, user: { id: string; role: Role }) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotificationError("Notification not found", 404);

    // Ensure authorized to mark read
    if (
      notification.recipientUserId &&
      notification.recipientUserId !== user.id &&
      notification.recipientRole !== user.role &&
      user.role !== Role.MANAGER &&
      user.role !== Role.ADMIN
    ) {
      throw new NotificationError("Unauthorized to access notification", 403);
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications for this user/role as read (PRD 20.1.1)
   */
  async markAllAsRead(user: { id: string; role: Role }) {
    return prisma.notification.updateMany({
      where: {
        OR: [
          { recipientUserId: user.id },
          { recipientRole: user.role },
          { AND: [{ recipientUserId: null }, { recipientRole: null }] },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Central notification creator enforcing Sound Policy (PRD 20.2.1)
   */
  async createNotification(data: {
    title: string;
    message: string;
    eventType: string;
    recipientRole?: Role | string;
    recipientUserId?: string;
    playSound?: boolean;
    link?: string;
  }) {
    // PRD 20.2.1: Only NEW_KITCHEN_TICKET and TICKET_READY make sound
    const allowedSoundEvents = ["NEW_KITCHEN_TICKET", "TICKET_READY"];
    const shouldPlaySound = !!data.playSound && allowedSoundEvents.includes(data.eventType);

    const notification = await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        eventType: data.eventType,
        recipientRole: data.recipientRole || null,
        recipientUserId: data.recipientUserId || null,
        playSound: shouldPlaySound,
        link: data.link || null,
      },
    });

    // Broadcast over WebSocket to appropriate room
    const targetRoom = data.recipientRole ? `room:${data.recipientRole.toLowerCase()}` : "room:all";
    emitNotification(targetRoom, notification);

    return notification;
  }

  /**
   * 30-Day retention cleanup (PRD 20.1.1)
   */
  async cleanupOldNotifications(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

export const notificationsService = new NotificationsService();
