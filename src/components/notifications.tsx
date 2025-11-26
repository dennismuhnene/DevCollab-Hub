'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  getDoc,
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

async function openChat(matchId: string, router: any) {
  if (!matchId) {
    alert("This notification is not linked to a valid match.");
    return;
  }
  const matchRef = doc(db, "matches", matchId);
  const snap = await getDoc(matchRef);

  if (!snap.exists()) {
    alert("Match does not exist anymore. It may have been deleted.");
    return router.push("/messages");
  }

  const data = snap.data();

  if (!data.participants || !Array.isArray(data.participants) || data.participants.length < 2) {
    alert("This match was corrupted. Attempting auto-repair...");
    await updateDoc(matchRef, { participants: [], repaired: true });
    return router.push("/messages");
  }

  router.push(`/messages/${matchId}`);
}

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
    }, (err) => {
      console.error("Notification listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.id && user && !notification.read) {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
    }

    // Do not navigate for message notifications, just mark as read.
    if (notification.type === 'message') {
      return; 
    }

    if (notification.type === 'interest' && notification.projectId) {
      router.push(`/projects/${notification.projectId}`);
    } else if (notification.type === 'match' && notification.matchId) {
       await openChat(notification.matchId, router);
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
  
  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
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
              className={`flex items-start gap-3 py-2 px-3 whitespace-normal ${!notif.read ? 'bg-primary/10' : ''}`}
              onSelect={() => handleNotificationClick(notif)}
            >
                <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                <div className="flex-1">
                    {getNotificationText(notif)}
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(notif.timestamp as Timestamp)}
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
