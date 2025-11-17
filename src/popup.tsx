function IndexPopup() {
  const openSettings = () => {
    const api: any = (globalThis as any).chrome ?? (globalThis as any).browser
    try {
      if (api?.tabs?.query && api?.tabs?.sendMessage) {
        api.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          const tabId = tabs?.[0]?.id
          if (tabId) {
            api.tabs.sendMessage(tabId, {
              type: 'utags-advanced-filter:show-settings',
            })
            try {
              window.close()
            } catch {}
          }
        })
      }
    } catch {
      // ignore
    }

    // Fallback: close popup even if messaging is unavailable
    try {
      window.close()
    } catch {}
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
        width: '300px',
      }}>
      <h1>UTags Advanced Filter</h1>
      <button onClick={openSettings} style={{ marginTop: 8, marginBottom: 20 }}>
        设置
      </button>
      <footer>
        Made with ❤️ by{' '}
        <a href="https://www.pipecraft.net/" target="_blank">
          Pipecraft
        </a>
      </footer>
    </div>
  )
}

export default IndexPopup
