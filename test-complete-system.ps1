# Comprehensive System Test Script
# Tests all features of the Inventory ERP System

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
        [hashtable]$Headers = @{}
    )
    
    try {
        $uri = "$API_BASE$Endpoint"
        $headers["Content-Type"] = "application/json"
        
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $Headers
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
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorMessage = $errorBody.error
        } catch { }
        return @{ Success = $false; Error = $errorMessage; StatusCode = $statusCode }
    }
}

function Test-HealthCheck {
    Write-Host "`n=== Testing Health Check ===" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
        Write-TestResult "Health Check" "PASS" "Backend is running"
        return $true
    } catch {
        Write-TestResult "Health Check" "FAIL" $_.Exception.Message
        Add-Error "Health Check" $_.Exception.Message
        return $false
    }
}

function Test-Attributes {
    Write-Host "`n=== Testing Attributes (Categories, Subcategories, Brands) ===" -ForegroundColor Cyan
    
    # Test Categories
    $result = Invoke-ApiRequest -Endpoint "/dropdowns/categories/all"
    if ($result.Success) {
        $categories = if ($result.Data.data) { $result.Data.data } elseif ($result.Data) { $result.Data } else { @() }
        Write-TestResult "Get Categories" "PASS" "Retrieved $($categories.Count) categories"
    } else {
        Write-TestResult "Get Categories" "FAIL" $result.Error
        Add-Error "Attributes - Categories" $result.Error
    }
    
    # Create Category
    $categoryData = @{
        name = "Test Category $(Get-Date -Format 'HHmmss')"
        status = "active"
    }
    $result = Invoke-ApiRequest -Endpoint "/dropdowns/categories" -Method "POST" -Body $categoryData
    $categoryId = $null
    $subcategoryId = $null
    if ($result.Success) {
        # Categories API returns data directly, not wrapped in 'data'
        if ($result.Data.id) {
            $categoryId = $result.Data.id
        } elseif ($result.Data.data.id) {
            $categoryId = $result.Data.data.id
        }
        Write-TestResult "Create Category" "PASS" "Category ID: $categoryId"
        
        # Test Subcategories
        if ($categoryId) {
            $subcategoryData = @{
                name = "Test Subcategory $(Get-Date -Format 'HHmmss')"
                category_id = $categoryId
                status = "active"
            }
            $result = Invoke-ApiRequest -Endpoint "/dropdowns/subcategories" -Method "POST" -Body $subcategoryData
            if ($result.Success) {
                if ($result.Data.id) {
                    $subcategoryId = $result.Data.id
                } elseif ($result.Data.data.id) {
                    $subcategoryId = $result.Data.data.id
                }
                Write-TestResult "Create Subcategory" "PASS" "Subcategory ID: $subcategoryId"
            } else {
                Write-TestResult "Create Subcategory" "FAIL" $result.Error
                Add-Error "Attributes - Subcategories" $result.Error
            }
        }
    } else {
        Write-TestResult "Create Category" "FAIL" $result.Error
        Add-Error "Attributes - Categories" $result.Error
    }
    
    # Test Brands
    $result = Invoke-ApiRequest -Endpoint "/dropdowns/brands/all"
    if ($result.Success) {
        $brands = if ($result.Data.data) { $result.Data.data } elseif ($result.Data) { $result.Data } else { @() }
        Write-TestResult "Get Brands" "PASS" "Retrieved $($brands.Count) brands"
    } else {
        Write-TestResult "Get Brands" "FAIL" $result.Error
        Add-Error "Attributes - Brands" $result.Error
    }
    
    $brandData = @{
        name = "Test Brand $(Get-Date -Format 'HHmmss')"
        status = "active"
    }
    $result = Invoke-ApiRequest -Endpoint "/dropdowns/brands" -Method "POST" -Body $brandData
    $brandId = $null
    if ($result.Success) {
        if ($result.Data.id) {
            $brandId = $result.Data.id
        } elseif ($result.Data.data.id) {
            $brandId = $result.Data.data.id
        }
        Write-TestResult "Create Brand" "PASS" "Brand ID: $brandId"
        return @{ CategoryId = $categoryId; SubcategoryId = $subcategoryId; BrandId = $brandId }
    } else {
        Write-TestResult "Create Brand" "FAIL" $result.Error
        Add-Error "Attributes - Brands" $result.Error
        return @{ CategoryId = $categoryId; SubcategoryId = $subcategoryId; BrandId = $null }
    }
}

function Test-Parts {
    param($attributes)
    Write-Host "`n=== Testing Parts Management ===" -ForegroundColor Cyan
    
    if (-not $attributes) {
        Write-TestResult "Create Part" "SKIP" "Attributes not available"
        return $null
    }
    
    # Get Master Parts
    $result = Invoke-ApiRequest -Endpoint "/dropdowns/master-parts"
    $masterPartNo = "MP-TEST-001"
    if ($result.Success) {
        $masterParts = if ($result.Data.data) { $result.Data.data } elseif ($result.Data) { $result.Data } else { @() }
        if ($masterParts.Count -gt 0) {
            $masterPartNo = $masterParts[0].masterPartNo
        }
        Write-TestResult "Get Master Parts" "PASS" "Found $($masterParts.Count) master parts"
    } else {
        Write-TestResult "Get Master Parts" "FAIL" $result.Error
    }
    
    # Create Part with Models
    $partData = @{
        master_part_no = $masterPartNo
        part_no = "PART-TEST-$(Get-Date -Format 'HHmmss')"
        brand_id = $attributes.BrandId
        category_id = $attributes.CategoryId
        subcategory_id = $attributes.SubcategoryId
        description = "Test Part Description"
        cost = 100.50
        price_a = 150.00
        price_b = 140.00
        price_m = 145.00
        uom = "PCS"
        reorder_level = 10
        status = "active"
        models = @(
            @{
                name = "Test Model 2020-2024"
                qty_used = 2
            },
            @{
                name = "Test Model 2018-2023"
                qty_used = 1
            }
        )
    }
    
    $result = Invoke-ApiRequest -Endpoint "/parts" -Method "POST" -Body $partData
    $partId = $null
    if ($result.Success) {
        # Parts API returns data wrapped in 'data'
        if ($result.Data.data.id) {
            $partId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $partId = $result.Data.id
        }
        Write-TestResult "Create Part" "PASS" "Part ID: $partId"
        
        # Get Part Details and verify Models
        if ($partId) {
            $result = Invoke-ApiRequest -Endpoint "/parts/$partId"
            if ($result.Success) {
                $partDetails = if ($result.Data.data) { $result.Data.data } else { $result.Data }
                $modelsCount = if ($partDetails.models) { $partDetails.models.Count } else { 0 }
                Write-TestResult "Get Part Details" "PASS" "Retrieved part details with $modelsCount models"
                
                # Verify Models are present
                if ($modelsCount -gt 0) {
                    Write-TestResult "Part Models Verification" "PASS" "Part has $modelsCount models associated"
                } else {
                    Write-TestResult "Part Models Verification" "FAIL" "Part should have models but none found"
                    Add-Error "Parts - Models" "Part created with models but models not found in details"
                }
            } else {
                Write-TestResult "Get Part Details" "FAIL" $result.Error
                Add-Error "Parts - Get Details" $result.Error
            }
        }
        
        return $partId
    } else {
        Write-TestResult "Create Part" "FAIL" $result.Error
        Add-Error "Parts - Create" $result.Error
        return $null
    }
}

function Test-Kits {
    param($partId)
    Write-Host "`n=== Testing Kits Management ===" -ForegroundColor Cyan
    
    if (-not $partId) {
        Write-TestResult "Create Kit" "SKIP" "Part not available"
        return $null
    }
    
    # Get Part details for kit
    $result = Invoke-ApiRequest -Endpoint "/parts/$partId"
    if (-not $result.Success) {
        Write-TestResult "Get Part for Kit" "FAIL" $result.Error
        return $null
    }
    
    $part = if ($result.Data.data) { $result.Data.data } else { $result.Data }
    $kitData = @{
        badge = "KIT-TEST-$(Get-Date -Format 'HHmmss')"
        name = "Test Kit $(Get-Date -Format 'HHmmss')"
        description = "Test Kit Description"
        sellingPrice = 500.00
        status = "Active"
        items = @(
            @{
                partId = $partId
                partNo = $part.part_no
                partName = $part.description
                quantity = 2
                costPerUnit = $part.cost
            }
        )
    }
    
    $result = Invoke-ApiRequest -Endpoint "/kits" -Method "POST" -Body $kitData
    $kitId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $kitId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $kitId = $result.Data.id
        }
        Write-TestResult "Create Kit" "PASS" "Kit ID: $kitId"
        
        # Get Kit Details
        if ($kitId) {
            $result = Invoke-ApiRequest -Endpoint "/kits/$kitId"
            if ($result.Success) {
                Write-TestResult "Get Kit Details" "PASS" "Retrieved kit details"
            } else {
                Write-TestResult "Get Kit Details" "FAIL" $result.Error
                Add-Error "Kits - Get Details" $result.Error
            }
        }
        
        return $kitId
    } else {
        Write-TestResult "Create Kit" "FAIL" $result.Error
        Add-Error "Kits - Create" $result.Error
        return $null
    }
}

function Test-Inventory {
    param($partId)
    Write-Host "`n=== Testing Inventory Management ===" -ForegroundColor Cyan
    
    # Test Inventory Dashboard
    $result = Invoke-ApiRequest -Endpoint "/inventory/dashboard"
    if ($result.Success) {
        Write-TestResult "Inventory Dashboard" "PASS" "Dashboard data retrieved"
    } else {
        Write-TestResult "Inventory Dashboard" "FAIL" $result.Error
        Add-Error "Inventory - Dashboard" $result.Error
    }
    
    # Test Stock Movements
    if ($partId) {
        $movementData = @{
            part_id = $partId
            type = "in"
            quantity = 100
            notes = "Test stock movement"
        }
        $result = Invoke-ApiRequest -Endpoint "/inventory/movements" -Method "POST" -Body $movementData
        if ($result.Success) {
            Write-TestResult "Create Stock Movement" "PASS" "Stock movement created"
        } else {
            Write-TestResult "Create Stock Movement" "FAIL" $result.Error
            Add-Error "Inventory - Stock Movement" $result.Error
        }
        
        # Test Stock Balance
        $result = Invoke-ApiRequest -Endpoint "/inventory/balance/$partId"
        if ($result.Success) {
            Write-TestResult "Get Stock Balance" "PASS" "Stock balance retrieved"
        } else {
            Write-TestResult "Get Stock Balance" "FAIL" $result.Error
            Add-Error "Inventory - Stock Balance" $result.Error
        }
    }
    
    # Test Stores
    $storeData = @{
        name = "Test Store $(Get-Date -Format 'HHmmss')"
        type = "Main"
        status = "active"
        description = "Test store description"
    }
    $result = Invoke-ApiRequest -Endpoint "/inventory/stores" -Method "POST" -Body $storeData
    $storeId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $storeId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $storeId = $result.Data.id
        }
        Write-TestResult "Create Store" "PASS" "Store ID: $storeId"
        return $storeId
    } else {
        Write-TestResult "Create Store" "FAIL" $result.Error
        Add-Error "Inventory - Stores" $result.Error
        return $null
    }
}

function Test-Suppliers {
    Write-Host "`n=== Testing Suppliers Management ===" -ForegroundColor Cyan
    
    $supplierData = @{
        code = "SUP-TEST-$(Get-Date -Format 'HHmmss')"
        companyName = "Test Supplier Company"
        name = "Test Supplier"
        email = "supplier@test.com"
        phone = "1234567890"
        status = "active"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/suppliers" -Method "POST" -Body $supplierData
    $supplierId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $supplierId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $supplierId = $result.Data.id
        }
        Write-TestResult "Create Supplier" "PASS" "Supplier ID: $supplierId"
        
        # Get Supplier Details
        if ($supplierId) {
            $result = Invoke-ApiRequest -Endpoint "/suppliers/$supplierId"
            if ($result.Success) {
                Write-TestResult "Get Supplier Details" "PASS" "Retrieved supplier details"
            } else {
                Write-TestResult "Get Supplier Details" "FAIL" $result.Error
                Add-Error "Suppliers - Get Details" $result.Error
            }
        }
        
        return $supplierId
    } else {
        Write-TestResult "Create Supplier" "FAIL" $result.Error
        Add-Error "Suppliers - Create" $result.Error
        return $null
    }
}

function Test-Customers {
    Write-Host "`n=== Testing Customers Management ===" -ForegroundColor Cyan
    
    $customerData = @{
        name = "Test Customer $(Get-Date -Format 'HHmmss')"
        email = "customer@test.com"
        contactNo = "9876543210"
        openingBalance = 0
        creditLimit = 10000
        status = "active"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/customers" -Method "POST" -Body $customerData
    $customerId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $customerId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $customerId = $result.Data.id
        }
        Write-TestResult "Create Customer" "PASS" "Customer ID: $customerId"
        
        # Get Customer Details
        if ($customerId) {
            $result = Invoke-ApiRequest -Endpoint "/customers/$customerId"
            if ($result.Success) {
                Write-TestResult "Get Customer Details" "PASS" "Retrieved customer details"
            } else {
                Write-TestResult "Get Customer Details" "FAIL" $result.Error
                Add-Error "Customers - Get Details" $result.Error
            }
        }
        
        return $customerId
    } else {
        Write-TestResult "Create Customer" "FAIL" $result.Error
        Add-Error "Customers - Create" $result.Error
        return $null
    }
}

function Test-PurchaseOrders {
    param($supplierId, $partId, $storeId)
    Write-Host "`n=== Testing Purchase Orders ===" -ForegroundColor Cyan
    
    if (-not $partId) {
        Write-TestResult "Create Purchase Order" "SKIP" "Part not available"
        return $null
    }
    
    $poData = @{
        po_number = "PO-TEST-$(Get-Date -Format 'HHmmss')"
        date = (Get-Date -Format "yyyy-MM-dd")
        supplier_id = $supplierId
        items = @(
            @{
                part_id = $partId
                quantity = 50
                unit_cost = 100.00
            }
        )
    }
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/purchase-orders" -Method "POST" -Body $poData
    $poId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $poId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $poId = $result.Data.id
        }
        Write-TestResult "Create Purchase Order" "PASS" "PO ID: $poId"
        
        # Get PO Details
        if ($poId) {
            $result = Invoke-ApiRequest -Endpoint "/inventory/purchase-orders/$poId"
            if ($result.Success) {
                Write-TestResult "Get Purchase Order Details" "PASS" "Retrieved PO details"
            } else {
                Write-TestResult "Get Purchase Order Details" "FAIL" $result.Error
                Add-Error "Purchase Orders - Get Details" $result.Error
            }
        }
        
        return $poId
    } else {
        Write-TestResult "Create Purchase Order" "FAIL" $result.Error
        Add-Error "Purchase Orders - Create" $result.Error
        return $null
    }
}

function Test-DirectPurchaseOrders {
    param($supplierId, $partId, $storeId)
    Write-Host "`n=== Testing Direct Purchase Orders ===" -ForegroundColor Cyan
    
    if (-not $partId) {
        Write-TestResult "Create Direct Purchase Order" "SKIP" "Part not available"
        return $null
    }
    
    $dpoData = @{
        dpo_number = "DPO-TEST-$(Get-Date -Format 'HHmmss')"
        date = (Get-Date -Format "yyyy-MM-dd")
        supplier_id = $supplierId
        store_id = $storeId
        status = "completed"
        items = @(
            @{
                part_id = $partId
                quantity = 25
                purchase_price = 95.00
                sale_price = 150.00
            }
        )
    }
    
    $result = Invoke-ApiRequest -Endpoint "/inventory/direct-purchase-orders" -Method "POST" -Body $dpoData
    $dpoId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $dpoId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $dpoId = $result.Data.id
        }
        Write-TestResult "Create Direct Purchase Order" "PASS" "DPO ID: $dpoId"
        
        # Get DPO Details
        if ($dpoId) {
            $result = Invoke-ApiRequest -Endpoint "/inventory/direct-purchase-orders/$dpoId"
            if ($result.Success) {
                Write-TestResult "Get Direct Purchase Order Details" "PASS" "Retrieved DPO details"
            } else {
                Write-TestResult "Get Direct Purchase Order Details" "FAIL" $result.Error
                Add-Error "Direct Purchase Orders - Get Details" $result.Error
            }
        }
        
        return $dpoId
    } else {
        Write-TestResult "Create Direct Purchase Order" "FAIL" $result.Error
        Add-Error "Direct Purchase Orders - Create" $result.Error
        return $null
    }
}

function Test-Reports {
    Write-Host "`n=== Testing Reports ===" -ForegroundColor Cyan
    
    # Dashboard Metrics
    $result = Invoke-ApiRequest -Endpoint "/reports/dashboard/metrics"
    if ($result.Success) {
        Write-TestResult "Dashboard Metrics Report" "PASS" "Metrics retrieved"
    } else {
        Write-TestResult "Dashboard Metrics Report" "FAIL" $result.Error
        Add-Error "Reports - Dashboard Metrics" $result.Error
    }
    
    # Sales Report
    $result = Invoke-ApiRequest -Endpoint "/reports/sales"
    if ($result.Success) {
        Write-TestResult "Sales Report" "PASS" "Sales report retrieved"
    } else {
        Write-TestResult "Sales Report" "FAIL" $result.Error
        Add-Error "Reports - Sales" $result.Error
    }
    
    # Stock Movement Report
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/stock-movement"
    if ($result.Success) {
        Write-TestResult "Stock Movement Report" "PASS" "Stock movement report retrieved"
    } else {
        Write-TestResult "Stock Movement Report" "FAIL" $result.Error
        Add-Error "Reports - Stock Movement" $result.Error
    }
}

function Test-Accounting {
    Write-Host "`n=== Testing Accounting System ===" -ForegroundColor Cyan
    
    # Get Main Groups
    $result = Invoke-ApiRequest -Endpoint "/accounting/main-groups"
    if ($result.Success) {
        Write-TestResult "Get Main Groups" "PASS" "Main groups retrieved"
    } else {
        Write-TestResult "Get Main Groups" "FAIL" $result.Error
        Add-Error "Accounting - Main Groups" $result.Error
    }
    
    # Get Accounts
    $result = Invoke-ApiRequest -Endpoint "/accounting/accounts"
    if ($result.Success) {
        Write-TestResult "Get Accounts" "PASS" "Accounts retrieved"
    } else {
        Write-TestResult "Get Accounts" "FAIL" $result.Error
        Add-Error "Accounting - Accounts" $result.Error
    }
    
    # Trial Balance
    $result = Invoke-ApiRequest -Endpoint "/accounting/trial-balance"
    if ($result.Success) {
        Write-TestResult "Trial Balance" "PASS" "Trial balance retrieved"
    } else {
        Write-TestResult "Trial Balance" "FAIL" $result.Error
        Add-Error "Accounting - Trial Balance" $result.Error
    }
    
    # Balance Sheet
    $result = Invoke-ApiRequest -Endpoint "/accounting/balance-sheet"
    if ($result.Success) {
        Write-TestResult "Balance Sheet" "PASS" "Balance sheet retrieved"
    } else {
        Write-TestResult "Balance Sheet" "FAIL" $result.Error
        Add-Error "Accounting - Balance Sheet" $result.Error
    }
    
    # Income Statement
    $result = Invoke-ApiRequest -Endpoint "/accounting/income-statement"
    if ($result.Success) {
        Write-TestResult "Income Statement" "PASS" "Income statement retrieved"
    } else {
        Write-TestResult "Income Statement" "FAIL" $result.Error
        Add-Error "Accounting - Income Statement" $result.Error
    }
}

function Test-Users {
    Write-Host "`n=== Testing Users Management ===" -ForegroundColor Cyan
    
    $userData = @{
        name = "Test User $(Get-Date -Format 'HHmmss')"
        email = "testuser$(Get-Date -Format 'HHmmss')@test.com"
        role = "admin"
        status = "active"
        password = "Test123!"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/users" -Method "POST" -Body $userData
    $userId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $userId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $userId = $result.Data.id
        }
        Write-TestResult "Create User" "PASS" "User ID: $userId"
        
        # Get User Details
        if ($userId) {
            $result = Invoke-ApiRequest -Endpoint "/users/$userId"
            if ($result.Success) {
                Write-TestResult "Get User Details" "PASS" "Retrieved user details"
            } else {
                Write-TestResult "Get User Details" "FAIL" $result.Error
                Add-Error "Users - Get Details" $result.Error
            }
        }
        
        return $userId
    } else {
        Write-TestResult "Create User" "FAIL" $result.Error
        Add-Error "Users - Create" $result.Error
        return $null
    }
}

function Test-Roles {
    Write-Host "`n=== Testing Roles Management ===" -ForegroundColor Cyan
    
    $roleData = @{
        name = "Test Role $(Get-Date -Format 'HHmmss')"
        description = "Test role description"
        permissions = @("read", "write", "delete")
    }
    
    $result = Invoke-ApiRequest -Endpoint "/roles" -Method "POST" -Body $roleData
    $roleId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $roleId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $roleId = $result.Data.id
        }
        Write-TestResult "Create Role" "PASS" "Role ID: $roleId"
        
        # Get Role Details
        if ($roleId) {
            $result = Invoke-ApiRequest -Endpoint "/roles/$roleId"
            if ($result.Success) {
                Write-TestResult "Get Role Details" "PASS" "Retrieved role details"
            } else {
                Write-TestResult "Get Role Details" "FAIL" $result.Error
                Add-Error "Roles - Get Details" $result.Error
            }
        }
        
        return $roleId
    } else {
        Write-TestResult "Create Role" "FAIL" $result.Error
        Add-Error "Roles - Create" $result.Error
        return $null
    }
}

function Test-ApprovalFlows {
    Write-Host "`n=== Testing Approval Flows ===" -ForegroundColor Cyan
    
    $flowData = @{
        name = "Test Flow $(Get-Date -Format 'HHmmss')"
        description = "Test approval flow"
        module = "purchase"
        trigger = "create"
        steps = @(
            @{ role = "manager"; action = "approve" },
            @{ role = "admin"; action = "approve" }
        )
        status = "active"
    }
    
    $result = Invoke-ApiRequest -Endpoint "/approval-flows" -Method "POST" -Body $flowData
    $flowId = $null
    if ($result.Success) {
        if ($result.Data.data.id) {
            $flowId = $result.Data.data.id
        } elseif ($result.Data.id) {
            $flowId = $result.Data.id
        }
        Write-TestResult "Create Approval Flow" "PASS" "Flow ID: $flowId"
        
        # Get Flow Details
        if ($flowId) {
            $result = Invoke-ApiRequest -Endpoint "/approval-flows/$flowId"
            if ($result.Success) {
                Write-TestResult "Get Approval Flow Details" "PASS" "Retrieved flow details"
            } else {
                Write-TestResult "Get Approval Flow Details" "FAIL" $result.Error
                Add-Error "Approval Flows - Get Details" $result.Error
            }
        }
        
        return $flowId
    } else {
        Write-TestResult "Create Approval Flow" "FAIL" $result.Error
        Add-Error "Approval Flows - Create" $result.Error
        return $null
    }
}

# Main Test Execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPREHENSIVE SYSTEM TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting tests at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Yellow

# Check if backend is running
if (-not (Test-HealthCheck)) {
    Write-Host "`nERROR: Backend server is not running or not accessible!" -ForegroundColor Red
    Write-Host "Please start the backend server first: cd backend && npm run dev" -ForegroundColor Yellow
    exit 1
}

# Run all tests
$attributes = Test-Attributes
$partId = Test-Parts -attributes $attributes
$kitId = Test-Kits -partId $partId
$storeId = Test-Inventory -partId $partId
$supplierId = Test-Suppliers
$customerId = Test-Customers
$poId = Test-PurchaseOrders -supplierId $supplierId -partId $partId -storeId $storeId
$dpoId = Test-DirectPurchaseOrders -supplierId $supplierId -partId $partId -storeId $storeId
Test-Reports
Test-Accounting
$userId = Test-Users
$roleId = Test-Roles
$flowId = Test-ApprovalFlows

# Generate Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$skipped = ($testResults | Where-Object { $_.Status -eq "SKIP" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Skipped: $skipped" -ForegroundColor Yellow

# Create Error Report
if ($errors.Count -gt 0) {
    Write-Host "`nCreating error report..." -ForegroundColor Yellow
    $errorReport = @"
# System Test Error Report

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary
- Total Errors: $($errors.Count)
- Total Tests: $total
- Passed: $passed
- Failed: $failed
- Skipped: $skipped

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
    
    $errorReport | Out-File -FilePath "error.md" -Encoding UTF8
    Write-Host "Error report saved to error.md" -ForegroundColor Yellow
} else {
    Write-Host "`nNo errors found! All tests passed." -ForegroundColor Green
    if (Test-Path "error.md") {
        Remove-Item "error.md"
    }
}

Write-Host "`nTest completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow

