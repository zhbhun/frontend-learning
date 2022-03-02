/**
 * 官方实例
 * 
 * @return {[type]} [description]
 */
(function() {
    option = {
        legend: {
            orient: 'horizontal', // 'vertical'
            x: 'right', // 'center' | 'left' | {number},
            y: 'top', // 'center' | 'bottom' | {number}
            backgroundColor: '#eee',
            borderColor: 'rgba(178,34,34,0.8)',
            borderWidth: 4,
            padding: 10, // [5, 10, 15, 20]
            itemGap: 20,
            textStyle: {
                color: 'red'
            },
            selected: {
                '降水量': false
            },
            data: [{
                    name: '蒸发量',
                    icon: 'image://favicon.png',
                    textStyle: {
                        fontWeight: 'bold',
                        color: 'green'
                    }
                },
                '降水量', '最高气温', '最低气温'
            ]
        },
        xAxis: {
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        },
        yAxis: [{
            type: 'value',
            axisLabel: {
                formatter: '{value} ml'
            }
        }, {
            type: 'value',
            axisLabel: {
                formatter: '{value} °C'
            },
            splitLine: {
                show: false
            }
        }],
        series: [{
            name: '蒸发量',
            type: 'bar',
            data: [2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6]
        }, {
            name: '最高气温',
            type: 'line',
            yAxisIndex: 1,
            data: [11, 11, 15, 13, 12, 13, 10]
        }, {
            name: '降水量',
            type: 'bar',
            data: [2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6]
        }]
    };
    var myChart = echarts.init(document.getElementById("official"));
    myChart.setOption(option);
    // 动态添加默认不显示的数据
    var ecConfig = echarts.config;
    myChart.on(ecConfig.EVENT.LEGEND_SELECTED, function(param) {
        var selected = param.selected;
        var len;
        var added;
        if (selected['最低气温']) {
            len = option.series.length;
            added = false;
            while (len--) {
                if (option.series[len].name == '最低气温') {
                    // 已经添加
                    added = true;
                    break;
                }
            }
            if (!added) {
                myChart.showLoading({
                    text: '数据获取中',
                    effect: 'whirling'
                });
                setTimeout(function() {
                    option.series.push({
                        name: '最低气温',
                        type: 'line',
                        yAxisIndex: 1,
                        data: [-2, 1, 2, 5, 3, 2, 0]
                    });
                    myChart.hideLoading();
                    myChart.setOption(option);
                }, 2000)
            }
        }
    });

})()