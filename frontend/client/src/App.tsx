import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Accessibility, Droplets, ClipboardList, CheckCircle, Clock } from 'lucide-react';

const API_BASE = "http://127.0.0.1:4000/api";

export default function App() {
  const [view, setView] = useState<'patient' | 'nurse'>('patient');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <nav className="bg-white p-4 shadow-sm flex justify-center gap-4 mb-6">
        <button onClick={() => setView('patient')} className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'patient' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>患者モード</button>
        <button onClick={() => setView('nurse')} className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'nurse' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>看護師ステーション</button>
      </nav>
      {view === 'patient' ? <PatientView /> : <NurseView />}
    </div>
  );
}

// --- 患者側画面 ---
function PatientView() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const sendCall = async (msg: string) => {
    setStatus("sending");
    try {
      await fetch(`${API_BASE}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      setStatus("sent");
    } catch (e) {
      console.error("送信エラー:", e);
      setStatus("idle");
      alert("バックエンドに接続できませんでした。サーバーが起動しているか確認してください。");
    }
    setTimeout(() => setStatus("idle"), 5000);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-extrabold text-center mb-6 text-gray-700">ナースコール</h2>
      
      {status === "sent" ? (
        <div className="bg-green-100 border-4 border-green-500 rounded-3xl p-8 text-center animate-fade-in">
          <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">送信しました</h3>
          <p className="text-green-700 font-medium">看護師さんが確認しています。<br/>そのままお待ちください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PictoBtn icon={<Droplets size={56}/>} label="トイレ" color="bg-blue-500" onClick={() => sendCall("トイレに行きたいです")} disabled={status !== "idle"} />
          <PictoBtn icon={<AlertTriangle size={56}/>} label="痛い・苦しい" color="bg-red-500" onClick={() => sendCall("体が痛いです")} disabled={status !== "idle"} />
          <PictoBtn icon={<Accessibility size={56}/>} label="手伝って" color="bg-orange-500" onClick={() => sendCall("至急来てください")} disabled={status !== "idle"} />
          <PictoBtn icon={<Bell size={56}/>} label="その他" color="bg-gray-600" onClick={() => sendCall("呼び出し")} disabled={status !== "idle"} />
        </div>
      )}
    </div>
  );
}

// --- 看護師側画面 ---
function NurseView() {
  const [calls, setCalls] = useState<any[]>([]);
  const prevCallCount = useRef(0);

  const fetchCalls = async () => {
    try {
      const res = await fetch(`${API_BASE}/calls`);
      const data = await res.json();
      
      if (data.length > prevCallCount.current && prevCallCount.current !== 0) {
        const newCall = data[0]; 
        playNotificationSound(newCall.priority);
      }
      prevCallCount.current = data.length;
      setCalls(data);
    } catch (e) {
      console.error("取得エラー:", e);
    }
  };

  const playNotificationSound = (priority: string) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = priority === 'High' ? 'square' : 'sine';
    osc.frequency.setValueAtTime(priority === 'High' ? 880 : 440, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    fetchCalls();
    const timer = setInterval(fetchCalls, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleRespond = async (id: number) => {
    await fetch(`${API_BASE}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id),
    });
    fetchCalls();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold flex items-center gap-3 text-indigo-900"><ClipboardList size={32}/> ナースステーション</h2>
        <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold">待機中: {calls.filter((c: any) => c.status === 'Waiting').length}件</div>
      </div>

      <div className="grid gap-4">
        {calls.map((call: any) => {
          const isHigh = call.priority === 'High';
          const isWaiting = call.status === 'Waiting';
          
          return (
            <div key={call.id} className={`p-5 rounded-2xl shadow-sm border-l-8 transition-all flex items-center justify-between
              ${isWaiting ? 'bg-white' : 'bg-gray-100 opacity-60'}
              ${isHigh && isWaiting ? 'border-red-500 animate-pulse' : 
                call.priority === 'Medium' ? 'border-yellow-400' : 'border-blue-400'}
            `}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-black bg-slate-800 text-white px-3 py-1 rounded-md">{call.room} 号室</span>
                  <h3 className="text-xl font-bold text-gray-800">{call.patient_id} 様</h3>
                  <span className="flex items-center gap-1 text-sm text-gray-500 font-medium"><Clock size={14}/> {call.timestamp}</span>
                </div>
                
                <div className={`inline-block px-4 py-2 rounded-lg border text-base font-bold
                  ${isHigh ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}
                `}>
                  🤖 AI解析: {call.summary}
                </div>
              </div>

              <div className="ml-4">
                {isWaiting ? (
                  <button onClick={() => handleRespond(call.id)} className={`px-6 py-4 rounded-xl font-bold text-white shadow-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform
                    ${isHigh ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}
                  `}>
                    <CheckCircle size={24}/> 対応開始
                  </button>
                ) : (
                  <div className="px-6 py-4 text-gray-500 font-bold flex items-center gap-2">
                    <CheckCircle size={24} className="text-green-500"/> 対応済
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PictoBtn({ icon, label, color, onClick, disabled }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'} text-white p-6 rounded-[2rem] shadow-lg flex flex-col items-center justify-center transition-all aspect-square`}
    >
      {icon}
      <span className="mt-4 text-2xl font-black tracking-wider">{label}</span>
    </button>
  );
}