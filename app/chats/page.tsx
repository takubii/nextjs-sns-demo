'use client';

import { Database } from '@/types/supabasetype';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useRef, useState } from 'react';

export default function Chats() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState('');
  const [currentToId, setCurrentToId] = useState('');
  const [profiles, setProfiles] = useState<Database['public']['Tables']['profiles']['Row'][]>([]);
  const [inputText, setInputText] = useState('');
  const [messageText, setMessageText] = useState<any[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [intersectionObserver, setIntersectionObserver] = useState<IntersectionObserver>();
  const [mutationObserver, setMutationObserver] = useState<MutationObserver>();
  const scrollElement = useRef(null);

  // 1個目の未読メッセージまでスクロールする
  const scrollToFirstUnread = () => {
    setIsScrolled(true);
    const items = document.querySelectorAll('[data-isalreadyread]');
    const firstUnreadItem = Array.from(items).find(
      (item) => item.getAttribute('data-isalreadyread') === 'false'
    );

    if (firstUnreadItem) {
      firstUnreadItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 未読メッセージが画面に入った時のイベント
  const intersectionObserverCallback = (
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver
  ) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        if (
          entry.target.getAttribute('data-isalreadyread') !== 'true' &&
          !entry.target.classList.contains('isMyMessage')
        ) {
          entry.target.setAttribute('data-isalreadyread', 'true');
          await updateChat(entry.target.id, true);
        }

        observer.unobserve(entry.target);
      }
    });
  };

  // チャットの更新処理
  const updateChat = async (id: string, value: boolean) => {
    try {
      const index = parseInt(id.split('id')[1]);
      const { error } = await supabase
        .from('Chats')
        .update({ isAlreadyRead: value })
        .eq('id', index);

      if (error) {
        console.error(error);
        return;
      }
    } catch (error) {
      console.error(error);
      return;
    }
  };

  useEffect(() => {
    getUserId();

    const tmpIntersectionObserver = new IntersectionObserver(intersectionObserverCallback, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    });
    setIntersectionObserver(tmpIntersectionObserver);

    const tmpMutationObserver = new MutationObserver((mutations) => {
      tmpMutationObserver.disconnect();
      mutations.forEach(() => {
        const element: HTMLElement = scrollElement.current!;
        element.scrollTop = element.scrollHeight;
      });
    });
    setMutationObserver(tmpMutationObserver);
  }, []);

  const addToRefs = (el: never) => {
    if (el) {
      // 要素監視のためにIntersectionObserverに追加
      intersectionObserver!.observe(el);

      if (!isScrolled) {
        scrollToFirstUnread();
      }
    }
  };

  const getUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user !== null) {
      setUserId(user.id);
    }
  };

  const fetchAndMergeChats = async (toId: string) => {
    // 1つ目の配列を取得
    const { data: chats1, error: error1 } = await supabase
      .from('Chats')
      .select('*')
      .eq('uid', userId)
      .eq('toID', toId)
      .order('created_at');

    // 2つ目の配列を取得
    const { data: chats2, error: error2 } = await supabase
      .from('Chats')
      .select('*')
      .eq('uid', toId)
      .eq('toID', userId)
      .order('created_at');

    if (error1 || error2) {
      console.error('Error fetching chats', error1 || error2);
      return;
    }

    const fixed_chats1 = [];

    for (let index = 0; index < chats1.length; index++) {
      fixed_chats1.push({
        created_at: chats1[index].created_at,
        id: chats1[index].id,
        message: chats1[index].message,
        toID: chats1[index].toID,
        uid: chats1[index].uid,
        isAlreadyRead: chats1[index].isAlreadyRead,
        isMyMessage: true,
      });
    }

    const fixed_chats2 = [];

    for (let index = 0; index < chats2.length; index++) {
      fixed_chats2.push({
        created_at: chats2[index].created_at,
        id: chats2[index].id,
        message: chats2[index].message,
        toID: chats2[index].toID,
        uid: chats2[index].uid,
        isAlreadyRead: chats2[index].isAlreadyRead,
        isMyMessage: false,
      });
    }

    // 配列をマージ
    const mergedChats = [...fixed_chats1, ...fixed_chats2];
    // `created_at`でソート
    mergedChats.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return mergedChats;
  };
}
