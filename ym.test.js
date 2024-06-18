import { YuanmengFarm } from "./ym.js";

function summarize(logs) {
    const result = {
        wait: 0,
        pour: 0,
    }
    for (let item of logs) {
        if (item.move.action === 'WAIT') {
            result.wait += item.move.duration
        } else if (item.move.action === 'POUR') {
            result.pour++
        }
    }
    console.log(logs)
    return result
}

describe('种什么', () => {
    test('32h作物', () => {
        const p = new YuanmengFarm(32*60);
        const sum = summarize(p.suggest());
        //T:1920
        //p:160 w:640 p:160 w:640 p:160 w:128 p:32
        expect(sum.wait).toBe(1408);
        expect(sum.pour).toBe(4);
    })
    test('16h作物', () => {
        const p = new YuanmengFarm(16*60);
        const sum = summarize(p.suggest());
        //T:960
        //p:80 w:320 p:80 w:320 p:80 w:64 p:16
        expect(sum.wait).toBe(704);
        expect(sum.pour).toBe(4);
        
    })
    test('12h作物', () => {
        const p = new YuanmengFarm(12*60);
        const sum = summarize(p.suggest());
        //T:720
        //p:60 w:240 p:60 w:240 p:60 w:48 p:12
        expect(sum.wait).toBe(528);
        expect(sum.pour).toBe(4);
    })

    describe('疯狂浇水', () => {
        test('32h作物', () => {
            const p = new YuanmengFarm(32*60);
            const sum = summarize(p.suggest(true));
            //T:1920 minPw:64
            //p:160 (w:64 p:16) * 22
            expect(sum.wait).toBe(1408);
            expect(sum.pour).toBe(23);
        })
    })
});

describe('边界情况', () => {
    test('浇水不能', () => {
        const p = new YuanmengFarm(12*60, 22, 240);
        const sum = summarize(p.suggest());
        //T:720
        //p:60 w:240 p:60 w:240 p:60 w:48 p:12
        expect(sum.wait).toBe(22);
        expect(sum.pour).toBe(0);
    });

    test('可重入', () => {
        const p = new YuanmengFarm(12*60, 22, 240);
        const sum1 = summarize(p.suggest());
        const sum2 = summarize(p.suggest());
        //T:720
        //p:60 w:240 p:60 w:240 p:60 w:48 p:12
        expect(sum1.wait).toBe(sum2.wait);
        expect(sum1.pour).toBe(sum2.pour);
    })
});

describe('历史bad case', () => {
});

//历史上的 bad case
// let p = new YuanmengFarm(12*60, 4*60+29, 2*60+43);
// console.log(p.suggest())