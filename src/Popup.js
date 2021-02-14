/* global chrome */
// import logo from './logo.svg';
// import logo from './icons/gather_one.svg';
import gatherOneIcon from './icons/gather_one.svg';
import gatherAllIcon from './icons/gather_all.svg';
import closeIcon from './icons/close.svg';
import infoIcon from './icons/info.svg';
import './Popup.css';
// import testData from "./testData.json"
import { IDTimeline } from "./idtimeline"
import { useCallback, useEffect, useState } from 'react';


let openedWindowId = null

chrome.windows.getCurrent((window) => {
  openedWindowId = window.id
})

function TabButtons(props) {

  // const windowId = props.windowId
  // const tabId = props.tabId
  const tab = props.tab

  // console.log(props)

  function handleInfoClick(windowId, tabId) {
    // e.preventDefault()
    console.log('The info button was clicked for window ' + windowId + ', ' + tabId)
  }

  const myHandleInfoClick = useCallback(
    () => {
      handleInfoClick(tab.windowId, tab.tabId);
    },
    [tab.windowId, tab.tabId],
  );

  function handleGatherClick(e) {
    e.preventDefault()
    console.log("The gather button was clicked")
    chrome.tabs.move(tab.id, {windowId: openedWindowId, index: -1})
  }

  function handleCloseClick(e) {
    e.preventDefault()
    console.log('The close button was clicked')
    chrome.tabs.remove(tab.id)
  }

  return (
    <div className="TabButtons">
      { tab.windowId !== openedWindowId &&
      <input
        className="TabButtons-icon" type="image" alt="gather"
        src={gatherOneIcon}
        onClick={handleGatherClick}
      />
      }
      <input
        className="TabButtons-icon" type="image" alt="close"
        src={closeIcon}
        onClick={handleCloseClick}
      />
      <input
        className="TabButtons-icon" type="image" alt="info"
        src={infoIcon}
        onClick={myHandleInfoClick}
      />
    </div>
  );
}

function TabLine(props) {
  console.log("props:")
  console.log(props)
  const tab = props.tab.info
  let favIconUrl = null
  console.log("TabLine:")
  console.log(tab)

  if (tab.favIconUrl) {
    favIconUrl = tab.favIconUrl
  } else if (tab.url.startsWith("chrome://")) {
    favIconUrl = "chrome://favicon/" + tab.favIconUrl
  }

  function navigateToTab(e) {
    chrome.tabs.update(tab.id, {active: true})
    chrome.windows.update(tab.windowId, {focused: true})
  }

  return (
    <div className="TabLine">
      <div onClick={navigateToTab}>
        <img className="TabLine-favicon" alt="icon" src={favIconUrl}></img>
      </div>
      <div className="TabLine-title" onClick={navigateToTab}>{tab.title}</div>
      <TabButtons tab={tab}/>
    </div>
  );
}

function TabList(props) {

  const [displayList, setDisplayList] = useState([])

  let lastTimeline = null

  useEffect(() => {
    if (props.tabTimeline !== lastTimeline) {
      // recalc display list
      console.log("useEffect tabData=")
      console.log(props.tabData)
      let dList  = []
      lastTimeline = props.tabTimeline
      for (let i = lastTimeline.length - 1; i >= 0; i--) {
        let tabId = lastTimeline[i]
        // if (props.tabData.hasOwnProperty(tabId)) {
        if (tabId in props.tabData) {
          dList.push(props.tabData[tabId])
        }
      }
      console.log("dList=")
      console.log(dList)
      setDisplayList(dList)
    }
  }, [props.tabTimeline, props.tabData])

  return (
    displayList.map((tab) => TabLine({tab: tab}))
  );
}

var DefaultObjectKey = {
  get: (target, key) => {
    if (!target.hasOwnProperty(key)) {
      target[key] = {}
    }
    return target[key]
  }
}

function Popup() {

  const [tabCount, setTabCount] = useState(0)
  const [windowCount, setWindowCount] = useState(0)
  const [tabTimeline, setTabTimeline] = useState([])
  const [tabData, setTabData] = useState({})
  const [activeWindowId, setActiveWindowId] = useState(0)

  let windows = new Proxy({}, DefaultObjectKey)
  let tabs = new Proxy({}, DefaultObjectKey)
  let tabTL = new IDTimeline()

  useEffect(() => {
    console.log("registering storage handler")
    chrome.storage.onChanged.addListener((changes, namespace) => {
      console.log("changes and namespace")
      console.log(changes)
      console.log(namespace)
      let tabsUpdated = false
      let windowsUpdated = false
      for (const [key, change] of Object.entries(changes)) {
        let prefix = key.substring(0, 2)
        let id = parseInt(key.substring(2))

        if (!("newValue" in change)) {
          if (prefix[0] == "t" && id in tabs) {
            tabTL.remove(id)
            delete tabs[id]
            tabsUpdated = true
          } else if (prefix[0] == "w" && id in windows) {
            delete windows[id]
            windowsUpdated = true
          }
        } else {
          switch (prefix) {
            case "ta":
              tabs[id].lastActive = change.newValue
              if ("oldValue" in change) {
                tabTL.update(id, change.newValue)
              } else {
                tabTL.add(id, change.newValue)
              }
              tabsUpdated = true
              break
            case "tc":
              tabs[id].created = change.newValue
              tabsUpdated = true
              break
            case "ti":
              tabs[id].info = change.newValue
              tabsUpdated = true
              break
            case "tt":
              tabs[id].info.windowId = change.newValue.newWindowId
              tabsUpdated = true
              break
            case "wa":
              windows[id].lastActive = change.newValue
              windowsUpdated = true
              break
            case "wc":
              windows[id].created =change.newValue
              windowsUpdated = true
              break
            case "wi":
              windows[id].info = change.newValue
              windowsUpdated = true
              break
            default:
              console.log(`ERROR: unhandled storage event prefix: ${prefix}`)
          }
        }
      }
      if (tabsUpdated) {
        setTabCount(Object.keys(tabs).length)
        setTabTimeline(tabTL.timeline)
        tabs = {...tabs} // trigger rerender
        setTabData(tabs)
      }
      if (windowsUpdated) {
        setWindowCount(Object.keys(windows).length)
      }
    })
  }, [])

  // Initial load
  useEffect(() => {
    chrome.windows.getCurrent((window) => {
      setActiveWindowId(window.id)
    })
    chrome.storage.local.get((data) => {
      let attaches = []
      for (const [key, value] of Object.entries(data)) {
        let prefix = key.substring(0, 2)
        let id = parseInt(key.substring(2))
        switch (prefix) {
          case "ta":
            tabs[id].lastActive = value
            tabTL.add(id, value)
            break
          case "tc":
            tabs[id].created = value
            break
          case "ti":
            tabs[id].info = value
            break
          case "tt":
            attaches.push({tabId: id, attachInfo: value})
            break
          case "wa":
            windows[id].lastActive = value
            break
          case "wc":
            windows[id].created = value
            break
          case "wi":
            windows[id].info = value
            break
          default:
            console.log(`ERROR: unhandled storage event prefix: ${prefix}`)
        }
      }
      for (let i = 0; i < attaches.length; i++) {
        let tid = attaches[i].tabId
        let wid = attaches[i].attachInfo.newWindowId
        if (tid in tabs && wid != tabs[tid].info.windowId) {
          tabs[tid].info.windowId = wid
        }
      }
      setWindowCount(Object.keys(windows).length)
      setTabCount(Object.keys(tabs).length)
      console.log("setTabTimeLine=>")
      console.log(tabTL.timeline)
      setTabTimeline(tabTL.timeline)
      console.log("tabs=")
      console.log(tabs)
      setTabData(tabs)
    })
  }, [])

  return (
    <div className="Popup">
      <header className="Popup-header">
        <div className="Result-counts">
        {tabCount} tab{tabCount > 1 ? "s" : ""}, {windowCount} window{windowCount > 1 ? "s" : ""}
        </div>
        <div>
          <input type="image" className="Popup-button-icon"
          title="Gather result tabs to this window" alt="G"
          src={gatherAllIcon}
          />
        </div>
        <div>
          <input type="text"
          placeholder="Search Titles and URLs"
          />
        </div>
      </header>
      <div>
        <TabList tabData={tabData} tabTimeline={tabTimeline} activeWindowId={activeWindowId}/>
      </div>
    </div>
  );
}

export default Popup;
