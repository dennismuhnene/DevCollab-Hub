'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useEffect, useState } from 'react';
import type { Notification } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { Bell, Hand, MessageSquare, UserCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const notifsQuery = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
      const notifsData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Notification)
      );
      setNotifications(notifsData);
      setUnreadCount(notifsData.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.id && user) {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
    }

    if (notification.type === 'message' && notification.matchId) {
      router.push(`/messages/${notification.matchId}`);
    } else if (notification.type === 'interest' && notification.projectId) {
      router.push(`/projects/${notification.projectId}`);
    } else if (notification.type === 'match' && notification.matchId) {
       router.push(`/messages/${notification.matchId}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const batch = writeBatch(db);
    const unreadNotifs = notifications.filter(n => !n.read);
    
    unreadNotifs.forEach(notification => {
        if(notification.id) {
            const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
            batch.update(notifRef, { read: true });
        }
    });

    await batch.commit();
  };


  const getNotificationIcon = (type: string) => {
    switch(type) {
        case 'interest': return <Hand className="h-4 w-4 text-yellow-500" />;
        case 'match': return <UserCheck className="h-4 w-4 text-green-500" />;
        case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
        default: return <Bell className="h-4 w-4" />;
    }
  }

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'interest':
        return <p><span className="font-semibold">{notification.fromUserName}</span> showed interest in your project: <span className="font-semibold">{notification.projectTitle}</span>.</p>;
      case 'match':
        return <p>You matched with <span className="font-semibold">{notification.fromUserName}</span> for project <span className="font-semibold">{notification.projectTitle}</span>!</p>;
      case 'message':
        return <p><span className="font-semibold">{notification.fromUserName}</span> sent you a message: <span className="italic">"{notification.messageSnippet}"</span></p>;
      default:
        return <p>You have a new notification.</p>;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
                <Button variant="link" className="p-0 h-auto" onClick={markAllAsRead}>Mark all as read</Button>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              className={`flex items-start gap-3 py-2 px-3 whitespace-normal ${!notif.read ? 'bg-blue-500/10' : ''}`}
              onSelect={() => handleNotificationClick(notif)}
            >
                <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                <div className="flex-1">
                    {getNotificationText(notif)}
                    <p className="text-xs text-muted-foreground mt-1">
                        {notif.timestamp ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true }) : ''}
                    </p>
                </div>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="p-4 text-sm text-center text-muted-foreground">
            No new notifications.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    