/* global chrome */
// import logo from './logo.svg';
// import logo from './icons/gather_one.svg';
import gatherOneIcon from './icons/gather_one.svg';
import gatherAllIcon from './icons/gather_all.svg';
import closeIcon from './icons/close.svg';
import sortByAccessedIcon from './icons/sort_by_accessed.svg';
import sortByAlphaIcon from './icons/sort_by_alpha.svg';
// import infoIcon from './icons/info.svg';
import './Popup.css';
// import testData from "./testData.json"
import { IDTimeline } from "./idtimeline"
import { useCallback, useEffect, useState } from 'react';
import { IDAlpha } from './idalpha';
// import InlineSVG from 'svg-inline-react';


let openedWindowId = null

chrome.windows.getCurrent((window) => {
  openedWindowId = window.id
})

function TabButtons(props) {

  const tab = props.tab

  // function handleInfoClick(windowId, tabId) {
  //   // e.preventDefault()
  //   console.log('The info button was clicked for window ' + windowId + ', ' + tabId)
  // }

  // const myHandleInfoClick = useCallback(
  //   () => {
  //     handleInfoClick(tab.windowId, tab.tabId);
  //   },
  //   [tab.windowId, tab.tabId],
  // );

  function handleGatherClick(e) {
    e.preventDefault()
    chrome.tabs.move(tab.id, {windowId: openedWindowId, index: -1})
  }

  function handleCloseClick(e) {
    e.preventDefault()
    chrome.tabs.remove(tab.id)
  }

  return (
    <div className="TabButtons">
      { tab.windowId !== openedWindowId &&
      <input
        className="TabButtons-icon" type="image" alt="gather"
        title="Move to the current window."
        src={gatherOneIcon}
        onClick={handleGatherClick}
      />
      }
      <input
        className="TabButtons-icon" type="image" alt="close"
        title="Close this tab."
        src={closeIcon}
        onClick={handleCloseClick}
      />
      {/* <input
        className="TabButtons-icon" type="image" alt="info"
        src={infoIcon}
        onClick={myHandleInfoClick}
      /> */}
    </div>
  );
}

function TabLine(props) {
  const tab = props.tab.info
  let favIconUrl = null

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
  return (
    props.displayTabs.map((tab) => TabLine({tab: tab}))
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
  const [tabAlpha, setTabAlpha] = useState([])
  const [tabData, setTabData] = useState({})
  const [searchValue, setSearchValue] = useState("")
  const [displayTabs, setDisplayTabs] = useState([])
  const [sortBy, setSortBy] = useState("alpha")

  let windows = new Proxy({}, DefaultObjectKey)
  let tabs = new Proxy({}, DefaultObjectKey)
  let tabTL = new IDTimeline()
  let tabA = new IDAlpha()

  // Event updates
  useEffect(() => {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      let tabsUpdated = false
      let windowsUpdated = false
      for (const [key, change] of Object.entries(changes)) {
        let prefix = key.substring(0, 2)
        let id = parseInt(key.substring(2))

        if (!("newValue" in change)) {
          if (prefix[0] === "t" && id in tabs) {
            tabTL.remove(id)
            tabA.remove(id)
            delete tabs[id]
            tabsUpdated = true
          } else if (prefix[0] === "w" && id in windows) {
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
              tabs[id].searchValue = tabs[id].info.title.toLowerCase() + "\t" + 
                tabs[id].info.url.toLowerCase().replace(/^https?:\/\//, "")
              if ("oldValue" in change) {
                tabA.update(id, tabs[id].info.title)
              } else {
                tabA.add(id, tabs[id].info.title)
              }
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
        setTabAlpha(tabA.sorted)
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
            tabs[id].searchValue = value.title.toLowerCase() + "\t" + 
              value.url.toLowerCase().replace(/^https?:\/\//, "")
            tabA.add(id, value.title)
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
        if (tid in tabs && wid !== tabs[tid].info.windowId) {
          tabs[tid].info.windowId = wid
        }
      }
      setWindowCount(Object.keys(windows).length)
      setTabCount(Object.keys(tabs).length)
      setTabTimeline(tabTL.timeline)
      setTabAlpha(tabA.sorted)
      setTabData(tabs)
    })
  }, [])

  useEffect(() => {
    let dList  = []
    switch (sortBy) {
      case "accessed":
        console.log(`sb=accessed: tabTL.tl = ${tabTL.tl}`)
        for (let i = tabTimeline.length - 1; i >= 0; i--) {
          let tabId = tabTimeline[i]
          if (tabId in tabData) {
            if (searchValue === "" || tabData[tabId].searchValue.includes(searchValue)) {
              dList.push(tabData[tabId])
            }
          }
        }
        break
      default: // alpha
        console.log(`sb=accessed: tabA.al = ${tabA.al}`)
        for (let i = 0; i < tabAlpha.length; i++) {
          let tabId = tabAlpha[i]
          if (tabId in tabData) {
            if (searchValue === "" || tabData[tabId].searchValue.includes(searchValue)) {
              dList.push(tabData[tabId])
            }
          }
        }
    }
    setDisplayTabs(dList)
  }, [tabTimeline, tabAlpha, tabData, searchValue, sortBy])

  function handleGatherAllClick(e) {
    e.preventDefault()
    let moveTabIds = []
    for (let i = 0, lenDT = displayTabs.length; i < lenDT; i++) {
      if (displayTabs[i].windowId !== openedWindowId) {
        moveTabIds.push(displayTabs[i].info.id)
      }
    }
    chrome.tabs.move(moveTabIds, {windowId: openedWindowId, index: -1})
  }

  function searchBoxOnInput(e) {
    setSearchValue(e.target.value)
  }

  function clickSortBy(e) {
    if (sortBy == "alpha") {
      setSortBy("accessed")
    } else {
      setSortBy("alpha")
    }
  }

  return (
    <div className="Popup">
      <header className="Popup-header">
        <div className="Popup-header-line">
          <div className="Header-buttons">
            <input type="image" className="Popup-button-icon" onClick={handleGatherAllClick}
            title="Gather result tabs to this window" alt="G"
            src={gatherAllIcon}
            />
          </div>
          <div className="Result-counts">
          {tabCount} tab{tabCount > 1 ? "s" : ""}, {windowCount} window{windowCount > 1 ? "s" : ""}
          </div>
          <div className="Header-buttons">
            {sortBy === "accessed" && (
              <input type="image" className="Popup-button-icon" onClick={clickSortBy}
              title="Sorting by last accessed time" alt="S"
              src={sortByAccessedIcon}
              />
            )}
            {sortBy === "alpha" && (
              <input type="image" className="Popup-button-icon" onClick={clickSortBy}
              title="Sorting by title in alphabetic order" alt="S"
              src={sortByAlphaIcon}
              />
            )}
            {/* <InlineSVG src={require("svg-inline-loader?classPrefix!./icons/sort_by_accessed.svg")} /> */}
            {/* <InlineSVG src={require("./icons/sort_by_accessed.svg")} /> */}
            {/* require('svg-inline-loader?classPrefix!./logo_two.svg') */}
          </div>
        </div>
        <div>
          <input className="Search-text" autoFocus type="text" onInput={searchBoxOnInput}
          placeholder="Search Titles and URLs"
          />
        </div>
      </header>
      <div>
        {/* <TabList tabData={tabData} tabTimeline={tabTimeline} activeWindowId={activeWindowId} searchValue={searchValue}/> */}
        <TabList displayTabs={displayTabs} />
      </div>
    </div>
  );
}

export default Popup;
