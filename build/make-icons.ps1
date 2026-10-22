Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = $PSScriptRoot

function New-Tile($srcPath, $size, $dark) {
  $src = [System.Drawing.Bitmap]::FromFile($srcPath)
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($dark) {
    $r = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc(0, 0, $d, $d, 180, 90); $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90); $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#141518'))), $path)
  }
  $pad = $size * 0.20
  $h = $size - 2 * $pad
  $w = $h * $src.Width / $src.Height
  $g.DrawImage($src, ($size - $w) / 2, $pad, $w, $h)
  $g.Dispose(); $src.Dispose()
  return $bmp
}

function Get-PngBytes($bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  return ,$ms.ToArray()
}

# favicon (logo escuro transparente) e icone do app (logo claro sobre tile escuro)
$fav = New-Tile "$root\ISO2.png" 256 $false
$fav.Save("$out\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$sizes = 256, 128, 64, 48, 32, 16
$imgs = foreach ($s in $sizes) {
  $b = New-Tile "$root\ISO1.png" $s $true
  ,(Get-PngBytes $b)
}
$big = New-Tile "$root\ISO1.png" 512 $true
$big.Save("$out\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$fs = [System.IO.File]::Create("$out\icon.ico")
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $bytes = $imgs[$i]
  $dim = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$bytes.Length); $bw.Write([uint32]$offset)
  $offset += $bytes.Length
}
foreach ($bytes in $imgs) { $bw.Write($bytes) }
$bw.Close(); $fs.Close()
Write-Output "Icones gerados em $out"

