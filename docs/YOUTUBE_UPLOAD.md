# YouTube full-lesson publication record

The complete, approximately six-minute lesson is published as [AI Agent Tool Use Explained | Codex Study Studio — Full Lesson](https://www.youtube.com/watch?v=aLF_IylZ3y8). The 15-second MP4 and animated GIF remain available from the repository and showcase as lightweight previews.

## Published assets

- Full video source: [`Lecture.mp4`](../examples/ai-agents-tool-use/Chapter%2004%20-%20Tool%20Use/Lecture.mp4)
- English captions: [`Lecture.srt`](../examples/ai-agents-tool-use/Chapter%2004%20-%20Tool%20Use/Lecture.srt)
- YouTube URL: <https://www.youtube.com/watch?v=aLF_IylZ3y8>
- Source-file duration: 356.080408 seconds. YouTube Studio rounds the listing to 5:57, while the public player displays 5:56.
- Language: English (`en-US` synthetic narration)
- Source revision: Microsoft AI Agents for Beginners, lesson 04, commit `f09e94ffe170f8af6d3db7c42987bbe4db227723`

The upload title, description, tags, language and source checksum were prepared from `.local/youtube-full-metadata.json`; the full description and ten verified chapter timestamps were prepared from `.local/youtube-full-description.txt`. Those local files are release-working records and are intentionally excluded from the public repository.

## Maintenance

When replacing the full lesson, verify the source video and captions together, retain the Microsoft MIT attribution and independent-project statement, and keep the synthetic-narration disclosure. Update the YouTube URL in:

1. `README.md` and `README.zh-CN.md`;
2. the `YOUTUBE` constant in `scripts/build_showcase.py`, then rebuild `docs/index.html` and `docs/zh.html`;
3. the example delivery record and public verification evidence.

Do not replace the local 15-second preview links with a remote embed. The static showcase deliberately avoids loading third-party YouTube resources until a visitor chooses the complete lesson link.

## 中文维护说明

约 6 分钟的完整课程已发布至 [YouTube](https://www.youtube.com/watch?v=aLF_IylZ3y8)。原文件实际时长为 356.080408 秒；YouTube Studio 列表取整显示 5:57，公开播放器显示 5:56。15 秒 MP4 与动图继续作为轻量预览保留在仓库和首页。后续替换完整视频时，应同步核对字幕、保留 Microsoft MIT 来源与独立项目说明，并继续披露 `en-US` 合成配音。首页不嵌入远程播放器，只有用户主动点击完整课程链接时才会访问 YouTube。
