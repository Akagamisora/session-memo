import type { EngineInterface, Register } from 'claude-code'

type Note = { text: string; at: number }

const PANE = 'memo'

// 今のセッションのメモ。リロードで消えるので、正は $.store 側に置く
let notes: Note[] = []
let loadedFor: string | undefined

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (ms: number) => {
  const d = new Date(ms)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}
const ymd = (ms: number) => {
  const d = new Date(ms)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// セッション ID ごとに保存しているメモを読む。/resume で ID が変わったら読み直す
async function load($: EngineInterface): Promise<string> {
  const id = await $.session.id()
  if (loadedFor === id) return id
  const saved = await $.store.get('notes:' + id)
  notes = Array.isArray(saved) ? (saved as Note[]) : []
  loadedFor = id
  return id
}

async function persist($: EngineInterface, id: string): Promise<void> {
  if (notes.length === 0) await $.store.delete('notes:' + id)
  else await $.store.set('notes:' + id, notes)
  $.ui.invalidate('ui.render')
}

async function add($: EngineInterface, text: string): Promise<void> {
  const id = await load($)
  notes = [...notes, { text, at: await $.clock.now() }]
  await persist($, id)
}

async function removeAt($: EngineInterface, index: number): Promise<void> {
  const id = await load($)
  notes = notes.filter((_, i) => i !== index)
  await persist($, id)
}

async function clear($: EngineInterface): Promise<void> {
  const id = await load($)
  notes = []
  await persist($, id)
}

// ~/claude-memos/<日付>-<セッション ID の先頭 8 文字>.md に書き出す
async function exportFile($: EngineInterface): Promise<string> {
  const id = await load($)
  const now = await $.clock.now()
  const cwd = await $.session.cwd()
  const home = (await $.env.get('HOME')) ?? cwd
  const path = home + '/claude-memos/' + ymd(now) + '-' + id.slice(0, 8) + '.md'
  const lines = notes.map(note => '- ' + hhmm(note.at) + ' ' + note.text)
  await $.fs.write(
    path,
    '# メモ ' + ymd(now) + '\n\n' +
      '- セッション: ' + id + '\n' +
      '- 作業フォルダ: ' + cwd + '\n\n' +
      lines.join('\n') + '\n',
  )
  return path
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'memo',
      description: 'このセッションのメモ帳を開く。/memo <文> でそのまま追記',
      argumentHint: '[文 | list | save | clear]',
      immediate: true,
    })
    await load($)

    return next(e)
  })

  on('command.run', { command: 'memo' }, async ($, e) => {
    const arg = e.args.trim()
    await load($)

    if (arg === 'list') {
      if (notes.length === 0) return { text: 'メモはまだありません。' }
      return { text: notes.map(note => hhmm(note.at) + ' ' + note.text).join('\n') }
    }
    if (arg === 'save') {
      if (notes.length === 0) return { text: '保存するメモがありません。' }
      return { text: '保存しました: ' + (await exportFile($)) }
    }
    if (arg === 'clear') {
      const count = notes.length
      await clear($)
      return { text: count + ' 件のメモを消しました。' }
    }
    if (arg) {
      await add($, arg)
      return { text: 'メモしました(' + notes.length + ' 件)' }
    }

    const opened = await $.ui.open({ id: PANE, title: 'メモ', focus: true, closeOnEscape: true })
    if (opened.isPlaced) return {}
    // ペインを置けないときは一覧を文字で返す
    return {
      text: notes.length === 0
        ? 'メモはまだありません。/memo <文> で追記できます。'
        : notes.map(note => hhmm(note.at) + ' ' + note.text).join('\n'),
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    await load($)

    return (
      <Box flexDirection="column">
        <Input
          key="new"
          label="メモ"
          placeholder="書いて Enter(Claude には送られません)"
          value=""
          submitLabel="追加"
          autoFocus
          onSubmit={async value => {
            if (value.trim()) await add($, value.trim())
          }}
        />
        {notes.length === 0 && <Text dimColor>まだメモはありません。</Text>}
        {notes.map((note, i) => (
          <Box flexDirection="row" columnGap={1}>
            <Button key={'delete-' + i} label="x" plain onPress={() => removeAt($, i)} />
            <Text dimColor>{hhmm(note.at)}</Text>
            <Text>{note.text}</Text>
          </Box>
        ))}
        {notes.length > 0 && (
          <Box flexDirection="row" columnGap={2} marginTop={1}>
            <Button
              key="save"
              label="ファイルに保存"
              onPress={async () => {
                $.ui.toast('メモを保存: ' + (await exportFile($)))
              }}
            />
            <Button key="clear" label="全部消す" onPress={() => clear($)} />
          </Box>
        )}
      </Box>
    )
  })
}
