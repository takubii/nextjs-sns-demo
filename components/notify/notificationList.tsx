'use client';

import { Database } from '@/types/supabasetype';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotificationList() {
  const supabase = createClientComponentClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [display, setDisplay] = useState<boolean>(false);

  useEffect(() => {
    getUserData();
  }, []);

  const getUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user === null) return;

    getAllNotificationManager(user.id);
  };

  const getAllNotificationManager = async (userId: string) => {
    const { data: notificationManager, error } = await supabase
      .from('notificationmanager')
      .select()
      .eq('uid', userId)
      .order('id', { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    const notificationManagerList: Database['public']['Tables']['notificationmanager']['Row'][] =
      notificationManager;

    await getAllNotifications(notificationManagerList);
  };

  const getAllNotifications = async (
    notificationManagerList: Database['public']['Tables']['notificationmanager']['Row'][]
  ) => {
    const { data: notifications, error } = await supabase.from('notifications').select();

    if (error) {
      console.log(error);
      return;
    }

    const notificationList: Database['public']['Tables']['notifications']['Row'][] = notifications;
    // 既読フラグも含めたリスト
    const tmpNotificationList = [];
    let tmpCount = 0;

    for (let i = 0; i < notificationManagerList.length; i++) {
      const manager = notificationManagerList[i];

      for (let j = 0; j < notificationList.length; j++) {
        const notification = notificationList[j];

        if (manager.notificationid === notification.id) {
          let isAlreadyRead = true;

          if (manager.read_at === null) {
            isAlreadyRead = false;
            tmpCount += 1;
          }

          tmpNotificationList.push({
            id: notification.id,
            message: notification.message,
            isAlreadyRead: isAlreadyRead,
          });
        }
      }
    }

    setNotifications(tmpNotificationList);
    setUnreadCount(tmpCount);
  };

  const toggleList = () => {
    setDisplay(!display);
  };

  return (
    <div className='fixed right-5 top-5'>
      <button
        onClick={toggleList}
        type='button'
        className='relative inline-flex items-center p-3 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
      >
        <svg
          className='w-5 h-5'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
          fill='currentColor'
          viewBox='0 0 20 16'
        >
          <path d='m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z' />
          <path d='M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z' />
        </svg>
        {unreadCount != 0 ? (
          <>
            <span className='sr-only'>Notifications</span>
            <div className='absolute inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 border-2 border-white rounded-full -top-2 -end-2 dark:border-gray-900'>
              {unreadCount}
            </div>
          </>
        ) : (
          <></>
        )}
      </button>
      <ul
        className={
          display
            ? 'p-3 bg-gray-100 fixed mt-2 right-0 shadow-md overflow-auto max-h-60'
            : 'p-3 bg-gray-100 fixed mt-2 right-0 shadow-md hidden'
        }
      >
        {notifications.length === 0
          ? 'お知らせはありません'
          : notifications.map((item, index) => (
              <li className='mt-2 w-60 truncate' key={index}>
                <Link
                  className={item.isAlreadyRead ? 'text-blue-400' : 'text-blue-700'}
                  href={'/notify?id=' + item.id}
                >
                  {item.message}
                </Link>
              </li>
            ))}
      </ul>
    </div>
  );
}
