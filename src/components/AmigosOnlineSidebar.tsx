import { useNavigate } from 'react-router-dom';
import { useOnlineFriends } from '../hooks/useOnlineFriends';
import { MessageCircle, MessageCircleOff, Users } from 'lucide-react';

type Props = {
  userId: string | undefined;
};

export default function AmigosOnlineSidebar({ userId }: Props) {
  const friends = useOnlineFriends(userId);
  const navigate = useNavigate();

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <div className="px-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-500">
          Amigos
          {friends.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">
              ({onlineCount} online)
            </span>
          )}
        </h3>
        {friends.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/mensagens')}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Mensagens
          </button>
        )}
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-5 text-center transition-all duration-200">
          <Users className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-400">
            Nenhum amigo ainda
          </p>
          <p className="mt-1 px-3 text-xs text-slate-400">
            Siga pessoas para vê-las aqui
          </p>
          <button
            type="button"
            onClick={() => navigate('/explorar')}
            className="noctal-btn-primary mt-3 inline-flex text-xs"
          >
            Procurar pessoas
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {friends.map((friend) => (
            <button
              type="button"
              key={friend.uid}
              onClick={() => navigate(`/u/${friend.uid}`)}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-white hover:shadow-sm"
            >
              <div className="relative flex-shrink-0">
                {friend.photo ? (
                  <img
                    src={friend.photo}
                    alt={friend.label}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-bold text-white">
                    {friend.initials}
                  </div>
                )}
                {/* Indicador de Status Online */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-white ${
                    friend.online
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                  }`}
                  title={friend.online ? 'Online' : 'Offline'}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-slate-700 group-hover:text-slate-900">
                  {friend.label}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  {friend.online ? (
                    <>
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Online
                    </>
                  ) : (
                    <>
                      <MessageCircleOff className="h-3 w-3" />
                      Offline
                    </>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}