console.log("background script ran!")

// Storage Model
//
// The background script monitors the window and tab states and updates
// storage.local with new info.  To avoid complex objects, the script writes
// a flat structure to storage, with a key for each date type, for example:
// "wi123" - Window info for windowId 123
// "wc123" - Window created timestamp for windowId 123
// "wa123" - Window last accessed timestamp for windowId 123
// "ti321" - Tab info for tabId 321
// "tc321" - Tab created timestamp for tabId 321
// "ta321" - Tab last accessed timestamp for tabId 321
//
// This uses a write-only mechanism to avoid the read/mod/write races that
// arise with multiple events firing, and issues with Chrome preempting
// an event handler in the middle of its "mod" state with another
// read/mod/write event handler.

chrome.runtime.onInstalled.addListener(async () => {
    console.log("onInstalled called!")

    chrome.storage.local.clear()

    // Scan existing tabs...
    chrome.windows.getAll((windows) => {
        console.log("browser promise api")
        console.log(windows)

        Object.values(windows).map(async (window) => {
            console.log(`querying window ${window.id}`)
            let wts = Date.now()
            let wWrite = {[`wc${window.id}`]: wts, [`wa${window.id}`]: wts, [`wi${window.id}`]: window}
            chrome.storage.local.set(wWrite)
            chrome.tabs.query({windowId: window.id}, (tabs) => {
                let ts = Date.now()
                let tWrite = {}
                console.log(tabs)
                for (const tab of Object.values(tabs)) {
                    tWrite[[`tc${tab.id}`]] = ts
                    tWrite[[`ta${tab.id}`]] = ts
                    tWrite[[`ti${tab.id}`]] = tab
                }
                chrome.storage.local.set(tWrite, () => {
                    console.log(`Wrote onInstalled tabs for window ${window.id}`)
                })
            })
        })
    })
})

chrome.tabs.onCreated.addListener((tab) => {
    console.log("onCreated called @ " + Date.now())
    console.log(tab)
    let ts = Date.now()
    let tWrite = {}
    tWrite[[`tc${tab.id}`]] = ts
    tWrite[[`ta${tab.id}`]] = ts
    tWrite[[`ti${tab.id}`]] = tab
    chrome.storage.local.set(tWrite, () => {
        console.log("Wrote created tab " + tab.id)
    })
})

chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log("onActivated called @ " + Date.now())
    console.log(activeInfo)

    chrome.storage.local.set({[`ta${activeInfo.tabId}`]: Date.now()}, () => {
        console.log(`Wrote activated tab ${activeInfo.tabId}`)
    })
})

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    console.log("onAttached called @ " + Date.now())
    console.log(attachInfo)

    chrome.storage.local.set({[`tt${tabId}`]: attachInfo}, () => {
        console.log(`Wrote attached tab ${tabId} to window ${attachInfo.windowId}`)
    })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log("onUpdate called!")
    console.log(tabId)
    console.log(changeInfo)
    console.log(tab)

    let tWrite = {}
    tWrite[[`ti${tab.id}`]] = tab
    chrome.storage.local.set(tWrite, () => {
        console.log(`Wrote updated tab ${tab.id}`)
    })
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log("onRemoved called!")
    console.log(tabId)
    console.log(removeInfo)

    let removeKeys = [`ti${tabId}`, `ta${tabId}`, `tc${tabId}`]
    chrome.storage.local.remove(removeKeys, () => {
        console.log(`Removed tab ${tabId}`)
    })
})

chrome.windows.onCreated.addListener((window) => {
    console.log("window.onCreated called @ " + Date.now())
    console.log(window.id)

    let wts = Date.now()
    let wWrite = {[`wc${window.id}`]: wts, [`wa${window.id}`]: wts, [`wi${window.id}`]: window}
    chrome.storage.local.set(wWrite, () => {
        console.log(`Window created: ${window.id}`)
    })
})

chrome.windows.onRemoved.addListener((windowId) => {
    console.log("window.onRemoved called @ " + Date.now())
    console.log(window.id)

    let removeKeys = [`wc${window.id}`, `wa${window.id}`, `wi${window.id}`]
    chrome.storage.local.remove(removeKeys, () => {
        console.log(`Window removed: ${windowId}`)
    })
})

chrome.windows.onFocusChanged.addListener((windowId) => {
    console.log("window.onFocusChanged called @ " + Date.now())
    console.log(windowId)
    chrome.storage.local.set({[`wa${windowId}`]: Date.now()}, () => {
        console.log(`Window activated set for ${windowId}`)
    })
})
