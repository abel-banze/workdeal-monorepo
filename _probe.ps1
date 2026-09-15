$ErrorActionPreference = "SilentlyContinue"
$root = "C:\Users\COIN-\OneDrive\Desktop\projects\workdeal-monorepo"
$web = "$root\apps\web"

function Skip-NM { param([string]$p) return $p -notmatch "\\node_modules\\" }

Write-Output "=== 1) ONDE o AiAssistantPanel/ai-assistant-panel e aberto (import/usado) ==="
Get-ChildItem -Recurse -Path "$web\app","$web\components" -Include *.tsx,*.ts |
  Select-String -Pattern "AiAssistantPanel|ai-assistant-panel" |
  Where-Object { Skip-NM $_.Path } |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Replace("$web\",""), $_.LineNumber, $_.Line.Trim() } |
  Select-Object -First 30

Write-Output ""
Write-Output "=== 2) existe Bell/Notificacoes ja no dashboard (glyph) ==="
Get-ChildItem -Recurse -Path "$web\app","$web\components" -Include *.tsx,*.ts |
  Select-String -Pattern "BellIcon|BellRingIcon|NotificationsIcon|NotificationBell" |
  Where-Object { Skip-NM $_.Path } |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Replace("$web\",""), $_.LineNumber, $_.Line.Trim() } |
  Select-Object -First 20

Write-Output ""
Write-Output "=== 3) existe widget do agente/assistant ja (botao com nome 'Agente'/'Agent') ==="
Get-ChildItem -Recurse -Path "$web\app","$web\components" -Include *.tsx,*.ts |
  Select-String -Pattern "AgentButton|AgentIcon|BotIcon|SparklesIcon|assistant-widget|agent-widget" |
  Where-Object { Skip-NM $_.Path } |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path.Replace("$web\",""), $_.LineNumber, $_.Line.Trim() } |
  Select-Object -First 20

Write-Output ""
Write-Output "=== 4) AppSidebar atual: grupo que contem Painel/Perfil/Guardados/Indicacoes/Definicoes (o 'menu') ==="
Get-Content "$web\components\app-sidebar.tsx" | Select-Object -First 20