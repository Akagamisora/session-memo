import { expect, mock, test } from 'claude-code/testing'

test('/memo でメモを足して、一覧して、消せる', async ($, on) => {
  mock.store(on)
  // セッション ID はエンジンが答えるものなので、テストが代わりに答える
  on('session.id', () => ({ value: 'test-session' }))
  mock.clock(on, { now: Date.UTC(2026, 9, 3, 3, 0) })

  const first = await $.command.run({ command: 'memo', args: 'retry は 3 回まで' })
  expect(first.text).toBe('メモしました(1 件)')
  const second = await $.command.run({ command: 'memo', args: ' 型定義は手元が正 ' })
  expect(second.text).toBe('メモしました(2 件)')

  const list = await $.command.run({ command: 'memo', args: 'list' })
  expect(list.text).toContain('retry は 3 回まで')
  expect(list.text).toContain('型定義は手元が正')

  const cleared = await $.command.run({ command: 'memo', args: 'clear' })
  expect(cleared.text).toBe('2 件のメモを消しました。')
  const empty = await $.command.run({ command: 'memo', args: 'list' })
  expect(empty.text).toBe('メモはまだありません。')
})

test('ペインの入力欄から足して、x で消せる', async ($, on) => {
  mock.store(on)
  // セッション ID はエンジンが答えるものなので、テストが代わりに答える
  on('session.id', () => ({ value: 'test-session' }))
  mock.clock(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'session-memo',
      surface,
      component: 'Pane',
      requestId: 'memo',
      props: { title: 'メモ', isFocused: true, bodyColumns: 60, placement: 'dock' },
    })
    await ui.input({ key: 'new', text: 'あとで README を直す' })
    expect(await ui.find({ type: 'Text', text: /README を直す/ })).toBeDefined()

    await ui.press({ key: 'delete-0' })
    expect(await ui.find({ type: 'Text', text: /まだメモはありません/ })).toBeDefined()
    await ui.unmount()
  }
})

test('「送る」でメモを Claude に送り、送ったメモは消える', async ($, on) => {
  mock.store(on)
  on('session.id', () => ({ value: 'test-session' }))
  mock.clock(on)
  const sent: string[] = []
  on('prompt.submit', (_, e) => {
    sent.push(e.text)
    return { text: e.text }
  })

  const ui = await $.ui.mount({
    plugin: 'session-memo',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'memo',
    props: { title: 'メモ', isFocused: true, bodyColumns: 60, placement: 'dock' },
  })
  await ui.input({ key: 'new', text: 'テストも足して' })
  await ui.input({ key: 'new', text: 'README を直して' })
  await ui.press({ key: 'send-0' })

  expect(sent).toEqual(['テストも足して'])
  expect(await ui.find({ type: 'Text', text: /テストも足して/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /README を直して/ })).toBeDefined()
  await ui.unmount()
})

test('件数をステータス行に出し、0 件になったら消す', async ($, on) => {
  mock.store(on)
  on('session.id', () => ({ value: 'test-session' }))
  mock.clock(on)
  const shown: (string | undefined)[] = []
  on('ui.status', (_, e) => {
    shown.push(e.text)
    return {}
  })

  await $.command.run({ command: 'memo', args: '一つめ' })
  await $.command.run({ command: 'memo', args: '二つめ' })
  await $.command.run({ command: 'memo', args: 'clear' })

  expect(shown.slice(-3)).toEqual(['メモ 1 件', 'メモ 2 件', undefined])
})
