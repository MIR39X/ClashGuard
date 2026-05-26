import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { API_BASE, BTN_BASE, WEEK_DAYS } from '../constants';
import { daySortValue, selectedEntriesFromCourses } from '../lib/schedule';
import {
  buildFreeByDay,
  decodeSharePayload,
  encodeSharePayload,
  intersectFreeByDay,
  minutesToLabel,
  normalizeShareEntry,
} from '../utils/friendsUtils';

const FriendsPage = ({ allClasses, selectedCourses, friends, setFriends }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [friendName, setFriendName] = useState('');
  const [shareInput, setShareInput] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(() => friends[0]?.id || '');
  const [msg, setMsg] = useState('');

  const myEntries = useMemo(
    () =>
      selectedEntriesFromCourses(selectedCourses, allClasses).sort(
        (a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes,
      ),
    [allClasses, selectedCourses],
  );

  useEffect(() => {
    let cancelled = false;
    const createShare = async () => {
      if (myEntries.length === 0) {
        setShareCode('');
        return;
      }
      setShareBusy(true);
      try {
        const response = await fetch(`${API_BASE}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: myEntries.map(normalizeShareEntry) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create share link');
        if (!cancelled) setShareCode(String(data.code || ''));
      } catch {
        const fallback = encodeSharePayload({
          v: 1,
          createdAt: new Date().toISOString(),
          entries: myEntries.map(normalizeShareEntry),
        });
        if (!cancelled) setShareCode(fallback);
      } finally {
        if (!cancelled) setShareBusy(false);
      }
    };
    createShare();
    return () => {
      cancelled = true;
    };
  }, [myEntries]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shareCode) return '';
    const isShortCode = /^[a-z0-9]{6,}$/i.test(shareCode);
    return isShortCode
      ? `${window.location.origin}/friends?share=${encodeURIComponent(shareCode)}`
      : `${window.location.origin}/friends?payload=${encodeURIComponent(shareCode)}`;
  }, [shareCode]);

  useEffect(() => {
    if (!selectedFriendId && friends[0]?.id) setSelectedFriendId(friends[0].id);
    if (selectedFriendId && !friends.some((f) => f.id === selectedFriendId)) {
      setSelectedFriendId(friends[0]?.id || '');
    }
  }, [friends, selectedFriendId]);

  const fetchPayloadByCode = async (code) => {
    const response = await fetch(`${API_BASE}/share/${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Invalid share code');
    return data;
  };

  const resolvePayloadFromInput = async (input) => {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const maybeCode = /^[a-z0-9]{6,}$/i.test(raw);
    if (maybeCode) return fetchPayloadByCode(raw);

    try {
      const parsed = new URL(raw);
      const share = parsed.searchParams.get('share');
      if (share) return fetchPayloadByCode(share);
      const payload = parsed.searchParams.get('payload');
      if (payload) return decodeSharePayload(payload);
      const shareMatch = parsed.pathname.match(/\/share\/([a-z0-9]+)/i);
      if (shareMatch?.[1]) return fetchPayloadByCode(shareMatch[1]);
      return null;
    } catch {
      return decodeSharePayload(raw);
    }
  };

  const saveFriendFromPayload = async (name, payloadText) => {
    try {
      const payload = await resolvePayloadFromInput(payloadText);
      if (!payload || !Array.isArray(payload.entries) || payload.entries.length === 0) {
        setMsg('Invalid or empty share link.');
        return;
      }
      const cleanName = String(name || '').trim() || `Friend ${friends.length + 1}`;
      const entries = payload.entries
        .map((entry) => ({
          ...entry,
          startMinutes: Number(entry.startMinutes),
          endMinutes: Number(entry.endMinutes),
        }))
        .filter((entry) => entry.day && Number.isFinite(entry.startMinutes) && Number.isFinite(entry.endMinutes));

      const existing = friends.find((f) => f.name.toLowerCase() === cleanName.toLowerCase());
      const nextFriend = {
        id: existing?.id || `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        entries,
        updatedAt: new Date().toISOString(),
      };
      setFriends((prev) => {
        const without = prev.filter((f) => f.id !== nextFriend.id);
        return [nextFriend, ...without];
      });
      setSelectedFriendId(nextFriend.id);
      setMsg(`Linked friend: ${cleanName}`);
      setShareInput('');
    } catch (error) {
      setMsg(error?.message || 'Failed to link friend.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const share = params.get('share');
    const payload = params.get('payload');
    if (!share && !payload) return;
    if (friends.length === 0) {
      setMsg('Incoming share link detected. Enter friend name and tap Link Friend.');
      setShareInput(share || payload || '');
    }
  }, [friends.length, location.search]);

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || null;
  const myFreeByDay = useMemo(() => buildFreeByDay(myEntries), [myEntries]);
  const friendFreeByDay = useMemo(
    () => buildFreeByDay(selectedFriend?.entries || []),
    [selectedFriend?.entries],
  );
  const mutualFreeByDay = useMemo(
    () => intersectFreeByDay(myFreeByDay, friendFreeByDay),
    [friendFreeByDay, myFreeByDay],
  );

  const renderDayRows = (map, emptyLabel) => (
    <div className="mt-2 grid gap-2">
      {WEEK_DAYS.map((day) => {
        const slots = map?.[day] || [];
        return (
          <div key={day} className="rounded-lg border border-ink/15 bg-white p-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/65">{day}</p>
            {slots.length === 0 ? (
              <p className="mt-1 text-xs text-ink/55">{emptyLabel}</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {slots.map(([start, end], idx) => (
                  <span
                    key={`${day}-${start}-${end}-${idx}`}
                    className="rounded-full border border-ink/20 bg-ash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/75"
                  >
                    {minutesToLabel(start)} - {minutesToLabel(end)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const removeFriend = (id) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    if (selectedFriendId === id) setSelectedFriendId('');
  };

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.2rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [07]_FRIENDS
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>Timetable</button>
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>Clash Report</button>
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>Alternatives</button>
              <button onClick={() => navigate('/grades')} className={BTN_BASE}>Grades</button>
              <button onClick={() => navigate('/friends')} className={`${BTN_BASE} bg-signal text-white`}>Friends</button>
              <button onClick={() => navigate('/')} className={BTN_BASE}>Back To Selection</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-signal/30 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-signal">Share My Timetable</p>
              <p className="mt-1 text-xs text-ink/70">Send this link or QR to your friend.</p>
              <input
                readOnly
                value={shareBusy ? 'Generating short link...' : shareUrl}
                className="mt-2 w-full rounded-md border border-ink/20 bg-ash px-2 py-2 text-xs outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!shareUrl || shareBusy) return;
                    await navigator.clipboard.writeText(shareUrl);
                    setMsg('Share link copied.');
                  }}
                  className={BTN_BASE}
                >
                  Copy Link
                </button>
              </div>
              {shareUrl && (
                <img
                  alt="Share timetable QR"
                  className="mt-3 h-44 w-44 rounded-lg border border-signal/30 bg-white p-2"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`}
                />
              )}
            </div>

            <div className="rounded-xl border border-signal/30 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-signal">Add / Update Friend</p>
              <input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Friend name (e.g., Gotham)"
                className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
              />
              <textarea
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                placeholder="Paste shared link or short share code"
                className="mt-2 h-24 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-xs outline-none focus:border-signal"
              />
              <button
                onClick={() => saveFriendFromPayload(friendName, shareInput)}
                className={`${BTN_BASE} mt-2`}
              >
                Link Friend
              </button>
              {msg && <p className="mt-2 text-xs font-semibold uppercase text-signal">{msg}</p>}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-signal/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-signal">Friends</p>
            {friends.length === 0 ? (
              <p className="mt-2 text-sm text-ink/70">No friends linked yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFriendId(friend.id)}
                      className={`rounded-md border px-3 py-1 text-xs uppercase ${
                        selectedFriendId === friend.id
                          ? 'border-signal bg-signal text-white'
                          : 'border-signal/35 text-signal'
                      }`}
                    >
                      {friend.name}
                    </button>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="rounded-md border border-signal/35 px-2 py-1 text-[10px] uppercase text-signal"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-signal/25 bg-signal/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Mutual Free Slots</p>
              {selectedFriend ? renderDayRows(mutualFreeByDay, 'No mutual free slot') : <p className="mt-2 text-sm text-ink/65">Select a friend first.</p>}
            </div>
            <div className="rounded-xl border border-ink/15 bg-white/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">
                {selectedFriend ? `${selectedFriend.name} Free Slots` : 'Friend Free Slots'}
              </p>
              {selectedFriend ? renderDayRows(friendFreeByDay, 'No free slot') : <p className="mt-2 text-sm text-ink/65">Select a friend first.</p>}
            </div>
            <div className="rounded-xl border border-ink/15 bg-white/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">My Free Slots</p>
              {renderDayRows(myFreeByDay, 'No free slot')}
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
};

export default FriendsPage;
