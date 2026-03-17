param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Email = "demo@bus.local",
  [string]$Password = "123456",
  [int]$TopupAmount = 50000,
  [int]$RouteId = 1,
  [int]$TicketPrice = 7000,
  [switch]$RegisterNewUser
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Invoke-JsonPost($url, $body, $headers = @{}) {
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 5)
}

if ($RegisterNewUser) {
  Write-Step "Register user (optional)"
  try {
    $null = Invoke-JsonPost "$BaseUrl/api/auth/register" @{ email = $Email; password = $Password }
    Write-Host "Register success" -ForegroundColor Green
  } catch {
    Write-Host "Register skipped: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Step "Login"
$login = Invoke-JsonPost "$BaseUrl/api/auth/login" @{ email = $Email; password = $Password }
$userId = $login.userId
if (-not $userId) { throw "Khong lay duoc userId" }
Write-Host "Logged in userId=$userId" -ForegroundColor Green

$authHeaders = @{ "x-user-id" = $userId }

Write-Step "Create topup order"
$topup = Invoke-JsonPost "$BaseUrl/api/payments/topup/create" @{ amount = $TopupAmount } $authHeaders
$orderId = $topup.orderId
if (-not $orderId) { throw "Khong tao duoc order topup" }
Write-Host "Topup order: $orderId" -ForegroundColor Green

Write-Step "Confirm webhook success"
$null = Invoke-JsonPost "$BaseUrl/api/payments/webhook" @{ orderId = $orderId; status = "success"; amount = $TopupAmount } $authHeaders
Write-Host "Webhook confirmed" -ForegroundColor Green

Write-Step "Get wallet balance after topup"
$wallet = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/wallet/balance" -Headers $authHeaders
Write-Host "Balance: $($wallet.balance)" -ForegroundColor Green

Write-Step "Buy bus ticket"
$buy = Invoke-JsonPost "$BaseUrl/api/tickets/buy" @{ routeId = $RouteId; price = $TicketPrice } $authHeaders
Write-Host "Ticket code: $($buy.ticket.ticketCode)" -ForegroundColor Green

Write-Step "Get transactions + tickets"
$txs = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/wallet/transactions" -Headers $authHeaders
$tickets = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/tickets/buy" -Headers $authHeaders

Write-Host "Transactions: $($txs.items.Count)" -ForegroundColor Green
Write-Host "Tickets: $($tickets.items.Count)" -ForegroundColor Green
Write-Host "`nMVP smoke test done." -ForegroundColor Magenta
