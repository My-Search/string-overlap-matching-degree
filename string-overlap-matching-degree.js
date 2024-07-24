/**
 * 重叠匹配度
 * @author: zhuangjie
 * @date: 2024-07-23
 */
function overlapMatchingDegreeForObjectArray(keyword = "", objArr = [], fun = (obj) => [], sort = "desc") {
    const scopeForData = objArr.map(item => overlapMatchingDegree(keyword, fun(item), sort));
    sortAndSync(scopeForData, objArr)
    return scopeForData;
}
/**
 * 计算匹配度外层封装工具
 * @param {string} keyword - 匹配字符串1
 * @param {Object | Arrayy} topicWeighs - 匹配字符串2与它的权重
 * @returns {number} 匹配度分数
 */
function overlapMatchingDegree(keyword, topicWeighs = {}, sort = "desc") {
    // 兼容topicWeighs为topic数组，元素越靠前权重越高
    if (Array.isArray(topicWeighs)) {
        const _temp = {}
        if (sort === "asc") {
            for (let i = 1; i <= topicWeighs.length; i++) {
                _temp[topicWeighs[i - 1]] = i;
            }
        } else {
            // desc
            for (let i = topicWeighs.length; i > 0; i--) {
                _temp[topicWeighs[topicWeighs.length - i]] = i;
            }
        }
        topicWeighs = _temp;
    }
    let topicList = Object.keys(topicWeighs)
    // topic map 得分
    const topicScores = topicList.map(topic => {
        let topicScore = 0; // 得分
        const currentTopicScore = topicWeighs[topic]; // 当前topic“个数”
        const overlapLengthBlocksMap = findOverlapBlocks(keyword, topic)
        const overlapLengthKeys = Object.keys(overlapLengthBlocksMap);
        for (let overlapLengthKey of overlapLengthKeys) {
            const currentLengthBlocks = overlapLengthBlocksMap[overlapLengthKey];
            topicScore = Math.pow(currentTopicScore, overlapLengthKey) * currentLengthBlocks.length;
        }
        return topicScore;
    })
    // 算总分返回
    return topicScores.reduce((a, b) => a + b, 0)
}

/**
 * 查找重叠匹配块（入口函数）
 * @param {*} str1 
 * @param {*} str2 
 * @returns 返回重叠块 如：{"2": ["好用","推荐"],"3": ["好用推荐"]}
 * 算法核心思想：
 * -----------------------------------------------------
 * sumatrapdf*          | sumatrapdf*      | sumatrapdf*
 *           pdf-       |          pdf-    |         pdf-
 * ------------------------------------------------------
 */
function findOverlapBlocks(str1 = "", str2 = "") {
    let maxStr2OffsetLength = str1.length - 1;
    let minStr2OffsetLength = -(str2.length - 1);
    const alignmentHub = { /* "3": ["好用","推荐"] */ }
    for (let currentStr2OffsetLength = maxStr2OffsetLength; currentStr2OffsetLength >= minStr2OffsetLength; currentStr2OffsetLength--) {
        let str1EndIndex = str1.length - 1;
        let str2EndIndex = currentStr2OffsetLength + (str2.length - 1);

        let overlappingStart = currentStr2OffsetLength >= 0 ? currentStr2OffsetLength : 0; // 重叠闭区间开始 [
        let overlappingEnd = str2EndIndex < str1EndIndex ? str2EndIndex : str1EndIndex; // 重叠闭区间结束 ]

        // 对齐
        const alignmentContent = alignment(str1.substring(overlappingStart, overlappingEnd + 1), str2.substring(overlappingStart - currentStr2OffsetLength, overlappingEnd - currentStr2OffsetLength + 1));
        // 长重叠 覆盖 短重叠
        longOverlappingCoverage(alignmentHub, alignmentContent);
    }
    return alignmentHub;
}
function longOverlappingCoverage(alignmentHub = {}, alignmentContent = {}) {
    const modifiedCols = Object.keys(alignmentContent)
    const maxmodifiedCols = Math.max(...modifiedCols)
    const minmodifiedCols = Math.min(...modifiedCols)
    // 合并到对应的列上
    modifiedCols.forEach(col => {
        alignmentHub[col] = alignmentHub[col] ? Array.from(new Set(alignmentHub[col].concat(alignmentContent[col]))) : alignmentContent[col];
    })
    const alignmentHubCol = Object.keys(alignmentHub)
    const gtmodifiedCols = alignmentHubCol.filter(col => parseFloat(col) > maxmodifiedCols);
    const ltmodifiedCols = alignmentHubCol.filter(col => parseFloat(col) < minmodifiedCols);
    // 重新计算各列，过滤掉在modifiedCols的`大于modifiedCols的列`的子串，过滤掉`小于modifiedCols的列`在modifiedCols的子串
    // - 过滤掉在modifiedCols的`大于modifiedCols的列`的子串
    colElementFilter(alignmentHub, modifiedCols, gtmodifiedCols);
    // - 过滤掉`小于modifiedCols的列`在modifiedCols的子串
    colElementFilter(alignmentHub, ltmodifiedCols, modifiedCols);

}
// 列元素过滤
function colElementFilter(alignmentHub = {}, cols = [], gtCols = []) {
    if (cols.length == 0 || gtCols.length == 0) return;
    gtCols.forEach(gtCol => {
        const gtOverlappingBlocks = alignmentHub[gtCol];
        for (let [index, col] of cols.entries()) {
            const overlappingBlocks = alignmentHub[col];
            if (gtOverlappingBlocks == undefined || overlappingBlocks == undefined) continue;;
            alignmentHub[col] = overlappingBlocks.filter(overlappingBlock => {
                for (let gtOverlappingBlock of gtOverlappingBlocks) {
                    if (gtOverlappingBlock.includes(overlappingBlock)) {
                        return false
                    }
                }
                return true;
            })
        }
    })
    // 清理掉value为空数组项
    // {1: [],2:["好用"]} -to-> {2:["好用"]}
    Object.keys(alignmentHub).forEach(key => { if (alignmentHub[key].length == 0) delete alignmentHub[key] });
}
// 对齐
function alignment(str1 = "", str2 = "") {
    // 返回 {"1",["我","用"],"2":["推荐","可以"]}
    if (str1.length != str2.length) {
        throw new Error("算法错误，对齐字符串长度不一致");
    }
    const overlappingBlocks = {}
    let currentOverlappingBlock = "";
    for (let i = str1.length - 1; i >= 0; i--) {
        if (str1[i] == str2[i]) {
            currentOverlappingBlock = str1[i] + currentOverlappingBlock;
            if (i - 1 >= 0) continue;
        }
        if (currentOverlappingBlock.length == 0) {
            continue;
        } else {
            // 块收集
            let currentOverlappingBlockContainer = overlappingBlocks[currentOverlappingBlock.length]
            if (currentOverlappingBlockContainer == undefined) {
                currentOverlappingBlockContainer = overlappingBlocks[currentOverlappingBlock.length] = [currentOverlappingBlock]
            } else if (!currentOverlappingBlockContainer.includes(currentOverlappingBlock)) {
                currentOverlappingBlockContainer.push(currentOverlappingBlock)
            }
        }
        currentOverlappingBlock = "";
    }
    return overlappingBlocks;
}

// 【同步算法-堆实现】
function sortAndSync(arr1, arr2, order = 'desc') {
    if (arr1.length !== arr2.length) {
        throw new Error("Both arrays must have the same length");
    }
    function swap(arr, i, j) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    function heapify(arr1, arr2, n, i, order) {
        let largest = i;
        let left = 2 * i + 1;
        let right = 2 * i + 2;

        if (order === 'asc') {
            if (left < n && arr1[left] > arr1[largest]) {
                largest = left;
            }
            if (right < n && arr1[right] > arr1[largest]) {
                largest = right;
            }
        } else {

            if (left < n && arr1[left] < arr1[largest]) {
                largest = left;
            }
            if (right < n && arr1[right] < arr1[largest]) {
                largest = right;
            }
        }

        if (largest !== i) {
            swap(arr1, i, largest);
            swap(arr2, i, largest);
            heapify(arr1, arr2, n, largest, order);
        }
    }
    function buildHeap(arr1, arr2, n, order) {
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(arr1, arr2, n, i, order);
        }
    }
    function heapSort(arr1, arr2, order) {
        let n = arr1.length;
        buildHeap(arr1, arr2, n, order);

        for (let i = n - 1; i > 0; i--) {
            swap(arr1, 0, i);
            swap(arr2, 0, i);
            heapify(arr1, arr2, i, 0, order);
        }
    }
    heapSort(arr1, arr2, order);
}

// 【算法测试1】
//  console.log("-- 算法测试开始 --")
//  console.log(findOverlapBlocks("[推荐]sumatrapdf非常好用","pdf 推荐"))
//  console.log("-- 算法测试结束 --")

// 【算法测试2】
// console.log("匹配度：", overlapMatchingDegree("好用的pdf工具", { "sumatrapdf": 10, "小而好用的pdf阅读器": 8, "https://www.sumatrapdfreader.org/downloadafter": 3 }));
