
import { IDAlpha } from "./idalpha"

test("run constructor", () => {
    let al = new IDAlpha()
    expect(al.al.length).toBe(0)
})

test("add one element", () => {
    let al = new IDAlpha()
    al.add(1, "aaa")
    expect(al.al.length).toBe(1)
    expect(al.al[0][1]).toBe(1)
})

test("add two elements and update", () => {
    let al = new IDAlpha()
    al.add(4, "bbb")
    al.add(3, "aaa")
    expect(al.al.length).toBe(2)
    expect(al.al[0][1]).toBe(3)
    expect(al.al[1][1]).toBe(4)

    al.update(3, "ccc")
    expect(al.al.length).toBe(2)
    expect(al.al[0][1]).toBe(4)
    expect(al.al[1][1]).toBe(3)
})

test("add 5 elements starting with a", () => {
    let al = new IDAlpha()
    let elCount = 5
    for (let i = 0; i < elCount; i+=2) {
        al.add(i, (100+i).toString())
    }
    for (let i = 1; i < elCount; i+=2) {
        al.add(i, (100+i).toString())
    }
    let tli = al.sorted
    expect(tli.length).toBe(elCount)
    for (let i = 0; i < elCount; i++) {
        expect(tli[i]).toBe(i)
    }
})

test("add 5 elements starting with 1", () => {
    let al = new IDAlpha()
    let elCount = 5
    for (let i = 1; i < elCount; i+=2) {
        al.add(i, (100+i).toString())
    }
    for (let i = 0; i < elCount; i+=2) {
        al.add(i, (100+i).toString())
    }
    let tli = al.sorted
    expect(tli.length).toBe(elCount)
    for (let i = 0; i < elCount; i++) {
        expect(tli[i]).toBe(i)
    }
})