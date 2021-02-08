console.log("background script ran!")

// Database Model
// tabs: {tabId: TabData}
// TabData: {
//      tabInfo: TabInfo(Chrome),
//      tabLastActivated: int,
//      tabCreated: int
// }
// tabTimeline: [tabId, tabId, ...]
// windowIds: {windowId: true} // json "set"
// activeWindowId: Number // the active window Id

const dbWriteLockBuf = new SharedArrayBuffer(4)
const dbWriteLock = new Uint8Array(dbWriteLockBuf)

dbWriteLock[0] = 0
dbWriteLock[1] = 0
dbWriteLock[2] = 0
dbWriteLock[3] = 0

/**
 * forceLock attempts to spinlock to acquire the lock for maxWAit milliseconds, and
 * after that it assumes the lock regardless.  This favors progress over consistency
 * with a "reasonable effort" locking model.
 * @param {Number} maxWait Maximum time in ms to wait for the lock before acquiring the lock.
 * @returns {Boolean}    true if lock was acquired without forcing, false if the timeout was hit.
 */
function forceLock(maxWait=2000) {
    let t0 = window.performance.now()
    let timeout = false
    let ret = 1
    // while (0 != Atomics.compareExchange(dbWriteLock, 0, 0, 1)) {
    while (ret != 0) {
        ret = Atomics.compareExchange(dbWriteLock, 0, 0, 1)
        if (window.performance.now() - t0 >= maxWait) {
            timeout = true
            console.log(`forceLock timed out, ret = ${ret}`)
            break
        }
        sleep(1)
    }
    let tl = window.performance.now() - t0
    console.log(`forceLock took ${tl} ms`)
    return !timeout
}

/**
 * unlock releases the lock, regardless of what thread owns it.
 */
function unlock() {
    console.log("unlocking")
    Atomics.store(dbWriteLock, 0, 0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

chrome.runtime.onInstalled.addListener(async () => {
    console.log("onInstalled called!")
    // chrome.storage.local.set({tabs: {}, tabTimeLine: [], windowIds: {}}, function () {
    //     console.log("Reset storage.")
    // })

    let data = {
        tabs: {},
        tabTimeLine: [],
        windowIds: {},
        activeWindowId: null,
    }

    // Scan existing tabs...
    await browser.windows.getAll().then(async (windows) => {
        console.log("browser promise api")
        console.log(windows)

        await Promise.all(
            Object.values(windows).map(async (window) => {
                console.log(`querying window ${window.id}`)
                await browser.tabs.query({windowId: window.id}).then(tabs => {
                    let ts = Date.now()
                    console.log(data)
                    data.windowIds[window.id] = true
                    for (const tab of Object.values(tabs)) {
                        let tInfo = {
                            tabInfo: tab,
                            tabCreated: ts,
                            tabLastActivated: ts,
                        }
                        data.tabTimeLine.push(tab.id)
                        data.tabs[tab.id] = tInfo
                    }
                })
                console.log(`done awaiting querying window ${window.id}`)
            })
        )
    })

    console.log("writing data to storage")
    console.log(data)
    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    // await browser.storage.local.set(data, () => {
    await browser.storage.local.set(data).then(() => {
        // unlock()
        let tc = Object.keys(data.tabs).length
        let wc = Object.keys(data.windowIds).length
        console.log(`Wrote loaded tabs: tab count = ${tc}, window count = ${wc}`)
    })
})

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("onCreated called @ " + Date.now())
    let ts = Date.now()
    let tInfo = {
        tabInfo: tab,
        tabCreated: ts,
        tabLastActivated: ts,
    }
    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    await browser.storage.local.get().then(async (data) => {
        if (data.tabs.hasOwnProperty(tab.id)) {
            // unlock()
            return
        }
        data.tabTimeLine.push(tab.id)
        data.tabs[tab.id] = tInfo
        await browser.storage.local.set(data).then(() => {
            // unlock()
            console.log("Wrote created tab " + tab.id)
        })
    })
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("onActivated called @ " + Date.now())
    console.log(activeInfo)
    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    browser.storage.local.get().then(async (data) => {
        let tInfo = data.tabs[activeInfo.tabId]
        if (!tInfo) {
            return
        }
        tInfo.tabLastActivated = Date.now()
        let tabIdIndex = data.tabTimeLine.indexOf(activeInfo.tabId)
        if (tabIdIndex != -1) {
            data.tabTimeLine.splice(tabIdIndex, 1)
        }
        data.tabTimeLine.push(activeInfo.tabId)
        browser.storage.local.set(data).then(() => {
            // unlock()
            console.log("Wrote activated tab " + activeInfo.tabId)
        })
    })
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log("onUpdate called!")
    console.log(tabId)
    console.log(changeInfo)
    console.log(tab)

    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    browser.storage.local.get().then(async (data) => {
        if (!data.tabs.hasOwnProperty(tabId)) {
            data.tabTimeLine.push(tab.id)
            let ts = Date.now()
            let tInfo = {
                tabInfo: tab,
                tabCreated: ts,
                tabLastActivated: ts,
            }
            data.tabs[tabId] = tInfo
        } else {
            data.tabs[tabId].tabInfo = tab
        }
        browser.storage.local.set(data).then(() => {
            // unlock()
            console.log("Wrote updated tab " + tabId)
        })
    })
})

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    console.log("onRemoved called!")
    console.log(tabId)
    console.log(removeInfo)

    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    browser.storage.local.get().then(async (data) => {
        delete data.tabs[tabId]
        let tabIdIndex = data.tabTimeLine.indexOf(tabId)
        if (tabIdIndex != -1) {
            data.tabTimeLine.splice(tabIdIndex, 1)
        }
        browser.storage.local.set(data).then(() => {
            // unlock()
            console.log("Wrote removed tab " + tabId)
        })
    })
})

chrome.windows.onCreated.addListener(async (window) => {
    console.log("window.onCreated called @ " + Date.now())
    console.log(window.id)
    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    browser.storage.local.get(["windowIds"]).then(async (data) => {
        data.windowIds[window.id] = true
        browser.storage.local.set({"windowIds": data.windowIds}).then(() => {
            // unlock()
            console.log(`Added windowId ${window.id}`)
        })
    })
})

chrome.windows.onRemoved.addListener(async (windowId) => {
    console.log("window.onCreated called @ " + Date.now())
    console.log(window.id)
    // if (!forceLock()) {
    //     console.log("forceLock timed out, ignoring lock")
    // }
    browser.storage.local.get(["windowIds"]).then(async (data) => {
        data.windowIds[window.id] = true
        browser.storage.local.set({"windowIds": data.windowIds}).then(() => {
            // unlock()
            console.log(`Added windowId ${window.id}`)
        })
    })
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    console.log("window.onFocusChanged called @ " + Date.now())
    console.log(windowId)
    browser.storage.local.set({"activeWindowId": windowId}).then((data) => {
        console.log(`Wrote windowId ${windowId}`)
    })
})
