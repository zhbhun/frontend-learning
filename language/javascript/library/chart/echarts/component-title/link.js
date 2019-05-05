/**
 * 测试标题链接
 *     - link/sublink：http地址字符串，默认为""
 *     - target/subtarget：目标窗口，可选值为self和blank，默认为null（同blank）
 *     - ...
 * @return {[type]} [description]
 */
(function() {
    option = {
        title: {
            text: '测试标题链接',
            link: "#/xxx",
            target: "self",
            subtext: '测试副标题链接',
            sublink: "http://www.baidu.com",
            subtarget: "blank"
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['气温']
        },
        calculable: true,
        xAxis: [{
            type: 'category',
            boundaryGap: false,
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        }],
        yAxis: [{
            type: 'value',
            axisLabel: {
                formatter: '{value} °C'
            }
        }],
        series: [{
            name: '气温',
            type: 'line',
            data: [11, 11, 15, 13, 12, 13, 10]
        }]
    };


    var chart = echarts.init(document.getElementById("link"));
    chart.setOption(option);
})()