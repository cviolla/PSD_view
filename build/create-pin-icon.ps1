Add-Type -AssemblyName System.Drawing

$size = 24
$bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Desenha ícone de Pushpin estilizado moderno (estilo Windows/Segoe Fluent)
# Transladar e rotacionar para ficar a 45 graus com agulha para o canto inferior esquerdo
$state = $g.Save()
$g.TranslateTransform(12.0, 12.0)
$g.RotateTransform(45.0)

$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 0, 0))
$pen = New-Object System.Drawing.Pen $brush, 1.8
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

# Agulha (ponta inferior)
$g.DrawLine($pen, 0.0, 3.5, 0.0, 10.5)

# Base do alfinete (barra horizontal)
$g.FillRectangle($brush, -4.5, 2.0, 9.0, 2.0)

# Corpo cônico do alfinete
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddLine(-3.0, 2.0, -1.8, -4.5)
$path.AddLine(-1.8, -4.5, 1.8, -4.5)
$path.AddLine(1.8, -4.5, 3.0, 2.0)
$path.CloseFigure()
$g.FillPath($brush, $path)
$path.Dispose()

# Cabeça do alfinete (topo)
$g.FillRectangle($brush, -4.0, -6.5, 8.0, 2.2)

$pen.Dispose()
$brush.Dispose()
$g.Restore($state)
$g.Dispose()

$targetPath = Join-Path (Split-Path -Parent $PSScriptRoot) "icons\Pin.png"
$bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Pin.png atualizado em $targetPath"
