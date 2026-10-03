# Changelog

## 0.1.0 - 2026-10-03

- `/memo` でメモのペインを開く。入力欄に書いて Enter で追加、`x` で 1 件削除
- `/memo <文>` でペインを開かずに追記。`/memo list` / `save` / `clear`
- メモはセッション ID ごとに保存し、`/resume` で再開しても残る
- `~/claude-memos/<日付>-<セッション ID の先頭 8 文字>.md` への書き出し
