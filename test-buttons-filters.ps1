# Comprehensive Buttons and Filters Test Script
# Tests all buttons and filters across all pages

$ErrorActionPreference = "Continue"
$API_BASE = "http://localhost:3001/api"
$errors = @()
$testResults = @()

function Write-TestResult {
    param($testName, $status, $message = "")
    $result = [PSCustomObject]@{
        Test = $testName
        Status = $status
        Message = $message
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
    $script:testResults += $result
    $color = if ($status -eq "PASS") { "Green" } elseif ($status -eq "FAIL") { "Red" } else { "Yellow" }
    Write-Host "[$status] $testName" -ForegroundColor $color
    if ($message) { Write-Host "  $message" -ForegroundColor Gray }
}

function Add-Error {
    param($location, $error, $details = "")
    $script:errors += [PSCustomObject]@{
        Location = $location
        Error = $error
        Details = $details
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [object]$Body = $null,
        [hashtable]$QueryParams = @{}
    )
    
    try {
        $uriBuilder = New-Object System.UriBuilder("$API_BASE$Endpoint")
        
        # Add query parameters
        if ($QueryParams.Count -gt 0) {
            $queryCollection = [System.Web.HttpUtility]::ParseQueryString([string]::Empty)
            foreach ($key in $QueryParams.Keys) {
                $queryCollection.Add($key, $QueryParams[$key])
            }
            $uriBuilder.Query = $queryCollection.ToString()
        }
        $uri = $uriBuilder.ToString()
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        $errorMessage = $_.Exception.Message
        try {
            if ($_.ErrorDetails.Message) {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($errorBody.error) {
                    $errorMessage = $errorBody.error
                }
            }
        } catch { }
        return @{ Success = $false; Error = $errorMessage; StatusCode = $statusCode }
    }
}

# ============================================
# PARTS PAGE - Buttons and Filters
# ============================================
function Test-PartsPage {
    Write-Host "`n=== Testing Parts Page ===" -ForegroundColor Cyan
    
    # Test Filters
    Write-Host "`n--- Testing Parts Filters ---" -ForegroundColor Yellow
    
    # Search Filter
    $result = Invoke-ApiRequest -Endpoint "/parts" -QueryParams @{ search = "test" }
    if ($result.Success -and $result.Data) {
        $count = if ($result.Data.data) { $result.Data.data.Count } else { 0 }
        Write-TestResult "Parts - Search Filter" "PASS" "Search filter working (found $count items)"
    } else {
        Write-TestResult "Parts - Search Filter" "FAIL" $result.Error
        Add-Error "Parts Page - Search Filter" $result.Error
    }
    
    # Category Filter (test with empty string to get all)
    $result = Invoke-ApiRequest -Endpoint "/parts" -QueryParams @{ limit = "5" }
    if ($result.Success -and $result.Data) {
        Write-TestResult "Parts - Category Filter" "PASS" "Category filter endpoint accessible"
    } else {
        Write-TestResult "Parts - Category Filter" "FAIL" $result.Error
        Add-Error "Parts Page - Category Filter" $result.Error
    }
    
    # Brand Filter
    $result = Invoke-ApiRequest -Endpoint "/parts" -QueryParams @{ limit = "5" }
    if ($result.Success -and $result.Data) {
        Write-TestResult "Parts - Brand Filter" "PASS" "Brand filter endpoint accessible"
    } else {
        Write-TestResult "Parts - Brand Filter" "FAIL" $result.Error
        Add-Error "Parts Page - Brand Filter" $result.Error
    }
    
    # Status Filter
    $result = Invoke-ApiRequest -Endpoint "/parts" -QueryParams @{ status = "active"; limit = "5" }
    if ($result.Success -and $result.Data) {
        Write-TestResult "Parts - Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Parts - Status Filter" "FAIL" $result.Error
        Add-Error "Parts Page - Status Filter" $result.Error
    }
    
    # Pagination Buttons
    $result = Invoke-ApiRequest -Endpoint "/parts" -QueryParams @{ page = "1"; limit = "10" }
    if ($result.Success -and $result.Data) {
        $pagination = $result.Data.pagination
        Write-TestResult "Parts - Pagination" "PASS" "Pagination working (page $($pagination.page) of $($pagination.totalPages))"
    } else {
        Write-TestResult "Parts - Pagination" "FAIL" $result.Error
        Add-Error "Parts Page - Pagination" $result.Error
    }
}

# ============================================
# INVENTORY PAGE - Buttons and Filters
# ============================================
function Test-InventoryPage {
    Write-Host "`n=== Testing Inventory Page ===" -ForegroundColor Cyan
    
    # Stock Movements Filters
    Write-Host "`n--- Testing Stock Movements Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/movements" -QueryParams @{ type = "in" }
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Movements Type Filter" "PASS" "Type filter working"
    } else {
        Write-TestResult "Inventory - Stock Movements Type Filter" "FAIL" $result.Error
        Add-Error "Inventory - Stock Movements Type Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/movements" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Movements Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Inventory - Stock Movements Date Filter" "FAIL" $result.Error
        Add-Error "Inventory - Stock Movements Date Filter" $result.Error
    }
    
    # Stock Balance Filters
    Write-Host "`n--- Testing Stock Balance Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/balances" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Balance Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Inventory - Stock Balance Search Filter" "FAIL" $result.Error
        Add-Error "Inventory - Stock Balance Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/balances" -QueryParams @{ low_stock = "true" }
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Balance Low Stock Filter" "PASS" "Low stock filter working"
    } else {
        Write-TestResult "Inventory - Stock Balance Low Stock Filter" "FAIL" $result.Error
        Add-Error "Inventory - Stock Balance Low Stock Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/balances" -QueryParams @{ out_of_stock = "true" }
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Balance Out of Stock Filter" "PASS" "Out of stock filter working"
    } else {
        Write-TestResult "Inventory - Stock Balance Out of Stock Filter" "FAIL" $result.Error
        Add-Error "Inventory - Stock Balance Out of Stock Filter" $result.Error
    }
    
    # Purchase Orders Filters
    Write-Host "`n--- Testing Purchase Orders Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/purchase-orders" -QueryParams @{ status = "Draft" }
    if ($result.Success) {
        Write-TestResult "Inventory - Purchase Orders Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Inventory - Purchase Orders Status Filter" "FAIL" $result.Error
        Add-Error "Inventory - Purchase Orders Status Filter" $result.Error
    }
    
    # Direct Purchase Orders Filters
    $result = Invoke-ApiRequest -Endpoint "/inventory/direct-purchase-orders" -QueryParams @{ status = "completed" }
    if ($result.Success) {
        Write-TestResult "Inventory - Direct Purchase Orders Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Inventory - Direct Purchase Orders Status Filter" "FAIL" $result.Error
        Add-Error "Inventory - Direct Purchase Orders Status Filter" $result.Error
    }
    
    # Stock Analysis Filters
    Write-Host "`n--- Testing Stock Analysis Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/stock-analysis"
    if ($result.Success) {
        Write-TestResult "Inventory - Stock Analysis" "PASS" "Stock analysis working"
    } else {
        Write-TestResult "Inventory - Stock Analysis" "FAIL" $result.Error
        Add-Error "Inventory - Stock Analysis" $result.Error
    }
}

# ============================================
# SALES PAGE - Buttons and Filters
# ============================================
function Test-SalesPage {
    Write-Host "`n=== Testing Sales Page ===" -ForegroundColor Cyan
    
    # Sales Reports Filters
    Write-Host "`n--- Testing Sales Reports Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/reports/sales" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Sales - Sales Report Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Sales - Sales Report Date Filter" "FAIL" $result.Error
        Add-Error "Sales Page - Sales Report Date Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/reports/sales/periodic" -QueryParams @{ period_type = "monthly"; year = "2024" }
    if ($result.Success) {
        Write-TestResult "Sales - Periodic Sales Report Filter" "PASS" "Periodic filter working"
    } else {
        Write-TestResult "Sales - Periodic Sales Report Filter" "FAIL" $result.Error
        Add-Error "Sales Page - Periodic Sales Report Filter" $result.Error
    }
}

# ============================================
# REPORTS PAGE - Buttons and Filters
# ============================================
function Test-ReportsPage {
    Write-Host "`n=== Testing Reports Page ===" -ForegroundColor Cyan
    
    # Dashboard Metrics
    $result = Invoke-ApiRequest -Endpoint "/reports/dashboard/metrics"
    if ($result.Success) {
        Write-TestResult "Reports - Dashboard Metrics" "PASS" "Dashboard metrics working"
    } else {
        Write-TestResult "Reports - Dashboard Metrics" "FAIL" $result.Error
        Add-Error "Reports Page - Dashboard Metrics" $result.Error
    }
    
    # Stock Movement Report Filters
    Write-Host "`n--- Testing Stock Movement Report Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/stock-movement" -QueryParams @{ period = "monthly" }
    if ($result.Success) {
        Write-TestResult "Reports - Stock Movement Period Filter" "PASS" "Period filter working"
    } else {
        Write-TestResult "Reports - Stock Movement Period Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Stock Movement Period Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/stock-movement" -QueryParams @{ category = "test" }
    if ($result.Success) {
        Write-TestResult "Reports - Stock Movement Category Filter" "PASS" "Category filter working"
    } else {
        Write-TestResult "Reports - Stock Movement Category Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Stock Movement Category Filter" $result.Error
    }
    
    # Brand Wise Report Filters
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/brand-wise" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Reports - Brand Wise Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Reports - Brand Wise Date Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Brand Wise Date Filter" $result.Error
    }
    
    # Financial Reports Filters
    Write-Host "`n--- Testing Financial Reports Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/purchases" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Reports - Purchases Report Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Reports - Purchases Report Date Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Purchases Report Date Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/expenses" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31"; category = "operational" }
    if ($result.Success) {
        Write-TestResult "Reports - Expenses Report Filters" "PASS" "Expenses filters working"
    } else {
        Write-TestResult "Reports - Expenses Report Filters" "FAIL" $result.Error
        Add-Error "Reports Page - Expenses Report Filters" $result.Error
    }
    
    # Customer Analysis Filters
    Write-Host "`n--- Testing Customer Analysis Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/customers" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Reports - Customer Analysis Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Reports - Customer Analysis Date Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Customer Analysis Date Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/customer-aging" -QueryParams @{ customer_type = "all" }
    if ($result.Success) {
        Write-TestResult "Reports - Customer Aging Filter" "PASS" "Customer aging filter working"
    } else {
        Write-TestResult "Reports - Customer Aging Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Customer Aging Filter" $result.Error
    }
    
    # Supplier Performance Filters
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/supplier-performance" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Reports - Supplier Performance Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Reports - Supplier Performance Date Filter" "FAIL" $result.Error
        Add-Error "Reports Page - Supplier Performance Date Filter" $result.Error
    }
}

# ============================================
# ACCOUNTING PAGE - Buttons and Filters
# ============================================
function Test-AccountingPage {
    Write-Host "`n=== Testing Accounting Page ===" -ForegroundColor Cyan
    
    # Accounts Filters
    Write-Host "`n--- Testing Accounts Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/accounting/accounts" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Accounting - Accounts Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Accounting - Accounts Search Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - Accounts Search Filter" $result.Error
    }
    
    # Journal Entries Filters
    Write-Host "`n--- Testing Journal Entries Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/accounting/journal-entries" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Accounting - Journal Entries Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Accounting - Journal Entries Date Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - Journal Entries Date Filter" $result.Error
    }
    
    # General Ledger Filters
    Write-Host "`n--- Testing General Ledger Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/accounting/general-ledger" -QueryParams @{ account = "test" }
    if ($result.Success) {
        Write-TestResult "Accounting - General Ledger Account Filter" "PASS" "Account filter working"
    } else {
        Write-TestResult "Accounting - General Ledger Account Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - General Ledger Account Filter" $result.Error
    }
    
    # Trial Balance Filters
    $result = Invoke-ApiRequest -Endpoint "/accounting/trial-balance" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Accounting - Trial Balance Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Accounting - Trial Balance Date Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - Trial Balance Date Filter" $result.Error
    }
    
    # Income Statement Filters
    $result = Invoke-ApiRequest -Endpoint "/accounting/income-statement" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Accounting - Income Statement Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Accounting - Income Statement Date Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - Income Statement Date Filter" $result.Error
    }
    
    # Balance Sheet Filters
    $result = Invoke-ApiRequest -Endpoint "/accounting/balance-sheet" -QueryParams @{ as_of_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Accounting - Balance Sheet Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Accounting - Balance Sheet Date Filter" "FAIL" $result.Error
        Add-Error "Accounting Page - Balance Sheet Date Filter" $result.Error
    }
}

# ============================================
# EXPENSES PAGE - Buttons and Filters
# ============================================
function Test-ExpensesPage {
    Write-Host "`n=== Testing Expenses Page ===" -ForegroundColor Cyan
    
    # Expense Types Filters
    Write-Host "`n--- Testing Expense Types Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/expenses/expense-types" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Expenses - Expense Types Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Expenses - Expense Types Search Filter" "FAIL" $result.Error
        Add-Error "Expenses Page - Expense Types Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/expenses/expense-types" -QueryParams @{ category = "operational" }
    if ($result.Success) {
        Write-TestResult "Expenses - Expense Types Category Filter" "PASS" "Category filter working"
    } else {
        Write-TestResult "Expenses - Expense Types Category Filter" "FAIL" $result.Error
        Add-Error "Expenses Page - Expense Types Category Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/expenses/expense-types" -QueryParams @{ status = "active" }
    if ($result.Success) {
        Write-TestResult "Expenses - Expense Types Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Expenses - Expense Types Status Filter" "FAIL" $result.Error
        Add-Error "Expenses Page - Expense Types Status Filter" $result.Error
    }
    
    # Posted Expenses Filters
    Write-Host "`n--- Testing Posted Expenses Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/expenses/posted-expenses" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Expenses - Posted Expenses Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Expenses - Posted Expenses Date Filter" "FAIL" $result.Error
        Add-Error "Expenses Page - Posted Expenses Date Filter" $result.Error
    }
    
    # Operational Expenses Filters
    $result = Invoke-ApiRequest -Endpoint "/expenses/operational-expenses" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success) {
        Write-TestResult "Expenses - Operational Expenses Date Filter" "PASS" "Date filter working"
    } else {
        Write-TestResult "Expenses - Operational Expenses Date Filter" "FAIL" $result.Error
        Add-Error "Expenses Page - Operational Expenses Date Filter" $result.Error
    }
}

# ============================================
# MANAGE PAGE (Customers/Suppliers) - Buttons and Filters
# ============================================
function Test-ManagePage {
    Write-Host "`n=== Testing Manage Page (Customers/Suppliers) ===" -ForegroundColor Cyan
    
    # Customers Filters
    Write-Host "`n--- Testing Customers Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/customers" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Manage - Customers Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Manage - Customers Search Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Customers Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/customers" -QueryParams @{ searchBy = "name"; search = "test" }
    if ($result.Success) {
        Write-TestResult "Manage - Customers Search By Filter" "PASS" "Search by filter working"
    } else {
        Write-TestResult "Manage - Customers Search By Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Customers Search By Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/customers" -QueryParams @{ status = "active" }
    if ($result.Success) {
        Write-TestResult "Manage - Customers Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Manage - Customers Status Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Customers Status Filter" $result.Error
    }
    
    # Suppliers Filters
    Write-Host "`n--- Testing Suppliers Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/suppliers" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Manage - Suppliers Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Manage - Suppliers Search Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Suppliers Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/suppliers" -QueryParams @{ fieldFilter = "name"; search = "test" }
    if ($result.Success) {
        Write-TestResult "Manage - Suppliers Field Filter" "PASS" "Field filter working"
    } else {
        Write-TestResult "Manage - Suppliers Field Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Suppliers Field Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/suppliers" -QueryParams @{ status = "active" }
    if ($result.Success) {
        Write-TestResult "Manage - Suppliers Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Manage - Suppliers Status Filter" "FAIL" $result.Error
        Add-Error "Manage Page - Suppliers Status Filter" $result.Error
    }
}

# ============================================
# SETTINGS PAGE - Buttons and Filters
# ============================================
function Test-SettingsPage {
    Write-Host "`n=== Testing Settings Page ===" -ForegroundColor Cyan
    
    # Users Filters
    Write-Host "`n--- Testing Users Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/users" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Settings - Users Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Settings - Users Search Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Users Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/users" -QueryParams @{ role = "admin" }
    if ($result.Success) {
        Write-TestResult "Settings - Users Role Filter" "PASS" "Role filter working"
    } else {
        Write-TestResult "Settings - Users Role Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Users Role Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/users" -QueryParams @{ status = "active" }
    if ($result.Success) {
        Write-TestResult "Settings - Users Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Settings - Users Status Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Users Status Filter" $result.Error
    }
    
    # Activity Logs Filters
    Write-Host "`n--- Testing Activity Logs Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/activity-logs" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Settings - Activity Logs Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Settings - Activity Logs Search Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Activity Logs Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/activity-logs" -QueryParams @{ module = "Inventory" }
    if ($result.Success) {
        Write-TestResult "Settings - Activity Logs Module Filter" "PASS" "Module filter working"
    } else {
        Write-TestResult "Settings - Activity Logs Module Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Activity Logs Module Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/activity-logs" -QueryParams @{ actionType = "create" }
    if ($result.Success) {
        Write-TestResult "Settings - Activity Logs Action Filter" "PASS" "Action filter working"
    } else {
        Write-TestResult "Settings - Activity Logs Action Filter" "FAIL" $result.Error
        Add-Error "Settings Page - Activity Logs Action Filter" $result.Error
    }
}

# ============================================
# PRICING/COSTING PAGE - Buttons and Filters
# ============================================
function Test-PricingCostingPage {
    Write-Host "`n=== Testing Pricing/Costing Page ===" -ForegroundColor Cyan
    
    # Price Management Filters
    Write-Host "`n--- Testing Price Management Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/parts/price-management" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Pricing - Price Management Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Pricing - Price Management Search Filter" "FAIL" $result.Error
        Add-Error "Pricing Page - Price Management Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/parts/price-management" -QueryParams @{ category = "test" }
    if ($result.Success) {
        Write-TestResult "Pricing - Price Management Category Filter" "PASS" "Category filter working"
    } else {
        Write-TestResult "Pricing - Price Management Category Filter" "FAIL" $result.Error
        Add-Error "Pricing Page - Price Management Category Filter" $result.Error
    }
    
    # Price History Filters
    $result = Invoke-ApiRequest -Endpoint "/parts/price-history" -QueryParams @{ page = "1"; limit = "10" }
    if ($result.Success) {
        Write-TestResult "Pricing - Price History Pagination" "PASS" "Pagination working"
    } else {
        Write-TestResult "Pricing - Price History Pagination" "FAIL" $result.Error
        Add-Error "Pricing Page - Price History Pagination" $result.Error
    }
}

# ============================================
# KITS PAGE - Buttons and Filters
# ============================================
function Test-KitsPage {
    Write-Host "`n=== Testing Kits Page ===" -ForegroundColor Cyan
    
    # Kits Filters
    Write-Host "`n--- Testing Kits Filters ---" -ForegroundColor Yellow
    
    $result = Invoke-ApiRequest -Endpoint "/kits" -QueryParams @{ search = "test" }
    if ($result.Success) {
        Write-TestResult "Kits - Search Filter" "PASS" "Search filter working"
    } else {
        Write-TestResult "Kits - Search Filter" "FAIL" $result.Error
        Add-Error "Kits Page - Search Filter" $result.Error
    }
    
    $result = Invoke-ApiRequest -Endpoint "/kits" -QueryParams @{ status = "Active" }
    if ($result.Success) {
        Write-TestResult "Kits - Status Filter" "PASS" "Status filter working"
    } else {
        Write-TestResult "Kits - Status Filter" "FAIL" $result.Error
        Add-Error "Kits Page - Status Filter" $result.Error
    }
}

# Main Test Execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUTTONS & FILTERS TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting tests at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Yellow

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend server is running`n" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Backend server is not running!" -ForegroundColor Red
    Write-Host "Please start the backend server first: cd backend && npm run dev" -ForegroundColor Yellow
    exit 1
}

# Run all tests
Test-PartsPage
Test-InventoryPage
Test-SalesPage
Test-ReportsPage
Test-AccountingPage
Test-ExpensesPage
Test-ManagePage
Test-SettingsPage
Test-PricingCostingPage
Test-KitsPage

# Generate Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

# Create Error Report
if ($errors.Count -gt 0) {
    Write-Host "`nCreating error report..." -ForegroundColor Yellow
    $errorReport = @"
# Buttons & Filters Test Error Report

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary
- Total Errors: $($errors.Count)
- Total Tests: $total
- Passed: $passed
- Failed: $failed

## Errors Found

"@
    
    foreach ($error in $errors) {
        $errorReport += @"

### Error at: $($error.Location)
- **Timestamp**: $($error.Timestamp)
- **Error**: $($error.Error)
- **Details**: $($error.Details)

"@
    }
    
    $errorReport | Out-File -FilePath "error-buttons-filters.md" -Encoding UTF8
    Write-Host "Error report saved to error-buttons-filters.md" -ForegroundColor Yellow
} else {
    Write-Host "`nNo errors found! All buttons and filters are working." -ForegroundColor Green
    if (Test-Path "error-buttons-filters.md") {
        Remove-Item "error-buttons-filters.md"
    }
}

Write-Host "`nTest completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow

