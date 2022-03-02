/**
 * 官方实例
 * 
 * @return {[type]} [description]
 */
(function() {
    option = {
        tooltip: {
            trigger: 'axis'
        },
        toolbox: {
            show: true,
            feature: {
                mark: {
                    show: true
                },
                dataZoom: {
                    show: true
                },
                dataView: {
                    show: true
                },
                magicType: {
                    show: true,
                    type: ['line', 'bar']
                },
                restore: {
                    show: true
                },
                saveAsImage: {
                    show: true
                }
            }
        },
        dataZoom: {
            show: true,
            realtime: true,
            //orient: 'vertical',   // 'horizontal'
            //x: 0,
            y: 36,
            width: 650,
            height: 20,
            //backgroundColor: 'red',
            //dataBackgroundColor: 'rgba(138,43,226,0.5)',
            //fillerColor: 'blue',
            //handleColor: 'rgba(128,43,16,0.8)',
            //xAxisIndex:[],
            //yAxisIndex:[],
            start: 0,
            end: 10,
            xAxisIndex: 0
        },
        xAxis: [{
            type: 'category',
            boundaryGap: false,
            data: function() {
                var list = [];
                var n = 0;
                while (n++ < 150) {
                    list.push(n);
                }
                return list;
            }()
        }],
        yAxis: [{
            type: 'value'
        }],
        series: [{
            name: 'dz',
            type: 'bar',
            data: function() {
                var list = [];
                for (var i = 1; i <= 150; i++) {
                    list.push(Math.round(Math.random() * 30));
                }
                return list;
            }()
        }],
        calculable: false
    };

    var chart = echarts.init(document.getElementById("official"));
    chart.setOption(option);
})()