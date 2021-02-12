/* global chrome */
// import logo from './logo.svg';
// import logo from './icons/gather_one.svg';
import gatherAllIcon from './icons/gather_all.svg';
import closeIcon from './icons/close.svg';
import infoIcon from './icons/info.svg';
import './Popup.css';
// import testData from "./testData.json"
import { IDTimeline } from "./idtimeline"
import { useCallback, useEffect, useState } from 'react';

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

  function handleCloseClick(e) {
    e.preventDefault()
    console.log('The close button was clicked')
  }

  return (
    <div className="TabButtons">
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

  // <div windowId={tab.windowId} tabId={tab.tabId} className="TabLine"></div>
  return (
    <div className="TabLine">
      <div>
        <img className="TabLine-favicon" alt="icon" src={favIconUrl}></img>
      </div>
      <div className="TabLine-title">{tab.title}</div>
      <TabButtons tab={tab}/>
    </div>
  );
}

function TabList(props) {
  const tabs = Object.values(props.tabData)
  return (
    tabs.map((tab) => TabLine({tab: tab}))
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
  const [tabTimeLine, setTabTimeLine] = useState([])
  const [tabData, setTabData] = useState({})
  const [activeWindowId, setActiveWindowId] = useState(0)

  // useEffect(() => {
  //   console.log("registering storage handler")
  //   chrome.storage.onChanged.addListener((changes, namespace) => {
  //     for (var key in changes) {
  //       var change = changes[key]
  //       if (key == "tabTimeLine") {
  //         if (change.oldValue.length != change.newValue) {
  //           setTabCount(change.newValue.length)
  //         }
  //         setTabTimeLine(change.newValue)
  //       }
  //       if (key == "windowIds") {
  //         setWindowCount(change.newValue.size)
  //       }
  //       if (key == "tabs") {
  //         setTabData(change.newValue)
  //       }
  //       console.log(
  //         'Storage key "%s" in namespace "%s" changed. ' +
  //         'Old value was "%s", new value is "%s".',
  //         key,
  //         namespace,
  //         change.oldValue,
  //         change.newValue);
  //     }
  //   })
  // }, [])

  // Initial load
  useEffect(() => {
    chrome.windows.getCurrent((window) => {
      setActiveWindowId(window.id)
    })
    chrome.storage.local.get((data) => {
      let windows = new Proxy({}, DefaultObjectKey)
      let tabs = new Proxy({}, DefaultObjectKey)
      let tabTL = new IDTimeline()

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
      setWindowCount(Object.keys(windows).length)
      setTabCount(Object.keys(tabs).length)
      setTabTimeLine(tabTL)
      // console.log("useEffect data:")
      // console.log(data)
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
        <TabList tabData={tabData} tabTimeLine={tabTimeLine} activeWindowId={activeWindowId}/>
      </div>
    </div>
  );
}

export default Popup;
