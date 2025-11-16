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
  { key: "schools", label: "School Management", icon: <MenuBookIcon /> },
];

// --- Enhance card and typography styling for a more modern look ---
function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card sx={{ flex: 1, minWidth: 180, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #e0f2f1', bgcolor: '#fafdff', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: '#018b8a', mb: 0.5, fontWeight: 700, letterSpacing: 0.5, fontSize: 13 }}>{label}</Typography>
        <Typography variant="h4" fontWeight={800} color="#014d4e" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 32 }}>{value}</Typography>
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf1fb', display: 'flex', flexDirection: 'row' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0f766e 0%, #115e59 100%)',
            color: 'white',
            border: 0,
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '1px',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)'
            }
          }
        }}
      >
        {/* Logo Section */}
        <Box sx={{ 
          px: 4, 
          py: 4, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          bgcolor: 'rgba(255, 255, 255, 0.05)'
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontSize: 24, 
              fontWeight: 700, 
              letterSpacing: '-0.5px', 
              mb: 1,
              color: 'white'
            }}
          >
            Entab Support
          </Typography>
          <Typography 
            sx={{ 
              fontSize: 13, 
              opacity: 0.8, 
              fontWeight: 500, 
              letterSpacing: 0.5, 
              textTransform: 'uppercase',
              color: 'white'
            }}
          >
            ENTAB
          </Typography>
        </Box>
        
        {/* Navigation Menu */}
        <Box component="nav" sx={{ flex: 1, py: 3 }}>
          {sidebarTabs.map((item) => (
            <Box
              key={item.key}
              component="div"
              onClick={() => setTab(item.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 2,
                px: 3,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderLeft: '3px solid transparent',
                position: 'relative',
                ...(tab === item.key && {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  borderLeftColor: '#10b981',
                  fontWeight: 600
                }),
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  borderLeftColor: 'rgba(255, 255, 255, 0.5)'
                }
              }}
            >
              <Box sx={{ 
                width: 20, 
                height: 20, 
                mr: 2, 
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.icon}
              </Box>
              <Typography component="span" sx={{ fontWeight: 'inherit' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
        
        {/* Logout Section */}
        <Box sx={{ px: 3, py: 3, borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <Button
            fullWidth
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            sx={{
              py: 1.75,
              px: 2.5,
              bgcolor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              border: 'none',
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(220, 38, 38, 0.95)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }
            }}
          >
            LOGOUT →
          </Button>
        </Box>
      </Drawer>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', width: 'calc(100vw - 280px)', ml: 0 }}>
        {/* Top Bar */}
        {/* Removed the Entab Support Dashboard heading as requested */}
        <Box sx={{ width: '100%', px: 2, py: 1 }}>
          <Paper sx={{ width: '100%', p: 2, borderRadius: 3, boxShadow: 2, display: 'flex', flexDirection: 'column' }}>
            {tab === "dashboard" && (
              <>
                {/* Summary Cards */}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
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
                  gap: 1.5,
                  mb: 2,
                  alignItems: 'stretch',
                }}>
                  {/* Usage Graph */}
                  <Paper elevation={3} sx={{
                    flex: 1,
                    minWidth: 280,
                    p: 2,
                    borderRadius: 4,
                    border: '1.5px solid #e0e7ef',
                    bgcolor: '#fafdff',
                    boxShadow: 2,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', mb: 2, gap: 2 }}>
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
                          sx={{ minWidth: 140 }}
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
                    minWidth: 280,
                    p: 2,
                    borderRadius: 4,
                    border: '1.5px solid #ffe0b2',
                    bgcolor: '#fffaf5',
                    boxShadow: 2,
                    display: 'flex',
                    flexDirection: 'column',
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
                <Box sx={{ width: '100%' }}>
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
            {tab === "chat" && (
              <>
                <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ maxWidth: 1200, width: '100%', mb: 2 }}>
                    <Typography variant="h3" fontWeight={700} sx={{ color: '#1e293b', fontSize: 28, letterSpacing: 0, lineHeight: 1.15, mb: 1 }}>
                      Chat History
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>
                      Review previous support chats.
                    </Typography>
                  </Box>
                  <Paper sx={{ width: '100%', maxWidth: 1200, p: 0, borderRadius: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <ChatHistory />
                  </Paper>
                </Box>
              </>
            )}
            {tab === "schools" && (
              <>
                <Box sx={{ width: '100%', mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ maxWidth: 1200, width: '100%', mb: 2 }}>
                    <Typography variant="h3" fontWeight={700} sx={{ color: '#1e293b', fontSize: 28, letterSpacing: 0, lineHeight: 1.15, mb: 1 }}>
                      School Management
                    </Typography>
                    <Typography sx={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>
                      Monitor school adoption, usage analytics, and generate comprehensive reports.
                    </Typography>
                  </Box>
                  <Paper sx={{ width: '100%', maxWidth: 1200, p: 0, borderRadius: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                    <SchoolManagement />
                  </Paper>
                </Box>
              </>
            )}
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

// School Management Component
function SchoolManagement() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeSchools, setActiveSchools] = useState<any[]>([]);
  const [inactiveSchools, setInactiveSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsRes, activeRes, inactiveRes] = await Promise.all([
          fetch('/api/schools/analytics'),
          fetch('/api/schools/active'),
          fetch('/api/schools/inactive')
        ]);
        
        const analyticsData = await analyticsRes.json();
        const activeData = await activeRes.json();
        const inactiveData = await inactiveRes.json();
        
        setAnalytics(analyticsData);
        setActiveSchools(activeData.schools || []);
        setInactiveSchools(inactiveData.schools || []);
      } catch (err) {
        setError('Failed to load school management data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getActivityStatus = (messageCount: number) => {
    if (messageCount > 50) return { label: 'Active', color: '#10b981' };
    if (messageCount > 10) return { label: 'Limited', color: '#f59e0b' };
    return { label: 'Inactive', color: '#ef4444' };
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={40} sx={{ color: '#0f766e' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 4 }}>
      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Card sx={{ flex: 1, minWidth: 180, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #e0f2f1', bgcolor: '#fafdff' }}>
          <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ fontSize: 24, mb: 1 }}>🏫</Box>
            <Typography variant="subtitle2" sx={{ color: '#018b8a', mb: 0.5, fontWeight: 700, letterSpacing: 0.5, fontSize: 13 }}>Total Schools</Typography>
            <Typography variant="h4" fontWeight={800} color="#014d4e" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 32 }}>{analytics?.totalSchools || 0}</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1, minWidth: 180, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #dcfce7', bgcolor: '#f0fdf4' }}>
          <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ fontSize: 24, mb: 1 }}>✅</Box>
            <Typography variant="subtitle2" sx={{ color: '#059669', mb: 0.5, fontWeight: 700, letterSpacing: 0.5, fontSize: 13 }}>Active Schools</Typography>
            <Typography variant="h4" fontWeight={800} color="#065f46" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 32 }}>{analytics?.activeSchools || 0}</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1, minWidth: 180, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #fed7d7', bgcolor: '#fffbfa' }}>
          <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ fontSize: 24, mb: 1 }}>⚠️</Box>
            <Typography variant="subtitle2" sx={{ color: '#dc2626', mb: 0.5, fontWeight: 700, letterSpacing: 0.5, fontSize: 13 }}>Inactive Schools</Typography>
            <Typography variant="h4" fontWeight={800} color="#991b1b" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 32 }}>{analytics?.inactiveSchools || 0}</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ flex: 1, minWidth: 180, minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 2, borderRadius: 4, border: '1.5px solid #dbeafe', bgcolor: '#f8faff' }}>
          <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
            <Box sx={{ fontSize: 24, mb: 1 }}>📈</Box>
            <Typography variant="subtitle2" sx={{ color: '#2563eb', mb: 0.5, fontWeight: 700, letterSpacing: 0.5, fontSize: 13 }}>Adoption Rate</Typography>
            <Typography variant="h4" fontWeight={800} color="#1d4ed8" sx={{ fontFamily: 'Inter, sans-serif', fontSize: 32 }}>{analytics?.adoptionRate || 0}%</Typography>
          </CardContent>
        </Card>
      </Box>
      
      {/* Recently Active Schools */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#374151' }}>Recently Active Schools</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Paper sx={{ flex: 1, minWidth: 400, p: 3, borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#059669', mr: 2 }}>Active ({activeSchools.length})</Typography>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {activeSchools.map((school, idx) => {
                const schoolInfo = school.schoolInfo?.[0];
                const status = getActivityStatus(school.messageCount);
                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: idx === activeSchools.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#111827' }}>
                        {schoolInfo?.name || school._id}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {school.messageCount} messages
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      bgcolor: status.color, 
                      color: 'white', 
                      px: 2, 
                      py: 0.5, 
                      borderRadius: 1, 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      {status.label}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
          
          {/* Inactive Schools */}
          <Paper sx={{ flex: 1, minWidth: 400, p: 3, borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#dc2626', mr: 2 }}>Inactive ({inactiveSchools.length})</Typography>
            </Box>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {inactiveSchools.map((school, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: idx === inactiveSchools.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#111827' }}>
                      {school.name || school.schoolcode}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      No recent activity
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: '#6b7280', 
                    color: 'white', 
                    px: 2, 
                    py: 0.5, 
                    borderRadius: 1, 
                    fontSize: 12, 
                    fontWeight: 600 
                  }}>
                    Inactive
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
      
      {/* Generate Reports */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button 
          variant="contained" 
          size="large"
          sx={{ 
            bgcolor: '#0f766e', 
            color: 'white', 
            px: 4, 
            py: 1.5, 
            borderRadius: 2,
            fontWeight: 600,
            '&:hover': { 
              bgcolor: '#0d5b52'
            }
          }}
        >
          Generate Reports
        </Button>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
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
    
    // Fetch average rating
    fetch("/api/support/average-rating")
      .then(res => res.json())
      .then(data => {
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
      })
      .catch(() => {
        console.error("Failed to load average rating");
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

  // Pagination logic
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSessions = filteredSessions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [from, to, minMessages, sort]);

  return (
    <>
      <Box sx={{ width: '100%', p: 4 }}>
      {/* Section Title with Accent Line and Average Rating */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          sx={{ 
            color: '#374151', 
            fontSize: 24, 
            display: 'flex', 
            alignItems: 'center',
            '&::before': {
              content: '""',
              width: '4px',
              height: '24px',
              background: '#0f766e',
              borderRadius: '2px',
              marginRight: '16px'
            }
          }}
        >
          Chat Sessions
        </Typography>
        
        {/* Average Rating Display */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          bgcolor: '#fff',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          border: '2px solid #f59e0b',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, fontSize: 11 }}>
              AVERAGE RATING
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#f59e0b' }}>
                {averageRating.toFixed(1)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#f59e0b', fontSize: 18 }}>
                ★
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: 10 }}>
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Filters Grid - matching screenshot */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 3, 
        mb: 4, 
        p: 3, 
        bgcolor: '#f1f5f9', 
        borderRadius: 1, 
        border: '1px solid #e2e8f0' 
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#6b7280', 
            mb: 1.5, 
            textTransform: 'uppercase', 
            letterSpacing: 1 
          }}>Sort</Typography>
          <Select 
            value={sort} 
            onChange={e => setSort(e.target.value)}
            size="medium"
            displayEmpty
            sx={{ 
              bgcolor: 'white', 
              minHeight: 45,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                border: '1px solid #d1d5db',
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#0f766e' }
              },
              '& .MuiSelect-select': {
                py: 1.5,
                fontSize: 14
              }
            }}
          >
            <MenuItem value="Newest">Newest</MenuItem>
            <MenuItem value="Oldest">Oldest</MenuItem>
            <MenuItem value="Most Interactions">Most Interactions</MenuItem>
          </Select>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#6b7280', 
            mb: 1.5, 
            textTransform: 'uppercase', 
            letterSpacing: 1 
          }}>From</Typography>
          <TextField
            type="date"
            placeholder="dd-mm-yyyy"
            value={from}
            onChange={e => setFrom(e.target.value)}
            sx={{ 
              bgcolor: 'white',
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                border: '1px solid #d1d5db',
                minHeight: 45,
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#0f766e' }
              },
              '& .MuiInputBase-input': {
                py: 1.5,
                fontSize: 14
              }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#6b7280', 
            mb: 1.5, 
            textTransform: 'uppercase', 
            letterSpacing: 1 
          }}>To</Typography>
          <TextField
            type="date"
            placeholder="dd-mm-yyyy"
            value={to}
            onChange={e => setTo(e.target.value)}
            sx={{ 
              bgcolor: 'white',
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                border: '1px solid #d1d5db',
                minHeight: 45,
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#0f766e' }
              },
              '& .MuiInputBase-input': {
                py: 1.5,
                fontSize: 14
              }
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#6b7280', 
            mb: 1.5, 
            textTransform: 'uppercase', 
            letterSpacing: 1 
          }}>Messages</Typography>
          <Select 
            value={minMessages} 
            onChange={e => setMinMessages(e.target.value)}
            size="medium"
            displayEmpty
            sx={{ 
              bgcolor: 'white',
              minHeight: 45,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                border: '1px solid #d1d5db',
                '&:hover fieldset': { borderColor: '#9ca3af' },
                '&.Mui-focused fieldset': { borderColor: '#0f766e' }
              },
              '& .MuiSelect-select': {
                py: 1.5,
                fontSize: 14
              }
            }}
          >
            <MenuItem value=">0">&gt;0</MenuItem>
            <MenuItem value=">5">&gt;5</MenuItem>
            <MenuItem value=">10">&gt;10</MenuItem>
            <MenuItem value=">20">&gt;20</MenuItem>
          </Select>
        </Box>
      </Box>
        {/* Clean Table - matching screenshot */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderRadius: 1, 
          overflow: 'hidden', 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
        }}>
          <Table sx={{ width: '100%' }}>
            <TableHead>
              <TableRow sx={{ 
                '& th': {
                  bgcolor: '#f9fafb',
                  py: 2,
                  px: 3,
                  fontWeight: 700,
                  fontSize: 12,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  borderBottom: '1px solid #e5e7eb'
                }
              }}>
                <TableCell>Session ID</TableCell>
                <TableCell>School Code</TableCell>
                <TableCell>Total Interactions</TableCell>
                <TableCell>Datetime</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingSessions ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={24} sx={{ color: '#0f766e' }} />
                  </TableCell>
                </TableRow>
              ) : currentSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#6b7280', fontSize: 15 }}>
                    No chat sessions found.
                  </TableCell>
                </TableRow>
              ) : currentSessions.map((s, idx) => (
                <TableRow 
                  key={s.sessionId} 
                  sx={{ 
                    '&:hover': { bgcolor: '#f8fafc' },
                    '&:last-child td': { borderBottom: 'none' },
                    '& td': {
                      py: 2.5,
                      px: 3,
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: 15,
                      color: '#374151',
                      fontWeight: 500
                    }
                  }}
                >
                  <TableCell>
                    <Box sx={{ 
                      fontFamily: 'Monaco, Consolas, monospace', 
                      fontSize: 14, 
                      color: '#0f766e', 
                      fontWeight: 600, 
                      bgcolor: 'rgba(15, 118, 110, 0.1)', 
                      py: 0.75, 
                      px: 1.5, 
                      borderRadius: 1.5, 
                      display: 'inline-block' 
                    }}>
                      {s.sessionId}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {s.schoolCode ? (
                      <Box sx={{ 
                        bgcolor: '#0f766e', 
                        color: 'white', 
                        py: 0.75, 
                        px: 1.5, 
                        borderRadius: 2.5, 
                        fontSize: 13, 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        letterSpacing: 0.5, 
                        display: 'inline-block' 
                      }}>
                        {s.schoolCode}
                      </Box>
                    ) : (
                      <Box sx={{ 
                        bgcolor: '#6b7280', 
                        color: 'white', 
                        py: 0.75, 
                        px: 1.5, 
                        borderRadius: 2.5, 
                        fontSize: 13, 
                        fontWeight: 600, 
                        display: 'inline-block' 
                      }}>
                        N/A
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ 
                      bgcolor: 'rgba(16, 185, 129, 0.1)', 
                      color: '#065f46', 
                      py: 0.75, 
                      px: 1.5, 
                      borderRadius: 2.5, 
                      fontSize: 13, 
                      fontWeight: 700, 
                      textAlign: 'center', 
                      display: 'inline-block', 
                      minWidth: 40 
                    }}>
                      {s.messageCount}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ color: '#6b7280', fontSize: 14 }}>
                      {s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleView(s)}
                      sx={{ 
                        background: 'linear-gradient(135deg, #0f766e, #10b981)', 
                        color: 'white', 
                        py: 1.25, 
                        px: 2.5, 
                        borderRadius: 1.5, 
                        fontWeight: 600, 
                        fontSize: 13, 
                        textTransform: 'uppercase', 
                        letterSpacing: 0.5,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0d5b52, #0f766e)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)'
                        }
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} of {filteredSessions.length} sessions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </Button>
              
              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current page
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "contained" : "outlined"}
                      size="small"
                      onClick={() => handlePageChange(page)}
                      sx={{
                        minWidth: 40,
                        ...(currentPage === page && {
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        })
                      }}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <Typography key={page} sx={{ px: 1, alignSelf: 'center' }}>...</Typography>;
                }
                return null;
              })}
              
              <Button
                variant="outlined"
                size="small"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Box>
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
    </>
  );
}
