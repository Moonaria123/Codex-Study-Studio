param([Parameter(Mandatory=$true)][ValidateSet('render', 'audio')][string]$Stage, [Parameter(Mandatory=$true)][string]$Course)
$ErrorActionPreference = 'Stop'
$mediaRepo = Split-Path -Parent $PSScriptRoot
$mediaCourse = if ([IO.Path]::IsPathRooted($Course)) { $Course } else { Join-Path (Join-Path $mediaRepo 'examples') $Course }
$mediaCourse = [IO.Path]::GetFullPath($mediaCourse)
$mediaManifest = Get-Content -LiteralPath (Join-Path $mediaCourse '_studio\slide-content.json') -Raw | ConvertFrom-Json
if (-not $mediaManifest.chapter_dir) { throw 'Set chapter_dir in slide-content.json.' }
$mediaChapter = [IO.Path]::GetFullPath((Join-Path $mediaCourse $mediaManifest.chapter_dir))
$mediaCoursePrefix = $mediaCourse.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $mediaChapter.StartsWith($mediaCoursePrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'chapter_dir must remain inside the selected course.' }
$mediaRender = Join-Path $mediaCourse '_studio\render'
if ($Stage -eq 'render') {
    $mediaPowerPoint = New-Object -ComObject PowerPoint.Application
    $mediaPresentation = $null
    try {
        $mediaPresentation = $mediaPowerPoint.Presentations.Open((Join-Path $mediaChapter 'Lecture.pptx'), -1, 0, 0)
        $mediaSlidesPath = Join-Path $mediaRender 'slides'
        New-Item -ItemType Directory -Path $mediaSlidesPath -Force | Out-Null
        foreach ($mediaSlide in $mediaPresentation.Slides) {
            $mediaSlide.Export((Join-Path $mediaSlidesPath ('Slide{0}.PNG' -f $mediaSlide.SlideIndex)), 'PNG', 1920, 1080)
        }
        $mediaPresentation.SaveAs((Join-Path $mediaChapter 'Lecture.pdf'), 32)
        Write-Output ('Rendered {0} slides through Microsoft PowerPoint.' -f $mediaPresentation.Slides.Count)
    } finally {
        if ($null -ne $mediaPresentation) { $mediaPresentation.Close() }
        $mediaPowerPoint.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($mediaPowerPoint) | Out-Null
    }
} else {
    Add-Type -AssemblyName System.Speech
    $mediaPlan = Get-Content -LiteralPath (Join-Path $mediaRender 'audio-plan.json') -Raw | ConvertFrom-Json
    $mediaSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $mediaSpeaker.SelectVoice($mediaPlan.voice)
        $mediaSpeaker.Rate = $mediaPlan.rate
        foreach ($mediaSlide in $mediaPlan.slides) {
            foreach ($mediaClip in $mediaSlide.clips) {
                $mediaSpeaker.SetOutputToWaveFile((Join-Path $mediaRender $mediaClip.wav))
                $mediaSpeaker.Speak([string]$mediaClip.text)
                $mediaSpeaker.SetOutputToNull()
            }
            Write-Output ('Synthesised {0} ({1} segments).' -f $mediaSlide.id, $mediaSlide.clips.Count)
        }
    } finally { $mediaSpeaker.Dispose() }
}
