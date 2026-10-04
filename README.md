# session-memo

Claude Code の mod。今のセッションに紐づくメモ帳をペインに出す。メモを書いてもターンは始まらず、Claude には送られない。Claude の作業中でも書ける。

mod は Claude Code v2.1.287 以降で動く。動作確認は v2.1.288(macOS、Ghostty)。

## 入れ方

このリポジトリ自体がマーケットプレイスになっている。

```bash
claude plugin marketplace add Akagamisora/session-memo
claude plugin install session-memo@session-memo
```

入れずに 1 セッションだけ試すなら、clone して `--plugin-dir` で読み込む。

```bash
git clone https://github.com/Akagamisora/session-memo
claude --plugin-dir session-memo
```

mod は本人の権限で動く。入れる前に `claude plugin validate session-memo` で、どのイベントに割り込み、どの API を呼ぶかを確認できる。

## 使い方

| 操作 | 動き |
| :- | :- |
| `/memo` | メモのペインを開く。入力欄に書いて Enter で追加 |
| `/memo <文>` | ペインを開かずに追記 |
| `/memo list` | 一覧を表示 |
| `/memo save` | Markdown ファイルに書き出す |
| `/memo clear` | このセッションのメモを全部消す |

ペインでは各行の `x` で 1 件削除、下のボタンで「ファイルに保存」「全部消す」。

各行の「送る」を押すと、そのメモを自分の言葉として Claude に送り、ターンが始まった時点でメモを消す。Claude の作業中に書き留めておいて、あとで頼む、という使い方ができる。作業中に押した場合は、Claude の手が空くまで「送信待ち」と表示される。`@ファイル` の展開は効かない。

メモが 1 件以上あるあいだは、プロンプト下のステータス行に件数が出る。

メモはセッション ID ごとにプラグインのストア(`~/.claude/plugins/store/` 配下)へ保存するので、`/resume` で再開しても残る。別のセッションには出てこない。

## この mod が触る範囲

- 読む: 環境変数 `HOME`、セッション ID、作業フォルダのパス
- 書く: プラグインのストア、`~/claude-memos/<日付>-<セッション ID の先頭 8 文字>.md`(保存を押したときだけ)
- 送る: 「送る」を押したメモの本文を、プロンプトとして Claude に送る
- それ以外のモデルの呼び出し、通信、プロセスの起動はしない

## 開発

```bash
claude --plugin-dir .     # 読み込んで起動。ファイルを保存すると再読み込みされる
claude plugin validate .  # フックと API 呼び出しの一覧
claude plugin test .      # テスト
```

mod を変えたら、同じ変更の中で `.claude-plugin/plugin.json` の `version` と `CHANGELOG.md` を更新する。インストール済みのコピーはバージョン単位で保存されるので、バージョンを上げないと更新が届かない。

## ライセンス

MIT
