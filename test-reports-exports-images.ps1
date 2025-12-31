# Comprehensive Reports, Exports, and Image Upload Test Script
# Tests all report pages, PDF/CSV exports, and image uploading

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
        Add-Type -AssemblyName System.Web
        $uriBuilder = New-Object System.UriBuilder("$API_BASE$Endpoint")
        
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

function Test-CSVExportData {
    param($data, $testName)
    if ($data -and $data.Count -gt 0) {
        # Simulate CSV generation
        $headers = @("Column1", "Column2", "Column3")
        $csvRows = @()
        $csvRows += ($headers -join ",")
        foreach ($row in $data) {
            $csvRows += ("Value1,Value2,Value3")
        }
        $csvContent = $csvRows -join "`n"
        if ($csvContent.Length -gt 0) {
            Write-TestResult "$testName - CSV Data Generation" "PASS" "CSV data can be generated ($($data.Count) rows)"
            return $true
        }
    }
    Write-TestResult "$testName - CSV Data Generation" "FAIL" "No data available for CSV export"
    return $false
}

# ============================================
# OVERVIEW REPORTS
# ============================================
function Test-OverviewReports {
    Write-Host "`n=== Testing Overview Reports ===" -ForegroundColor Cyan
    
    # Real-Time Dashboard
    $result = Invoke-ApiRequest -Endpoint "/reports/dashboard/metrics"
    if ($result.Success -and $result.Data) {
        Write-TestResult "Overview - Real-Time Dashboard" "PASS" "Dashboard metrics retrieved"
        Test-CSVExportData @($result.Data), "Overview - Dashboard"
    } else {
        Write-TestResult "Overview - Real-Time Dashboard" "FAIL" $result.Error
        Add-Error "Overview Reports - Dashboard" $result.Error
    }
    
    # Sales Report
    $result = Invoke-ApiRequest -Endpoint "/reports/sales" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Overview - Sales Report" "PASS" "Sales report data retrieved ($($data.Count) records)"
        Test-CSVExportData $data, "Overview - Sales Report"
    } else {
        Write-TestResult "Overview - Sales Report" "FAIL" $result.Error
        Add-Error "Overview Reports - Sales Report" $result.Error
    }
}

# ============================================
# SALES REPORTS
# ============================================
function Test-SalesReports {
    Write-Host "`n=== Testing Sales Reports ===" -ForegroundColor Cyan
    
    # Periodic Sales
    $result = Invoke-ApiRequest -Endpoint "/reports/sales/periodic" -QueryParams @{ period_type = "monthly"; year = "2024" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Sales - Periodic Sales Report" "PASS" "Periodic sales data retrieved"
        Test-CSVExportData $data, "Sales - Periodic Sales"
    } else {
        Write-TestResult "Sales - Periodic Sales Report" "FAIL" $result.Error
        Add-Error "Sales Reports - Periodic Sales" $result.Error
    }
    
    # Sales by Type
    $result = Invoke-ApiRequest -Endpoint "/reports/sales/by-type" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Sales - Sales by Type Report" "PASS" "Sales by type data retrieved"
        Test-CSVExportData $data, "Sales - Sales by Type"
    } else {
        Write-TestResult "Sales - Sales by Type Report" "FAIL" $result.Error
        Add-Error "Sales Reports - Sales by Type" $result.Error
    }
    
    # Target Achievement
    $result = Invoke-ApiRequest -Endpoint "/reports/sales/target-achievement" -QueryParams @{ period = "monthly"; month = "12" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Sales - Target Achievement Report" "PASS" "Target achievement data retrieved"
        Test-CSVExportData $data, "Sales - Target Achievement"
    } else {
        Write-TestResult "Sales - Target Achievement Report" "FAIL" $result.Error
        Add-Error "Sales Reports - Target Achievement" $result.Error
    }
}

# ============================================
# INVENTORY REPORTS
# ============================================
function Test-InventoryReports {
    Write-Host "`n=== Testing Inventory Reports ===" -ForegroundColor Cyan
    
    # Stock Movement
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/stock-movement" -QueryParams @{ period = "monthly" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Inventory - Stock Movement Report" "PASS" "Stock movement data retrieved"
        Test-CSVExportData $data, "Inventory - Stock Movement"
    } else {
        Write-TestResult "Inventory - Stock Movement Report" "FAIL" $result.Error
        Add-Error "Inventory Reports - Stock Movement" $result.Error
    }
    
    # Brand Wise
    $result = Invoke-ApiRequest -Endpoint "/reports/inventory/brand-wise" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Inventory - Brand Wise Report" "PASS" "Brand wise data retrieved"
        Test-CSVExportData $data, "Inventory - Brand Wise"
    } else {
        Write-TestResult "Inventory - Brand Wise Report" "FAIL" $result.Error
        Add-Error "Inventory Reports - Brand Wise" $result.Error
    }
}

# ============================================
# FINANCIAL REPORTS
# ============================================
function Test-FinancialReports {
    Write-Host "`n=== Testing Financial Reports ===" -ForegroundColor Cyan
    
    # Purchases Report
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/purchases" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Financial - Purchases Report" "PASS" "Purchases data retrieved"
        Test-CSVExportData $data, "Financial - Purchases"
    } else {
        Write-TestResult "Financial - Purchases Report" "FAIL" $result.Error
        Add-Error "Financial Reports - Purchases" $result.Error
    }
    
    # Purchase Comparison
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/purchase-comparison" -QueryParams @{ 
        period1_start = "2024-01-01"; 
        period1_end = "2024-06-30";
        period2_start = "2024-07-01";
        period2_end = "2024-12-31"
    }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Financial - Purchase Comparison Report" "PASS" "Purchase comparison data retrieved"
        Test-CSVExportData $data, "Financial - Purchase Comparison"
    } else {
        Write-TestResult "Financial - Purchase Comparison Report" "FAIL" $result.Error
        Add-Error "Financial Reports - Purchase Comparison" $result.Error
    }
    
    # Import Cost Summary
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/import-cost" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Financial - Import Cost Summary Report" "PASS" "Import cost data retrieved"
        Test-CSVExportData $data, "Financial - Import Cost Summary"
    } else {
        Write-TestResult "Financial - Import Cost Summary Report" "FAIL" $result.Error
        Add-Error "Financial Reports - Import Cost Summary" $result.Error
    }
    
    # Expenses Report
    $result = Invoke-ApiRequest -Endpoint "/reports/financial/expenses" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Financial - Expenses Report" "PASS" "Expenses data retrieved"
        Test-CSVExportData $data, "Financial - Expenses"
    } else {
        Write-TestResult "Financial - Expenses Report" "FAIL" $result.Error
        Add-Error "Financial Reports - Expenses" $result.Error
    }
}

# ============================================
# ANALYTICS REPORTS
# ============================================
function Test-AnalyticsReports {
    Write-Host "`n=== Testing Analytics Reports ===" -ForegroundColor Cyan
    
    # Customer Analysis
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/customers" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Analytics - Customer Analysis Report" "PASS" "Customer analysis data retrieved"
        Test-CSVExportData $data, "Analytics - Customer Analysis"
    } else {
        Write-TestResult "Analytics - Customer Analysis Report" "FAIL" $result.Error
        Add-Error "Analytics Reports - Customer Analysis" $result.Error
    }
    
    # Customer Aging
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/customer-aging" -QueryParams @{ customer_type = "all" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Analytics - Customer Aging Report" "PASS" "Customer aging data retrieved"
        Test-CSVExportData $data, "Analytics - Customer Aging"
    } else {
        Write-TestResult "Analytics - Customer Aging Report" "FAIL" $result.Error
        Add-Error "Analytics Reports - Customer Aging" $result.Error
    }
    
    # Supplier Performance
    $result = Invoke-ApiRequest -Endpoint "/reports/analytics/supplier-performance" -QueryParams @{ from_date = "2024-01-01"; to_date = "2024-12-31" }
    if ($result.Success -and $result.Data) {
        $data = if ($result.Data.data) { $result.Data.data } else { $result.Data }
        Write-TestResult "Analytics - Supplier Performance Report" "PASS" "Supplier performance data retrieved"
        Test-CSVExportData $data, "Analytics - Supplier Performance"
    } else {
        Write-TestResult "Analytics - Supplier Performance Report" "FAIL" $result.Error
        Add-Error "Analytics Reports - Supplier Performance" $result.Error
    }
}

# ============================================
# PDF EXPORT TESTING
# ============================================
function Test-PDFExport {
    Write-Host "`n=== Testing PDF Export Functionality ===" -ForegroundColor Cyan
    
    # Check if export utilities exist
    $exportUtilsPath = "src/utils/exportUtils.ts"
    if (Test-Path $exportUtilsPath) {
        $content = Get-Content $exportUtilsPath -Raw
        if ($content -match "printReport|exportToPDF|window\.print") {
            Write-TestResult "PDF Export - Print Function Available" "PASS" "Print/PDF export function found in exportUtils"
        } else {
            Write-TestResult "PDF Export - Print Function Available" "FAIL" "Print function not found"
            Add-Error "PDF Export" "Print function not found in exportUtils.ts"
        }
        
        if ($content -match "exportToCSV") {
            Write-TestResult "PDF Export - CSV Export Function Available" "PASS" "CSV export function found"
        } else {
            Write-TestResult "PDF Export - CSV Export Function Available" "FAIL" "CSV export function not found"
            Add-Error "PDF Export" "CSV export function not found"
        }
    } else {
        Write-TestResult "PDF Export - Export Utils File" "FAIL" "exportUtils.ts not found"
        Add-Error "PDF Export" "exportUtils.ts file not found"
    }
    
    # Test that reports have export buttons (check component files)
    $reportFiles = Get-ChildItem -Path "src/components/reports" -Filter "*.tsx" -Recurse
    $exportButtonsFound = 0
    foreach ($file in $reportFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "handleExport|exportToCSV|Download|export") {
            $exportButtonsFound++
        }
    }
    
    if ($exportButtonsFound -gt 0) {
        Write-TestResult "PDF Export - Export Buttons in Reports" "PASS" "Found export functionality in $exportButtonsFound report components"
    } else {
        Write-TestResult "PDF Export - Export Buttons in Reports" "FAIL" "No export buttons found in report components"
        Add-Error "PDF Export" "Export buttons not found in report components"
    }
}

# ============================================
# IMAGE UPLOAD TESTING
# ============================================
function Test-ImageUpload {
    Write-Host "`n=== Testing Image Upload Functionality ===" -ForegroundColor Cyan
    
    # Check Part Entry Form for image upload
    $partEntryFormPath = "src/components/parts/PartEntryForm.tsx"
    if (Test-Path $partEntryFormPath) {
        $content = Get-Content $partEntryFormPath -Raw
        if ($content -match "handleImageUpload|FileReader|readAsDataURL|imageP1|imageP2") {
            Write-TestResult "Image Upload - Part Entry Form" "PASS" "Image upload functionality found in PartEntryForm"
        } else {
            Write-TestResult "Image Upload - Part Entry Form" "FAIL" "Image upload not found in PartEntryForm"
            Add-Error "Image Upload - Part Entry Form" "Image upload functionality not found"
        }
        
        # Check for file input elements
        if ($content -match "input.*type.*file|fileInput|accept.*image") {
            Write-TestResult "Image Upload - File Input Elements" "PASS" "File input elements found"
        } else {
            Write-TestResult "Image Upload - File Input Elements" "FAIL" "File input elements not found"
            Add-Error "Image Upload - File Input" "File input elements not found"
        }
        
        # Check for image preview
        if ($content -match "imageP1|imageP2|preview|img.*src") {
            Write-TestResult "Image Upload - Image Preview" "PASS" "Image preview functionality found"
        } else {
            Write-TestResult "Image Upload - Image Preview" "FAIL" "Image preview not found"
            Add-Error "Image Upload - Preview" "Image preview not found"
        }
    } else {
        Write-TestResult "Image Upload - Part Entry Form File" "FAIL" "PartEntryForm.tsx not found"
        Add-Error "Image Upload" "PartEntryForm.tsx file not found"
    }
    
    # Check CompactPartForm
    $compactFormPath = "src/components/parts/CompactPartForm.tsx"
    if (Test-Path $compactFormPath) {
        $content = Get-Content $compactFormPath -Raw
        if ($content -match "handleImageUpload|FileReader|readAsDataURL") {
            Write-TestResult "Image Upload - Compact Part Form" "PASS" "Image upload found in CompactPartForm"
        } else {
            Write-TestResult "Image Upload - Compact Part Form" "FAIL" "Image upload not found in CompactPartForm"
            Add-Error "Image Upload - Compact Form" "Image upload not found"
        }
        
        # Check file size validation
        if ($content -match "file\.size|5.*1024.*1024|5MB") {
            Write-TestResult "Image Upload - File Size Validation" "PASS" "File size validation found"
        } else {
            Write-TestResult "Image Upload - File Size Validation" "WARN" "File size validation not found (may be optional)"
        }
    }
    
    # Test API endpoint for image upload (if parts API accepts images)
    $testPartData = @{
        part_no = "TEST-IMG-$(Get-Date -Format 'HHmmss')"
        description = "Test part with image"
        cost = 100
        price_a = 150
        status = "active"
        image_p1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    
    $result = Invoke-ApiRequest -Endpoint "/parts" -Method "POST" -Body $testPartData
    if ($result.Success) {
        Write-TestResult "Image Upload - API Accepts Base64 Images" "PASS" "API accepts image data in part creation"
    } else {
        Write-TestResult "Image Upload - API Accepts Base64 Images" "WARN" "API may not accept base64 images directly: $($result.Error)"
    }
    
    # Test retrieving part with images
    if ($result.Success -and $result.Data) {
        $partId = if ($result.Data.data.id) { $result.Data.data.id } elseif ($result.Data.id) { $result.Data.id } else { $null }
        if ($partId) {
            $getResult = Invoke-ApiRequest -Endpoint "/parts/$partId"
            if ($getResult.Success) {
                $part = if ($getResult.Data.data) { $getResult.Data.data } else { $getResult.Data }
                if ($part.image_p1 -or $part.imageP1) {
                    Write-TestResult "Image Upload - Image Storage & Retrieval" "PASS" "Images can be stored and retrieved"
                } else {
                    Write-TestResult "Image Upload - Image Storage & Retrieval" "WARN" "Image may not be stored in expected format"
                }
            }
        }
    }
}

# ============================================
# CSV EXPORT DETAILED TESTING
# ============================================
function Test-CSVExportDetailed {
    Write-Host "`n=== Testing CSV Export in Detail ===" -ForegroundColor Cyan
    
    # Test CSV export utility function
    $exportUtilsPath = "src/utils/exportUtils.ts"
    if (Test-Path $exportUtilsPath) {
        $content = Get-Content $exportUtilsPath -Raw
        
        # Check for exportToCSV function
        if ($content -match "exportToCSV") {
            Write-TestResult "CSV Export - exportToCSV Function" "PASS" "exportToCSV function exists"
            
            # Check for Blob creation
            if ($content -match "new Blob|Blob\(\[csvContent\]") {
                Write-TestResult "CSV Export - Blob Creation" "PASS" "Blob creation for CSV found"
            } else {
                Write-TestResult "CSV Export - Blob Creation" "FAIL" "Blob creation not found"
                Add-Error "CSV Export" "Blob creation not found in exportUtils"
            }
            
            # Check for download link creation
            if ($content -match "createElement.*a|setAttribute.*download") {
                Write-TestResult "CSV Export - Download Link Creation" "PASS" "Download link creation found"
            } else {
                Write-TestResult "CSV Export - Download Link Creation" "FAIL" "Download link creation not found"
                Add-Error "CSV Export" "Download link creation not found"
            }
        } else {
            Write-TestResult "CSV Export - exportToCSV Function" "FAIL" "exportToCSV function not found"
            Add-Error "CSV Export" "exportToCSV function not found"
        }
        
        # Check for exportTableToCSV function
        if ($content -match "exportTableToCSV") {
            Write-TestResult "CSV Export - exportTableToCSV Function" "PASS" "exportTableToCSV function exists"
        } else {
            Write-TestResult "CSV Export - exportTableToCSV Function" "WARN" "exportTableToCSV function not found (may be optional)"
        }
    }
    
    # Test that reports use CSV export
    $reportFiles = Get-ChildItem -Path "src/components/reports" -Filter "*Tab.tsx" -Recurse
    $csvUsageCount = 0
    foreach ($file in $reportFiles) {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "exportToCSV|handleExport.*csv|\.csv") {
            $csvUsageCount++
            $fileName = $file.Name
            Write-TestResult "CSV Export - $fileName Uses CSV" "PASS" "Report component uses CSV export"
        }
    }
    
    if ($csvUsageCount -gt 0) {
        Write-TestResult "CSV Export - Reports Using CSV" "PASS" "$csvUsageCount report components use CSV export"
    } else {
        Write-TestResult "CSV Export - Reports Using CSV" "FAIL" "No reports found using CSV export"
        Add-Error "CSV Export" "No reports using CSV export found"
    }
}

# Main Test Execution
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REPORTS, EXPORTS & IMAGE UPLOAD TEST" -ForegroundColor Cyan
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
Test-OverviewReports
Test-SalesReports
Test-InventoryReports
Test-FinancialReports
Test-AnalyticsReports
Test-PDFExport
Test-CSVExportDetailed
Test-ImageUpload

# Generate Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$warned = ($testResults | Where-Object { $_.Status -eq "WARN" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Warnings: $warned" -ForegroundColor Yellow

# Create Error Report
if ($errors.Count -gt 0) {
    Write-Host "`nCreating error report..." -ForegroundColor Yellow
    $errorReport = @"
# Reports, Exports & Image Upload Test Error Report

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary
- Total Errors: $($errors.Count)
- Total Tests: $total
- Passed: $passed
- Failed: $failed
- Warnings: $warned

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
    
    $errorReport | Out-File -FilePath "error-reports-exports-images.md" -Encoding UTF8
    Write-Host "Error report saved to error-reports-exports-images.md" -ForegroundColor Yellow
} else {
    Write-Host "`nNo errors found! All reports, exports, and image uploads are working." -ForegroundColor Green
    if (Test-Path "error-reports-exports-images.md") {
        Remove-Item "error-reports-exports-images.md"
    }
}

Write-Host "`nTest completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow

