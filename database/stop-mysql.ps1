$running = Get-Process mysqld -ErrorAction SilentlyContinue

if (!$running) {
  Write-Host "MySQL hien khong chay."
  exit 0
}

$running | Stop-Process -Force
Write-Host "Da dung MySQL local."
