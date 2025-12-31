'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { unblockUser } from '@/lib/firebase/users';

const BlockedUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) return;
      setLoading(true);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data() as UserProfile;
      const blockedUserIds = userData?.blockedUsers || [];

      if (blockedUserIds.length > 0) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', blockedUserIds));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setBlockedUsers(users);
      } else {
        setBlockedUsers([]);
      }

      setLoading(false);
    };

    fetchBlockedUsers();
  }, [user]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;

    try {
      await unblockUser(user.uid, blockedUserId);
      setBlockedUsers(prev => prev.filter(u => u.uid !== blockedUserId));
      toast({ title: 'User Unblocked', description: 'You can now interact with this user again.' });
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not unblock user.' });
    }
  };

  if (loading) {
    return <div>Loading blocked users...</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-medium">Blocked Users</h3>
      <p className="text-sm text-muted-foreground mb-4">Users you have blocked will appear here. You can unblock them at any time.</p>
      {blockedUsers.length > 0 ? (
        <ul className="space-y-4">
          {blockedUsers.map(blockedUser => (
            <li key={blockedUser.uid} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={blockedUser.photoURL} />
                  <AvatarFallback>{blockedUser.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{blockedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{blockedUser.email}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleUnblock(blockedUser.uid)}>Unblock</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You haven't blocked any users.</p>
      )}
    </div>
  );
};

export default BlockedUsers;
