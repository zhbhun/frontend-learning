
```
m4a: {
  args: "-vn -c:a aac -b:a 192k".trim().split(" "),
  title: "AAC",
  blurb: "Modern audio format, good quality and compression. .m4a",
  extension: ".m4a",
  mimeType: "audio/m4a"
},
mp3: {
  args: "-vn -c:a libmp3lame -q:a 2".trim().split(" "),
  title: "MP3",
  blurb: "Widely compatible, good quality.",
  extension: ".mp3",
  mimeType: "audio/mpeg"
}
medium: {
  args: "-c:v libx264 -tag:v avc1 -movflags faststart -crf 30 -preset superfast".trim().split(" "),
  title: "Medium",
  blurb: "Balanced quality, size, and speed."
},
high: {
  args: "-c:v libx264 -tag:v avc1 -movflags faststart -crf 23 -preset fast".trim().split(" "),
  title: "High",
  blurb: "Sharper image, larger file, and a slower process."
},
low: {
  args: "-c:v libx264 -tag:v avc1 -movflags faststart -crf 40 -preset ultrafast".trim().split(" "),
  title: "Low",
  blurb: "Fastest process, smallest file, lowest quality. Great for messages."
}

ffmpeg -i input.mp4 -c:v libx264 -tag:v avc1 -movflags faststart -crf 30 -preset superfast output.mp4

ffmpeg -i input.mp4 -c:v libx264 -tag:v avc1 -movflags faststart -crf 23 -preset fast output.mp4
```

