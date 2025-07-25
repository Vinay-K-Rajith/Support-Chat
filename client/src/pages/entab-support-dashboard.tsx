import { useState, useEffect } from "react";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import InputBase from '@mui/material/InputBase';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import { MessageBubble } from "../components/chatbot/message-bubble";
import { useTheme } from '@mui/material/styles';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
} from 'chart.js';
import dayjs from 'dayjs';
import { MongoClient } from "mongodb";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

const sidebarTabs = [
  { key: "dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { key: "knowledge", label: "Knowledge Base", icon: <MenuBookIcon /> },
  { key: "chat", label: "Chat History", icon: <MenuBookIcon /> },
];

// --- Enhance card and typography styling for a more modern look ---
function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card sx={{ minWidth: 200, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #e0f2f1', bgcolor: '#fafdff', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ color: '#018b8a', mb: 1, fontWeight: 700, letterSpacing: 0.5 }}>{label}</Typography>
        <Typography variant="h4" fontWeight={800} color="#014d4e" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 36 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function EntabSupportDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [schoolName] = useState("Entab Support");
  const [schoolCode] = useState("ENTAB");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageType, setUsageType] = useState<'daily' | 'weekly' | 'monthly' | 'hourly'>('hourly');
  const [usageData, setUsageData] = useState<{ period: string, count: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number, count: number }[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [hourlyDate, setHourlyDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [hourlyError, setHourlyError] = useState<string | null>(null);
  const [ticketHourlyData, setTicketHourlyData] = useState<{ hour: number, count: number }[]>([]);
  const [loadingTicketStats, setLoadingTicketStats] = useState(true);
  const [ticketStatsError, setTicketStatsError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/chat/sessions")
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load chat sessions.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setLoadingUsage(true);
    setHourlyError(null);
    if (usageType === 'hourly') {
      fetch(`/api/chat/usage/hourly?date=${hourlyDate}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.usage) && data.usage.length === 24) {
            setHourlyData(data.usage);
            setHourlyError(null);
          } else {
            setHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));
            setHourlyError('No data for this day.');
          }
          setLoadingUsage(false);
        })
        .catch(() => {
          setHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));
          setHourlyError('Failed to load hourly data.');
          setLoadingUsage(false);
        });
    } else {
      fetch(`/api/chat/usage?type=${usageType}`)
        .then(res => res.json())
        .then(data => {
          setUsageData(data.usage || []);
          setLoadingUsage(false);
        })
        .catch(() => setLoadingUsage(false));
    }
  }, [usageType, hourlyDate]);

  // Fetch ticket stats for the current day
  useEffect(() => {
    setLoadingTicketStats(true);
    setTicketStatsError(null);
    const from = `${hourlyDate}T00:00:00.000Z`;
    const to = `${hourlyDate}T23:59:59.999Z`;
    fetch(`/api/support/ticket-stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.stats)) {
          // Map to 24-hour array
          const hourMap: Record<number, number> = {};
          data.stats.forEach((r: any) => {
            hourMap[r._id.hour] = r.count;
          });
          const full = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }));
          setTicketHourlyData(full);
        } else {
          setTicketHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));
          setTicketStatsError('No ticket data for this day.');
        }
        setLoadingTicketStats(false);
      })
      .catch(() => {
        setTicketHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })));
        setTicketStatsError('Failed to load ticket stats.');
        setLoadingTicketStats(false);
      });
  }, [hourlyDate]);

  // --- Analytics ---
  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeSessionsToday = sessions.filter(s => s.lastMessageAt && new Date(s.lastMessageAt).toISOString().slice(0, 10) === todayStr).length;
  const messagesToday = sessions.filter(s => s.lastMessageAt && new Date(s.lastMessageAt).toISOString().slice(0, 10) === todayStr).reduce((sum, s) => sum + (s.messageCount || 0), 0);
  const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;
  const recentSessions = [...sessions].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()).slice(0, 5);

  // --- Chart Data ---
  const chartData = {
    labels: usageData.map(u => u.period),
    datasets: [
      {
        label: 'Messages',
        data: usageData.map(u => u.count),
        fill: false,
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.3,
      },
    ],
  };
  const usageChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: usageType === 'hourly' ? 'Hour of Day (IST)' : 'Time Period', font: { size: 14 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'Total Messages', font: { size: 14 } }
      },
    },
  };

  // Convert UTC hour to IST hour for labels
  function utcHourToISTLabel(utcHour: number) {
    // Add 5 hours 30 minutes
    let istHour = utcHour + 5;
    let istMinute = 30;
    if (istHour >= 24) {
      istHour -= 24;
    }
    // Format as 'HH:MM' in 24-hour format
    return `${istHour.toString().padStart(2, '0')}:${istMinute === 0 ? '00' : '30'}`;
  }

  const hourlyChartData = {
    labels: hourlyData.map(u => utcHourToISTLabel(u.hour)),
    datasets: [
      {
        label: 'Messages',
        data: hourlyData.map(u => u.count),
        backgroundColor: '#2563eb',
      },
    ],
  };
  const hourlyChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: 'Hour of Day (IST)', font: { size: 14 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e5e7eb' },
        title: { display: true, text: 'Total Messages', font: { size: 14 } }
      },
    },
  };

  const ticketHourlyChartData = {
    labels: ticketHourlyData.map(u => utcHourToISTLabel(u.hour)),
    datasets: [
      {
        label: 'Tickets',
        data: ticketHourlyData.map(u => u.count),
        backgroundColor: '#f59e42',
      },
    ],
  };
  const ticketHourlyChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: 'Hour of Day (IST)', font: { size: 14 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#ffe0b2' },
        title: { display: true, text: 'Total Tickets', font: { size: 14 } }
      },
    },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf1fb', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            bgcolor: '#014d4e', // dark aquamarine
            color: 'white',
            width: 220,
            border: 0,
            boxShadow: 3,
            borderRadius: 0,
          }
        }}
      >
        <Box sx={{ px: 3, py: 4, mb: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 0.5, lineHeight: 1.1, letterSpacing: 0.5 }}>{schoolName}</Typography>
          <Typography variant="caption" sx={{ color: '#7de2d1', fontFamily: 'monospace', fontWeight: 600 }}>{schoolCode}</Typography>
        </Box>
        <List>
          {sidebarTabs.map(n => (
            <ListItem key={n.key} disablePadding sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemButton
                selected={tab === n.key}
                onClick={() => setTab(n.key)}
                sx={{
                  borderRadius: 2,
                  bgcolor: tab === n.key ? '#017c7b' : 'inherit',
                  color: tab === n.key ? '#fff' : '#e0f7fa',
                  '&:hover': {
                    bgcolor: '#016060',
                  },
                  '&.Mui-selected': {
                    bgcolor: '#017c7b',
                    color: '#fff',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: '#018b8a',
                  },
                }}
              >
                <ListItemIcon sx={{ color: tab === n.key ? '#fff' : '#b2f7ef', minWidth: 36 }}>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} primaryTypographyProps={{ sx: { color: tab === n.key ? '#fff' : '#b2f7ef', fontWeight: 600, letterSpacing: 0.2 } }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {/* Logout Button */}
        <Box sx={{ px: 3, py: 2, mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            sx={{ fontWeight: 700, borderWidth: 2, borderColor: '#ff5252', color: '#ff5252', '&:hover': { bgcolor: '#ffebee', borderColor: '#ff1744', color: '#d32f2f' } }}
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
      <Box sx={{ flex: 1, py: 4, ml: '220px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', px: 0 }}>
        {/* Top Bar */}
        {/* Removed the Entab Support Dashboard heading as requested */}
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <Paper sx={{ width: '100%', p: 4, borderRadius: 3, boxShadow: 2, mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {tab === "dashboard" && (
              <>
                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <SummaryCard label="Total Sessions" value={totalSessions} />
                  <SummaryCard label="Total Messages" value={totalMessages} />
                  <SummaryCard label="Active Sessions Today" value={activeSessionsToday} />
                  <SummaryCard label="Messages Today" value={messagesToday} />
                  <SummaryCard label="Avg. Msgs/Session" value={avgMessagesPerSession} />
                </Box>
                {/* Usage & Ticket Stats Graphs Side by Side */}
                <Box sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 4,
                  mb: 4,
                  justifyContent: 'center',
                  alignItems: 'stretch',
                }}>
                  {/* Usage Graph */}
                  <Paper elevation={3} sx={{
                    flex: 1,
                    minWidth: 320,
                    maxWidth: 480,
                    p: 3,
                    borderRadius: 4,
                    border: '1.5px solid #e0e7ef',
                    bgcolor: '#fafdff',
                    boxShadow: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}></Typography>
                      <Tabs value={usageType} onChange={(_, v) => setUsageType(v)}>
                        <Tab value="daily" label="Daily" />
                        <Tab value="weekly" label="Weekly" />
                        <Tab value="monthly" label="Monthly" />
                        <Tab value="hourly" label="Hourly" />
                      </Tabs>
                      {usageType === 'hourly' && (
                        <TextField
                          type="date"
                          size="small"
                          value={hourlyDate}
                          onChange={e => setHourlyDate(e.target.value)}
                          sx={{ ml: 2, minWidth: 140 }}
                          inputProps={{ max: dayjs().format('YYYY-MM-DD') }}
                        />
                      )}
                    </Box>
                    {loadingUsage ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
                    ) : usageType === 'hourly' ? (
                      <>
                        <Bar data={hourlyChartData} options={hourlyChartOptions} height={340} width={420} />
                        {hourlyError && (
                          <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>{hourlyError}</Typography>
                        )}
                      </>
                    ) : (
                      <Line data={chartData} options={usageChartOptions} height={340} width={420} />
                    )}
                  </Paper>
                  {/* Ticket Stats Graph */}
                  <Paper elevation={3} sx={{
                    flex: 1,
                    minWidth: 320,
                    maxWidth: 480,
                    p: 3,
                    borderRadius: 4,
                    border: '1.5px solid #ffe0b2',
                    bgcolor: '#fffaf5',
                    boxShadow: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: '#f59e42' }}>Tickets Created (Hourly)</Typography>
                    </Box>
                    {loadingTicketStats ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
                    ) : (
                      <Bar data={ticketHourlyChartData} options={ticketHourlyChartOptions} height={340} width={420} />
                    )}
                    {ticketStatsError && (
                      <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>{ticketStatsError}</Typography>
                    )}
                  </Paper>
                </Box>
                {/* Recent Activity */}
                <Box sx={{ width: '100%', maxWidth: 700 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Recent Activity</Typography>
                  <Paper sx={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f6fb' }}>
                          <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Session ID</th>
                          <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Last Message</th>
                          <th style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>Messages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSessions.map((s) => (
                          <tr key={s.sessionId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: 8 }}>{s.sessionId}</td>
                            <td style={{ padding: 8 }}>{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : ''}</td>
                            <td style={{ padding: 8 }}>{s.messageCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Paper>
                </Box>
              </>
            )}
            {tab === "knowledge" && (
              <>
                <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ maxWidth: 900, width: '100%', mb: 2 }}>
                    <Typography variant="h3" fontWeight={800} sx={{ color: '#222b36', fontSize: 48, letterSpacing: 0, lineHeight: 1.15 }}>
                      Knowledge Base Editor
                    </Typography>
                    <Typography sx={{ color: '#7b8fa9', fontSize: 22, fontWeight: 400, mt: 1 }}>
                      Update your support knowledge base here.
                    </Typography>
                  </Box>
                  <Paper sx={{ width: '100%', maxWidth: 1200, p: 4, borderRadius: 4, boxShadow: 3, bgcolor: '#fff' }}>
                    <KnowledgeBaseEditor />
                  </Paper>
                </Box>
              </>
            )}
            {tab === "chat" && <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>Chat History</Typography>}
            {tab === "chat" && <Typography sx={{ textAlign: 'center', mb: 4, color: '#2563eb' }}>Review previous support chats.</Typography>}
            {tab === "chat" && <ChatHistory />}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

function KnowledgeBaseEditor() {
  const [tab, setTab] = useState(0);
  const [botRole, setBotRole] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [moduleFeatures, setModuleFeatures] = useState<string[]>([""]);
  const [scenarios, setScenarios] = useState([
    { title: "", scenario: "", steps: [""] }
  ]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/knowledge-base")
      .then(res => res.json())
      .then(data => {
        setBotRole(data.botRole || "");
        setIntroduction(data.introduction || "");
        setModuleFeatures(Array.isArray(data.moduleFeatures) && data.moduleFeatures.length ? data.moduleFeatures : [""]);
        setScenarios(Array.isArray(data.scenarios) && data.scenarios.length ? data.scenarios : [{ title: "", scenario: "", steps: [""] }]);
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load knowledge base.");
        setLoading(false);
      });
  }, []);

  // Handlers for module features
  const handleFeatureChange = (i: number, value: string) => {
    setModuleFeatures(f => f.map((v, idx) => idx === i ? value : v));
  };
  const addFeature = () => setModuleFeatures(f => [...f, ""]);
  const removeFeature = (i: number) => setModuleFeatures(f => f.filter((_, idx) => idx !== i));

  // Handlers for scenarios
  const handleScenarioChange = (i: number, key: "title" | "scenario", value: string) => {
    setScenarios(s => s.map((sc, idx) => idx === i ? { ...sc, [key]: value } : sc));
  };
  const handleStepChange = (i: number, j: number, value: string) => {
    setScenarios(s => s.map((sc, idx) => idx === i ? { ...sc, steps: sc.steps.map((st, k) => k === j ? value : st) } : sc));
  };
  const addScenario = () => setScenarios(s => [...s, { title: "", scenario: "", steps: [""] }]);
  const removeScenario = (i: number) => setScenarios(s => s.filter((_, idx) => idx !== i));
  const addStep = (i: number) => setScenarios(s => s.map((sc, idx) => idx === i ? { ...sc, steps: [...sc.steps, ""] } : sc));
  const removeStep = (i: number, j: number) => setScenarios(s => s.map((sc, idx) => idx === i ? { ...sc, steps: sc.steps.filter((_, k) => k !== j) } : sc));

  // Document upload handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    Array.from(e.target.files).forEach(file => formData.append("documents", file));
    try {
      const res = await fetch("/api/knowledge-base/upload-doc", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setSuccess("Document(s) uploaded successfully!");
      } else {
        setUploadError("Failed to upload document(s).");
      }
    } catch {
      setUploadError("Failed to upload document(s).");
    }
    setUploading(false);
    e.target.value = "";
  };

  // Document delete handler
  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/knowledge-base/document/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setSuccess("Document deleted successfully!");
      } else {
        setUploadError("Failed to delete document.");
      }
    } catch {
      setUploadError("Failed to delete document.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botRole, introduction, moduleFeatures, scenarios })
      });
      if (res.ok) {
        setSuccess("Knowledge base saved successfully!");
      } else {
        setError("Failed to save knowledge base.");
      }
    } catch {
      setError("Failed to save knowledge base.");
    }
    setSaving(false);
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ width: '100%', mt: 4 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 3 }}>
        <Tab label="Bot Role" />
        <Tab label="Introduction" />
        <Tab label="Module Features" />
        <Tab label="Scenarios" />
        <Tab label="Documents" />
      </Tabs>
      {success && <Box sx={{ color: 'green', textAlign: 'center', mb: 2 }}>{success}</Box>}
      {error && <Box sx={{ color: 'red', textAlign: 'center', mb: 2 }}>{error}</Box>}
      {tab === 0 && (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          <TextField
            label="Bot Role"
            value={botRole}
            onChange={e => setBotRole(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            variant="outlined"
          />
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          <TextField
            label="Introduction"
            value={introduction}
            onChange={e => setIntroduction(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            variant="outlined"
          />
        </Box>
      )}
      {tab === 2 && (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Module Features</Typography>
          {moduleFeatures.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                value={f}
                onChange={e => handleFeatureChange(i, e.target.value)}
                placeholder={`Feature ${i + 1}`}
                fullWidth
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <IconButton onClick={() => removeFeature(i)} disabled={moduleFeatures.length === 1} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addFeature}>Add Feature</Button>
        </Box>
      )}
      {tab === 3 && (
        <Box sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Scenarios</Typography>
          {scenarios.map((sc, i) => (
            <Paper key={i} sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  label="Title"
                  value={sc.title}
                  onChange={e => handleScenarioChange(i, "title", e.target.value)}
                  fullWidth
                  sx={{ mr: 1 }}
                />
                <IconButton onClick={() => removeScenario(i)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Scenario (optional)"
                value={sc.scenario}
                onChange={e => handleScenarioChange(i, "scenario", e.target.value)}
                fullWidth
                multiline
                minRows={2}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Steps</Typography>
              {sc.steps.map((st, j) => (
                <Box key={j} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TextField
                    value={st}
                    onChange={e => handleStepChange(i, j, e.target.value)}
                    placeholder={`Step ${j + 1}`}
                    fullWidth
                    sx={{ mr: 1 }}
                  />
                  <IconButton onClick={() => removeStep(i, j)} disabled={sc.steps.length === 1} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => addStep(i)} sx={{ mt: 1, mb: 2 }}>Add Step</Button>
            </Paper>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addScenario}>Add Scenario</Button>
        </Box>
      )}
      {tab === 4 && (
        <Box sx={{ p: 2, maxWidth: 700, mx: 'auto' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Upload Documents</Typography>
          <Button
            variant="contained"
            component="label"
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload Document(s)'}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              hidden
              onChange={handleUpload}
            />
          </Button>
          {uploadError && <Typography color="error" sx={{ mt: 1 }}>{uploadError}</Typography>}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Uploaded Documents</Typography>
            {documents.length === 0 ? (
              <Typography sx={{ color: '#64748b' }}>No documents uploaded yet.</Typography>
            ) : (
              <Box component="ul" sx={{ pl: 2, listStyle: 'disc', color: '#222' }}>
                {documents.map(doc => (
                  <li key={doc.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{doc.filename}</span>
                    <Button size="small" color="error" onClick={() => handleDeleteDoc(doc.id)} sx={{ ml: 2 }}>Delete</Button>
                  </li>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button variant="contained" color="primary" size="large" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Knowledge Base'}</Button>
      </Box>
    </Box>
  );
}

function ChatHistory() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('Newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minMessages, setMinMessages] = useState('>0');
  const [viewSession, setViewSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    setLoadingSessions(true);
    fetch("/api/chat/sessions")
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoadingSessions(false);
      })
      .catch(() => {
        setError("Failed to load chat sessions.");
        setLoadingSessions(false);
      });
  }, []);

  const handleView = (session: any) => {
    setViewSession(session);
    setLoadingMessages(true);
    fetch(`/api/chat/history/${session.sessionId}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
        setLoadingMessages(false);
      })
      .catch(() => {
        setLoadingMessages(false);
      });
  };

  // Filtering logic (client-side for now)
  const filteredSessions = sessions.filter(s => {
    let pass = true;
    if (minMessages === '>0' && s.messageCount <= 0) pass = false;
    if (from) {
      const fromDate = new Date(from);
      if (!s.lastMessageAt || new Date(s.lastMessageAt) < fromDate) pass = false;
    }
    if (to) {
      const toDate = new Date(to);
      if (!s.lastMessageAt || new Date(s.lastMessageAt) > toDate) pass = false;
    }
    return pass;
  }).sort((a, b) => {
    if (sort === 'Newest') return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    if (sort === 'Oldest') return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
    return 0;
  });

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Chat Sessions</Typography>
        {/* Filter Row */}
        <Box sx={{ display: 'flex', gap: 3, bgcolor: '#f3f6fb', p: 2, borderRadius: 2, mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sort} label="Sort" onChange={e => setSort(e.target.value)}>
              <MenuItem value="Newest">Newest</MenuItem>
              <MenuItem value="Oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={from}
            onChange={e => setFrom(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={to}
            onChange={e => setTo(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Messages</InputLabel>
            <Select value={minMessages} label="Messages" onChange={e => setMinMessages(e.target.value)}>
              <MenuItem value=">0">&gt;0</MenuItem>
              <MenuItem value=">5">&gt;5</MenuItem>
              <MenuItem value=">10">&gt;10</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* Table */}
        <TableContainer component={Paper} sx={{ boxShadow: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Session ID</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Total Interactions</TableCell>
                <TableCell>Datetime</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingSessions ? (
                <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={20} /></TableCell></TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">No chat sessions found.</TableCell></TableRow>
              ) : filteredSessions.map((s, idx) => (
                <TableRow key={s.sessionId}>
                  <TableCell>{s.sessionId}</TableCell>
                  <TableCell>{s.ip || '127.0.0.1'}</TableCell>
                  <TableCell>{s.messageCount}</TableCell>
                  <TableCell>{s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : ''}</TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => handleView(s)}>VIEW</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Chat Messages Dialog */}
      <Dialog open={!!viewSession} onClose={() => setViewSession(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Chat Messages
          <IconButton onClick={() => setViewSession(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: theme.palette.grey[50] }}>
          {loadingMessages ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : messages.length === 0 ? (
            <Typography sx={{ color: '#64748b', fontSize: 16, py: 4 }}>No messages in this session.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[95%]">
                    <MessageBubble
                      content={msg.content}
                      isUser={msg.isUser}
                      timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                      isFirstBotMessage={false}
                    />
                  </div>
                </div>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 