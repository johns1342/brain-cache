
import { IDTimeline } from "./idtimeline"

test("run constructor", () => {
    let tl = new IDTimeline()
    expect(tl.tl.length).toBe(0)
})

test("add one element", () => {
    let tl = new IDTimeline()
    tl.add(1, Date.now())
    expect(tl.tl.length).toBe(1)
    expect(tl.tl[0][1]).toBe(1)
})

test("add two elements and update", () => {
    let tl = new IDTimeline()
    tl.add(4, 54321)
    tl.add(3, 12345)
    expect(tl.tl.length).toBe(2)
    expect(tl.tl[0][1]).toBe(3)
    expect(tl.tl[1][1]).toBe(4)

    tl.update(3, 65432)
    expect(tl.tl.length).toBe(2)
    expect(tl.tl[0][1]).toBe(4)
    expect(tl.tl[1][1]).toBe(3)
})

test("add 5 elements starting with 0", () => {
    let tl = new IDTimeline()
    let elCount = 5
    for (let i = 0; i < elCount; i+=2) {
        tl.add(i, 100+i)
    }
    for (let i = 1; i < elCount; i+=2) {
        tl.add(i, 100+i)
    }
    let tli = tl.timeline
    expect(tli.length).toBe(elCount)
    for (let i = 0; i < elCount; i++) {
        expect(tli[i]).toBe(i)
    }
})

test("add 5 elements starting with 1", () => {
    let tl = new IDTimeline()
    let elCount = 5
    for (let i = 1; i < elCount; i+=2) {
        tl.add(i, 100+i)
    }
    for (let i = 0; i < elCount; i+=2) {
        tl.add(i, 100+i)
    }
    let tli = tl.timeline
    expect(tli.length).toBe(elCount)
    for (let i = 0; i < elCount; i++) {
        expect(tli[i]).toBe(i)
    }
})