class YuanmengFarm {
    /**
     * 农作物信息
     * @param {Number} totalGrow 
     * @param {Number} growRemain 
     * @param {Number} waterRemain 
     */
    constructor(totalGrow, growRemain = 0, waterRemain = 0) {
        this.MAX_WATER_REMAIN = totalGrow / 3
        this.MAX_POUR_SAVE = totalGrow / 12
        this.MIN_POUR_INTERVAL = this.MAX_WATER_REMAIN / 10

        this.totalGrow = totalGrow
        this.waterRemain = waterRemain
        this.growRemain = growRemain || totalGrow
    }

    canPourFuture(wait) {
        const futureWaterRemain = Math.max(this.waterRemain - wait, 0) //最小为0
        return this.MAX_WATER_REMAIN - futureWaterRemain >= this.MIN_POUR_INTERVAL
    }

    canPourNow() {
        return this.canPourFuture(0)
    }

    futurePourSave(wait) {    
        const futureWaterRemain = Math.max(this.waterRemain - wait, 0) //最小为0
        const futureGrowRemain = Math.max(this.growRemain - wait, 0)
        //最多不超过剩余的成熟时间
        return Math.min(futureGrowRemain, (this.MAX_WATER_REMAIN - futureWaterRemain) / this.MAX_WATER_REMAIN * this.MAX_POUR_SAVE);
    }

    nowPourSave() {
        return this.futurePourSave(0);
    }

    nextPourMustWait() {
        if (this.canPourNow()) {
            return 0
        }
        return this.MIN_POUR_INTERVAL - (this.MAX_WATER_REMAIN - this.waterRemain)
    }

    suggest(crazy = false) {
        // 不分模式的总体目标：可控成熟，时间尽可能短
        // normal 正常模式：浇水次数最少
        // crazy 疯狂模式：浇水次数最多，成熟时间最短
        const logs = []
        let offset = 0; //事件发生的时间偏移量
        
        const {waterRemain, growRemain} = this; //backup

        while (this.growRemain > 0) {
            const move = this.suggestNextMove(crazy)
            const before = { growRemain: this.growRemain, waterRemain: this.waterRemain}
            this.applyMove(move)
            const after = { growRemain: this.growRemain, waterRemain: this.waterRemain}

            if (move.action === 'WAIT' && logs.length && logs[logs.length - 1].move.action === 'WAIT') { //merge continuous wait
                logs[logs.length - 1].after = after
                logs[logs.length - 1].move.duration += move.duration
                offset += move.duration
                continue
            }
            
            logs.push({
                before, move, after, offset
            })
            if (move.action === 'WAIT') {
                offset += move.duration
            }
        }

        this.waterRemain = waterRemain;
        this.growRemain = growRemain;
        return logs
    }

    /**
     * 根据当前状态提供下一步建议
     * 建议包括：等待、浇水
     */ 
    suggestNextMove(crazy = false) {
        //现在交不了水，那就等，这一般是浇水之后的 10% 水分时间内导致
        const mustWait = this.nextPourMustWait()
        if (mustWait) {
            return { action: 'WAIT', duration: Math.min( mustWait, this.growRemain) }
        }

        // 现在可浇水，疯狂模式抓住机会浇水
        const nowPourSave = this.nowPourSave()
        if (crazy) {
            return { action: 'POUR', duration: nowPourSave }
        }

        // 如果现在浇水立刻可以成熟也行
        if (nowPourSave >= this.growRemain) {
            return { action: 'POUR', duration: nowPourSave }
        }

        // 如果现在已经没水了，正常都应该浇水，避免干涸 nowPourSave = MAX_POUR_SAVE
        // 现在不浇水只有一个理由，就是浇了之后剩余的生长时间会造成不可控成熟（无法再次浇水了）
        if (this.waterRemain <= 0) {
            if (this.growRemain - nowPourSave < this.MIN_POUR_INTERVAL) {
                // 没水的浇水收益是常量，只是把它安排在后面
                // wait + MAX_POUR_SAVE = growRemain
                // wait = growRemain - MAX_POUR_SAVE
                return { action: 'WAIT', duration: this.growRemain - this.MAX_POUR_SAVE }
            }
            return { action: 'POUR', duration: nowPourSave }
        }

        // 不是疯狂模式，也不是立刻成熟，那么这次水是否浇下去，主要需要考虑几个特别情况

        // 有以下情况
        // 1. 水干早于成熟，反正水干了还没有熟，可以把时间等完；
        if (this.waterRemain < this.growRemain) {
            return { action: 'WAIT', duration: this.waterRemain }
        }
        // 2. 水干等于成熟，这表明是自然成熟，不符合可控成熟的目标，这时候不等水干
        //    而是等到某个位置点，这个位置点预期浇水可以立刻成熟
        //    futurePourSave(wait) >= growRemain - wait
        //    直接用最笨的方法遍历
        for (let w = 0; w <= this.growRemain; w++) {
            if (this.futurePourSave(w) >= this.growRemain - w) {
                return { action: 'WAIT', duration: w }
            }
        }
        // 3. 水干晚于成熟，这也表明不可等水干，否则不符合可控成熟目标，处理同 2
        // 
        // 兜底的如果跑到了这里，数学上暂时认为不可能，画个二维坐标图，y轴为剩余时间，x轴为等待时间
        // 水分线和生长线是斜率为 -1 的线 y = -x + a，只不过a分别为当前剩余水分和剩余生长
        // 只要水分剩余大于等于成熟时间，水分直线在成熟直线之上，而第一个if分支后我们已经确定现在是可以浇水的
        // 因此浇水收益直线是 y = -1/4 x + b，他必然与成熟线有交点，交点的x浇水可控成熟
        alert(`恭喜你发现了一组看起来并不可能的数据，请找绿茶看看，提供以下数据：\n 作物总成熟${this.totalGrow} 水分剩余${this.waterRemain} 生长剩余${this.growRemain}`)
    }

    applyMove(move) {
        if (move.action === 'WAIT') {
            this.growRemain -= move.duration
            this.waterRemain -= move.duration
        } else if (move.action === 'POUR') {
            this.growRemain -= move.duration
            this.waterRemain = this.MAX_WATER_REMAIN
        }
    }
}

export { YuanmengFarm }