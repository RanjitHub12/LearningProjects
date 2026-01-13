import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
// NEW: Import Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null); 
  const [authMode, setAuthMode] = useState("login"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  // --- GAME STATE ---
  const [text, setText] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  
  // NEW: Graph State
  const [graphData, setGraphData] = useState([]);

  // --- 1. CHECK FOR SAVED USER ON LOAD ---
  useEffect(() => {
    const savedUser = localStorage.getItem("typing_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
  }, []);

  // --- 2. AUTH FUNCTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      let userData;
      // NOTE: Change URL to https://ranjitsingh12.pythonanywhere.com if using cloud
      const baseURL = 'http://127.0.0.1:8000';

       
      
      if (authMode === "login") {
        const res = await axios.post(`${baseURL}/api/login`, { email, password });
        userData = { id: res.data.user_id, username: res.data.username };
      } else {
        const res = await axios.post(`${baseURL}/api/register`, { username, email, password });
        userData = { id: res.data.user_id, username: res.data.username };
      }
      
      setUser(userData);
      localStorage.setItem("typing_user", JSON.stringify(userData));
      
    } catch (error) {
      alert("Error: " + (error.response?.data?.detail || "Connection Failed"));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("typing_user");
    setUserInput("");
    setIsFinished(false);
    setText([]);
    setGraphData([]); // Clear graph on logout
  };

  // --- GAME FUNCTIONS ---
  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/leaderboard');
      setLeaderboard(res.data);
    } catch (error) { console.error(error); }
  };

  // NEW: Fetch Graph Data
  const fetchGraphData = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/user-history/${user.id}`);
      setGraphData(res.data);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  const resetGame = async () => {
    setUserInput("");
    setStartTime(null);
    setIsFinished(false);
    setStatusMsg(""); 
    setText("Loading...".split(""));
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/get-text');
      setText(res.data.content.split(""));
    } catch (error) {
      setText("fallback text example".split(""));
    }
  };

  // Run only when User is logged in
  useEffect(() => {
    if (user) {
      resetGame();
      fetchLeaderboard();
    }
  }, [user]);

  // Typing Logic
  useEffect(() => {
    if (!user) return; 

    const handleKeyDown = (e) => {
      if (isFinished) return;
      if (e.key === 'Tab') { e.preventDefault(); resetGame(); return; }
      if (!startTime && e.key.length === 1) setStartTime(Date.now());
      if (e.key === 'Backspace') { setUserInput(prev => prev.slice(0, -1)); return; }
      if (e.key.length > 1) return;

      if (userInput.length < text.length) {
        const newUserInput = userInput + e.key;
        setUserInput(newUserInput);
        if (newUserInput.length === text.length) finishGame(newUserInput);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userInput, startTime, isFinished, text, user]);

  const finishGame = async (finalInput) => {
    setIsFinished(true);
    const timeInMinutes = (Date.now() - startTime) / 60000;
    let correctChars = finalInput.split('').filter((c, i) => c === text[i]).length;
    const finalWpm = Math.round((correctChars / 5) / timeInMinutes);
    const finalAcc = Math.round((correctChars / text.length) * 100);

    setWpm(finalWpm);
    setAccuracy(finalAcc);

    try {
      setStatusMsg("Saving...");
      await axios.post('http://127.0.0.1:8000/api/save-score', {
        user_id: user.id, 
        wpm: finalWpm,
        accuracy: finalAcc
      });
      setStatusMsg("Saved!");
      
      // Update Data after saving
      fetchLeaderboard();
      fetchGraphData(); // <--- NEW: Get updated graph data
      
    } catch (e) { setStatusMsg("Error Saving"); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await axios.post('http://127.0.0.1:8000/api/upload', formData);
    alert("Vocabulary Updated!");
    resetGame();
  };

  // --- RENDER ---
  if (!user) {
    return (
      <div className="container">
        <h1>Typing Speed Test</h1>
        <div className="results" style={{maxWidth: '400px', margin: '0 auto'}}>
          <h2 style={{color: '#e2b714'}}>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuth} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {authMode === 'register' && (
              <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{padding: '10px'}} required />
            )}
            <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{padding: '10px'}} required />
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{padding: '10px'}} required />
            
            <button className="restart-btn" type="submit">
              {authMode === 'login' ? 'Enter Game' : 'Create Account'}
            </button>
          </form>
          <p style={{marginTop: '20px', cursor: 'pointer', color: '#646669'}} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "New here? Register" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h1>Typing Test</h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
           <div style={{color: '#646669'}}>Player: <span style={{color: '#e2b714'}}>{user.username}</span></div>
           <button onClick={handleLogout} style={{padding: '5px 10px', fontSize: '0.8rem', background: '#333', border: 'none', color: '#888', cursor: 'pointer'}}>Logout</button>
        </div>
      </div>

      {isFinished ? (
        <div className="results">
          <div className="stats-box"><span>WPM: {wpm}</span><span>Acc: {accuracy}%</span></div>
          <h2 style={{color: '#646669'}}>Great Job!</h2>
          <p className="status-message" style={{color: '#e2b714'}}>{statusMsg}</p>
          <button className="restart-btn" onClick={resetGame}>Play Again</button>

          {/* --- NEW GRAPH SECTION --- */}
          {graphData.length > 0 && (
            <div style={{ width: '100%', height: 250, marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{color: '#e2b714', fontSize: '1rem'}}>Your Progress History</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{backgroundColor: '#333', border: 'none', color: '#fff'}} />
                  <Legend />
                  <Line type="monotone" dataKey="wpm" stroke="#e2b714" strokeWidth={2} name="Speed (WPM)" dot={{r: 4}} />
                  <Line type="monotone" dataKey="accuracy" stroke="#646669" name="Accuracy (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="leaderboard" style={{marginTop: '30px', textAlign: 'left'}}>
            <h3 style={{color: '#e2b714', borderBottom: '1px solid #646669'}}>Top 5 Leaderboard</h3>
            <ul style={{listStyle: 'none', padding: 0}}>
              {leaderboard.map((score, index) => (
                <li key={score.id} style={{padding: '8px 0', borderBottom: '1px solid #3e4042', display: 'flex', justifyContent: 'space-between'}}>
                  <span>
                    <span style={{color: '#e2b714', fontWeight: 'bold', marginRight: '10px'}}>#{index + 1}</span>
                    <span style={{color: '#d1d0c5'}}>{score.username}</span>
                  </span>
                  <span style={{color: '#646669'}}>{score.wpm} WPM</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="upload-section" style={{marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #646669'}}>
             <p style={{fontSize: '0.9rem'}}>Add new words to dictionary:</p>
             <input type="file" onChange={handleFileUpload} style={{color: '#d1d0c5'}} />
          </div>
        </div>
      ) : (
        <>
          <div className="stats-box">
             <span>Live WPM: {startTime ? Math.round(((userInput.length/5) / ((Date.now()-startTime)/60000))) : 0}</span>
          </div>
          <div className="word-display">
            {text.map((char, i) => {
              let className = "char";
              if (i < userInput.length) className += (userInput[i] === char) ? " correct" : " incorrect";
              if (i === userInput.length) className += " current";
              return <span key={i} className={className}>{char}</span>
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default App