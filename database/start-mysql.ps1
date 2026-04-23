$mysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$mysqlConfig = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"

if (!(Test-Path $mysqlExe)) {
  Write-Error "Khong tim thay mysqld.exe. Hay kiem tra lai duong dan cai dat MySQL."
  exit 1
}

$running = Get-Process mysqld -ErrorAction SilentlyContinue

if ($running) {
  Write-Host "MySQL dang chay san."
  exit 0
}

Start-Process -FilePath $mysqlExe -ArgumentList "--defaults-file=$mysqlConfig" -WorkingDirectory (Split-Path $mysqlExe)
Start-Sleep -Seconds 4

if ((Test-NetConnection localhost -Port 3306).TcpTestSucceeded) {
  Write-Host "MySQL da san sang tren cong 3306."
} else {
  Write-Error "MySQL chua mo cong 3306. Hay kiem tra log hoac cau hinh."
  exit 1
}
