import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, Send, Minimize2, Maximize2, FileText, Package, BarChart3, Receipt, Users, Settings, DollarSign, BookOpen, Mic, MicOff, ShoppingCart, Truck, CreditCard, Calculator, FileSpreadsheet, Building, Warehouse, Tag, TrendingUp, ClipboardList, UserPlus, RefreshCw, Sparkles, Navigation, Zap, Brain, ArrowRight, Trash2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const CHAT_STORAGE_KEY = 'ai-assistant-chat-history';
const MAX_STORED_MESSAGES = 50;

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
  isThinking?: boolean;
}

interface ActionButton {
  label: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  icon?: React.ReactNode;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  action: string;
  path?: string;
  tab?: string;
}

// Load messages from localStorage
const loadStoredMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed: StoredMessage[] = JSON.parse(stored);
      return parsed.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
  return [];
};

// Save messages to localStorage
const saveMessages = (messages: Message[]) => {
  try {
    const toStore: StoredMessage[] = messages
      .slice(-MAX_STORED_MESSAGES)
      .filter(m => !m.actions) // Don't store action buttons
      .map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

const AIChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Smart navigation mapping with enhanced context
  const navigationMap: Record<string, { path: string; tab?: string; description: string }> = {
    // Dashboard
    'dashboard': { path: '/', description: 'Main dashboard with overview' },
    'home': { path: '/', description: 'Main dashboard' },
    'overview': { path: '/', description: 'Dashboard overview' },
    
    // Parts
    'parts': { path: '/parts', description: 'Parts management' },
    'add part': { path: '/parts', tab: 'add', description: 'Add new part' },
    'new part': { path: '/parts', tab: 'add', description: 'Create new part' },
    'create part': { path: '/parts', tab: 'add', description: 'Create new part' },
    'parts list': { path: '/parts', tab: 'list', description: 'View all parts' },
    'view parts': { path: '/parts', tab: 'list', description: 'View parts list' },
    'kits': { path: '/parts', tab: 'kits', description: 'Manage kits' },
    'create kit': { path: '/parts', tab: 'kits', description: 'Create new kit' },
    
    // Sales
    'sales': { path: '/sales', description: 'Sales module' },
    'invoice': { path: '/sales', tab: 'invoice', description: 'Sales invoice' },
    'create invoice': { path: '/sales', tab: 'invoice', description: 'Create new invoice' },
    'new invoice': { path: '/sales', tab: 'invoice', description: 'Create sales invoice' },
    'quotation': { path: '/sales', tab: 'quotation', description: 'Sales quotation' },
    'quote': { path: '/sales', tab: 'quotation', description: 'Create quotation' },
    'delivery': { path: '/sales', tab: 'delivery', description: 'Delivery challan' },
    'challan': { path: '/sales', tab: 'delivery', description: 'Delivery challan' },
    'sales returns': { path: '/sales', tab: 'returns', description: 'Sales returns' },
    'returns': { path: '/sales', tab: 'returns', description: 'Process returns' },
    
    // Inventory
    'inventory': { path: '/inventory', description: 'Inventory management' },
    'stock': { path: '/inventory', description: 'Stock management' },
    'stock balance': { path: '/inventory', tab: 'balance', description: 'View stock balance' },
    'stock transfer': { path: '/inventory', tab: 'transfer', description: 'Transfer stock' },
    'adjust stock': { path: '/inventory', tab: 'adjust', description: 'Adjust stock levels' },
    'purchase order': { path: '/inventory', tab: 'purchase', description: 'Create purchase order' },
    'po': { path: '/inventory', tab: 'purchase', description: 'Purchase order' },
    
    // Vouchers
    'vouchers': { path: '/vouchers', description: 'Voucher management' },
    'voucher': { path: '/vouchers', description: 'Manage vouchers' },
    'payment': { path: '/vouchers', tab: 'payment', description: 'Payment voucher' },
    'payment voucher': { path: '/vouchers', tab: 'payment', description: 'Create payment' },
    'receipt': { path: '/vouchers', tab: 'receipt', description: 'Receipt voucher' },
    'receipt voucher': { path: '/vouchers', tab: 'receipt', description: 'Create receipt' },
    'journal': { path: '/vouchers', tab: 'journal', description: 'Journal voucher' },
    'contra': { path: '/vouchers', tab: 'contra', description: 'Contra voucher' },
    
    // Reports
    'reports': { path: '/reports', description: 'Reports & analytics' },
    'analytics': { path: '/reports', description: 'View analytics' },
    'sales report': { path: '/reports', tab: 'sales', description: 'Sales reports' },
    'expense report': { path: '/reports', tab: 'expenses', description: 'Expense reports' },
    
    // Expenses
    'expenses': { path: '/expenses', description: 'Expense management' },
    'add expense': { path: '/expenses', tab: 'add', description: 'Add new expense' },
    'expense types': { path: '/expenses', tab: 'types', description: 'Manage expense types' },
    
    // Accounting
    'accounting': { path: '/accounting', description: 'Accounting module' },
    'accounts': { path: '/accounting', description: 'Chart of accounts' },
    'ledger': { path: '/accounting', tab: 'ledger', description: 'General ledger' },
    'trial balance': { path: '/accounting', tab: 'trial', description: 'Trial balance' },
    
    // Financial
    'financial': { path: '/financial-statements', description: 'Financial statements' },
    'balance sheet': { path: '/financial-statements', tab: 'balance', description: 'Balance sheet' },
    'income statement': { path: '/financial-statements', tab: 'income', description: 'Income statement' },
    'profit loss': { path: '/financial-statements', tab: 'income', description: 'Profit & loss' },
    'p&l': { path: '/financial-statements', tab: 'income', description: 'Profit & loss' },
    
    // Manage
    'manage': { path: '/manage', description: 'Customer & supplier management' },
    'customers': { path: '/manage', tab: 'customers', description: 'Customer management' },
    'customer': { path: '/manage', tab: 'customers', description: 'Manage customers' },
    'add customer': { path: '/manage', tab: 'customers', description: 'Add new customer' },
    'suppliers': { path: '/manage', tab: 'suppliers', description: 'Supplier management' },
    'supplier': { path: '/manage', tab: 'suppliers', description: 'Manage suppliers' },
    'add supplier': { path: '/manage', tab: 'suppliers', description: 'Add new supplier' },
    
    // Settings
    'settings': { path: '/settings', description: 'System settings' },
    'users': { path: '/settings', tab: 'users', description: 'User management' },
    'add user': { path: '/settings', tab: 'users', description: 'Add new user' },
    'roles': { path: '/settings', tab: 'roles', description: 'Roles & permissions' },
    'whatsapp': { path: '/settings', tab: 'whatsapp', description: 'WhatsApp settings' },
    'company': { path: '/settings', tab: 'company', description: 'Company profile' },
    'backup': { path: '/settings', tab: 'backup', description: 'Backup & restore' },
    
    // Pricing
    'pricing': { path: '/pricing-costing', description: 'Pricing & costing' },
    'costing': { path: '/pricing-costing', description: 'Cost management' },
  };

  // Intelligent message processor
  const processUserIntent = useCallback((message: string): { type: string; data: any; confidence: number } => {
    const lowerMessage = message.toLowerCase().trim();
    
    // Navigation intent detection
    const navigationKeywords = ['go to', 'open', 'show me', 'take me to', 'navigate to', 'switch to', 'view', 'access'];
    const createKeywords = ['create', 'add', 'new', 'make', 'generate'];
    const helpKeywords = ['help', 'how to', 'how do i', 'what is', 'explain', 'guide'];
    const actionKeywords = ['do', 'perform', 'execute', 'run', 'process'];
    
    // Check for navigation intent
    for (const keyword of navigationKeywords) {
      if (lowerMessage.includes(keyword)) {
        for (const [key, value] of Object.entries(navigationMap)) {
          if (lowerMessage.includes(key)) {
            return { type: 'navigate', data: { ...value, key }, confidence: 0.9 };
          }
        }
      }
    }
    
    // Check for create/add intent
    for (const keyword of createKeywords) {
      if (lowerMessage.includes(keyword)) {
        for (const [key, value] of Object.entries(navigationMap)) {
          if (lowerMessage.includes(key.replace('add ', '').replace('create ', '').replace('new ', ''))) {
            return { type: 'create', data: { ...value, key }, confidence: 0.85 };
          }
        }
      }
    }
    
    // Direct module matching
    for (const [key, value] of Object.entries(navigationMap)) {
      if (lowerMessage === key || lowerMessage.includes(key)) {
        return { type: 'navigate', data: { ...value, key }, confidence: 0.75 };
      }
    }
    
    // Help intent
    for (const keyword of helpKeywords) {
      if (lowerMessage.startsWith(keyword) || lowerMessage.includes(keyword)) {
        return { type: 'help', data: { query: message }, confidence: 0.8 };
      }
    }
    
    return { type: 'general', data: { message }, confidence: 0.5 };
  }, []);

  // Smart response generator
  const generateSmartResponse = useCallback((intent: { type: string; data: any; confidence: number }): { content: string; actions?: ActionButton[] } => {
    switch (intent.type) {
      case 'navigate':
        const navData = intent.data;
        return {
          content: `🧭 Taking you to **${navData.description}**...\n\nI'll navigate you there right away.`,
          actions: [
            {
              label: `Go to ${navData.key}`,
              action: () => {
                navigate(navData.path);
                toast.success(`Navigated to ${navData.description}`);
              },
              variant: 'default',
              icon: <Navigation className="h-3 w-3" />
            }
          ]
        };
      
      case 'create':
        const createData = intent.data;
        return {
          content: `✨ I'll help you create a new item in **${createData.description}**.\n\nLet me take you to the right place.`,
          actions: [
            {
              label: `Create in ${createData.key}`,
              action: () => {
                navigate(createData.path);
                toast.success(`Ready to create in ${createData.description}`);
              },
              variant: 'default',
              icon: <Zap className="h-3 w-3" />
            }
          ]
        };
      
      case 'help':
        return {
          content: getContextualHelp(pathname),
        };
      
      default:
        return {
          content: getIntelligentResponse(intent.data.message, pathname),
        };
    }
  }, [navigate, pathname]);

  // Get contextual help based on current page
  const getContextualHelp = (path: string): string => {
    const helpGuides: Record<string, string> = {
      '/': `🏠 **Dashboard Guide**\n\nYou're on the main dashboard. Here you can:\n• View key statistics and metrics\n• Access quick actions\n• See recent activity\n• Monitor inventory levels\n\n💡 **Pro tip**: Click any quick action button below to get started!`,
      '/parts': `📦 **Parts Management Guide**\n\n• **Add Part**: Create new inventory items\n• **Parts List**: View and search all parts\n• **Kits**: Create product bundles\n\n💡 Use the search to quickly find parts by code or name.`,
      '/sales': `💰 **Sales Module Guide**\n\n• **Invoice**: Create sales invoices\n• **Quotation**: Generate quotes\n• **Delivery**: Manage deliveries\n• **Returns**: Process returns\n\n💡 Always select customer first before adding items.`,
      '/inventory': `📊 **Inventory Guide**\n\n• **Stock Balance**: View current stock levels\n• **Transfer**: Move stock between locations\n• **Adjust**: Correct stock quantities\n• **Purchase Order**: Order from suppliers\n\n💡 Regularly verify stock to maintain accuracy.`,
      '/vouchers': `📝 **Vouchers Guide**\n\n• **Payment**: Record outgoing payments\n• **Receipt**: Record incoming payments\n• **Journal**: General journal entries\n• **Contra**: Cash/bank transfers\n\n💡 Ensure proper narration for audit trail.`,
      '/settings': `⚙️ **Settings Guide**\n\n• **Users**: Manage user accounts\n• **Roles**: Configure permissions\n• **Company**: Update company profile\n• **WhatsApp**: Configure messaging\n\n💡 Backup regularly to prevent data loss.`,
    };
    
    return helpGuides[path] || `📖 **Help Guide**\n\nI can help you with:\n• Navigating the system\n• Creating records\n• Understanding features\n• Completing tasks\n\nJust tell me what you need!`;
  };

  // Intelligent response based on context
  const getIntelligentResponse = (message: string, path: string): string => {
    const lowerMessage = message.toLowerCase();
    
    // Greeting responses
    if (['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'].some(g => lowerMessage.includes(g))) {
      return `👋 Hello! I'm your AI assistant with **enhanced system control**.\n\nI can:\n🧭 Navigate you anywhere instantly\n✨ Help create records\n📊 Provide insights\n🔧 Guide you through tasks\n\nWhat would you like to do?`;
    }
    
    // Thank you responses
    if (['thank', 'thanks', 'appreciate'].some(t => lowerMessage.includes(t))) {
      return `You're welcome! 😊\n\nI'm always here to help. Just ask me to:\n• Go to any module\n• Create new records\n• Explain any feature\n\nAnything else?`;
    }
    
    // Status/overview requests
    if (['status', 'overview', 'summary', 'how is'].some(s => lowerMessage.includes(s))) {
      return `📈 **Quick Overview**\n\nI can show you various reports:\n• Sales performance\n• Inventory status\n• Financial summaries\n• Expense tracking\n\nWhich area interests you? Just say "go to reports" or click a quick action below.`;
    }
    
    // Default intelligent response
    return `🧠 I understand you're asking about "${message}"\n\nI can help you with this! Would you like me to:\n\n1️⃣ Navigate to a specific module\n2️⃣ Guide you through a process\n3️⃣ Explain how something works\n\nJust tell me more specifically what you need!`;
  };

  // Execute navigation with smooth transition
  const executeNavigation = useCallback((path: string, description: string) => {
    navigate(path);
    toast.success(`Navigated to ${description}`, {
      icon: <Navigation className="h-4 w-4" />,
    });
  }, [navigate]);

  // Quick actions based on current page
  const getQuickActions = (): QuickAction[] => {
    const pageActions: Record<string, QuickAction[]> = {
      '/': [
        { label: 'Invoice', icon: <FileText className="h-3 w-3" />, action: 'create_invoice', path: '/sales' },
        { label: 'Add Part', icon: <Package className="h-3 w-3" />, action: 'add_part', path: '/parts' },
        { label: 'Reports', icon: <BarChart3 className="h-3 w-3" />, action: 'view_reports', path: '/reports' },
        { label: 'Expenses', icon: <DollarSign className="h-3 w-3" />, action: 'expenses', path: '/expenses' },
        { label: 'Stock', icon: <Warehouse className="h-3 w-3" />, action: 'stock', path: '/inventory' },
        { label: 'Voucher', icon: <Receipt className="h-3 w-3" />, action: 'voucher', path: '/vouchers' },
      ],
      '/parts': [
        { label: 'New Part', icon: <Package className="h-3 w-3" />, action: 'add_part' },
        { label: 'Create Kit', icon: <Sparkles className="h-3 w-3" />, action: 'create_kit' },
        { label: 'Parts List', icon: <ClipboardList className="h-3 w-3" />, action: 'parts_list' },
        { label: 'Inventory', icon: <Warehouse className="h-3 w-3" />, action: 'inventory', path: '/inventory' },
      ],
      '/sales': [
        { label: 'Invoice', icon: <FileText className="h-3 w-3" />, action: 'invoice' },
        { label: 'Quotation', icon: <FileSpreadsheet className="h-3 w-3" />, action: 'quotation' },
        { label: 'Delivery', icon: <Truck className="h-3 w-3" />, action: 'delivery' },
        { label: 'Returns', icon: <RefreshCw className="h-3 w-3" />, action: 'returns' },
        { label: 'Customers', icon: <Users className="h-3 w-3" />, action: 'customers', path: '/manage' },
      ],
      '/inventory': [
        { label: 'Balance', icon: <Warehouse className="h-3 w-3" />, action: 'balance' },
        { label: 'Transfer', icon: <Truck className="h-3 w-3" />, action: 'transfer' },
        { label: 'Adjust', icon: <RefreshCw className="h-3 w-3" />, action: 'adjust' },
        { label: 'PO', icon: <ShoppingCart className="h-3 w-3" />, action: 'purchase_order' },
      ],
      '/vouchers': [
        { label: 'Payment', icon: <CreditCard className="h-3 w-3" />, action: 'payment' },
        { label: 'Receipt', icon: <Receipt className="h-3 w-3" />, action: 'receipt' },
        { label: 'Journal', icon: <BookOpen className="h-3 w-3" />, action: 'journal' },
        { label: 'Contra', icon: <RefreshCw className="h-3 w-3" />, action: 'contra' },
      ],
      '/settings': [
        { label: 'Users', icon: <UserPlus className="h-3 w-3" />, action: 'users' },
        { label: 'Roles', icon: <Users className="h-3 w-3" />, action: 'roles' },
        { label: 'Company', icon: <Building className="h-3 w-3" />, action: 'company' },
        { label: 'WhatsApp', icon: <Settings className="h-3 w-3" />, action: 'whatsapp' },
      ],
    };
    
    return pageActions[pathname] || pageActions['/'];
  };

  // Initialize speech recognition
  useEffect(() => {
    const windowWithSpeech = window as any;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Initial greeting or welcome back message
  useEffect(() => {
    if (isOpen && !hasLoadedHistory) {
      setHasLoadedHistory(true);
      
      if (messages.length === 0) {
        // First time user - show greeting
        const greeting: Message = {
          id: '1',
          role: 'assistant',
          content: `🤖 **AI Control Center Active**\n\nI'm your intelligent assistant with **full system control**. I can:\n\n🧭 **Navigate** - "Go to sales" or "Open inventory"\n✨ **Create** - "Add new part" or "Create invoice"\n📊 **Analyze** - "Show reports" or "View dashboard"\n🔧 **Guide** - "Help with vouchers"\n\n*Try saying: "Go to invoice" or "Help me create a customer"*`,
          timestamp: new Date(),
        };
        setMessages([greeting]);
      } else {
        // Returning user - show welcome back
        const welcomeBack: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `👋 **Welcome back!**\n\nI've restored your previous conversation (${messages.length} messages). How can I help you today?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, welcomeBack]);
      }
    }
  }, [isOpen, hasLoadedHistory, messages.length]);

  // Clear chat history
  const clearHistory = useCallback(() => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([]);
    setHasLoadedHistory(false);
    toast.success('Chat history cleared');
    
    // Show fresh greeting
    const greeting: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🤖 **AI Control Center Active**\n\nI'm your intelligent assistant with **full system control**. I can:\n\n🧭 **Navigate** - "Go to sales" or "Open inventory"\n✨ **Create** - "Add new part" or "Create invoice"\n📊 **Analyze** - "Show reports" or "View dashboard"\n🔧 **Guide** - "Help with vouchers"\n\n*Try saying: "Go to invoice" or "Help me create a customer"*`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
    setHasLoadedHistory(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Handle message send with intelligent processing
  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setConversationContext(prev => [...prev.slice(-5), input.trim()]);
    setInput('');
    setIsTyping(true);

    // Process intent and generate response
    const intent = processUserIntent(input.trim());
    
    setTimeout(() => {
      const response = generateSmartResponse(intent);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Auto-execute high confidence navigation
      if (intent.type === 'navigate' && intent.confidence >= 0.85 && response.actions?.[0]) {
        setTimeout(() => {
          response.actions![0].action();
        }, 500);
      }
    }, 600);
  }, [input, processUserIntent, generateSmartResponse]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle quick action click
  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.path && action.path !== pathname) {
      navigate(action.path);
      toast.success(`Navigated to ${action.label}`);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Help me with: ${action.label}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const response = getQuickActionResponse(action.action);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 500);
  }, [navigate, pathname]);

  // Quick action responses
  const getQuickActionResponse = (action: string): string => {
    const responses: Record<string, string> = {
      create_invoice: "📄 **Create Invoice**\n\n1. Select customer\n2. Add line items\n3. Apply discounts\n4. Review & save\n\n💡 Pro tip: Use item search to quickly find products!",
      add_part: "📦 **Add New Part**\n\n1. Enter part code & name\n2. Set category & brand\n3. Configure pricing\n4. Set stock levels\n5. Save\n\n💡 Use unique part codes for easy tracking.",
      view_reports: "📊 **Reports Center**\n\nAvailable reports:\n• Sales analysis\n• Stock movement\n• Customer aging\n• Expense breakdown\n• Financial summaries",
      expenses: "💰 **Expense Management**\n\n• Add operational expenses\n• Categorize by type\n• Import bulk data\n• Post to accounts",
      stock: "📦 **Stock Management**\n\n• View balances\n• Transfer between locations\n• Adjust quantities\n• Track serial numbers",
      voucher: "📝 **Voucher Types**\n\n• **Payment**: Money going out\n• **Receipt**: Money coming in\n• **Journal**: General entries\n• **Contra**: Bank-to-bank",
    };
    
    return responses[action] || `I'll help you with ${action}. What would you like to know?`;
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 group"
        size="icon"
      >
        <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 bg-card border border-border rounded-xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden",
        isMinimized ? "w-72 h-14" : "w-80 sm:w-[400px] max-h-[calc(100vh-100px)] h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center relative">
            <Brain className="h-5 w-5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              AI Control Center
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </p>
            <p className="text-xs text-muted-foreground">Intelligent System Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!isMinimized && messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={clearHistory}
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className="max-w-[90%] space-y-2">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{message.content.replace(/\*\*(.*?)\*\*/g, '$1')}</div>
                    </div>
                    
                    {/* Action buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.variant || 'default'}
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={action.action}
                          >
                            {action.icon}
                            {action.label}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                    <div className="flex gap-1.5 items-center">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" />
                        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Quick Actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {getQuickActions().map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-background hover:bg-primary/10 hover:border-primary/30"
                  onClick={() => handleQuickAction(action)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-background">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "🎤 Listening..." : "Ask me anything or say 'Go to...'"}
                  className={cn(
                    "pr-4 h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-xl",
                    isListening && "border-primary animate-pulse"
                  )}
                />
              </div>
              <Button 
                onClick={toggleVoiceInput} 
                size="icon" 
                variant={isListening ? "destructive" : "ghost"}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-xl",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={!input.trim()}
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatBot;
