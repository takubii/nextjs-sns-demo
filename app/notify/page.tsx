'use client';

import DateFormatter from '@/components/date';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Notify() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const notificationId = searchParams.get('id');
  const [notifications, setNotifications] = useState<any>({});

  useEffect(() => {
    updateUnreadNotification();
    getNotification();
  }, []);

  const getNotification = async () => {
    const { data: notificatons, error } = await supabase
      .from('notifications')
      .select()
      .eq('id', notificationId);

    if (error) {
      console.log(error);
      return;
    }

    if (notifications.length > 0) {
      setNotifications(notifications[0]);
    }
  };

  const updateUnreadNotification = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user === null) return;

    const timeStamp = new Date().toISOString();
    await supabase
      .from('notificationmanager')
      .update({ read_at: timeStamp })
      .eq('uid', user.id)
      .eq('notificationid', notificationId);
  };

  return (
    <div className='pt-10 w-2/4 m-auto'>
      <p>
        <DateFormatter timestamp={notifications.created_at} />
      </p>
      <p>{notifications.message}</p>
    </div>
  );
}
