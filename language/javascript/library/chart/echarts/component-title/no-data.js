/**
 * 测试标题对图表的依赖性
 *     - 如果series没有name，则不显示图表
 *     - 如果series有name，但没有数据，则提示暂无数据
 *     - ...
 * @return {[type]} [description]
 */
(function() {
    option = {
        title: {
            text: '未来一周气温变化',
            subtext: '纯属虚构'
        },
        // series: []
        series: [{name: '测试标题'}]
    };

    var chart = echarts.init(document.getElementById("no-data"));
    chart.setOption(option);
})()