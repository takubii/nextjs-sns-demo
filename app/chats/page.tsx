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

  const getMessage = async (toId: string) => {
    let allMessage = null;

    try {
      const data = await fetchAndMergeChats(toId);
      allMessage = data;
    } catch (error) {
      console.error(error);
    }

    if (allMessage != null) {
      setMessageText(allMessage);
    }
  };

  const fetchRealtimeData = (currentToId: string) => {
    try {
      supabase
        .channel('chats')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'Chats',
          },
          (payload) => {
            // insert時の処理
            if (payload.eventType === 'INSERT') {
              const { created_at, id, message, toID, uid, isAlreadyRead } = payload.new;
              const isUser = uid === userId && toID === currentToId;
              const isToUser = uid === currentToId && toID === userId;

              if (isUser || isToUser) {
                let isMyMessage = true;

                if (uid === currentToId) {
                  isMyMessage = false;
                }

                setMessageText((messageText) => [
                  ...messageText,
                  { created_at, id, message, toID, uid, isAlreadyRead, isMyMessage },
                ]);
              }
            }

            // update時に既読マークをつける
            if (payload.eventType === 'UPDATE') {
              const { id, toID, uid } = payload.new;
              const element = document.querySelector(`#id${id} .isAlreadyRead`);

              if (element && uid === userId && toID === currentToId) {
                element.textContent = '既読';
              }
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectUser = async (event: any) => {
    event.preventDefault();
    setIsScrolled(false);

    const toUserId = event.target.id;
    setCurrentToId(toUserId);

    await getMessage(toUserId);

    fetchRealtimeData(toUserId);
  };

  const onSubmitNewMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputText === '') return;

    try {
      await supabase.from('Chats').insert({ message: inputText, uid: userId, toID: currentToId });
    } catch (error) {
      console.error(error);
      return;
    }

    setInputText('');
    mutationObserver!.observe(scrollElement.current!, { childList: true });
  };

  return (
    <div className='mt-10 container mx-auto shadow-lg rounded-lg'>
      <div className='flex flex-row justify-between bg-white'>
        {/* TODO Sidebar */}
        <div className='w-full px-5 flex flex-col justify-between'>
          <div className='flex flex-col mt-5'>
            {/* TODO ChatUI */}
            <div className='py-5'>
              <form className='w-full flex' onSubmit={onSubmitNewMessage}>
                <input
                  type='text'
                  name='message'
                  id='message'
                  className='w-full bg-gray-300 py-5 px-3 rounded-xl'
                  placeholder='type your message here...'
                  value={inputText}
                  onChange={(event) => setInputText(() => event.target.value)}
                />
                <button
                  type='submit'
                  disabled={inputText === ''}
                  className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-20 ml-2 px-5 py-2.5 text-center disabled:opacity-25'
                >
                  送信
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}