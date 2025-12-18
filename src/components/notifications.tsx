'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Notification } from '@/types';
import Link from 'next/link';
import { Bell, Hand, UserPlus, UserX, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(db, `users/${user.uid}/notifications`, notificationId);
    try {
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error("Failed to mark notification as read", error);
    }
  };


  const getNotificationLink = (notif: Notification) => {
    if (notif.type === 'interest' || notif.type === 'rejection') {
      if (notif.projectId) return `/projects/${notif.projectId}`;
      if (notif.roleId) return `/roles/${notif.roleId}`;
    } else if (notif.type === 'match' || notif.type === 'message') {
      if (notif.matchId) return `/messages/${notif.matchId}`;
      return '/messages';
    }
    return '#'; // Default/fallback link
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch(type) {
        case 'interest': return <Hand className="h-5 w-5 text-yellow-500" />;
        case 'match': return <UserPlus className="h-5 w-5 text-green-500" />;
        case 'rejection': return <UserX className="h-5 w-5 text-red-500" />;
        case 'message': return <MessageSquare className="h-5 w-5 text-blue-500" />;
        default: return <Bell className="h-5 w-5" />;
    }
  }

  const handleNotificationClick = (notif: Notification) => {
      if (!notif.read && notif.id) {
          markAsRead(notif.id);
      }
  }

  const renderNotificationMessage = (notif: Notification) => {
      const context = notif.projectId ? 'project' : 'role';
      const title = notif.projectTitle || notif.roleTitle || notif.contextTitle;

      switch(notif.type) {
          case 'interest':
              return <> is interested in your {context}: <span className="font-semibold">{title}</span></>;
          case 'match':
              return <> matched with you for the {context}: <span className="font-semibold">{title}</span>. Click to start the conversation!</>;
          case 'rejection':
              return <> has declined your request for the {context}: <span className="font-semibold">{title}</span> for now.</>;
          case 'message':
              return <> sent you a message about <span className="font-semibold">{title}</span>: <i className="text-muted-foreground">"{notif.messageSnippet}"</i></>;
          default:
              return ' has sent you a notification.';
      }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute top-0 right-0 h-5 w-5 justify-center rounded-full p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="font-semibold p-2 border-b">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <Link 
                key={notif.id} 
                href={getNotificationLink(notif)}
                onClick={() => handleNotificationClick(notif)}
                className={`block p-3 hover:bg-muted/50 ${!notif.read ? 'bg-blue-500/10' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="pt-1">{getNotificationIcon(notif.type)}</div>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{notif.fromUserName}</span>
                      {renderNotificationMessage(notif)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notif.createdAt?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="p-4 text-sm text-center text-muted-foreground">No new notifications.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
