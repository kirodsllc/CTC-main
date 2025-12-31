const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('API request failed:', error);
      return { error: error.message || 'Network error occurred' };
    }
  }

  // Parts API
  async getParts(params?: {
    search?: string;
    category_id?: string;
    category_name?: string;
    subcategory_id?: string;
    subcategory_name?: string;
    brand_id?: string;
    brand_name?: string;
    application_id?: string;
    application_name?: string;
    status?: string;
    master_part_no?: string;
    part_no?: string;
    description?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/parts${queryString ? `?${queryString}` : ''}`);
  }

  async getPart(id: string) {
    return this.request(`/parts/${id}`);
  }

  async createPart(data: any) {
    return this.request('/parts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePart(id: string, data: any) {
    return this.request(`/parts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePart(id: string) {
    return this.request(`/parts/${id}`, {
      method: 'DELETE',
    });
  }

  // Price Management API
  async getPartsForPriceManagement(params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/parts/price-management${queryString ? `?${queryString}` : ''}`);
  }

  async bulkUpdatePrices(data: {
    part_ids: string[];
    price_field: 'cost' | 'priceA' | 'priceB' | 'all';
    update_type: 'percentage' | 'fixed';
    update_value: number;
    reason: string;
    updated_by?: string;
  }) {
    return this.request('/parts/bulk-update-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePartPrices(id: string, data: {
    cost?: number;
    priceA?: number;
    priceB?: number;
    reason?: string;
    updated_by?: string;
  }) {
    return this.request(`/parts/${id}/prices`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPriceHistory(params?: {
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/parts/price-history${queryString ? `?${queryString}` : ''}`);
  }

  // Dropdowns API
  async getMasterParts(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/dropdowns/master-parts${query}`);
  }

  async getBrands(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/dropdowns/brands${query}`);
  }

  async getCategories(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/dropdowns/categories${query}`);
  }

  async getSubcategories(categoryId?: string, search?: string) {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/subcategories${query}`);
  }

  async getApplications(subcategoryId?: string, search?: string) {
    const params = new URLSearchParams();
    if (subcategoryId) params.append('subcategory_id', subcategoryId);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/applications${query}`);
  }

  async getPartsForDropdown(masterPartNo?: string, search?: string) {
    const params = new URLSearchParams();
    if (masterPartNo) params.append('master_part_no', masterPartNo);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/parts${query}`);
  }

  // Attributes Management API
  async getAllCategories(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/categories/all${query}`);
  }

  async createCategory(data: { name: string; status?: string }) {
    return this.request('/dropdowns/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { name: string; status?: string }) {
    return this.request(`/dropdowns/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/dropdowns/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getAllSubcategories(search?: string, status?: string, category_id?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    if (category_id && category_id !== 'all') params.append('category_id', category_id);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/subcategories/all${query}`);
  }

  async createSubcategory(data: { name: string; category_id: string; status?: string }) {
    return this.request('/dropdowns/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubcategory(id: string, data: { name: string; category_id: string; status?: string }) {
    return this.request(`/dropdowns/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubcategory(id: string) {
    return this.request(`/dropdowns/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  async getAllBrands(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dropdowns/brands/all${query}`);
  }

  async createBrand(data: { name: string; status?: string }) {
    return this.request('/dropdowns/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBrand(id: string, data: { name: string; status?: string }) {
    return this.request(`/dropdowns/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBrand(id: string) {
    return this.request(`/dropdowns/brands/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory API
  async getInventoryDashboard() {
    return this.request('/inventory/dashboard');
  }

  async getStockMovements(params?: {
    part_id?: string;
    type?: string;
    from_date?: string;
    to_date?: string;
    store_id?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/movements${queryString ? `?${queryString}` : ''}`);
  }

  async createStockMovement(data: {
    part_id: string;
    type: 'in' | 'out';
    quantity: number;
    store_id?: string;
    rack_id?: string;
    shelf_id?: string;
    reference_type?: string;
    reference_id?: string;
    notes?: string;
  }) {
    return this.request('/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStockBalance(partId: string) {
    return this.request(`/inventory/balance/${partId}`);
  }

  async getStockBalances(params?: {
    search?: string;
    category_id?: string;
    low_stock?: boolean;
    out_of_stock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Convert boolean to string 'true' or 'false'
          if (typeof value === 'boolean') {
            queryParams.append(key, value ? 'true' : 'false');
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/balances${queryString ? `?${queryString}` : ''}`);
  }

  async getStockBalanceValuation(params?: {
    search?: string;
    category?: string;
    store?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/stock-balance-valuation${queryString ? `?${queryString}` : ''}`);
  }

  async getTransfers(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/transfers${queryString ? `?${queryString}` : ''}`);
  }

  async getTransfer(id: string) {
    return this.request(`/inventory/transfers/${id}`);
  }

  async createTransfer(data: {
    transfer_number: string;
    date: string;
    from_store_id?: string;
    to_store_id?: string;
    notes?: string;
    items: Array<{
      part_id: string;
      from_store_id?: string;
      from_rack_id?: string;
      from_shelf_id?: string;
      to_store_id?: string;
      to_rack_id?: string;
      to_shelf_id?: string;
      quantity: number;
    }>;
  }) {
    return this.request('/inventory/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransfer(id: string, data: {
    transfer_number?: string;
    date?: string;
    from_store_id?: string;
    to_store_id?: string;
    notes?: string;
    status?: string;
    items?: Array<{
      part_id: string;
      from_store_id?: string;
      from_rack_id?: string;
      from_shelf_id?: string;
      to_store_id?: string;
      to_rack_id?: string;
      to_shelf_id?: string;
      quantity: number;
    }>;
  }) {
    return this.request(`/inventory/transfers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransfer(id: string) {
    return this.request(`/inventory/transfers/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdjustments(params?: {
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/adjustments${queryString ? `?${queryString}` : ''}`);
  }

  async createAdjustment(data: {
    date: string;
    subject?: string;
    store_id?: string;
    add_inventory?: boolean;
    notes?: string;
    items: Array<{
      part_id: string;
      quantity: number;
      cost?: number;
      notes?: string;
    }>;
  }) {
    return this.request('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdjustment(id: string) {
    return this.request(`/inventory/adjustments/${id}`);
  }

  async updateAdjustment(id: string, data: {
    date?: string;
    subject?: string;
    store_id?: string;
    add_inventory?: boolean;
    notes?: string;
    items?: Array<{
      part_id: string;
      quantity: number;
      cost?: number;
      notes?: string;
    }>;
  }) {
    return this.request(`/inventory/adjustments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdjustment(id: string) {
    return this.request(`/inventory/adjustments/${id}`, {
      method: 'DELETE',
    });
  }

  async getPurchaseOrders(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/purchase-orders${queryString ? `?${queryString}` : ''}`);
  }

  async createPurchaseOrder(data: {
    po_number: string;
    date: string;
    supplier_id?: string;
    expected_date?: string;
    notes?: string;
    items: Array<{
      part_id: string;
      quantity: number;
      unit_cost: number;
      total_cost?: number;
      received_qty?: number;
      notes?: string;
    }>;
  }) {
    return this.request('/inventory/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPurchaseOrder(id: string) {
    return this.request(`/inventory/purchase-orders/${id}`);
  }

  async updatePurchaseOrder(id: string, data: {
    po_number?: string;
    date?: string;
    supplier_id?: string;
    expected_date?: string;
    notes?: string;
    status?: string;
    items?: Array<{
      part_id: string;
      quantity: number;
      unit_cost: number;
      total_cost?: number;
      received_qty?: number;
      notes?: string;
    }>;
  }) {
    return this.request(`/inventory/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePurchaseOrder(id: string) {
    return this.request(`/inventory/purchase-orders/${id}`, {
      method: 'DELETE',
    });
  }

  async getStores(status?: string) {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return this.request(`/inventory/stores${query}`);
  }

  async createStore(data: {
    name: string;
    type: string;
    status?: string;
    description?: string;
  }) {
    return this.request('/inventory/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStore(id: string, data: {
    name: string;
    type: string;
    status?: string;
    description?: string;
  }) {
    return this.request(`/inventory/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStore(id: string) {
    return this.request(`/inventory/stores/${id}`, {
      method: 'DELETE',
    });
  }

  async getRacks(storeId?: string, status?: string) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/inventory/racks${query}`);
  }

  async createRack(data: {
    codeNo: string;
    storeId: string;
    description?: string;
    status?: string;
  }) {
    return this.request('/inventory/racks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRack(id: string, data: {
    codeNo: string;
    description?: string;
    status?: string;
  }) {
    return this.request(`/inventory/racks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRack(id: string) {
    return this.request(`/inventory/racks/${id}`, {
      method: 'DELETE',
    });
  }

  async getShelves(rackId?: string, status?: string) {
    const params = new URLSearchParams();
    if (rackId) params.append('rack_id', rackId);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/inventory/shelves${query}`);
  }

  async createShelf(data: {
    shelfNo: string;
    rackId: string;
    description?: string;
    status?: string;
  }) {
    return this.request('/inventory/shelves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShelf(id: string, data: {
    shelfNo: string;
    description?: string;
    status?: string;
  }) {
    return this.request(`/inventory/shelves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShelf(id: string) {
    return this.request(`/inventory/shelves/${id}`, {
      method: 'DELETE',
    });
  }

  async getMultiDimensionalReport(params?: {
    primary_dimension?: string;
    secondary_dimension?: string;
    tertiary_dimension?: string;
    category_filter?: string;
    brand_filter?: string;
    sort_by?: string;
    sort_direction?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/multi-dimensional-report${queryString ? `?${queryString}` : ''}`);
  }

  // Direct Purchase Orders
  async getDirectPurchaseOrders(params?: {
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/inventory/direct-purchase-orders${queryString ? `?${queryString}` : ''}`);
  }

  async getDirectPurchaseOrder(id: string) {
    return this.request(`/inventory/direct-purchase-orders/${id}`);
  }

  async createDirectPurchaseOrder(data: {
    dpo_number: string;
    date: string;
    store_id?: string;
    supplier_id?: string;
    account?: string;
    description?: string;
    status?: string;
    items: Array<{
      part_id: string;
      quantity: number;
      purchase_price: number;
      sale_price: number;
      amount?: number;
      rack_id?: string;
      shelf_id?: string;
    }>;
    expenses?: Array<{
      expense_type: string;
      payable_account: string;
      description?: string;
      amount: number;
    }>;
  }) {
    return this.request('/inventory/direct-purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDirectPurchaseOrder(id: string, data: {
    dpo_number?: string;
    date?: string;
    store_id?: string;
    supplier_id?: string;
    account?: string;
    description?: string;
    status?: string;
    items?: Array<{
      part_id: string;
      quantity: number;
      purchase_price: number;
      sale_price: number;
      amount?: number;
      rack_id?: string;
      shelf_id?: string;
    }>;
    expenses?: Array<{
      expense_type: string;
      payable_account: string;
      description?: string;
      amount: number;
    }>;
  }) {
    return this.request(`/inventory/direct-purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDirectPurchaseOrder(id: string) {
    return this.request(`/inventory/direct-purchase-orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Expenses API
  async getExpenseStatistics() {
    return this.request('/expenses/statistics');
  }

  async getExpenseTypes(params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/expenses/expense-types${queryString ? `?${queryString}` : ''}`);
  }

  async createExpenseType(data: {
    name: string;
    description?: string;
    category: string;
    budget: number;
    status?: string;
  }) {
    return this.request('/expenses/expense-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpenseType(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    budget?: number;
    status?: string;
  }) {
    return this.request(`/expenses/expense-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpenseType(id: string) {
    return this.request(`/expenses/expense-types/${id}`, {
      method: 'DELETE',
    });
  }

  async getPostedExpenses(params?: {
    search?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/expenses/posted-expenses${queryString ? `?${queryString}` : ''}`);
  }

  async createPostedExpense(data: {
    date: string;
    expense_type_id: string;
    amount: number;
    paidTo: string;
    paymentMode?: string;
    referenceNumber?: string;
    description?: string;
  }) {
    return this.request('/expenses/posted-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOperationalExpenses(params?: {
    search?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/expenses/operational-expenses${queryString ? `?${queryString}` : ''}`);
  }

  async createOperationalExpense(data: {
    date: string;
    expenseType: string;
    paidTo: string;
    amount: number;
    description?: string;
  }) {
    return this.request('/expenses/operational-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOperationalExpense(id: string) {
    return this.request(`/expenses/operational-expenses/${id}`);
  }

  // Financial Statements API
  async getGeneralJournal(params?: {
    search_by?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/financial/general-journal${queryString ? `?${queryString}` : ''}`);
  }

  async getTrialBalance(params?: {
    from_date?: string;
    to_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/financial/trial-balance${queryString ? `?${queryString}` : ''}`);
  }

  async getBalanceSheet(params?: {
    as_of_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/financial/balance-sheet${queryString ? `?${queryString}` : ''}`);
  }

  async getIncomeStatement(params?: {
    from_date?: string;
    to_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/financial/income-statement${queryString ? `?${queryString}` : ''}`);
  }

  async getLedgers(params?: {
    main_group?: string;
    sub_group?: string;
    account?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/financial/ledgers${queryString ? `?${queryString}` : ''}`);
  }

  async getAccountGroups() {
    return this.request('/financial/account-groups');
  }

  // Customers API
  async getCustomers(params?: {
    search?: string;
    searchBy?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: {
    name: string;
    address?: string;
    email?: string;
    cnic?: string;
    contactNo?: string;
    openingBalance?: number;
    creditLimit?: number;
    status?: string;
  }) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: {
    name?: string;
    address?: string;
    email?: string;
    cnic?: string;
    contactNo?: string;
    openingBalance?: number;
    creditLimit?: number;
    status?: string;
  }) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Suppliers API
  async getSuppliers(params?: {
    search?: string;
    fieldFilter?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/suppliers${queryString ? `?${queryString}` : ''}`);
  }

  async getSupplier(id: string) {
    return this.request(`/suppliers/${id}`);
  }

  async createSupplier(data: {
    code: string;
    name?: string;
    companyName: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    email?: string;
    phone?: string;
    cnic?: string;
    contactPerson?: string;
    taxId?: string;
    paymentTerms?: string;
    status?: string;
    notes?: string;
  }) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: {
    code?: string;
    name?: string;
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    email?: string;
    phone?: string;
    cnic?: string;
    contactPerson?: string;
    taxId?: string;
    paymentTerms?: string;
    status?: string;
    notes?: string;
  }) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports API
  async getDashboardMetrics() {
    return this.request('/reports/dashboard/metrics');
  }

  async getHourlySales() {
    return this.request('/reports/dashboard/hourly-sales');
  }

  async getTopSelling(limit?: number) {
    const queryParams = limit ? `?limit=${limit}` : '';
    return this.request(`/reports/dashboard/top-selling${queryParams}`);
  }

  async getRecentActivity(limit?: number) {
    const queryParams = limit ? `?limit=${limit}` : '';
    return this.request(`/reports/dashboard/recent-activity${queryParams}`);
  }

  async getSalesReport(params?: {
    from_date?: string;
    to_date?: string;
    customer_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/sales${queryString ? `?${queryString}` : ''}`);
  }

  async getPeriodicSales(params?: {
    period_type?: string;
    year?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/sales/periodic${queryString ? `?${queryString}` : ''}`);
  }

  async getSalesByType(params?: {
    from_date?: string;
    to_date?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/sales/by-type${queryString ? `?${queryString}` : ''}`);
  }

  async getTargetAchievement(params?: {
    period?: string;
    month?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/sales/target-achievement${queryString ? `?${queryString}` : ''}`);
  }

  async getStockMovement(params?: {
    period?: string;
    category?: string;
    brand?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/inventory/stock-movement${queryString ? `?${queryString}` : ''}`);
  }

  async getBrandWise(params?: {
    from_date?: string;
    to_date?: string;
    brand?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/inventory/brand-wise${queryString ? `?${queryString}` : ''}`);
  }

  async getPurchasesReport(params?: {
    from_date?: string;
    to_date?: string;
    supplier_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/financial/purchases${queryString ? `?${queryString}` : ''}`);
  }

  async getPurchaseComparison(params?: {
    period1_start?: string;
    period1_end?: string;
    period2_start?: string;
    period2_end?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/financial/purchase-comparison${queryString ? `?${queryString}` : ''}`);
  }

  async getImportCostSummary(params?: {
    from_date?: string;
    to_date?: string;
    country?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/financial/import-cost${queryString ? `?${queryString}` : ''}`);
  }

  async getExpensesReport(params?: {
    from_date?: string;
    to_date?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/financial/expenses${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomerAnalysis(params?: {
    from_date?: string;
    to_date?: string;
    customer_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/analytics/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomerAging(params?: {
    customer_type?: string;
    sort_by?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/analytics/customer-aging${queryString ? `?${queryString}` : ''}`);
  }

  async getSupplierPerformance(params?: {
    from_date?: string;
    to_date?: string;
    supplier_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reports/analytics/supplier-performance${queryString ? `?${queryString}` : ''}`);
  }

  // Users Management API
  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    status: "active" | "inactive";
    password?: string;
  }) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: {
    name?: string;
    email?: string;
    role?: string;
    status?: "active" | "inactive";
    password?: string;
  }) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Roles & Permissions API
  async getRoles() {
    return this.request('/roles');
  }

  async getRole(id: string) {
    return this.request(`/roles/${id}`);
  }

  async createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
  }) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(id: string, data: {
    name?: string;
    description?: string;
    permissions?: string[];
  }) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // Activity Logs API
  async getActivityLogs(params?: {
    search?: string;
    module?: string;
    actionType?: string;
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/activity-logs${queryString ? `?${queryString}` : ''}`);
  }

  // Approval Flows API
  async getApprovalFlows() {
    return this.request('/approval-flows');
  }

  async getApprovalFlow(id: string) {
    return this.request(`/approval-flows/${id}`);
  }

  async createApprovalFlow(data: {
    name: string;
    description?: string;
    module: string;
    trigger: string;
    condition?: string;
    steps: Array<{ role: string; action: string }>;
    status?: "active" | "inactive";
  }) {
    return this.request('/approval-flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApprovalFlow(id: string, data: {
    name?: string;
    description?: string;
    module?: string;
    trigger?: string;
    condition?: string;
    steps?: Array<{ role: string; action: string }>;
    status?: "active" | "inactive";
  }) {
    return this.request(`/approval-flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApprovalFlow(id: string) {
    return this.request(`/approval-flows/${id}`, {
      method: 'DELETE',
    });
  }

  async getPendingApprovals() {
    return this.request('/approval-flows/pending');
  }

  // Backup & Restore API
  async getBackups() {
    return this.request('/backups');
  }

  async getBackup(id: string) {
    return this.request(`/backups/${id}`);
  }

  async createBackup(data: {
    name: string;
    type: "full" | "incremental";
    tables?: string[];
  }) {
    return this.request('/backups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async restoreBackup(id: string) {
    return this.request(`/backups/${id}/restore`, {
      method: 'POST',
    });
  }

  async downloadBackup(id: string) {
    const response = await fetch(`${this.baseUrl}/backups/${id}/download`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
      : `backup_${id}.json`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true };
  }

  async deleteBackup(id: string) {
    return this.request(`/backups/${id}`, {
      method: 'DELETE',
    });
  }

  async importBackup(backupData: any) {
    return this.request('/backups/import', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
  }

  async getBackupSchedules() {
    return this.request('/backups/schedules');
  }

  // Company Profile API
  async getCompanyProfile() {
    return this.request('/company-profile');
  }

  async updateCompanyProfile(data: any) {
    return this.request('/company-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // WhatsApp Settings API
  async getWhatsAppSettings() {
    return this.request('/whatsapp-settings');
  }

  async updateWhatsAppSettings(data: {
    appKey?: string;
    authKey?: string;
    administratorPhoneNumber?: string;
  }) {
    return this.request('/whatsapp-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async sendWhatsAppMessage(data: {
    to: string;
    message?: string;
    file?: string;
    template_id?: string;
    variables?: Record<string, string>;
  }) {
    return this.request('/whatsapp-settings/send-message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Kits API
  async getKits(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/kits${queryString ? `?${queryString}` : ''}`);
  }

  async getKit(id: string) {
    return this.request(`/kits/${id}`);
  }

  async createKit(data: {
    badge: string;
    name: string;
    description?: string;
    sellingPrice: number;
    status?: string;
    items: Array<{
      partId: string;
      partNo: string;
      partName: string;
      quantity: number;
      costPerUnit: number;
    }>;
  }) {
    return this.request('/kits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKit(id: string, data: {
    badge?: string;
    name?: string;
    description?: string;
    sellingPrice?: number;
    status?: string;
    items?: Array<{
      partId: string;
      partNo: string;
      partName: string;
      quantity: number;
      costPerUnit: number;
    }>;
  }) {
    return this.request(`/kits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteKit(id: string) {
    return this.request(`/kits/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

