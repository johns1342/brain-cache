// IDAlpha manages an ordered list of IDs based on a string.

class IDAlpha {
    constructor() {
      this.al = []
      this.cache = []
      this.version = 0
      this.cacheVersion = 0
    }
  
    get sorted() {
      // returns an ascending list of IDs sorted by title
      if (this.version === this.cacheVersion) {
        return this.cache
      }
      let out = []
      for (let i = 0; i < this.al.length; i++) {
        out.push(this.al[i][1])
      }
      this.cache = out
      this.cacheVersion = this.version
      return this.cache
    }

    _bisect(str) {
      // find and return lowest i where this.al[i][0] > str
      let l = 0
      let u = this.al.length
      let m
      while (l < u) {
        m = (l + u) >> 1
        if (this.al[m][0] > str) {
          u = m
        } else {
          l = m + 1
        }
      }
      return l
    }
  
    _findId(id) {
      // find and return the most recent index of an ID
      for (let i = this.al.length - 1; i >= 0; i--) {
        if (this.al[i][1] === id) {
          return i
        }
      }
      return -1
    }
  
    _removeId(id) {
      // remove an ID if it exists
      let oldIdx = this._findId(id)
      if (oldIdx !== -1) {
        this.al.splice(oldIdx, 1)
        return true
      }
      return false
    }
  
    add(id, str) {
      str = str.toLowerCase()
      let newIdx = this._bisect(str)
      this.al.splice(newIdx, 0, [str, id])
      this.version++
    }
  
    update(id, str) {
      // update an existing ID's alpha value
      this._removeId(id)
      this.add(id, str)
    }
  
    remove(id) {
      // remove an ID if it exists
      if (this._removeId(id)) {
        this.version++
      }
    }
  }

  export {IDAlpha}