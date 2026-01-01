import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, Send, Minimize2, Maximize2, FileText, Package, BarChart3, Receipt, Users, Settings, DollarSign, BookOpen, Mic, MicOff, ShoppingCart, Truck, CreditCard, Calculator, FileSpreadsheet, Building, Warehouse, Tag, TrendingUp, ClipboardList, UserPlus, RefreshCw, Sparkles, Navigation, Zap, Brain, ArrowRight, Trash2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

const CHAT_STORAGE_KEY = 'ai-assistant-chat-history';
const MAX_STORED_MESSAGES = 50;

// Comprehensive system prompt for ERP training
const SYSTEM_PROMPT = `You are an intelligent AI assistant for a comprehensive Inventory ERP System. Your role is to help users navigate, understand, and use the system effectively.

**SYSTEM OVERVIEW:**
This is a full-featured ERP system for inventory management, sales, accounting, and business operations.

**AVAILABLE MODULES & FEATURES:**

1. **DASHBOARD** (/)
   - Main overview with key statistics
   - Quick access to all modules
   - Recent activity monitoring

2. **PARTS MANAGEMENT** (/parts)
   - Add/Edit/Delete parts (inventory items)
   - Parts list with search and filters
   - Kits management (product bundles)
   - Features: Part codes, descriptions, categories, brands, pricing (Price A, B, M), stock levels, images

3. **SALES MODULE** (/sales)
   - Sales Invoice: Create customer invoices
   - Quotation: Generate price quotes
   - Delivery Challan: Delivery documentation
   - Sales Returns: Process returns
   - Features: Customer selection, item search, discounts, taxes, payment tracking

4. **INVENTORY MANAGEMENT** (/inventory)
   - Stock Balance: View current stock levels
   - Stock Transfer: Move stock between stores/locations
   - Stock Adjustment: Correct stock quantities
   - Purchase Orders: Order from suppliers
   - Features: Multi-location support, rack/shelf management, stock movements tracking

5. **VOUCHERS** (/vouchers)
   - Payment Voucher: Record outgoing payments
   - Receipt Voucher: Record incoming payments
   - Journal Voucher: General accounting entries
   - Contra Voucher: Cash/bank transfers
   - Features: Account selection, narration, audit trail

6. **ACCOUNTING** (/accounting)
   - Chart of Accounts: Account structure
   - General Ledger: Account-wise transactions
   - Trial Balance: Financial summary
   - Features: Double-entry bookkeeping, account groups

7. **FINANCIAL STATEMENTS** (/financial-statements)
   - Balance Sheet: Assets and liabilities
   - Income Statement: Profit & Loss
   - Features: Period-based reporting, financial analysis

8. **EXPENSES** (/expenses)
   - Expense Types: Categorize expenses
   - Posted Expenses: Record operational expenses
   - Features: Budget tracking, expense reporting

9. **CUSTOMERS & SUPPLIERS** (/manage)
   - Customer Management: Add/edit customers, credit limits, balances
   - Supplier Management: Add/edit suppliers, payment terms
   - Features: Contact info, addresses, credit management

10. **REPORTS** (/reports)
    - Sales Reports: Sales analysis and trends
    - Expense Reports: Expense breakdown
    - Inventory Reports: Stock analysis
    - Customer Reports: Customer performance
    - Supplier Reports: Supplier analysis

11. **SETTINGS** (/settings)
    - User Management: Create/edit users, roles
    - Roles & Permissions: Configure access control
    - Company Profile: Company information
    - WhatsApp Integration: Messaging configuration
    - LongCat AI: AI assistant settings
    - Backup & Restore: Data management

**NAVIGATION COMMANDS:**
Users can say things like:
- "Go to sales" → Navigate to /sales
- "Open inventory" → Navigate to /inventory
- "Show me parts" → Navigate to /parts
- "Take me to settings" → Navigate to /settings

**CREATION COMMANDS:**
- "Create invoice" → Navigate to /sales with invoice tab
- "Add new part" → Navigate to /parts with add tab
- "New customer" → Navigate to /manage with customers tab

**KEY FEATURES TO EXPLAIN:**

**Parts Management:**
- Each part has a unique part number
- Parts belong to categories, subcategories, and applications
- Pricing: Price A (retail), Price B (wholesale), Price M (margin)
- Stock tracking with reorder levels
- Image support (P1, P2)
- Master parts for grouping variants

**Sales Process:**
1. Select customer
2. Add items from parts list
3. Set quantities and prices
4. Apply discounts if needed
5. Review and save invoice
6. Print or email invoice

**Inventory Operations:**
- Stock Balance: Real-time stock levels by location
- Transfer: Move stock between stores/racks/shelves
- Adjustment: Correct discrepancies
- Purchase Orders: Order from suppliers, track receipts

**Accounting:**
- Double-entry bookkeeping system
- Chart of Accounts with main groups and subgroups
- Vouchers: Payment (outgoing), Receipt (incoming), Journal (general), Contra (bank transfers)
- Trial Balance: Ensures debits = credits
- Financial Statements: Balance Sheet, P&L

**Best Practices:**
- Always verify stock before creating sales
- Use proper account codes for accounting entries
- Regular stock verification prevents discrepancies
- Backup data regularly
- Use kits for bundled products

**YOUR CAPABILITIES:**
1. **Navigation**: Help users navigate to any module or feature
2. **Guidance**: Explain how to use features, step-by-step instructions
3. **Troubleshooting**: Help solve problems and answer questions
4. **Best Practices**: Suggest efficient workflows
5. **Data Insights**: Help interpret reports and data (when available)
6. **Feature Explanation**: Explain what each feature does and when to use it

**RESPONSE STYLE:**
- Be friendly, professional, and helpful
- Use clear, concise language
- Provide step-by-step instructions when needed
- Use emojis sparingly for visual clarity (✅ ❌ 📊 💡 ⚠️)
- Format lists with bullet points
- Always offer to help further

**NAVIGATION DETECTION:**
When users say things like:
- "Go to...", "Open...", "Show me...", "Take me to..." → These are navigation commands
- "How do I...", "How to...", "What is...", "Explain..." → These need detailed explanations
- "Create...", "Add...", "New..." → These might be navigation or instructions

**IMPORTANT RULES:**
1. If user asks about navigation, provide clear path and offer to navigate
2. If user asks "how to", provide detailed step-by-step guidance
3. If user asks about features, explain clearly with examples
4. If user asks "what is", provide clear definitions
5. Always maintain context of the conversation
6. Be proactive in offering help
7. If unsure, ask clarifying questions
8. Always be helpful and encouraging

**CURRENT CONTEXT:**
The user is currently on: {CURRENT_PATH}

**CONVERSATION HISTORY:**
{CONVERSATION_HISTORY}

Remember: You are here to make the ERP system easy to use and help users be productive! Be conversational, helpful, and always aim to solve the user's problem.`;

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
  const [longCatConfigured, setLongCatConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Check if LongCat is configured
  useEffect(() => {
    const checkLongCatConfig = async () => {
      try {
        const response = await apiClient.getLongCatSettings();
        if (response.data?.apiKey) {
          setLongCatConfigured(true);
        }
      } catch (error) {
        console.error('Failed to check LongCat config:', error);
      }
    };
    checkLongCatConfig();
  }, []);

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
    'longcat': { path: '/settings', tab: 'longcat', description: 'LongCat AI settings' },
    'ai settings': { path: '/settings', tab: 'longcat', description: 'AI assistant settings' },
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
        const aiStatus = longCatConfigured 
          ? '✨ **Powered by LongCat AI** - Advanced AI responses enabled'
          : '⚠️ **Basic Mode** - Configure LongCat AI in Settings for enhanced responses';
        
        const greeting: Message = {
          id: '1',
          role: 'assistant',
          content: `🤖 **AI Control Center Active**\n\n${aiStatus}\n\nI'm your intelligent assistant with **full system control**. I can:\n\n🧭 **Navigate** - "Go to sales" or "Open inventory"\n✨ **Create** - "Add new part" or "Create invoice"\n📊 **Analyze** - "Show reports" or "View dashboard"\n🔧 **Guide** - "Help with vouchers"\n💬 **Answer Questions** - Ask me anything about the system\n\n*Try saying: "Go to invoice" or "How do I create a customer?"*`,
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
    const aiStatus = longCatConfigured 
      ? '✨ **Powered by LongCat AI** - Advanced AI responses enabled'
      : '⚠️ **Basic Mode** - Configure LongCat AI in Settings for enhanced responses';
    
    const greeting: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🤖 **AI Control Center Active**\n\n${aiStatus}\n\nI'm your intelligent assistant with **full system control**. I can:\n\n🧭 **Navigate** - "Go to sales" or "Open inventory"\n✨ **Create** - "Add new part" or "Create invoice"\n📊 **Analyze** - "Show reports" or "View dashboard"\n🔧 **Guide** - "Help with vouchers"\n💬 **Answer Questions** - Ask me anything about the system\n\n*Try saying: "Go to invoice" or "How do I create a customer?"*`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
    setHasLoadedHistory(true);
  }, [longCatConfigured]);

  // Smooth auto-scroll to bottom when messages change
  useEffect(() => {
    const performScroll = () => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return;

      // Find the Radix ScrollArea viewport element (the actual scrollable element)
      const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      
      if (viewport) {
        // Use both requestAnimationFrame and a small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          setTimeout(() => {
            viewport.scrollTo({
              top: viewport.scrollHeight + 1000, // Add extra to ensure we're at bottom
              behavior: 'smooth'
            });
            // Also set scrollTop directly as backup
            viewport.scrollTop = viewport.scrollHeight;
          }, 50);
        });
      }
    };

    // Multiple attempts to ensure scroll happens
    const timeout1 = setTimeout(performScroll, 100);
    const timeout2 = setTimeout(performScroll, 200);
    const timeout3 = setTimeout(performScroll, 300);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Get system prompt with current context
  const getSystemPrompt = useCallback(() => {
    const recentContext = conversationContext.slice(-3).join('\n');
    return SYSTEM_PROMPT
      .replace('{CURRENT_PATH}', pathname)
      .replace('{CONVERSATION_HISTORY}', recentContext || 'No recent conversation');
  }, [pathname, conversationContext]);

  // Smooth scroll to bottom helper - more aggressive
  const scrollToBottom = useCallback((smooth = true) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const performScroll = () => {
      // Find the Radix ScrollArea viewport element
      const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      
      if (viewport) {
        if (smooth) {
          viewport.scrollTo({
            top: viewport.scrollHeight + 1000,
            behavior: 'smooth'
          });
        }
        // Always set scrollTop directly as well (instant scroll)
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    // Multiple attempts to ensure it scrolls
    requestAnimationFrame(() => {
      performScroll();
      setTimeout(performScroll, 50);
      setTimeout(performScroll, 100);
    });
  }, []);

  // Handle message send with LongCat AI integration
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setConversationContext(prev => [...prev.slice(-5), input.trim()]);
    const currentInput = input.trim();
    setInput('');
    setIsTyping(true);

    // Smooth scroll to show user message immediately
    setTimeout(() => scrollToBottom(true), 100);

    try {
      // First, check if it's a navigation/action command (high confidence)
      const intent = processUserIntent(currentInput);
      
      // If it's a high-confidence navigation, handle it immediately
      if (intent.type === 'navigate' && intent.confidence >= 0.9) {
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
      
      // Smooth scroll to show response
      setTimeout(() => scrollToBottom(true), 200);
      
      // Auto-execute navigation
      if (response.actions?.[0]) {
        setTimeout(() => {
          response.actions![0].action();
        }, 500);
      }
      return;
    }

      // For other queries, use LongCat AI if configured
      if (!longCatConfigured) {
        // Fallback to rule-based response
        const intent = processUserIntent(currentInput);
        const response = generateSmartResponse(intent);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content + '\n\n💡 *Tip: Configure LongCat AI in Settings → LongCat AI for enhanced AI-powered responses.*',
          timestamp: new Date(),
          actions: response.actions,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        
        // Smooth scroll to show response
        setTimeout(() => scrollToBottom(true), 100);
        return;
      }

      // Build conversation history for context
      const conversationHistory = messages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Add system message
      const systemMessage = {
        role: 'system',
        content: getSystemPrompt(),
      };

      // Add current user message
      const messagesForAPI = [
        systemMessage,
        ...conversationHistory,
        {
          role: 'user',
          content: currentInput,
        },
      ];

      // Call LongCat API
      const response = await apiClient.sendLongCatChat({
        messages: messagesForAPI,
        max_tokens: 1000,
        temperature: 0.7,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      let aiResponse = '';
      if (response.data?.choices?.[0]?.message?.content) {
        aiResponse = response.data.choices[0].message.content;
      } else if (response.data?.content) {
        // Handle Anthropic format
        const content = Array.isArray(response.data.content) 
          ? response.data.content.find((c: any) => c.type === 'text')?.text 
          : response.data.content;
        aiResponse = content || 'I apologize, but I couldn\'t generate a response.';
      } else {
        aiResponse = 'I apologize, but I couldn\'t generate a response.';
      }

      // Check if AI response suggests navigation
      const navIntent = processUserIntent(aiResponse);
      let actions: ActionButton[] | undefined;
      
      if (navIntent.type === 'navigate' && navIntent.confidence >= 0.7) {
        const navResponse = generateSmartResponse(navIntent);
        actions = navResponse.actions;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        actions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Smooth scroll to show AI response after a brief delay
      setTimeout(() => scrollToBottom(true), 250);

    } catch (error: any) {
      console.error('LongCat API error:', error);
      
      // Fallback to rule-based response
      const intent = processUserIntent(currentInput);
      const response = generateSmartResponse(intent);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content + '\n\n⚠️ *Note: AI service unavailable. Using fallback response. Please check LongCat API settings in Settings → LongCat AI.*',
        timestamp: new Date(),
        actions: response.actions,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Smooth scroll to show fallback response
      setTimeout(() => scrollToBottom(true), 200);
      
      toast.error('AI service unavailable. Using fallback mode.');
    }
  }, [input, messages, processUserIntent, generateSmartResponse, getSystemPrompt, navigate, longCatConfigured, scrollToBottom]);

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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 group"
        size="icon"
      >
        <Brain className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform" />
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div
        className={cn(
          "fixed z-50 bg-card border-2 border-primary/30 rounded-xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden",
          // Enhanced shadow and glow effect
          "ring-2 ring-primary/10 shadow-[0_0_20px_rgba(0,0,0,0.1)]",
          // Mobile: Full screen or nearly full screen with proper margins
          "bottom-0 right-0 left-0 sm:bottom-6 sm:right-6 sm:left-auto",
          // Ensure it doesn't overlap with header/sidebar
          "sm:max-w-[calc(100vw-2rem)]",
          isMinimized 
            ? "w-full sm:w-72 h-14 rounded-b-xl sm:rounded-xl" 
            : "w-full sm:w-[400px] md:w-[450px] lg:w-[500px] h-[calc(100vh-60px)] sm:h-[500px] sm:max-h-[calc(100vh-120px)] rounded-t-xl sm:rounded-xl"
        )}
        style={{
          // Ensure it stays within viewport
          maxHeight: 'calc(100vh - 80px)',
          // Add subtle glow
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.15), 0 0 60px rgba(var(--primary), 0.1)',
        }}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b-2 border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/20 flex items-center justify-center relative shrink-0">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500 rounded-full border-2 border-card animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5 truncate">
              AI Control Center
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Intelligent System Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isMinimized && messages.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={clearHistory}
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10 hidden sm:flex"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 p-3 sm:p-4 bg-background/50" ref={scrollRef}>
            <div className="space-y-3 sm:space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className="max-w-[85%] sm:max-w-[90%] space-y-1.5 sm:space-y-2">
                    <div
                      className={cn(
                        "rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm leading-relaxed transition-all",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
                          : 'bg-muted text-foreground rounded-bl-md shadow-sm'
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content.replace(/\*\*(.*?)\*\*/g, '$1')}</div>
                    </div>
                    
                    {/* Action buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        {message.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={action.variant || 'default'}
                            size="sm"
                            className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-3"
                            onClick={action.action}
                          >
                            <span className="scale-75 sm:scale-100">{action.icon}</span>
                            <span className="truncate">{action.label}</span>
                            <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-muted rounded-xl sm:rounded-2xl rounded-bl-md px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                    <div className="flex gap-1.5 items-center">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary/60 rounded-full animate-bounce" />
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-2 sm:px-3 py-1.5 sm:py-2 border-t-2 border-primary/10 bg-gradient-to-r from-muted/40 to-muted/20">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Quick Actions
            </p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {getQuickActions().map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-6 sm:h-7 text-[10px] sm:text-xs gap-1 bg-background hover:bg-primary/10 hover:border-primary/30 px-2 sm:px-3"
                  onClick={() => handleQuickAction(action)}
                >
                  <span className="scale-75 sm:scale-100">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-2 sm:p-3 border-t-2 border-primary/20 bg-gradient-to-r from-background to-muted/30 rounded-b-xl">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex-1 relative min-w-0">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "🎤 Listening..." : "Ask me anything..."}
                  className={cn(
                    "pr-3 sm:pr-4 h-9 sm:h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm",
                    isListening && "border-primary animate-pulse ring-2 ring-primary/20"
                  )}
                />
              </div>
              <Button 
                onClick={toggleVoiceInput} 
                size="icon" 
                variant={isListening ? "destructive" : "ghost"}
                className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
              <Button 
                onClick={handleSend} 
                size="icon" 
                disabled={!input.trim()}
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
};

export default AIChatBot;
