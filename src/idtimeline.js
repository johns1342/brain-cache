// IDTimeline manages an ordered list of IDs based on a time context.

class IDTimeline {
    constructor() {
      this.tl = []
      this.cache = []
      this.version = 0
      this.cacheVersion = 0
    }
  
    get timeline() {
      // returns an ascending timeline of IDs
      if (this.version === this.cacheVersion) {
        return this.cache
      }
      let out = []
      for (let i = 0; i < this.tl.length; i++) {
        out.push(this.tl[i][1])
      }
      this.cache = out
      this.cacheVersion = this.version
      return this.cache
    }
  
    _bisect(ts) {
      // find and return lowest i where this.tl[i][0] > ts
      let l = this.tl.length
      let u = l
      let i = l >> 1
      let priorI = -2

      while (i - priorI !== 1 && i - priorI !== 0) {
        priorI = i
        if (this.tl[i][0] > ts) {
          u = i + 1
          i = i >> 1
        } else {
          i = (u + i) >> 1  // int version of ((u - i) / 2) + i
        }
      }
      return i
    }
  
    _findId(id) {
      // find and return the most recent index of an ID
      for (let i = this.tl.length - 1; i >= 0; i--) {
        if (this.tl[i][1] === id) {
          return i
        }
      }
      return -1
    }
  
    _removeId(id) {
      // remove an ID if it exists
      let oldIdx = this._findId(id)
      if (oldIdx !== -1) {
        this.tl.splice(oldIdx, 1)
        return true
      }
      return false
    }
  
    add(id, ts) {
      // handle empty and optimize for most common recent update case
      if (this.tl.length === 0 || ts > this.tl[this.tl.length - 1][0]) {
        this.tl.push([ts, id])
        this.version++
        return
      }
      // insert sort...
      let newIdx = this._bisect(ts)
      this.tl.splice(newIdx, 0, [ts, id])
      this.version++
    }
  
    update(id, ts) {
      // update an existing ID's timestamp
      this._removeId(id)
      this.add(id, ts)
    }
  
    remove(id) {
      // remove an ID if it exists
      if (this._removeId(id)) {
        this.version++
      }
    }
  }

  export {IDTimeline}