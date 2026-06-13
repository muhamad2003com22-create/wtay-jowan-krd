import { useEffect, useState } from 'react';
import { 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  limit, 
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdminLog, Quote, UserProfile } from '../types';
import { 
  Users, 
  FileText, 
  Clock, 
  Trash2, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  LogIn,
  Award
} from 'lucide-react';

interface AdminPanelProps {
  currentUserId: string;
}

export default function AdminPanel({ currentUserId }: AdminPanelProps) {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch system logs
      const logsSnapshot = await getDocs(
        query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(100))
      );
      const fetchedLogs = logsSnapshot.docs.map(doc => doc.data() as AdminLog);
      setLogs(fetchedLogs);

      // Fetch quotes
      const quotesSnapshot = await getDocs(
        query(collection(db, 'quotes'), orderBy('createdAt', 'desc'))
      );
      const fetchedQuotes = quotesSnapshot.docs.map(doc => doc.data() as Quote);
      setQuotes(fetchedQuotes);

      // Fetch user profiles to view registrations
      const usersSnapshot = await getDocs(
        collection(db, 'users')
      );
      const fetchedUsers = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(fetchedUsers);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleClearLogs = async () => {
    if (window.confirm('دڵنیای لە خاوێنکردنەوەی هەموو لۆگ و تۆمارەکان؟')) {
      const batch = writeBatch(db);
      logs.forEach(log => {
        batch.delete(doc(db, 'adminLogs', log.id));
      });
      try {
        await batch.commit();
        setLogs([]);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'adminLogs_clear');
      }
    }
  };

  const formatKurdishDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ku-IQ', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' - ' + date.toLocaleDateString('ku-IQ', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  // Calculations for Admin Analytics
  const totalViews = quotes.reduce((sum, q) => sum + (q.viewsCount || 0), 0);
  const totalLikes = quotes.reduce((sum, q) => sum + (q.likesCount || 0), 0);
  const totalQuotes = quotes.length;
  const totalRegisteredUsers = users.length;

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 font-sans">کۆنتڕۆڵ پانێڵی سەرپەرشتیار (ئەدمین)</h2>
          <p className="text-xs text-gray-500 font-sans mt-1">ئامار، کۆنتڕۆڵکردنی پۆست و ناسنامەی بەکارهێنەران لە جێیەکدا.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors"
            id="btn-admin-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            نوێکردنەوە
          </button>
          <button
            onClick={handleClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-admin-clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
            سڕینەوەی لۆگەکان
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3" id="admin-loader">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-slate-500 font-sans">تکایە چاوەڕوان بە... بارکردنی داتاکان</p>
        </div>
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="admin-metrics-grid">
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center gap-3">
              <div className="p-3 bg-white/5 text-amber-500 rounded-xl border border-white/10">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-sans">کۆی دەقەکان</span>
                <span className="text-lg font-bold font-sans text-amber-500">{totalQuotes} پۆست</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center gap-3">
              <div className="p-3 bg-white/5 text-amber-500 rounded-xl border border-white/10">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-sans">ئەندامانی چالاک</span>
                <span className="text-lg font-bold font-sans text-amber-500">{totalRegisteredUsers} ئەندام</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center gap-3">
              <div className="p-3 bg-white/5 text-amber-500 rounded-xl border border-white/10">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-sans">کۆی بینینی وتەکان</span>
                <span className="text-lg font-bold font-sans text-amber-500">{totalViews} بینین</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center gap-3">
              <div className="p-3 bg-white/5 text-amber-500 rounded-xl border border-white/10">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-sans">کۆی لایکەکان</span>
                <span className="text-lg font-bold font-sans text-amber-500">{totalLikes} لایک</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left section: Log of User entry/exit & actions */}
            <div className="lg:col-span-7 bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-gray-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  لۆگی ڕووداوەکان و هاتووەکان (مۆنیتۆر)
                </h3>
                <span className="text-[10px] font-mono bg-white/5 text-gray-400 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {logs.length} تۆمارکراو
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-500" id="no-logs">
                  هیچ چالاکییەک لێرە دا لۆگ نەکراوە تا ئێستە.
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1 divide-y divide-white/5" id="admin-logs-timeline">
                  {logs.map((log) => (
                    <div key={log.id} className="pt-3 flex items-start gap-3 text-xs leading-normal">
                      <div className={`p-1.5 rounded-lg text-black mt-0.5 shrink-0 ${
                        log.eventType === 'login' 
                          ? 'bg-emerald-500' 
                          : log.eventType === 'join' 
                            ? 'bg-indigo-500' 
                            : log.eventType === 'post_created' 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                      }`}>
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-200">
                            {log.userName} ({log.userEmail})
                          </span>
                          <span className="text-[9px] text-gray-500 font-sans">
                            {formatKurdishDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-400 font-sans">
                          {log.eventType === 'login' && 'داخڵبوو بە پلاتفۆرمەکە لەگەڵ پڕۆفایل.'}
                          {log.eventType === 'join' && 'بۆ یەکەمجار پەیوەندی بە پۆرتالەکەوە کرد بۆ وەشانی نوێ.'}
                          {log.eventType === 'post_created' && 'وتەیەکی نوێی یان پەندێکی ناردە سەر هێڵ.'}
                          {log.eventType === 'post_deleted' && 'مۆدێلی سڕینەوەی پۆست بەکارهێنرا.'}
                          {log.eventType === 'profile_updated' && 'زانیاری پڕۆفایلەکەی گۆڕی.'}
                          {log.details && <span className="block text-[10px] text-amber-500/80 font-sans mt-0.5">{log.details}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right section: List of users registered */}
            <div className="lg:col-span-5 bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  هەموو بەکارهێنەرەکان
                </h3>
                <span className="text-[10px] font-sans bg-white/5 border border-white/10 text-emerald-400 px-2.5 py-0.5 rounded-full">
                  {users.length} ئەندام
                </span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" id="admin-user-list">
                {users.map((item) => (
                  <div 
                    key={item.uid} 
                    className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-all border border-white/5 bg-white/2"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.photoURL ? (
                        <img 
                          src={item.photoURL} 
                          alt={item.displayName} 
                          className="w-8 h-8 rounded-full border border-amber-500/30 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/5 text-gray-400 flex items-center justify-center font-bold text-xs border border-white/10">
                          {item.displayName ? item.displayName[0] : 'ك'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-200">
                            {item.displayName}
                          </span>
                          {item.isAdmin && (
                            <span className="text-[9px] font-bold text-black bg-amber-500 px-1 py-0.2 rounded font-sans scale-90">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 block font-sans shrink-0 truncate max-w-[150px]">
                          {item.email}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 font-sans">
                      {new Date(item.joinedAt).toLocaleDateString('ku-IQ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
