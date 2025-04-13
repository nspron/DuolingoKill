// 全局数据变量
let allStats = [];
let filteredStats = [];
let deviceModels = new Set();
let androidVersions = new Set();
let map = null;
let markers = [];
let isDarkMode = false;

// 图表实例
let totalOpensChart, devicesChart, androidChart, geoChart, trendChart;

// 初始化应用
function initApp() {
    // 初始化图表
    totalOpensChart = initBarChart('totalOpensChart', '总开启次数', 'rgba(67, 97, 238, 0.7)');
    devicesChart = initDoughnutChart('devicesChart', '设备分布');
    androidChart = initDoughnutChart('androidChart', 'Android版本分布');
    geoChart = initDoughnutChart('geoChart', '国家分布');
    trendChart = initLineChart('trendChart', '设备使用趋势');
    
    // 加载数据
    loadData();
    
    // 初始化事件监听
    initEventListeners();
    
    // 检查本地存储中的主题设置
    checkThemePreference();
}

// 加载数据
function loadData() {
    fetch('https://raw.githubusercontent.com/nspron/DuolingoKill/main/stats/device_stats.csv')
        .then(response => {
            if (!response.ok) throw new Error('网络响应不正常');
            return response.text();
        })
        .then(data => {
            // 解析CSV数据
            allStats = parseCSV(data).filter(entry => 
                entry.date && entry.device_id && entry.open_count
            );
            
            // 收集设备型号和Android版本
            allStats.forEach(stat => {
                if (stat.device_model) deviceModels.add(stat.device_model);
                if (stat.android_version) androidVersions.add(stat.android_version);
            });
            
            // 填充筛选器选项
            fillFilterOptions();
            
            // 应用初始筛选
            applyFilters();
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            document.querySelector('#statsTable tbody').innerHTML = `
                <tr>
                    <td colspan="8" class="error">数据加载失败，请稍后再试</td>
                </tr>
            `;
        });
}

// 解析CSV数据
function parseCSV(text) {
    const rows = text.split('\n').filter(row => row.trim() !== '');
    const headers = rows.shift().split(',').map(h => h.replace(/^"|"$/g, ''));
    
    return rows.map(row => {
        // 使用正则表达式匹配CSV字段（处理带引号的字段）
        const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const entry = {};
        headers.forEach((header, i) => {
            // 移除字段值的首尾引号（如果存在）
            entry[header] = values[i] ? values[i].replace(/^"|"$/g, '') : '';
        });
        return entry;
    });
}

// 初始化事件监听
function initEventListeners() {
    // 筛选器事件
    document.getElementById('dateRange').addEventListener('change', applyFilters);
    document.getElementById('deviceModel').addEventListener('change', applyFilters);
    document.getElementById('androidVersion').addEventListener('change', applyFilters);
    document.getElementById('deviceSearch').addEventListener('input', applyFilters);
    
    // 主题切换按钮
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

// 检查主题偏好
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    }
}

// 切换主题
function toggleTheme() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
}

// 启用暗黑模式
function enableDarkMode() {
    isDarkMode = true;
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').textContent = '☀️ 亮色模式';
    updateChartThemes(true);
}

// 禁用暗黑模式
function disableDarkMode() {
    isDarkMode = false;
    document.body.classList.remove('dark-mode');
    document.getElementById('themeToggle').textContent = '🌙 暗黑模式';
    updateChartThemes(false);
}

// 更新图表主题
function updateChartThemes(isDark) {
    const textColor = isDark ? '#f8f9fa' : '#212529';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    
    // 更新所有图表选项
    const charts = [totalOpensChart, devicesChart, androidChart, geoChart, trendChart];
    charts.forEach(chart => {
        if (chart) {
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.update();
        }
    });
}

// 初始化柱状图
function initBarChart(canvasId, label, color) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: color,
                    borderColor: color.replace('0.7', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: '#f8f9fa'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#212529'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#212529'
                        }
                    }
                }
            }
        }
    );
}

// 初始化环形图
function initDoughnutChart(canvasId, label) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: [
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(76, 201, 240, 0.7)',
                        'rgba(63, 55, 201, 0.7)',
                        'rgba(108, 117, 125, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#212529'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        }
    );
}

// 初始化折线图
function initLineChart(canvasId, label) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: '#f8f9fa'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#212529'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#212529'
                        }
                    }
                }
            }
        }
    );
}

// 填充筛选器选项
function fillFilterOptions() {
    const deviceModelSelect = document.getElementById('deviceModel');
    const androidVersionSelect = document.getElementById('androidVersion');
    
    // 添加设备型号选项
    deviceModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        deviceModelSelect.appendChild(option);
    });
    
    // 添加Android版本选项
    androidVersions.forEach(version => {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = `Android ${version}`;
        androidVersionSelect.appendChild(option);
    });
}

// 应用筛选条件
function applyFilters() {
    const dateRange = document.getElementById('dateRange').value;
    const deviceModel = document.getElementById('deviceModel').value;
    const androidVersion = document.getElementById('androidVersion').value;
    const deviceSearch = document.getElementById('deviceSearch').value.toLowerCase();
    
    // 计算日期范围
    let minDate = null;
    if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        minDate = new Date();
        minDate.setDate(minDate.getDate() - days);
    }
    
    // 筛选数据
    filteredStats = allStats.filter(stat => {
        // 日期筛选
        if (minDate && new Date(stat.date) < minDate) {
            return false;
        }
        
        // 设备型号筛选
        if (deviceModel !== 'all' && stat.device_model !== deviceModel) {
            return false;
        }
        
        // Android版本筛选
        if (androidVersion !== 'all' && stat.android_version !== androidVersion) {
            return false;
        }
        
        // 设备ID搜索
        if (deviceSearch && !stat.device_id.toLowerCase().includes(deviceSearch)) {
            return false;
        }
        
        return true;
    });
    
    // 更新图表和数据展示
    updateCharts();
    updateTable();
}

// 更新图表数据
function updateCharts() {
    const today = new Date().toISOString().split('T')[0];
    
    // 按日期聚合数据
    const dailyStats = {};
    const deviceCounts = {};
    const versionCounts = {};
    const countryCounts = {};
    let totalOpens = 0;
    let uniqueDevices = new Set();
    let uniqueCountries = new Set();
    
    filteredStats.forEach(stat => {
        // 统计总开启次数
        totalOpens += parseInt(stat.open_count) || 0;
        
        // 记录唯一设备
        uniqueDevices.add(stat.device_id);
        
        // 记录国家
        if (stat.country) {
            uniqueCountries.add(stat.country);
            if (!countryCounts[stat.country]) {
                countryCounts[stat.country] = 0;
            }
            countryCounts[stat.country] += parseInt(stat.open_count) || 0;
        }
        
        // 按日期统计
        if (!dailyStats[stat.date]) {
            dailyStats[stat.date] = 0;
        }
        dailyStats[stat.date] += parseInt(stat.open_count) || 0;
        
        // 按设备统计
        if (!deviceCounts[stat.device_model]) {
            deviceCounts[stat.device_model] = 0;
        }
        deviceCounts[stat.device_model] += parseInt(stat.open_count) || 0;
        
        // 按Android版本统计
        if (!versionCounts[stat.android_version]) {
            versionCounts[stat.android_version] = 0;
        }
        versionCounts[stat.android_version] += parseInt(stat.open_count) || 0;
    });
    
    // 更新仪表板数据
    document.getElementById('totalOpens').textContent = totalOpens.toLocaleString();
    document.getElementById('uniqueDevices').textContent = uniqueDevices.size.toLocaleString();
    document.getElementById('androidVersions').textContent = Object.keys(versionCounts).length.toLocaleString();
    document.getElementById('uniqueLocations').textContent = uniqueCountries.size.toLocaleString();
    
    // 准备日期排序
    const dates = Object.keys(dailyStats).sort();
    
    // 更新总开启次数图表
    totalOpensChart.data.labels = dates;
    totalOpensChart.data.datasets[0].data = dates.map(date => dailyStats[date]);
    totalOpensChart.update();
    
    // 更新设备分布图表
    const topDevices = Object.entries(deviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    devicesChart.data.labels = topDevices.map(d => d[0] || '未知设备');
    devicesChart.data.datasets[0].data = topDevices.map(d => d[1]);
    devicesChart.update();
    
    // 更新Android版本分布图表
    const topVersions = Object.entries(versionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    androidChart.data.labels = topVersions.map(v => `Android ${v[0]}` || '未知版本');
    androidChart.data.datasets[0].data = topVersions.map(v => v[1]);
    androidChart.update();
    
    // 更新国家分布图表
    const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    geoChart.data.labels = topCountries.map(c => c[0] || '未知国家');
    geoChart.data.datasets[0].data = topCountries.map(c => c[1]);
    geoChart.update();
    
    // 更新趋势图表
    trendChart.data.labels = dates;
    trendChart.data.datasets[0].data = dates.map(date => dailyStats[date]);
    trendChart.update();
}

// 更新表格数据
function updateTable() {
    const tbody = document.querySelector('#statsTable tbody');
    tbody.innerHTML = '';
    
    if (filteredStats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading">没有找到匹配的数据</td>
            </tr>
        `;
        return;
    }
    
    // 按日期降序排序
    const sortedStats = [...filteredStats].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // 只显示前100条记录
    const displayStats = sortedStats.slice(0, 100);
    
    displayStats.forEach(stat => {
        const tr = document.createElement('tr');
        
        // 日期
        const dateTd = document.createElement('td');
        dateTd.textContent = stat.date;
        tr.appendChild(dateTd);
        
        // 设备ID
        const deviceTd = document.createElement('td');
        deviceTd.textContent = stat.device_id.slice(0, 8) + '...';
        deviceTd.title = stat.device_id;
        tr.appendChild(deviceTd);
        
        // 开启次数
        const countTd = document.createElement('td');
        countTd.textContent = stat.open_count;
        tr.appendChild(countTd);
        
        // 设备型号
        const modelTd = document.createElement('td');
        modelTd.textContent = stat.device_model || '--';
        tr.appendChild(modelTd);
        
        // Android版本
        const versionTd = document.createElement('td');
        versionTd.textContent = stat.android_version ? `Android ${stat.android_version}` : '--';
        tr.appendChild(versionTd);
        
        // 制造商
        const manuTd = document.createElement('td');
        manuTd.textContent = stat.manufacturer || '--';
        tr.appendChild(manuTd);
        
        // 报告时间
        const timeTd = document.createElement('td');
        timeTd.textContent = stat.report_time || '--';
        tr.appendChild(timeTd);
        
        // 状态
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge ' + getStatusBadgeClass(stat.date);
        badge.textContent = getStatusText(stat.date);
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);
        
        tbody.appendChild(tr);
    });
}

// 获取状态标签样式
function getStatusBadgeClass(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'badge-success';
    } else if (diffDays <= 7) {
        return 'badge-primary';
    } else if (diffDays <= 30) {
        return 'badge-warning';
    } else {
        return 'badge-danger';
    }
}

// 获取状态文本
function getStatusText(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今日活跃';
    } else if (diffDays <= 7) {
        return '7天内活跃';
    } else if (diffDays <= 30) {
        return '30天内活跃';
    } else {
        return '历史记录';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
