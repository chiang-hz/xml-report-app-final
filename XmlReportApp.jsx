import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';

export default function XmlReportAnalyzer() {
  const chartRef = useRef(null);
  const [years, setYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [dataByYear, setDataByYear] = useState({});
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState(['__ALL__']);
  const [unit, setUnit] = useState(1);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    const parser = new DOMParser();
    const tempData = {};
    const yearSet = new Set();
    const subjectSet = new Set();

    for (const file of files) {
      const text = await file.text();
      const xml = parser.parseFromString(text, 'text/xml');
      const yearNode = xml.querySelector('年度');
      const year = yearNode?.textContent || file.name.match(/\d{3,4}/)?.[0] || '未知';
      const rows = Array.from(xml.getElementsByTagName('ROW'));

      if (!tempData[year]) tempData[year] = [];

      rows.forEach((row) => {
        const subject = row.querySelector('科目名稱')?.textContent || '未知科目';
        const final = parseFloat(row.querySelector('本年度決算數')?.textContent || 0);
        const budget = parseFloat(row.querySelector('本年度預算數')?.textContent || 0);
        const growth = parseFloat(row.querySelector('比較增減-百分比')?.textContent || 0);
        tempData[year].push({ year, subject, final, budget, growth });
        subjectSet.add(subject);
      });
      yearSet.add(year);
    }

    const sortedYears = Array.from(yearSet).sort();
    setDataByYear(tempData);
    setYears(sortedYears);
    setStartYear(sortedYears[0]);
    setEndYear(sortedYears[sortedYears.length - 1]);
    setSubjects(Array.from(subjectSet));
  };

  const getFilteredData = () => {
    const allYears = years.filter((y) => y >= startYear && y <= endYear);
    const allRows = allYears.flatMap((y) => dataByYear[y] || []);
    return selectedSubjects.includes('__ALL__')
      ? allRows
      : allRows.filter((r) => selectedSubjects.includes(r.subject));
  };

  const renderChart = () => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (window.chartInstance) window.chartInstance.destroy();

    const filtered = getFilteredData();
    const allYears = years.filter((y) => y >= startYear && y <= endYear);
    const subjectMap = {};
    filtered.forEach((item) => {
      if (!subjectMap[item.subject]) subjectMap[item.subject] = {};
      subjectMap[item.subject][item.year] = item.final / unit;
    });

    const datasets = Object.keys(subjectMap).map((subject, i) => ({
      label: subject,
      data: allYears.map((y) => subjectMap[subject][y] || 0),
      borderColor: `hsl(${(i * 47) % 360}, 70%, 50%)`,
      fill: false,
    }));

    window.chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: allYears, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: '跨年度科目趨勢圖' },
        },
      },
    });
  };

  const exportToExcel = () => {
    const rows = getFilteredData();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '損益表');
    XLSX.writeFile(wb, `損益表報表_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📤 上傳損益表 XML 並產生報表</h1>
      <input type="file" accept=".xml" multiple onChange={handleUpload} className="mb-4 border px-2 py-1 rounded" />
      {years.length > 0 && (
        <div className="grid gap-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">年度區間：</label>
              <select value={startYear} onChange={(e) => setStartYear(e.target.value)} className="border px-2 py-1 rounded">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span>~</span>
              <select value={endYear} onChange={(e) => setEndYear(e.target.value)} className="border px-2 py-1 rounded">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">篩選科目：</label>
              <select multiple value={selectedSubjects} onChange={(e) => setSelectedSubjects(Array.from(e.target.selectedOptions, o => o.value))} className="border px-2 py-1 rounded w-64 h-32">
                <option value="__ALL__">全部科目</option>
                {subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">金額單位：</label>
              <select value={unit} onChange={(e) => setUnit(Number(e.target.value))} className="border px-2 py-1 rounded">
                <option value={1}>元</option>
                <option value={1000}>千元</option>
                <option value={100000000}>億元</option>
              </select>
            </div>
            <button onClick={exportToExcel} className="ml-auto border px-3 py-1 rounded hover:bg-gray-100 flex gap-1 items-center">
              ⬇️ 匯出 Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">年度</th>
                  <th className="border px-2 py-1">科目</th>
                  <th className="border px-2 py-1">決算</th>
                  <th className="border px-2 py-1">預算</th>
                  <th className="border px-2 py-1">增減%</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredData().map((r, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-center">{r.year}</td>
                    <td className="border px-2 py-1">{r.subject}</td>
                    <td className="border px-2 py-1 text-right">{(r.final / unit).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">{(r.budget / unit).toLocaleString()}</td>
                    <td className="border px-2 py-1 text-right">{r.growth.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <canvas ref={chartRef} className="w-full h-96" onClick={renderChart}></canvas>
        </div>
      )}
    </div>
  );
}
