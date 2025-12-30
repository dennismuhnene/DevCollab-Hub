'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { markAllNotificationsAsRead, deleteNotification, clearAllNotifications } from '@/lib/firebase/notifications';
import type { Notification } from '@/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import { Bell, Hand, UserPlus, UserX, MessageSquare, CheckCircle2, X, MailCheck, Trash2, Handshake } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const pathname = usePathname(); // Get the current path

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

      // Auto-mark as read logic
      notifs.forEach(notif => {
        if (!notif.read && notif.link === pathname) {
            markAsRead(notif.id!);
        }
      });
    });

    return () => unsubscribe();
  }, [user, pathname]); // Add pathname to dependency array

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(db, `users/${user.uid}/notifications`, notificationId);
    try {
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error("Failed to mark notification as read", error);
    }
  };
  
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      toast({ title: 'Success', description: 'All notifications marked as read.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not mark all notifications as read.' });
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteNotification(user.uid, notificationId);
      toast({ title: 'Deleted', description: 'Notification removed.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the notification.' });
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    try {
      await clearAllNotifications(user.uid);
      toast({ title: 'Cleared', description: 'All notifications have been cleared.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not clear notifications.' });
    }
  };

  const getNotificationLink = (notif: Notification) => {
    if (notif.link) return notif.link;
    if (notif.type === 'interest' || notif.type === 'rejection') {
      if (notif.projectId) return `/projects/${notif.projectId}`;
      if (notif.roleId) return `/roles/${notif.roleId}`;
    } else if (notif.type === 'match' || notif.type === 'message') {
      if (notif.matchId) return `/messages/${notif.matchId}`;
      return '/messages';
    }
    return '#';
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch(type) {
        case 'interest': return <Hand className="h-5 w-5 text-yellow-500" />;
        case 'match': return <UserPlus className="h-5 w-5 text-green-500" />;
        case 'rejection': return <UserX className="h-5 w-5 text-red-500" />;
        case 'message': return <MessageSquare className="h-5 w-5 text-blue-500" />;
        case 'system': return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
        case 'engagement': return <Handshake className="h-5 w-5 text-purple-500" />;
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
        <div className="flex items-center justify-between p-2 border-b">
          <div className="font-semibold">Notifications</div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} title="Mark all as read">
                <MailCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll} title="Clear all notifications">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(notif => (
              <div key={notif.id} className="relative group">
                <Link 
                  href={getNotificationLink(notif)}
                  onClick={() => handleNotificationClick(notif)}
                  className={`block p-3 pr-8 hover:bg-muted/50 ${!notif.read ? 'bg-blue-500/10' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="pt-1">{getNotificationIcon(notif.type)}</div>
                    <div>
                      {notif.type === 'system' || notif.type === 'engagement' ? (
                          <>
                              <p className="text-sm font-semibold">{notif.title}</p>
                              {notif.message && <p className="text-sm text-muted-foreground">{notif.message}</p>}
                          </>
                      ) : (
                          <p className="text-sm">
                            <span className="font-semibold">{notif.fromUserName}</span>
                            {renderNotificationMessage(notif)}
                          </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {notif.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleDeleteNotification(e, notif.id!)}
                    title="Delete notification"
                  >
                    <X className="h-4 w-4" />
                  </Button>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-center text-muted-foreground">No new notifications.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
