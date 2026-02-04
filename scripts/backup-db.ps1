# 家庭健康管理平台 - 数据库自动备份脚本
# 用法: powershell -ExecutionPolicy Bypass -File backup-db.ps1

$ProjectDir = "D:\Workspace\familyHealthManager"
$BackupDir = "$ProjectDir\backups"
$ComposeFile = "$ProjectDir\docker-compose.yml"
$EnvFile = "$ProjectDir\.env.docker"
$MaxBackups = 12  # 最多保留 12 个备份（约 3 个月）

# 创建备份目录
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 生成备份文件名（按日期）
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\health_backup_$Date.sql"
$LogFile = "$BackupDir\backup.log"

# 记录日志
function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp - $Message" | Out-File -Append -FilePath $LogFile -Encoding UTF8
    Write-Host "$Timestamp - $Message"
}

Write-Log "===== 开始备份 ====="

# 检查 Docker 是否运行
$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "错误: Docker 未运行，跳过备份"
    exit 1
}

# 检查数据库容器是否运行
$DbState = docker compose -f $ComposeFile --env-file $EnvFile ps db --format '{{.State}}' 2>&1
if ($DbState -ne "running") {
    Write-Log "错误: 数据库容器未运行（状态: $DbState），跳过备份"
    exit 1
}

# 执行备份
Write-Log "正在导出数据库..."
# 使用 cmd /c 避免 PowerShell 的 UTF-16 编码问题
cmd /c "docker compose -f `"$ComposeFile`" --env-file `"$EnvFile`" exec -T db pg_dump -U postgres familyHealthManager > `"$BackupFile`" 2>&1"

if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile) -and (Get-Item $BackupFile).Length -gt 0) {
    $Size = [math]::Round((Get-Item $BackupFile).Length / 1KB, 1)
    Write-Log "备份成功: health_backup_$Date.sql ($Size KB)"
} else {
    Write-Log "错误: 备份失败"
    if (Test-Path $BackupFile) { Remove-Item $BackupFile }
    exit 1
}

# 清理旧备份（只保留最近 N 个）
$Backups = Get-ChildItem "$BackupDir\health_backup_*.sql" | Sort-Object Name -Descending
if ($Backups.Count -gt $MaxBackups) {
    $ToDelete = $Backups | Select-Object -Skip $MaxBackups
    foreach ($File in $ToDelete) {
        Remove-Item $File.FullName
        Write-Log "已删除旧备份: $($File.Name)"
    }
}

Write-Log "===== 备份完成 ====="
